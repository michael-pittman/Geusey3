#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"

CURATOR_REGION="${CURATOR_REGION:-us-east-1}"
CURATOR_INSTANCE_ID="${CURATOR_INSTANCE_ID:-i-05812b047bcfeb0dc}"
CURATOR_TARGET_GROUP_ARN="${CURATOR_TARGET_GROUP_ARN:-arn:aws:elasticloadbalancing:us-east-1:576245050892:targetgroup/AiBuildKit/e1f981c82db25120}"
CURATOR_AI_BASE_URL="${CURATOR_AI_BASE_URL:-https://ai.geuse.io}"
CURATOR_TIMEOUT_SECONDS="${CURATOR_TIMEOUT_SECONDS:-600}"

# NGA Open Data import defaults (used by import-opendata)
CURATOR_OBJECTS_CSV_URL="${CURATOR_OBJECTS_CSV_URL:-https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data/objects.csv}"
CURATOR_IMAGES_CSV_URL="${CURATOR_IMAGES_CSV_URL:-https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data/published_images.csv}"
CURATOR_IMPORT_MIN_OBJECTS="${CURATOR_IMPORT_MIN_OBJECTS:-1000}"
CURATOR_IMPORT_MIN_IMAGES="${CURATOR_IMPORT_MIN_IMAGES:-1000}"

# Remote sync defaults (used by sync-images)
CURATOR_POSTGRES_CONTAINER="${CURATOR_POSTGRES_CONTAINER:-001-starter-kit-postgres-1}"
CURATOR_N8N_DB_USER="${CURATOR_N8N_DB_USER:-root}"
CURATOR_N8N_DB_NAME="${CURATOR_N8N_DB_NAME:-n8n}"

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "[$(ts)] $*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

usage() {
  cat <<EOF
Usage: $SCRIPT_NAME <command>

  Commands:
    start         Start Curator EC2 instance, wait for ALB target healthy, then run healthcheck
    stop          Stop Curator EC2 instance
    restart       Stop then start
    status        Show instance state, SSM ping status, ALB target health, and run healthcheck (if running)
    wait          Wait for instance running + SSM online + target healthy
    healthcheck   Check Curator HTTP endpoints (webhooks the frontend depends on)
    db-stats      Print Postgres row counts for artworks + artwork_images (remote via SSM)
    import-opendata  Idempotent full import from NGA Open Data (objects.csv + published_images.csv) with verification
    fix-search-workflow  Patch the n8n Search API workflow to be SQL-paginated (prevents timeouts on full dataset)
    sync-images   Refresh artwork thumbnails in Postgres from NGA Open Data (runs remotely via SSM)

Environment (optional overrides):
  CURATOR_REGION            (default: $CURATOR_REGION)
  CURATOR_INSTANCE_ID       (default: $CURATOR_INSTANCE_ID)
  CURATOR_TARGET_GROUP_ARN  (default: $CURATOR_TARGET_GROUP_ARN)
  CURATOR_AI_BASE_URL       (default: $CURATOR_AI_BASE_URL)
  CURATOR_TIMEOUT_SECONDS   (default: $CURATOR_TIMEOUT_SECONDS)

NGA import (import-opendata) overrides:
  CURATOR_OBJECTS_CSV_URL      (default: $CURATOR_OBJECTS_CSV_URL)
  CURATOR_IMAGES_CSV_URL       (default: $CURATOR_IMAGES_CSV_URL)
  CURATOR_IMPORT_MIN_OBJECTS   (default: $CURATOR_IMPORT_MIN_OBJECTS)
  CURATOR_IMPORT_MIN_IMAGES    (default: $CURATOR_IMPORT_MIN_IMAGES)

Remote sync (sync-images) overrides:
  CURATOR_POSTGRES_CONTAINER (default: $CURATOR_POSTGRES_CONTAINER)
  CURATOR_N8N_DB_USER        (default: $CURATOR_N8N_DB_USER)
  CURATOR_N8N_DB_NAME        (default: $CURATOR_N8N_DB_NAME)

Examples:
  bash scripts/curator-ops.sh start
  bash scripts/curator-ops.sh stop
  CURATOR_INSTANCE_ID=i-abc CURATOR_AI_BASE_URL=https://ai.example.com bash scripts/curator-ops.sh healthcheck
EOF
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing dependency '$1' in PATH"
}

awsq() {
  aws --region "$CURATOR_REGION" "$@"
}

instance_state() {
  awsq ec2 describe-instances \
    --instance-ids "$CURATOR_INSTANCE_ID" \
    --query "Reservations[0].Instances[0].State.Name" \
    --output text 2>/dev/null || true
}

instance_public_ip() {
  awsq ec2 describe-instances \
    --instance-ids "$CURATOR_INSTANCE_ID" \
    --query "Reservations[0].Instances[0].PublicIpAddress" \
    --output text 2>/dev/null || true
}

ssm_ping_status() {
  awsq ssm describe-instance-information \
    --filters "Key=InstanceIds,Values=$CURATOR_INSTANCE_ID" \
    --query "InstanceInformationList[0].PingStatus" \
    --output text 2>/dev/null || true
}

is_ssm_online() {
  [[ "$(ssm_ping_status)" == "Online" ]]
}

target_health_states() {
  awsq elbv2 describe-target-health \
    --target-group-arn "$CURATOR_TARGET_GROUP_ARN" \
    --query "TargetHealthDescriptions[].TargetHealth.State" \
    --output text 2>/dev/null || true
}

is_target_healthy() {
  local states
  states="$(target_health_states)"

  local state
  for state in $states; do
    if [[ "$state" == "healthy" ]]; then
      return 0
    fi
  done

  return 1
}

wait_until() {
  local deadline=$(( $(date +%s) + CURATOR_TIMEOUT_SECONDS ))
  local what="$1"
  shift

  while true; do
    if "$@"; then
      return 0
    fi
    if [[ $(date +%s) -ge $deadline ]]; then
      log "Timed out waiting for: $what"
      return 1
    fi
    sleep 5
  done
}

