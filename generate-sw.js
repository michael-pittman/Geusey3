/**
 * Service Worker Generator
 * Reuses the canonical public/sw.js template and injects build metadata.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUILD_TIME = new Date().toISOString();
const VERSION = process.env.npm_package_version || '1.0.0';

const OUTPUT_DIR = 'dist';
const SW_OUTPUT_PATH = path.join(__dirname, OUTPUT_DIR, 'sw.js');
const SW_TEMPLATE_PATH = path.join(__dirname, 'public', 'sw.js');

/**
 * Recursively scans the build output directory to discover generated assets.
 * @param {string} dir Absolute directory path
 * @param {string} basePath Relative path prefix for asset URLs
 * @returns {{ static: string[], html: string[], chunks: string[], media: string[] }}
 */
function scanBuildAssets(dir, basePath = '') {
    const assets = {
        static: [],
        html: [],
        chunks: [],
        media: []
    };

    if (!fs.existsSync(dir)) {
        console.warn(`Build directory ${dir} does not exist`);
        return assets;
    }

    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        const relativePath = path.posix.join(basePath, file.name);

        if (file.isDirectory()) {
            const subAssets = scanBuildAssets(fullPath, relativePath);
            assets.static.push(...subAssets.static);
            assets.html.push(...subAssets.html);
            assets.chunks.push(...subAssets.chunks);
            assets.media.push(...subAssets.media);
            continue;
        }

        const url = '/' + relativePath;

        if (file.name.match(/\.(html)$/i)) {
            assets.html.push(url);
        } else if (file.name.match(/\.(js|css)$/i) && relativePath.includes('assets/')) {
            assets.chunks.push(url);
        } else if (file.name.match(/\.(png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot)$/i)) {
            if (relativePath.includes('assets/')) {
                assets.static.push(url);
            } else {
                assets.media.push(url);
            }
        } else if (file.name.match(/\.(json|txt|xml)$/i)) {
            assets.static.push(url);
        }
    }

    return assets;
}

function ensureOutputDirectory(filePath) {
    const outputDir = path.dirname(filePath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`📁 Created output directory: ${outputDir}`);
    }
}

function injectMetadata(template, { version, buildTime, assets }) {
    const injection = [
        '// Auto-generated Service Worker',
        `// Build Time: ${buildTime}`,
        `// Version: ${version}`,
        '',
        `const __VERSION__ = '${version}';`,
        `const __BUILD_TIME__ = '${buildTime}';`,
        `const __BUILD_ASSETS__ = ${JSON.stringify(assets, null, 2)};`
    ].join('\n');

    if (!template.includes('// __BUILD_ASSETS_DECLARATION__')) {
        throw new Error('Service worker template missing // __BUILD_ASSETS_DECLARATION__ placeholder.');
    }

    return template.replace('// __BUILD_ASSETS_DECLARATION__', `${injection}\n`);
}

function generateServiceWorker() {
    console.log('🔧 Generating service worker...');
    console.log(`📅 Build Time: ${BUILD_TIME}`);
    console.log(`📦 Version: ${VERSION}`);

    const buildDir = path.join(__dirname, OUTPUT_DIR);
    const buildAssets = scanBuildAssets(buildDir);

    console.log('🔍 Scanned build assets:');
    console.log(`   • Static: ${buildAssets.static.length}`);
    console.log(`   • HTML: ${buildAssets.html.length}`);
    console.log(`   • Chunks: ${buildAssets.chunks.length}`);
    console.log(`   • Media: ${buildAssets.media.length}`);

    const template = fs.readFileSync(SW_TEMPLATE_PATH, 'utf8');
    const generatedContent = injectMetadata(template, {
        version: VERSION,
        buildTime: BUILD_TIME,
        assets: buildAssets
    });

    ensureOutputDirectory(SW_OUTPUT_PATH);
    fs.writeFileSync(SW_OUTPUT_PATH, generatedContent, 'utf8');

    const fileSizeKb = (fs.statSync(SW_OUTPUT_PATH).size / 1024).toFixed(2);
    console.log(`✅ Service worker generated: ${SW_OUTPUT_PATH} (${fileSizeKb} KB)`);

    return {
        version: VERSION,
        buildTime: BUILD_TIME,
        assets: buildAssets,
        outputPath: SW_OUTPUT_PATH
    };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        generateServiceWorker();
        console.log('🎉 Service worker generation completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Service worker generation failed:', error);
        process.exit(1);
    }
}

export { generateServiceWorker };
