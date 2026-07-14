# Curator Ops Runbook (Stop/Start Safe)

This runbook is for operating the Curator backend (`ai.geuse.io` + n8n + Postgres) safely across EC2 stop/start, without breaking DNS or webhook endpoints.

## Day-to-Day Commands (Scriptable)

Everything here is wrapped in `scripts/curator-ops.sh`.

```bash
./scripts/curator-ops.sh start
./scripts/curator-ops.sh stop
./scripts/curator-ops.sh restart
./scripts/curator-ops.sh status
./scripts/curator-ops.sh healthcheck
./scripts/curator-ops.sh db-stats
./scripts/curator-ops.sh import-opendata
./scripts/curator-ops.sh sync-images
```

## What Broke (Root Cause)

1. **DNS was pointing at an EC2 public IP**
   - Stopping a normal EC2 instance changes its public IP on next start.
   - If `ai.geuse.io` points directly to that IP, the domain breaks until the record is updated.

2. **n8n “production” webhooks were missing/inactive**
   - The deployed Curator frontend calls specific production webhook paths.
   - If the corresponding workflows are not active, n8n returns `404 webhook not registered`, and the UI looks like it is stuck loading.

3. **Artwork images existed in source data, but weren’t being returned to the UI**
   - If the backend doesn’t join `artworks` to `artwork_images` (or `artwork_images` is empty), the UI receives results without thumbnails.

## Prevention (So Stop/Start Doesn’t Break Things)

1. **Never point DNS directly at an instance IP**
   - Use an ALB/NLB (or CloudFront) as the stable front door, or attach an Elastic IP.
   - For this project, `ai.geuse.io` should remain an alias to the load balancer, not the instance.

2. **Treat n8n workflows as deployable artifacts**
   - Keep required webhook paths documented (and ideally exported/backed up).
   - On restart, confirm workflows are active and webhooks register.

3. **Add a healthcheck that validates what the frontend depends on**
   - Use `./scripts/curator-ops.sh healthcheck` after any infra change.
   - Automate it in CI or a cron (optional) to catch drift early.

## Health Definition

`./scripts/curator-ops.sh healthcheck` validates the Curator backend endpoints the frontend depends on:

- `POST $CURATOR_AI_BASE_URL/webhook/home-newest` returns non-empty `results[]` with at least one thumbnail present.
- `POST $CURATOR_AI_BASE_URL/webhook/art-search-chat/chat` returns non-empty `results[]`.
- `POST $CURATOR_AI_BASE_URL/webhook/curator-assistant/chat` returns a non-empty `output` string.

If any of those fail, the Curator UI will be partially or fully broken.

## Environment Overrides

Defaults are baked into the script for the current Geuse setup, but you can override everything via environment variables:

```bash
export CURATOR_REGION=us-east-1
export CURATOR_INSTANCE_ID=i-xxxxxxxxxxxxxxxxx
export CURATOR_TARGET_GROUP_ARN=arn:aws:elasticloadbalancing:...
export CURATOR_AI_BASE_URL=https://ai.geuse.io

./scripts/curator-ops.sh start
```

## Thumbnails: How to Make Them Reliable

The goal: every artwork result should have a deterministic thumbnail URL without additional client-side lookups.

Recommended backend rules:

1. In SQL, select a single “primary” image per `objectid` (e.g., `viewtype='primary'` then lowest `sequence`).
2. Return `thumbUrl` (or `iiifthumburl`) for every item in `results[]`.
3. If you filter out artworks without images, compute `total`/`hasMore` based on the filtered dataset (not the raw `artworks` row count).

If you need to refresh `artwork_images` to match the current `artworks` table:

```bash
./scripts/curator-ops.sh sync-images
```

Note: `sync-images` truncates and reloads `artwork_images` remotely via SSM.

### Check Current DB Size

```bash
./scripts/curator-ops.sh db-stats
```

## Idempotent, Verifiable Import (Prevents Silent Partial Loads)

This is the replacement for “run an n8n ETL and hope it finished”.

`import-opendata`:

- Downloads NGA Open Data `objects.csv` and `published_images.csv`
- Verifies download size matches `Content-Length` (guards against truncated downloads)
- Loads into staging tables
- Refuses to proceed if staging counts are suspiciously small (default minimum is 1000 rows each)
- Upserts into `artworks` + `artwork_images` inside a single DB transaction (no partial state)
- Verifies every staging record exists in the final tables
- Records a summary row in `etl_runs`

Run it:

```bash
./scripts/curator-ops.sh import-opendata
```

Tune safety thresholds if needed:

```bash
CURATOR_IMPORT_MIN_OBJECTS=10000 CURATOR_IMPORT_MIN_IMAGES=10000 ./scripts/curator-ops.sh import-opendata
```

## “Discover Reached Full Collection” Too Early

That message is only as accurate as the backend’s pagination metadata.

To see what the backend thinks the current collection size is:

```bash
curl -sS -H 'Content-Type: application/json' \
  -X POST "$CURATOR_AI_BASE_URL/webhook/home-newest" \
  -d '{"limit":1,"offset":0}' \
  | node -e 'const fs=require("fs"); const j=JSON.parse(fs.readFileSync(0,"utf8")); console.log({ total:j.total, hasMore:j.hasMore, nextOffset:j.nextOffset });'
```

Common causes:

1. The database only contains a small subset (tens) of artworks.
2. The backend counts `total` from `artworks`, but the UI displays fewer because it filters out results missing thumbnails.
3. Pagination is done in code (fetch-all-then-slice), which breaks once the dataset grows.

Fixes:

1. Ensure ingestion actually loads the intended dataset size into `artworks`.
2. Ensure thumbnails are joined/available so the UI does not silently discard items.
3. Keep pagination SQL-based (`LIMIT/OFFSET` or keyset pagination), and compute `total` using the same filters used for `results[]`.

## Recovery If Something Looks Broken

1. Run:
   - `./scripts/curator-ops.sh status`
2. If the instance is stopped:
   - `./scripts/curator-ops.sh start`
3. If healthcheck fails with `webhook not registered`:
   - Open n8n and ensure the required workflows are active and their webhook paths match what the frontend calls.
4. If results load but images are missing:
   - `./scripts/curator-ops.sh sync-images`