wait_running() {
  log "Waiting for instance to be running: $CURATOR_INSTANCE_ID"
  awsq ec2 wait instance-running --instance-ids "$CURATOR_INSTANCE_ID"
}

wait_ssm_online() {
  log "Waiting for SSM agent to be online (PingStatus=Online)"
  wait_until "SSM online" is_ssm_online
}

wait_target_healthy() {
  log "Waiting for ALB target group to have at least one healthy target"
  wait_until "ALB target healthy" is_target_healthy
}

http_post_json() {
  local url="$1"
  local body="$2"
  curl -sS -m 25 -H 'Content-Type: application/json' -X POST "$url" -d "$body"
}

json_assert() {
  # Read JSON from stdin and run a node predicate that must exit 0.
  local js="$1"
  node -e "$js"
}

healthcheck() {
  require_cmd curl
  require_cmd node

  log "Healthcheck: $CURATOR_AI_BASE_URL"

  log "1/3 home-newest"
  http_post_json "$CURATOR_AI_BASE_URL/webhook/home-newest" '{"limit":8,"offset":0}' | json_assert '
let d = "";
process.stdin.on("data", (c) => (d += c));
process.stdin.on("end", () => {
  const j = JSON.parse(d);
  if (!Array.isArray(j.results) || j.results.length === 0) {
    console.error("home-newest: empty results");
    process.exit(1);
  }
  const withImages = j.results.filter((r) => r && r.iiifthumburl).length;
  if (withImages === 0) {
    console.error("home-newest: no thumbnails");
    process.exit(1);
  }
  process.exit(0);
});'

  log "2/3 art-search-chat/chat"
  http_post_json "$CURATOR_AI_BASE_URL/webhook/art-search-chat/chat" '{"chatInput":"painting","sessionId":"curator-ops-healthcheck"}' | json_assert '
let d = "";
process.stdin.on("data", (c) => (d += c));
process.stdin.on("end", () => {
  const j = JSON.parse(d);
  if (!Array.isArray(j.results) || j.results.length === 0) {
    console.error("art-search: empty results");
    process.exit(1);
  }
  process.exit(0);
});'

  log "3/3 curator-assistant/chat"
  http_post_json "$CURATOR_AI_BASE_URL/webhook/curator-assistant/chat" '{"chatInput":"painting","sessionId":"curator-ops-healthcheck-chat"}' | json_assert '
let d = "";
process.stdin.on("data", (c) => (d += c));
process.stdin.on("end", () => {
  const j = JSON.parse(d);
  if (typeof j.output !== "string" || j.output.trim().length === 0) {
    console.error("curator-assistant: missing output");
    process.exit(1);
  }
  process.exit(0);
});'

  log "Healthcheck OK"
}

cmd_start() {
  require_cmd aws
  local state
  state="$(instance_state)"

  if [[ "$state" == "running" ]]; then
    log "Instance already running: $CURATOR_INSTANCE_ID ($CURATOR_REGION)"
  elif [[ "$state" == "pending" ]]; then
    log "Instance already starting (pending): $CURATOR_INSTANCE_ID ($CURATOR_REGION)"
  else
    log "Starting instance: $CURATOR_INSTANCE_ID ($CURATOR_REGION)"
    awsq ec2 start-instances --instance-ids "$CURATOR_INSTANCE_ID" >/dev/null
  fi

  wait_running
  wait_ssm_online || die "SSM did not come online within ${CURATOR_TIMEOUT_SECONDS}s"
  wait_target_healthy || die "Target did not become healthy within ${CURATOR_TIMEOUT_SECONDS}s"
  healthcheck
}

cmd_stop() {
  require_cmd aws
  local state
  state="$(instance_state)"

  if [[ "$state" == "stopped" ]]; then
    log "Instance already stopped: $CURATOR_INSTANCE_ID ($CURATOR_REGION)"
    return 0
  fi

  if [[ "$state" == "stopping" ]]; then
    log "Instance already stopping: $CURATOR_INSTANCE_ID ($CURATOR_REGION)"
  else
    log "Stopping instance: $CURATOR_INSTANCE_ID ($CURATOR_REGION)"
    awsq ec2 stop-instances --instance-ids "$CURATOR_INSTANCE_ID" >/dev/null
  fi

  log "Waiting for instance to be stopped"
  awsq ec2 wait instance-stopped --instance-ids "$CURATOR_INSTANCE_ID"
  log "Stopped"
}

cmd_wait() {
  require_cmd aws
  wait_running
  wait_ssm_online || die "SSM did not come online within ${CURATOR_TIMEOUT_SECONDS}s"
  wait_target_healthy || die "Target did not become healthy within ${CURATOR_TIMEOUT_SECONDS}s"
  log "Wait OK"
}

cmd_status() {
  require_cmd aws
  local state
  state="$(instance_state)"

  log "Instance: $CURATOR_INSTANCE_ID"
  log "Region:   $CURATOR_REGION"
  log "State:    $state"
  log "PublicIP: $(instance_public_ip)"
  log "SSM:      $(ssm_ping_status)"
  log "TargetTG: $CURATOR_TARGET_GROUP_ARN"
  log "Targets:  $(target_health_states)"

  if [[ "$state" != "running" ]]; then
    log "Healthcheck: skipped (instance state is '$state')"
    return 0
  fi

  healthcheck
}

