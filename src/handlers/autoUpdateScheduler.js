const { exec } = require('child_process');

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

function checkForUpdates() {
    exec('git pull origin main 2>&1', (err, stdout) => {
        if (err) return; // no git or network error — skip silently
        const out = (stdout || '').trim();
        if (!out || out.includes('Already up to date')) return;

        console.log('[AutoUpdate] 🔄 Code cusub la helay — bot dib u bilaabaya...');
        console.log('[AutoUpdate]', out);

        // Install any new packages, then exit (Endercloud auto-restarts)
        exec('npm install --omit=dev 2>&1', () => {
            setTimeout(() => process.exit(0), 2000);
        });
    });
}

module.exports = function setupAutoUpdate() {
    setInterval(checkForUpdates, CHECK_INTERVAL);
    console.log('[AutoUpdate] ✅ Daqiiqad 5 walba GitHub la hubinayaa');
};
