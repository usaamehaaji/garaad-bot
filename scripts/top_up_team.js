const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'questions', 'team.json');
const existing = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const existingTexts = new Set(existing.map(q => q.question));

const been = existing.filter(q => q.correct === 'Been').length;
const run  = existing.filter(q => q.correct === 'Run').length;
const mc   = existing.filter(q => q.options.length === 4).length;
console.log(`Current: MC=${mc} | Been=${been} | Run=${run} | Total=${existing.length}`);

const needBeen = 360 - been; // 14
const needRun  = 361 - run;  // 13
console.log(`Need: Been+${needBeen}, Run+${needRun}`);

const moreBeen = [
  {"question":"Tirada saacadaha maalinta waa 12.","options":["Run","Been"],"correct":"Been"},
  {"question":"Tirada daqiiqadaha saacadda waa 30.","options":["Run","Been"],"correct":"Been"},
  {"question":"Tirada jilbaha bini'aadamka waa 4.","options":["Run","Been"],"correct":"Been"},
  {"question":"Xiddigga ugu caan badan caalamka waa Polaris.","options":["Run","Been"],"correct":"Run"},
  {"question":"Geyiga ugu weyn adduunka waa Africa.","options":["Run","Been"],"correct":"Been"},
  {"question":"Dalka ugu yar adduunka waa Monaco.","options":["Run","Been"],"correct":"Been"},
  {"question":"Tirada labista (sides) dodecagon waa 10.","options":["Run","Been"],"correct":"Been"},
  {"question":"Caasimadda Colombia waa Bogota — Been, waa Run.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Chile waa Santiago — Been.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada luqadaha rasmiga ee Qaramada Midoobay waa 5.","options":["Run","Been"],"correct":"Been"},
  {"question":"Laanta Biology waxay daraasaysaa Aadmiga keliya.","options":["Run","Been"],"correct":"Been"},
  {"question":"Laanta Physics waxay daraasaysaa Sayniska xawaaraha.","options":["Run","Been"],"correct":"Run"},
  {"question":"Meeraha ugu fog qorraxda waa Uranus.","options":["Run","Been"],"correct":"Been"},
  {"question":"Tirada dhinacyada tetrahedron waa 3.","options":["Run","Been"],"correct":"Been"},
  {"question":"Dareeraha bini'aadamka ee dhiiga waa cas.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada laf-dhabarta bini'aadamka waa 32.","options":["Run","Been"],"correct":"Been"},
  {"question":"Tirada xididada dhiigga weyn waa 2.","options":["Run","Been"],"correct":"Run"},
  {"question":"Past tense of eat waa ate — Been.","options":["Run","Been"],"correct":"Run"},
  {"question":"Past tense of speak waa spoken.","options":["Run","Been"],"correct":"Been"},
  {"question":"Past tense of write waa wrote — Been.","options":["Run","Been"],"correct":"Run"},
];

const moreRun = [
  {"question":"Tirada saacadaha maalinta waa 24.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada daqiiqadaha saacadda waa 60 — Run.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada jilbaha bini'aadamka waa 2.","options":["Run","Been"],"correct":"Run"},
  {"question":"Geyiga ugu weyn adduunka waa Asia.","options":["Run","Been"],"correct":"Run"},
  {"question":"Dalka ugu yar adduunka waa Vatican City.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada labista (sides) dodecagon waa 12.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Colombia waa Bogota.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Chile waa Santiago.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada luqadaha rasmiga ee Qaramada Midoobay waa 6.","options":["Run","Been"],"correct":"Run"},
  {"question":"Meeraha ugu fog qorraxda waa Neptune.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada dhinacyada tetrahedron waa 4.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada laf-dhabarta bini'aadamka waa 33.","options":["Run","Been"],"correct":"Run"},
  {"question":"Past tense of eat waa ate.","options":["Run","Been"],"correct":"Run"},
  {"question":"Past tense of write waa wrote.","options":["Run","Been"],"correct":"Run"},
  {"question":"Past tense of speak waa spoke.","options":["Run","Been"],"correct":"Run"},
];

const uniqueBeen = moreBeen.filter(q => !existingTexts.has(q.question)).slice(0, needBeen);
const uniqueRun  = moreRun.filter(q => !existingTexts.has(q.question)).slice(0, needRun);
console.log(`Adding Been: ${uniqueBeen.length} | Adding Run: ${uniqueRun.length}`);

const combined = [...existing, ...uniqueBeen, ...uniqueRun];
const fb = combined.filter(q => q.correct === 'Been').length;
const fr = combined.filter(q => q.correct === 'Run').length;
const fm = combined.filter(q => q.options.length === 4).length;
console.log(`Final: MC=${fm} | Been=${fb} | Run=${fr} | Total=${combined.length}`);
fs.writeFileSync(FILE, JSON.stringify(combined, null, 2), 'utf8');
console.log('Saved!');
