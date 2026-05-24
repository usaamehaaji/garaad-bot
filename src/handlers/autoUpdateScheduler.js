const { exec } = require('child_process');

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

function getRemote() {
    const token = process.env.GIT_TOKEN || process.env.GIT_ACCESS_TOKEN;
    if (token) return `https://${token}@github.com/usaamehaaji/garaad-bot.git`;
    return 'origin';
}

function applyUpdate(label) {
    console.log('[AutoUpdate] 🔄 Code cusub la helay — bot dib u bilaabaya...');
    if (label) console.log('[AutoUpdate]', label);
    exec('npm install --omit=dev 2>&1', { timeout: 60_000 }, () => {
        setTimeout(() => process.exit(0), 2000);
    });
}

function initAndPull(remote) {
    const steps = [
        'git init',
        `git remote add origin ${remote} 2>/dev/null || git remote set-url origin ${remote}`,
        'git fetch origin main 2>&1',
        'git reset --hard origin/main 2>&1',
    ].join(' && ');

    exec(steps, { timeout: 60_000 }, (err, stdout) => {
        if (err) {
            console.log('[AutoUpdate] ⚠️ Git init failed:', (err.message || '').slice(0, 200));
            return;
        }
        console.log('[AutoUpdate] ✅ Git initialized — code pulled from GitHub');
        applyUpdate('');
    });
}

function checkForUpdates() {
    const remote = getRemote();
    exec(`git pull ${remote} main 2>&1`, { timeout: 30_000 }, (err, stdout) => {
        if (err) {
            const txt = ((err.message || '') + (stdout || '')).toLowerCase();
            if (txt.includes('not a git repository')) {
                console.log('[AutoUpdate] 🔧 No .git found — initializing from GitHub...');
                initAndPull(remote);
            }
            return;
        }
        const out = (stdout || '').trim();
        if (!out || out.toLowerCase().includes('already up to date')) return;
        applyUpdate(out);
    });
}

module.exports = function setupAutoUpdate() {
    console.log('[AutoUpdate] ✅ Daqiiqad 5 walba GitHub la hubinayaa');
    checkForUpdates(); // run once immediately on startup
    setInterval(checkForUpdates, CHECK_INTERVAL);
};