cmd_db_stats() {
  require_cmd aws
  local state
  state="$(instance_state)"
  if [[ "$state" != "running" ]]; then
    die "Instance is not running (state=$state). Start it first: $SCRIPT_NAME start"
  fi

  log "Querying DB counts on instance via SSM"

  local tmp_json
  tmp_json="$(mktemp -t curator-db-stats.XXXXXX.json)"
  trap 'rm -f "'"$tmp_json"'"' EXIT

  cat >"$tmp_json" <<EOF
{
  "commands": [
    "set -e",
    "python3 - <<'PY'\\nimport json\\nimport subprocess\\n\\nPOSTGRES_CONTAINER = '${CURATOR_POSTGRES_CONTAINER}'\\nDB_USER = '${CURATOR_N8N_DB_USER}'\\nDB_NAME = '${CURATOR_N8N_DB_NAME}'\\n\\ndef q(sql: str) -> str:\\n    res = subprocess.run(\\n        ['docker','exec',POSTGRES_CONTAINER,'psql','-U',DB_USER,'-d',DB_NAME,'-At','-c',sql],\\n        check=True,\\n        text=True,\\n        capture_output=True,\\n    )\\n    return (res.stdout or '').strip()\\n\\ndef q_int(sql: str):\\n    s = q(sql)\\n    return int(s) if s else 0\\n\\nout = {\\n    'artworks_total': q_int('SELECT COUNT(*) FROM artworks;'),\\n    'artworks_distinct_objectid': q_int('SELECT COUNT(DISTINCT objectid) FROM artworks;'),\\n    'artwork_images_total': q_int('SELECT COUNT(*) FROM artwork_images;'),\\n    'artwork_images_distinct_objectid': q_int('SELECT COUNT(DISTINCT objectid) FROM artwork_images;'),\\n    'artworks_missing_images': q_int('SELECT COUNT(*) FROM artworks a LEFT JOIN artwork_images i ON a.objectid=i.objectid WHERE i.objectid IS NULL;'),\\n}\\nprint(json.dumps(out))\\nPY"
  ]
}
EOF

  local cmd_id
  cmd_id="$(awsq ssm send-command \
    --instance-ids "$CURATOR_INSTANCE_ID" \
    --document-name AWS-RunShellScript \
    --parameters "file://$tmp_json" \
    --query 'Command.CommandId' \
    --output text)"

  log "SSM command submitted: $cmd_id"

  while true; do
    local status
    status="$(awsq ssm get-command-invocation --command-id "$cmd_id" --instance-id "$CURATOR_INSTANCE_ID" --query Status --output text)"
    case "$status" in
      Pending|InProgress|Delayed) sleep 2 ;;
      Success) break ;;
      *) die "SSM command failed (status=$status)" ;;
    esac
  done

  awsq ssm get-command-invocation --command-id "$cmd_id" --instance-id "$CURATOR_INSTANCE_ID" --query StandardOutputContent --output text
}

