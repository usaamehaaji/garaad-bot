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
    'data/commands/today.js',
];

for (const f of files) {
    let c = fs.readFileSync(f, 'utf8');

    // Remove space after ₿: "₿ ${" → "₿${"
    c = c.replace(/₿ \$\{/g, '₿${');

    // "${X} BTC**" → "₿${X}**"  (bold balance lines)
    c = c.replace(/\$\{([^}]+)\} BTC\*\*/g, '₿${$1}**');

    // "${X} BTC\n" "${X} BTC\`" "${X} BTC)" "${X} BTC|" "${X} BTC " "${X} BTC\\"
    c = c.replace(/\$\{([^}]+)\} BTC([^a-zA-Z_\d])/g, '₿${$1}$2');

    // Handle end of string: "${X} BTC" at end of template literal line
    c = c.replace(/\$\{([^}]+)\} BTC$/gm, '₿${$1}');

    fs.writeFileSync(f, c);
    console.log('✓', f);
}
console.log('Done.');
