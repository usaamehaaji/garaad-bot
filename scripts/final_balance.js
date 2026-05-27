const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'questions', 'team.json');
const existing = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const existingTexts = new Set(existing.map(q => q.question));

const been = existing.filter(q => q.correct === 'Been').length;
const run  = existing.filter(q => q.correct === 'Run').length;
const mc   = existing.filter(q => q.options.length === 4).length;
console.log(`Current: MC=${mc} | Been=${been} | Run=${run} | Total=${existing.length}`);
// Need Been+5, remove Run-5

// Add 5 more Been questions
const moreBeen = [
  {"question":"Soomaaliya waxay xudunta ku leedahay bariga Afrika.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Djibouti waa Djibouti — Been, waa Run.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada aayada suuradda Al-Baqarah waa 184.","options":["Run","Been"],"correct":"Been"},
  {"question":"Tirada aayada suuradda Al-Imran waa 175.","options":["Run","Been"],"correct":"Been"},
  {"question":"Tirada suurtada Qur'aanka waa 113.","options":["Run","Been"],"correct":"Been"},
  {"question":"Nabi Ciise (AS) wuxuu ku dhashay Makkadda.","options":["Run","Been"],"correct":"Been"},
  {"question":"Meher-ka ugu yar Islamka waa lacag.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada rukuuca salaadda Fajar waa 4.","options":["Run","Been"],"correct":"Been"},
  {"question":"Tirada rukuuca salaadda Duhur waa 3.","options":["Run","Been"],"correct":"Been"},
  {"question":"Tirada salaadda oo dhan waa 5.","options":["Run","Been"],"correct":"Run"},
].filter(q => q.correct === 'Been' && !existingTexts.has(q.question)).slice(0, 5);

console.log(`Adding ${moreBeen.length} Been`);

// Remove 5 Run from the end
const mc_q    = existing.filter(q => q.options.length === 4);
const been_q  = existing.filter(q => q.correct === 'Been');
const run_q   = existing.filter(q => q.correct === 'Run');

const trimmedRun = run_q.slice(0, run_q.length - 5);
const combined = [...mc_q, ...been_q, ...moreBeen, ...trimmedRun];

const fb = combined.filter(q => q.correct === 'Been').length;
const fr = combined.filter(q => q.correct === 'Run').length;
const fm = combined.filter(q => q.options.length === 4).length;
console.log(`Final: MC=${fm} | Been=${fb} | Run=${fr} | Total=${combined.length}`);
fs.writeFileSync(FILE, JSON.stringify(combined, null, 2), 'utf8');
console.log('Saved!');