cmd_import_opendata() {
  require_cmd aws
  local state
  state="$(instance_state)"
  if [[ "$state" != "running" ]]; then
    die "Instance is not running (state=$state). Start it first: $SCRIPT_NAME start"
  fi

  log "Importing NGA Open Data on instance via SSM (idempotent upsert + verification)"
  log "Objects CSV: $CURATOR_OBJECTS_CSV_URL"
  log "Images  CSV: $CURATOR_IMAGES_CSV_URL"

  local tmp_json
  tmp_json="$(mktemp -t curator-import-opendata.XXXXXX.json)"
  trap 'rm -f "'"$tmp_json"'"' EXIT

  cat >"$tmp_json" <<EOF
{
  "commands": [
    "set -e",
    "python3 - <<'PY'\\nimport hashlib\\nimport json\\nimport os\\nimport subprocess\\nimport sys\\nimport time\\nimport uuid\\nimport urllib.request\\nfrom pathlib import Path\\n\\nPOSTGRES_CONTAINER = '${CURATOR_POSTGRES_CONTAINER}'\\nDB_USER = '${CURATOR_N8N_DB_USER}'\\nDB_NAME = '${CURATOR_N8N_DB_NAME}'\\nOBJECTS_URL = '${CURATOR_OBJECTS_CSV_URL}'\\nIMAGES_URL = '${CURATOR_IMAGES_CSV_URL}'\\nMIN_OBJECTS = int('${CURATOR_IMPORT_MIN_OBJECTS}')\\nMIN_IMAGES = int('${CURATOR_IMPORT_MIN_IMAGES}')\\n\\nRUN_ID = str(uuid.uuid4())\\nSTART = time.time()\\n\\nTMP_DIR = Path('/tmp/curator-opendata-import')\\nTMP_DIR.mkdir(parents=True, exist_ok=True)\\nOBJECTS_PATH = TMP_DIR / 'objects.csv'\\nIMAGES_PATH = TMP_DIR / 'published_images.csv'\\n\\n\\ndef sh(cmd, *, stdin=None):\\n    res = subprocess.run(cmd, input=stdin, text=True, capture_output=True)\\n    if res.returncode != 0:\\n        raise RuntimeError(f'Command failed ({res.returncode}): {cmd}\\\\nSTDOUT: {res.stdout}\\\\nSTDERR: {res.stderr}')\\n    return (res.stdout or '').strip()\\n\\n\\ndef psql(sql: str) -> str:\\n    return sh(['docker','exec',POSTGRES_CONTAINER,'psql','-U',DB_USER,'-d',DB_NAME,'-v','ON_ERROR_STOP=1','-At','-c',sql])\\n\\n\\ndef psql_file_copy(table: str, columns: list[str], path: Path):\\n    col_list = ','.join(columns)\\n    copy_sql = f\"\\\\\\\\copy {table}({col_list}) FROM STDIN WITH (FORMAT csv, HEADER true)\"\\n    with path.open('r', encoding='utf-8', errors='replace') as f:\\n        # Stream file into psql inside the container.\\n        subprocess.run(\\n            ['docker','exec','-i',POSTGRES_CONTAINER,'psql','-U',DB_USER,'-d',DB_NAME,'-v','ON_ERROR_STOP=1','-c',copy_sql],\\n            stdin=f,\\n            check=True,\\n            text=True,\\n        )\\n\\n\\ndef head_content_length(url: str):\\n    req = urllib.request.Request(url, method='HEAD')\\n    with urllib.request.urlopen(req, timeout=60) as resp:\\n        cl = resp.headers.get('Content-Length')\\n        return int(cl) if cl and cl.isdigit() else None\\n\\n\\ndef download(url: str, dest: Path) -> dict:\\n    expected = head_content_length(url)\\n    h = hashlib.sha256()\\n    n = 0\\n    with urllib.request.urlopen(url, timeout=300) as resp, dest.open('wb') as f:\\n        while True:\\n            chunk = resp.read(1024 * 1024)\\n            if not chunk:\\n                break\\n            f.write(chunk)\\n            h.update(chunk)\\n            n += len(chunk)\\n    if expected is not None and n != expected:\\n        raise RuntimeError(f'Download size mismatch for {url}: got {n} bytes, expected {expected} bytes')\\n    return {\\n        'url': url,\\n        'path': str(dest),\\n        'bytes': n,\\n        'expected_bytes': expected,\\n        'sha256': h.hexdigest(),\\n    }\\n\\n\\ndef try_record(status: str, details: dict):\\n    # Best-effort ETL run journaling (does not block the import).\\n    try:\\n        psql(\\n            \"CREATE TABLE IF NOT EXISTS etl_runs (\"\\n            \"run_id text PRIMARY KEY, \"\\n            \"source text NOT NULL, \"\\n            \"started_at timestamptz NOT NULL DEFAULT now(), \"\\n            \"finished_at timestamptz, \"\\n            \"status text NOT NULL, \"\\n            \"details jsonb\"\\n            \");\"\\n        )\\n        safe_details = json.dumps(details).replace(\"'\", \"''\")\\n        psql(\\n            \"INSERT INTO etl_runs(run_id, source, status, details) \"\\n            f\"VALUES ('{RUN_ID}', 'nga-opendata', '{status}', '{safe_details}'::jsonb) \"\\n            \"ON CONFLICT (run_id) DO UPDATE SET \"\\n            \"status = EXCLUDED.status, \"\\n            \"details = EXCLUDED.details, \"\\n            \"finished_at = CASE WHEN EXCLUDED.status IN ('success','failed') THEN now() ELSE etl_runs.finished_at END;\"\\n        )\\n    except Exception:\\n        pass\\n\\n\\ntry:\\n    details = {\\n        'run_id': RUN_ID,\\n        'objects': {'url': OBJECTS_URL},\\n        'images': {'url': IMAGES_URL},\\n    }\\n    try_record('running', details)\\n\\n    objects_meta = download(OBJECTS_URL, OBJECTS_PATH)\\n    images_meta = download(IMAGES_URL, IMAGES_PATH)\\n    details['objects'].update(objects_meta)\\n    details['images'].update(images_meta)\\n\\n    # Staging tables: keep everything as TEXT to avoid COPY failures on empty numeric cells.\\n    psql(\"\"\"\\n    CREATE UNLOGGED TABLE IF NOT EXISTS stg_nga_objects (\\n      objectid text,\\n      accessioned text,\\n      accessionnum text,\\n      locationid text,\\n      title text,\\n      displaydate text,\\n      beginyear text,\\n      endyear text,\\n      visualbrowsertimespan text,\\n      medium text,\\n      dimensions text,\\n      inscription text,\\n      markings text,\\n      attributioninverted text,\\n      attribution text,\\n      provenancetext text,\\n      creditline text,\\n      classification text,\\n      subclassification text,\\n      visualbrowserclassification text,\\n      parentid text,\\n      isvirtual text,\\n      departmentabbr text,\\n      portfolio text,\\n      series text,\\n      volume text,\\n      watermarks text,\\n      lastdetectedmodification text,\\n      wikidataid text,\\n      customprinturl text\\n    );\\n\\n    CREATE UNLOGGED TABLE IF NOT EXISTS stg_nga_images (\\n      uuid text,\\n      iiifurl text,\\n      iiifthumburl text,\\n      viewtype text,\\n      sequence text,\\n      width text,\\n      height text,\\n      maxpixels text,\\n      created text,\\n      modified text,\\n      depictstmsobjectid text,\\n      assistivetext text\\n    );\\n\\n    TRUNCATE TABLE stg_nga_objects;\\n    TRUNCATE TABLE stg_nga_images;\\n    \"\"\")\\n\\n    psql_file_copy(\\n        'stg_nga_objects',\\n        [\\n            'objectid','accessioned','accessionnum','locationid','title','displaydate','beginyear','endyear',\\n            'visualbrowsertimespan','medium','dimensions','inscription','markings','attributioninverted','attribution',\\n            'provenancetext','creditline','classification','subclassification','visualbrowserclassification','parentid',\\n            'isvirtual','departmentabbr','portfolio','series','volume','watermarks','lastdetectedmodification','wikidataid','customprinturl'\\n        ],\\n        OBJECTS_PATH,\\n    )\\n\\n    psql_file_copy(\\n        'stg_nga_images',\\n        [\\n            'uuid','iiifurl','iiifthumburl','viewtype','sequence','width','height','maxpixels',\\n            'created','modified','depictstmsobjectid','assistivetext'\\n        ],\\n        IMAGES_PATH,\\n    )\\n\\n    objects_rows = int(psql('SELECT COUNT(*) FROM stg_nga_objects;') or '0')\\n    images_rows = int(psql(\"SELECT COUNT(*) FROM stg_nga_images WHERE uuid IS NOT NULL AND uuid <> '';\" ) or '0')\\n\\n    if objects_rows < MIN_OBJECTS:\\n        raise RuntimeError(f'Objects staging count too small ({objects_rows} < {MIN_OBJECTS}). Refusing to proceed (prevents silent partial loads).')\\n    if images_rows < MIN_IMAGES:\\n        raise RuntimeError(f'Images staging count too small ({images_rows} < {MIN_IMAGES}). Refusing to proceed (prevents silent partial loads).')\\n\\n    details['staging'] = {'objects_rows': objects_rows, 'images_rows': images_rows}\\n    try_record('running', details)\\n\\n    # Upsert in a single transaction so failures do not leave a partial state.\\n    upsert_sql = \"\"\"\\n    BEGIN;\\n\\n    INSERT INTO artworks (\\n      objectid, accessioned, accessionnum, locationid, title, displaydate, beginyear, endyear,\\n      visualbrowsertimespan, medium, dimensions, inscription, markings, attributioninverted, attribution,\\n      provenancetext, creditline, classification, subclassification, visualbrowserclassification, parentid,\\n      isvirtual, departmentabbr, portfolio, series, volume, watermarks, wikidataid, customprinturl,\\n      created_at, updated_at\\n    )\\n    SELECT\\n      NULLIF(objectid,'')::int,\\n      NULLIF(accessioned,'')::int,\\n      NULLIF(accessionnum,''),\\n      NULLIF(locationid,'')::int,\\n      NULLIF(title,''),\\n      NULLIF(displaydate,''),\\n      NULLIF(beginyear,'')::int,\\n      NULLIF(endyear,'')::int,\\n      NULLIF(visualbrowsertimespan,''),\\n      NULLIF(medium,''),\\n      NULLIF(dimensions,''),\\n      NULLIF(inscription,''),\\n      NULLIF(markings,''),\\n      NULLIF(attributioninverted,''),\\n      NULLIF(attribution,''),\\n      NULLIF(provenancetext,''),\\n      NULLIF(creditline,''),\\n      NULLIF(classification,''),\\n      NULLIF(subclassification,''),\\n      NULLIF(visualbrowserclassification,''),\\n      NULLIF(parentid,'')::int,\\n      NULLIF(isvirtual,'')::int,\\n      NULLIF(departmentabbr,''),\\n      NULLIF(portfolio,''),\\n      NULLIF(series,''),\\n      NULLIF(volume,''),\\n      NULLIF(watermarks,''),\\n      NULLIF(wikidataid,''),\\n      NULLIF(customprinturl,''),\\n      NOW(),\\n      NOW()\\n    FROM stg_nga_objects\\n    WHERE NULLIF(objectid,'') IS NOT NULL\\n    ON CONFLICT (objectid) DO UPDATE SET\\n      accessioned = EXCLUDED.accessioned,\\n      accessionnum = EXCLUDED.accessionnum,\\n      locationid = EXCLUDED.locationid,\\n      title = EXCLUDED.title,\\n      displaydate = EXCLUDED.displaydate,\\n      beginyear = EXCLUDED.beginyear,\\n      endyear = EXCLUDED.endyear,\\n      visualbrowsertimespan = EXCLUDED.visualbrowsertimespan,\\n      medium = EXCLUDED.medium,\\n      dimensions = EXCLUDED.dimensions,\\n      inscription = EXCLUDED.inscription,\\n      markings = EXCLUDED.markings,\\n      attributioninverted = EXCLUDED.attributioninverted,\\n      attribution = EXCLUDED.attribution,\\n      provenancetext = EXCLUDED.provenancetext,\\n      creditline = EXCLUDED.creditline,\\n      classification = EXCLUDED.classification,\\n      subclassification = EXCLUDED.subclassification,\\n      visualbrowserclassification = EXCLUDED.visualbrowserclassification,\\n      parentid = EXCLUDED.parentid,\\n      isvirtual = EXCLUDED.isvirtual,\\n      departmentabbr = EXCLUDED.departmentabbr,\\n      portfolio = EXCLUDED.portfolio,\\n      series = EXCLUDED.series,\\n      volume = EXCLUDED.volume,\\n      watermarks = EXCLUDED.watermarks,\\n      wikidataid = EXCLUDED.wikidataid,\\n      customprinturl = EXCLUDED.customprinturl,\\n      updated_at = NOW();\\n\\n    INSERT INTO artwork_images (\\n      uuid, objectid, iiifurl, iiifthumburl, viewtype, sequence, width, height, maxpixels, assistivetext, created_at\\n    )\\n    SELECT\\n      NULLIF(uuid,''),\\n      NULLIF(depictstmsobjectid,'')::int,\\n      NULLIF(iiifurl,''),\\n      NULLIF(iiifthumburl,''),\\n      NULLIF(viewtype,''),\\n      NULLIF(sequence,'')::int,\\n      NULLIF(width,'')::int,\\n      NULLIF(height,'')::int,\\n      NULLIF(maxpixels,'')::int,\\n      NULLIF(assistivetext,''),\\n      NOW()\\n    FROM stg_nga_images s\\n    JOIN stg_nga_objects o ON NULLIF(o.objectid,'') = NULLIF(s.depictstmsobjectid,'')\\n    WHERE NULLIF(uuid,'') IS NOT NULL AND NULLIF(depictstmsobjectid,'') IS NOT NULL\\n    ON CONFLICT (uuid) DO UPDATE SET\\n      objectid = EXCLUDED.objectid,\\n      iiifurl = EXCLUDED.iiifurl,\\n      iiifthumburl = EXCLUDED.iiifthumburl,\\n      viewtype = EXCLUDED.viewtype,\\n      sequence = EXCLUDED.sequence,\\n      width = EXCLUDED.width,\\n      height = EXCLUDED.height,\\n      maxpixels = EXCLUDED.maxpixels,\\n      assistivetext = EXCLUDED.assistivetext;\\n\\n    COMMIT;\\n    \"\"\"\\n\\n    psql(upsert_sql)\\n\\n    # Verification: ensure every staging record exists in the final table.\\n    missing_artworks = int(psql(\\n        \"SELECT COUNT(*) FROM stg_nga_objects s \"\\n        \"LEFT JOIN artworks a ON a.objectid = NULLIF(s.objectid,'')::int \"\\n        \"WHERE NULLIF(s.objectid,'') IS NOT NULL AND a.objectid IS NULL;\"\\n    ) or '0')\\n\\n    missing_images = int(psql(\\n        \"SELECT COUNT(*) FROM stg_nga_images s \"\\n        \"JOIN stg_nga_objects o ON NULLIF(o.objectid,'') = NULLIF(s.depictstmsobjectid,'') \"\\n        \"LEFT JOIN artwork_images i ON i.uuid = NULLIF(s.uuid,'') \"\\n        \"WHERE NULLIF(s.uuid,'') IS NOT NULL AND NULLIF(s.depictstmsobjectid,'') IS NOT NULL AND i.uuid IS NULL;\"\\n    ) or '0')\\n\\n    if missing_artworks != 0:\\n        raise RuntimeError(f'Verification failed: {missing_artworks} staging artworks missing from artworks table')\\n    if missing_images != 0:\\n        raise RuntimeError(f'Verification failed: {missing_images} staging images missing from artwork_images table')\\n\\n    final_stats = {\\n        'artworks_total': int(psql('SELECT COUNT(*) FROM artworks;') or '0'),\\n        'artworks_distinct_objectid': int(psql('SELECT COUNT(DISTINCT objectid) FROM artworks;') or '0'),\\n        'artwork_images_total': int(psql('SELECT COUNT(*) FROM artwork_images;') or '0'),\\n        'artwork_images_distinct_objectid': int(psql('SELECT COUNT(DISTINCT objectid) FROM artwork_images;') or '0'),\\n        'artworks_with_images': int(psql('SELECT COUNT(DISTINCT a.objectid) FROM artworks a JOIN artwork_images i ON a.objectid=i.objectid;') or '0'),\\n    }\\n\\n    details['final'] = final_stats\\n    details['verification'] = {\\n        'missing_artworks': missing_artworks,\\n        'missing_images': missing_images,\\n        'elapsed_seconds': round(time.time() - START, 2),\\n    }\\n\\n    try_record('success', details)\\n    print(json.dumps(details))\\n\\nexcept Exception as e:\\n    err = str(e)\\n    try_record('failed', {'error': err})\\n    print(err, file=sys.stderr)\\n    sys.exit(1)\\nPY"
  ]
}
EOF

  local cmd_id
  cmd_id="$(awsq ssm send-command \
    --instance-ids "$CURATOR_INSTANCE_ID" \
    --document-name AWS-RunShellScript \
    --parameters "file://$tmp_json" \
    --query 'Command.CommandId' \
    --output text)"

  log "SSM command submitted: $cmd_id"

  while true; do
    local status
    status="$(awsq ssm get-command-invocation --command-id "$cmd_id" --instance-id "$CURATOR_INSTANCE_ID" --query Status --output text)"
    case "$status" in
      Pending|InProgress|Delayed) sleep 5 ;;
      Success) break ;;
      *) die "SSM command failed (status=$status). Check in SSM Run Command with CommandId=$cmd_id" ;;
    esac
  done

  awsq ssm get-command-invocation --command-id "$cmd_id" --instance-id "$CURATOR_INSTANCE_ID" --query StandardOutputContent --output text
  log "Import complete"
}

