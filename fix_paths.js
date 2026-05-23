const fs   = require('fs');
const path = require('path');

function fixFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let c = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    for (const [from, to] of replacements) {
        const before = c;
        c = c.split(from).join(to);
        if (c !== before) changed = true;
    }
    if (changed) {
        fs.writeFileSync(filePath, c);
        console.log('fixed:', filePath);
    }
}

function fixDir(dir, replacements) {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
        if (f.endsWith('.js')) fixFile(path.join(dir, f), replacements);
    }
}

// data/commands/*.js  — was src/commands/, so '../x' now needs '../../src/x'
const topReplacements = [
    ["require('../config')",          "require('../../src/config')"],
    ["require('../store')",           "require('../../src/store')"],
    ["require('../utils/",            "require('../../src/utils/"],
    ["require('../games/",            "require('../../src/games/"],
    ["require('../economy/econStore')", "require('../../src/economy/econStore')"],
    ["require('../economy/market')",  "require('../../src/economy/market')"],
    ["require('../economy/prediction')", "require('../../src/economy/prediction')"],
];
fixDir('data/commands', topReplacements);

// data/commands/admin/*.js  — was src/commands/admin/, so '../../x' needs '../../../src/x'
const adminReplacements = [
    ["require('../../config')",       "require('../../../src/config')"],
    ["require('../../store')",        "require('../../../src/store')"],
    ["require('../../utils/",         "require('../../../src/utils/"],
    ["require('../../games/",         "require('../../../src/games/"],
    ["require('../../economy/econStore')", "require('../../../src/economy/econStore')"],
];
fixDir('data/commands/admin', adminReplacements);

// data/commands/economy/*.js  — was src/commands/economy/, so '../../x' needs '../../../src/x'
const econReplacements = [
    ["require('../../economy/",       "require('../../../src/economy/"],
    ["require('../../utils/",         "require('../../../src/utils/"],
    ["require('../../store')",        "require('../../../src/store')"],
    ["require('../../config')",       "require('../../../src/config')"],
];
fixDir('data/commands/economy', econReplacements);

console.log('done');
