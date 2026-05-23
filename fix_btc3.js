const fs = require('fs');

const files = [
    'data/commands/economy/jeeb.js',
    'data/commands/economy/ebank.js',
    'data/commands/economy/rich.js',
    'data/commands/economy/shaqo.js',
    'data/commands/economy/rob.js',
    'data/commands/economy/give.js',
    'data/commands/economy/bankList.js',
    'data/commands/economy/cashflip.js',
    'data/commands/economy/trade.js',
    'data/commands/economy/econShop.js',
    'data/commands/today.js',
    'src/handlers/interactionHandler.js',
];

for (const f of files) {
    if (!fs.existsSync(f)) { console.log('skip:', f); continue; }
    let c = fs.readFileSync(f, 'utf8');
    // '₿${' → '₿: ${'  (add colon+space after ₿ before value)
    c = c.replace(/₿\$\{/g, '₿: ${');
    // Fix button labels that got broken: "₿: Repay" etc — revert those
    c = c.replace(/₿: Repay/g, '₿ Repay');
    c = c.replace(/₿: Take/g, '₿ Take');
    c = c.replace(/₿: Profit/g, '₿ Profit');
    c = c.replace(/₿: Lost/g, '₿ Lost');
    c = c.replace(/₿: New Balance/g, '₿ New Balance');
    c = c.replace(/₿: BTC/g, '₿ BTC');
    c = c.replace(/₿: TOP/g, '₿ TOP');
    fs.writeFileSync(f, c);
    console.log('done:', f);
}