cmd_sync_images() {
  require_cmd aws
  log "Syncing artwork thumbnails on instance via SSM (this mutates DB: artwork_images)"

  local tmp_json
  tmp_json="$(mktemp -t curator-sync-images.XXXXXX.json)"
  trap 'rm -f "'"$tmp_json"'"' EXIT

  cat >"$tmp_json" <<EOF
{
  "commands": [
    "set -e",
    "python3 - <<'PY'\\nimport csv\\nimport io\\nimport subprocess\\nimport urllib.request\\nfrom pathlib import Path\\n\\nPOSTGRES_CONTAINER = '${CURATOR_POSTGRES_CONTAINER}'\\nDB_USER = '${CURATOR_N8N_DB_USER}'\\nDB_NAME = '${CURATOR_N8N_DB_NAME}'\\nCSV_URL = 'https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data/published_images.csv'\\nOUT_PATH = Path('/tmp/matched_images.csv')\\n\\ndef run(cmd, **kwargs):\\n    return subprocess.run(cmd, check=True, text=True, capture_output=True, **kwargs)\\n\\nres = run(['docker','exec',POSTGRES_CONTAINER,'psql','-U',DB_USER,'-d',DB_NAME,'-At','-c','SELECT objectid FROM artworks;'])\\nobject_ids = {line.strip() for line in res.stdout.splitlines() if line.strip()}\\nprint(f'Found {len(object_ids)} artwork object IDs in database')\\n\\nmatched = []\\nwith urllib.request.urlopen(CSV_URL, timeout=180) as response:\\n    reader = csv.DictReader(io.TextIOWrapper(response, encoding='utf-8'))\\n    for row in reader:\\n        object_id = (row.get('depictstmsobjectid') or '').strip()\\n        if object_id and object_id in object_ids:\\n            matched.append({\\n                'uuid': row.get('uuid', '').strip(),\\n                'objectid': object_id,\\n                'iiifurl': row.get('iiifurl', '').strip(),\\n                'iiifthumburl': row.get('iiifthumburl', '').strip(),\\n                'viewtype': (row.get('viewtype') or '').strip() or None,\\n                'sequence': row.get('sequence', '').strip() or None,\\n                'width': row.get('width', '').strip() or None,\\n                'height': row.get('height', '').strip() or None,\\n                'maxpixels': row.get('maxpixels', '').strip() or None,\\n                'assistivetext': row.get('assistivetext', '').strip() or None,\\n            })\\n\\nprint(f'Matched {len(matched)} image rows for current artworks')\\n\\nwith OUT_PATH.open('w', newline='', encoding='utf-8') as f:\\n    writer = csv.writer(f)\\n    writer.writerow(['uuid','objectid','iiifurl','iiifthumburl','viewtype','sequence','width','height','maxpixels','assistivetext'])\\n    for row in matched:\\n        writer.writerow([\\n            row['uuid'], row['objectid'], row['iiifurl'], row['iiifthumburl'], row['viewtype'],\\n            row['sequence'], row['width'], row['height'], row['maxpixels'], row['assistivetext']\\n        ])\\n\\nsubprocess.run(['docker','exec',POSTGRES_CONTAINER,'psql','-U',DB_USER,'-d',DB_NAME,'-c','TRUNCATE TABLE artwork_images;'], check=True, text=True)\\n\\ncopy_cmd = [\\n    'docker','exec','-i',POSTGRES_CONTAINER,\\n    'psql','-U',DB_USER,'-d',DB_NAME,\\n    '-c','\\\\\\\\copy artwork_images(uuid,objectid,iiifurl,iiifthumburl,viewtype,sequence,width,height,maxpixels,assistivetext) FROM STDIN WITH (FORMAT csv, HEADER true)'\\n]\\nwith OUT_PATH.open('r', encoding='utf-8') as f:\\n    subprocess.run(copy_cmd, check=True, text=True, stdin=f)\\n\\ncount = run(['docker','exec',POSTGRES_CONTAINER,'psql','-U',DB_USER,'-d',DB_NAME,'-At','-c','SELECT COUNT(*) FROM artwork_images;']).stdout.strip()\\nprint(f'artwork_images row count after import: {count}')\\nPY"
  ]
}
EOF

  local cmd_id
  cmd_id="$(awsq ssm send-command \
    --instance-ids "$CURATOR_INSTANCE_ID" \
    --document-name AWS-RunShellScript \
    --parameters "file://$tmp_json" \
    --query 'Command.CommandId' \
    --output text)"

  log "SSM command submitted: $cmd_id"

  # Poll until complete
  while true; do
    local status
    status="$(awsq ssm get-command-invocation --command-id "$cmd_id" --instance-id "$CURATOR_INSTANCE_ID" --query Status --output text)"
    case "$status" in
      Pending|InProgress|Delayed) sleep 3 ;;
      Success) break ;;
      *) awsq ssm get-command-invocation --command-id "$cmd_id" --instance-id "$CURATOR_INSTANCE_ID" >/dev/null || true; die "SSM command failed (status=$status)" ;;
    esac
  done

  awsq ssm get-command-invocation --command-id "$cmd_id" --instance-id "$CURATOR_INSTANCE_ID" --query StandardOutputContent --output text
  log "Sync complete"
}

