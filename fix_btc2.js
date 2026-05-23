const fs = require('fs');
const files = [
    'src/handlers/interactionHandler.js',
    'data/commands/economy/trade.js',
    'data/commands/economy/econShop.js',
    'data/commands/economy/rob.js',
];
for (const f of files) {
    if (!fs.existsSync(f)) { console.log('skip (not found):', f); continue; }
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/₿ \$\{/g, '₿${');
    c = c.replace(/\$\{([^}]+)\} BTC\*\*/g, '₿${$1}**');
    c = c.replace(/\$\{([^}]+)\} BTC([^a-zA-Z_\d])/g, '₿${$1}$2');
    c = c.replace(/\$\{([^}]+)\} BTC$/gm, '₿${$1}');
    // Fix double ₿ labels
    c = c.replace(/₿ Wallet: \*\*₿/g, 'Wallet: **₿');
    c = c.replace(/₿ \*\*Wallet:\*\* \*\*₿/g, '**Wallet:** **₿');
    fs.writeFileSync(f, c);
    console.log('done:', f);
}
