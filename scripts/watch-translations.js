const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

console.log('Starting translation auto-sync watcher...');

// Function to run sync & translation
let isRunning = false;
let pendingTrigger = false;

function runSyncAndTranslate() {
    if (isRunning) {
        pendingTrigger = true;
        return;
    }
    isRunning = true;
    pendingTrigger = false;
    console.log('\n[Watcher] Changes detected. Syncing and translating keys...');
    
    try {
        // Run extract
        execSync('node scripts/extract-translations.js', { stdio: 'inherit' });
        // Run translate
        execSync('node scripts/translate.js', { stdio: 'inherit' });
        console.log('[Watcher] Translation sync complete!\n');
    } catch (err) {
        console.error('[Watcher] Failed to run translation scripts:', err.message);
    } finally {
        isRunning = false;
        if (pendingTrigger) {
            runSyncAndTranslate();
        }
    }
}

// Debounce helper
let timeoutId = null;
function handleFileChange(eventType, filename) {
    if (!filename) return;
    
    // Normalize path separators
    const normalPath = filename.replace(/\\/g, '/');
    
    // Ignore changes in i18n.tsx to prevent infinite loop
    if (normalPath.endsWith('i18n.tsx')) return;
    
    // Ignore api routes or brain logs
    if (normalPath.includes('app/api/') || normalPath.includes('brain/')) return;
    
    // Only watch JS/TS/JSX/TSX files
    const ext = path.extname(filename);
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) return;
    
    if (timeoutId) clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
        runSyncAndTranslate();
    }, 2000); // 2 second debounce
}

// Start watching
if (fs.existsSync(SRC_DIR)) {
    fs.watch(SRC_DIR, { recursive: true }, handleFileChange);
    console.log(`[Watcher] Watching ${SRC_DIR} recursively for new or modified pages/components...`);
} else {
    console.error(`[Watcher] Directory not found: ${SRC_DIR}`);
}

// Spawn next dev --turbopack
const args = process.argv.slice(2);
const devCmd = 'next';
const devArgs = ['dev', '--turbopack', ...args];

console.log(`[Watcher] Spawning dev server: ${devCmd} ${devArgs.join(' ')}`);
const devProcess = spawn(devCmd, devArgs, { 
    stdio: 'inherit',
    shell: true // critical for Windows command line execution
});

devProcess.on('exit', (code, signal) => {
    console.log(`[Watcher] Dev server exited with code ${code} and signal ${signal}`);
    process.exit(code || 0);
});

// Forward signals to child process
const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
signals.forEach((sig) => {
    process.on(sig, () => {
        if (devProcess && !devProcess.killed) {
            devProcess.kill(sig);
        }
        process.exit(0);
    });
});