cmd_fix_search_workflow() {
  require_cmd aws
  local state
  state="$(instance_state)"
  if [[ "$state" != "running" ]]; then
    die "Instance is not running (state=$state). Start it first: $SCRIPT_NAME start"
  fi

  log "Patching n8n workflow to avoid fetching all artworks into JS (fixes home-newest + art-search-chat timeouts)"

  local tmp_json
  tmp_json="$(mktemp -t curator-fix-search-workflow.XXXXXX.json)"
  trap 'rm -f "'"$tmp_json"'"' EXIT

  # NOTE: This heredoc is unquoted so that \\n sequences become \\n escapes in JSON, which the AWS CLI then
  # parses into real newlines for the SSM command. Any n8n expressions ($json/$input/$(...)) MUST be escaped
  # as \\$... or \$(...) to avoid bash expansion while building the JSON.
  cat >"$tmp_json" <<EOF
{
  "commands": [
    "set -e",
    "python3 - <<'PY'\\nimport base64\\nimport json\\nimport subprocess\\n\\nPOSTGRES_CONTAINER = '001-starter-kit-postgres-1'\\nDB_USER = 'root'\\nDB_NAME = 'n8n'\\nWORKFLOW_ID = 'avcGzu333qpH4Hcy'\\n\\nNEW_SQL = '''WITH req AS (\\n  SELECT\\n    NULLIF('{{\$json.query ? \$json.query.replace(/'/g, \`''\`) : ''}}', '') AS q,\\n    LEAST(80, GREATEST(1, {{\$json.limit}}::int)) AS lim,\\n    GREATEST(0, {{\$json.offset}}::int) AS off\\n),\\nfiltered AS (\\n  SELECT\\n    a.objectid,\\n    a.title,\\n    a.attribution,\\n    a.displaydate,\\n    a.medium,\\n    a.visualbrowserclassification,\\n    a.classification,\\n    a.beginyear,\\n    a.endyear,\\n    a.creditline,\\n    EXISTS(\\n      SELECT 1 FROM artwork_images ai WHERE ai.objectid = a.objectid\\n    ) AS has_image,\\n    CASE\\n      WHEN req.q IS NULL THEN 0\\n      ELSE ts_rank_cd(\\n        to_tsvector('english', concat_ws(' ', a.title, a.attribution, a.visualbrowserclassification, a.classification, a.medium, a.displaydate)),\\n        plainto_tsquery('english', req.q)\\n      )\\n    END AS rank\\n  FROM artworks a\\n  CROSS JOIN req\\n  WHERE COALESCE(a.title, '') NOT ILIKE 'codex pipeline validation%'\\n    AND (\\n      req.q IS NULL\\n      OR to_tsvector('english', concat_ws(' ', a.title, a.attribution, a.visualbrowserclassification, a.classification, a.medium, a.displaydate))\\n         @@ plainto_tsquery('english', req.q)\\n    )\\n),\\ntotal AS (\\n  SELECT COUNT(*)::int AS total_count FROM filtered\\n),\\npage AS (\\n  SELECT *\\n  FROM filtered\\n  ORDER BY\\n    rank DESC,\\n    has_image DESC,\\n    objectid DESC\\n  LIMIT (SELECT lim FROM req)\\n  OFFSET (SELECT off FROM req)\\n)\\nSELECT\\n  page.objectid,\\n  page.title,\\n  page.attribution,\\n  page.displaydate,\\n  page.medium,\\n  page.visualbrowserclassification,\\n  page.classification,\\n  page.beginyear,\\n  page.endyear,\\n  page.creditline,\\n  img.iiifthumburl,\\n  img.iiifurl,\\n  img.assistivetext,\\n  total.total_count\\nFROM page\\nCROSS JOIN total\\nLEFT JOIN LATERAL (\\n  SELECT iiifthumburl, iiifurl, assistivetext\\n  FROM artwork_images ai\\n  WHERE ai.objectid = page.objectid\\n  ORDER BY\\n    CASE WHEN COALESCE(ai.viewtype, '') = 'primary' THEN 0 ELSE 1 END,\\n    COALESCE(ai.sequence, 0)\\n  LIMIT 1\\n) img ON true\\n\\nUNION ALL\\nSELECT\\n  NULL::int AS objectid,\\n  NULL::text AS title,\\n  NULL::text AS attribution,\\n  NULL::text AS displaydate,\\n  NULL::text AS medium,\\n  NULL::text AS visualbrowserclassification,\\n  NULL::text AS classification,\\n  NULL::int AS beginyear,\\n  NULL::int AS endyear,\\n  NULL::text AS creditline,\\n  NULL::text AS iiifthumburl,\\n  NULL::text AS iiifurl,\\n  NULL::text AS assistivetext,\\n  total.total_count\\nFROM total\\nWHERE (SELECT COUNT(*) FROM page) = 0;\\n'''\\n\\nNEW_CODE = '''const req = \$('Parse Request').first().json;\\nconst offset = req.offset || 0;\\n\\nconst items = \$input.all().map((i) => i.json);\\nconst total = items.length ? Number(items[0].total_count || 0) : 0;\\n\\n// The SQL query returns a single dummy row when a page is empty.\\nconst rows = items.filter((row) => row && row.objectid !== null && row.objectid !== undefined);\\n\\nconst results = rows.map((row) => {\\n  const thumb = row.iiifthumburl || null;\\n  const iiifurl = row.iiifurl || null;\\n  return {\\n    objectid: row.objectid,\\n    title: row.title || 'Untitled',\\n    attribution: row.attribution || 'Unknown artist',\\n    displaydate: row.displaydate || '',\\n    medium: row.medium || '',\\n    classification: row.visualbrowserclassification || row.classification || '',\\n    beginyear: row.beginyear ?? null,\\n    endyear: row.endyear ?? null,\\n    creditline: row.creditline || '',\\n    iiifthumburl: thumb,\\n    images: thumb\\n      ? [\\n          {\\n            uuid: '',\\n            iiifurl: iiifurl || '',\\n            iiifthumburl: thumb,\\n            viewtype: 'primary',\\n            sequence: 0,\\n            width: 0,\\n            height: 0,\\n            assistivetext: row.assistivetext || row.title || '',\\n          },\\n        ]\\n      : [],\\n  };\\n});\\n\\nconst nextOffset = offset + results.length;\\nconst hasMore = nextOffset < total;\\n\\nreturn [\\n  {\\n    json: {\\n      results,\\n      total,\\n      hasMore,\\n      nextOffset: hasMore ? nextOffset : null,\\n    },\\n  },\\n];\\n'''\\n\\n\\ndef sh(cmd):\\n    res = subprocess.run(cmd, check=False, text=True, capture_output=True)\\n    if res.returncode != 0:\\n        raise RuntimeError('Command failed (%s): %s' % (res.returncode, cmd))\\n    return (res.stdout or '').strip()\\n\\n\\ndef psql(sql: str) -> str:\\n    return sh(['docker','exec',POSTGRES_CONTAINER,'psql','-U',DB_USER,'-d',DB_NAME,'-v','ON_ERROR_STOP=1','-At','-c',sql])\\n\\nraw_nodes = psql('SELECT nodes::text FROM workflow_entity WHERE id=\$\$%s\$\$;' % WORKFLOW_ID)\\nif not raw_nodes:\\n    raise RuntimeError('Workflow not found: %s' % WORKFLOW_ID)\\n\\nnodes = json.loads(raw_nodes)\\n\\nchanged = {'sql': False, 'code': False}\\nfor node in nodes:\\n    if node.get('name') == 'Fetch Artworks':\\n        node.setdefault('parameters', {})['query'] = NEW_SQL\\n        node.setdefault('parameters', {}).setdefault('options', {})\\n        changed['sql'] = True\\n    if node.get('name') == 'Filter and Format':\\n        node.setdefault('parameters', {})['jsCode'] = NEW_CODE\\n        changed['code'] = True\\n\\nif not all(changed.values()):\\n    raise RuntimeError('Did not find expected nodes to patch: %s' % changed)\\n\\nnew_nodes_json = json.dumps(nodes, separators=(',', ':'))\\nb64 = base64.b64encode(new_nodes_json.encode('utf-8')).decode('ascii')\\n\\npsql('UPDATE workflow_entity SET nodes = convert_from(decode(\$\$%s\$\$, \$\$base64\$\$), \$\$UTF8\$\$)::json WHERE id=\$\$%s\$\$;' % (b64, WORKFLOW_ID))\\n\\nprint('Patched workflow nodes:', changed)\\n\\n# Reload n8n to pick up DB changes.\\nsh(['docker','restart','n8n'])\\nprint('Restarted n8n')\\nPY"
  ]
}
EOF

  local cmd_id
  cmd_id="$(awsq ssm send-command \
    --instance-ids "$CURATOR_INSTANCE_ID" \
    --document-name AWS-RunShellScript \
    --parameters "file://$tmp_json" \
    --query 'Command.CommandId' \
    --output text)"

  log "SSM command submitted: $cmd_id"

  while true; do
    local status
    status="$(awsq ssm get-command-invocation --command-id "$cmd_id" --instance-id "$CURATOR_INSTANCE_ID" --query Status --output text)"
    case "$status" in
      Pending|InProgress|Delayed) sleep 3 ;;
      Success) break ;;
      *) die "SSM command failed (status=$status). Check in SSM Run Command with CommandId=$cmd_id" ;;
    esac
  done

  awsq ssm get-command-invocation --command-id "$cmd_id" --instance-id "$CURATOR_INSTANCE_ID" --query StandardOutputContent --output text
  log "Workflow patch complete"
}

main() {
  local cmd="${1:-}"
  case "$cmd" in
    -h|--help|"") usage; exit 0 ;;
    start) cmd_start ;;
    stop) cmd_stop ;;
    restart) cmd_stop; cmd_start ;;
    status) cmd_status ;;
    wait) cmd_wait ;;
    healthcheck) healthcheck ;;
    db-stats) cmd_db_stats ;;
    import-opendata) cmd_import_opendata ;;
    fix-search-workflow) cmd_fix_search_workflow ;;
    sync-images) cmd_sync_images ;;
    *) usage; die "Unknown command: $cmd" ;;
  esac
}

main "$@"
