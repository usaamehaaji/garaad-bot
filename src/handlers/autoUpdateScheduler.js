const { exec } = require('child_process');

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

function getRemote() {
    const token = process.env.GIT_TOKEN || process.env.GIT_ACCESS_TOKEN;
    if (token) return `https://${token}@github.com/usaamehaaji/garaad-bot.git`;
    return 'origin';
}

function checkForUpdates() {
    exec(`git pull ${getRemote()} main 2>&1`, { timeout: 30_000 }, (err, stdout) => {
        if (err) return; // network error or timeout — skip silently
        const out = (stdout || '').trim();
        if (!out || out.includes('Already up to date')) return;

        console.log('[AutoUpdate] 🔄 Code cusub la helay — bot dib u bilaabaya...');
        console.log('[AutoUpdate]', out);

        exec('npm install --omit=dev 2>&1', { timeout: 60_000 }, () => {
            setTimeout(() => process.exit(0), 2000);
        });
    });
}

module.exports = function setupAutoUpdate() {
    setInterval(checkForUpdates, CHECK_INTERVAL);
    console.log('[AutoUpdate] ✅ Daqiiqad 5 walba GitHub la hubinayaa');
};
