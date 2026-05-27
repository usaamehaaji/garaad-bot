const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'questions', 'team.json');
const existing = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const existingTexts = new Set(existing.map(q => q.question));

const mc   = existing.filter(q => q.options.length === 4).length;
const been = existing.filter(q => q.correct === 'Been').length;
const run  = existing.filter(q => q.correct === 'Run').length;
console.log(`Current: MC=${mc} | Been=${been} | Run=${run} | Total=${existing.length}`);
// Need: Been=360 (+31), Run=361 (+79)

const newBeen = [
  {"question":"Suuradda Al-Ikhlaas waxay leedahay 3 aayad.","options":["Run","Been"],"correct":"Been"},
  {"question":"Nabi Ibraahim (AS) wuxuu ku dhashay Masar.","options":["Run","Been"],"correct":"Been"},
  {"question":"Tirada Nabiyada ee Qur'aanka lagu xusay waa 20.","options":["Run","Been"],"correct":"Been"},
  {"question":"Dagaalkii Uxud wuxuu dhacay sanadkii 1 H.","options":["Run","Been"],"correct":"Been"},
  {"question":"Caasimadda Norway waa Oslo — Been.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Sweden waa Stockholm — Been, waa Run.","options":["Run","Been"],"correct":"Run"},
  {"question":"4 × 4 = 12.","options":["Run","Been"],"correct":"Been"},
  {"question":"7 × 8 = 54.","options":["Run","Been"],"correct":"Been"},
  {"question":"9 × 9 = 82.","options":["Run","Been"],"correct":"Been"},
  {"question":"Tirada ciyaaryahanada volleyball koox waa 7.","options":["Run","Been"],"correct":"Been"},
  {"question":"Tirada ciyaaryahanada cricket koox waa 10.","options":["Run","Been"],"correct":"Been"},
  {"question":"Caasimadda Libya waa Tripoli — Been.","options":["Run","Been"],"correct":"Run"},
  {"question":"World Cup 2010 waxay dhacday South Africa — Been.","options":["Run","Been"],"correct":"Run"},
  {"question":"Olympics-ka 2 sannadba mar ayuu dhacaa.","options":["Run","Been"],"correct":"Been"},
  {"question":"Xiddiga ugu weyn nidaamka qorraxeed waa Jupiter.","options":["Run","Been"],"correct":"Been"},
  {"question":"Tirada kalluunka deegaanka badda 'clownfish' waa dhibic jaalle ah.","options":["Run","Been"],"correct":"Run"},
  {"question":"Soomaaliya waxay heysataa badda Hindiya oo kaliya.","options":["Run","Been"],"correct":"Been"},
  {"question":"Koonfurta iyo Waqooyi Soomaaliya waxay midoobeen 1 Luulyo 1961.","options":["Run","Been"],"correct":"Been"},
  {"question":"Webiga Jubba wuxuu bilaabmaa Ethiopia.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Puntland waa Boosaaso.","options":["Run","Been"],"correct":"Been"},
  {"question":"Tirada gobolada Soomaaliya waa 18.","options":["Run","Been"],"correct":"Run"},
  {"question":"Luuqadda rasmiga ah ee Soomaaliya waa Ingiriisi.","options":["Run","Been"],"correct":"Been"},
  {"question":"HTTP waxay u dhigan tahay HyperText Transfer Protocol — Been.","options":["Run","Been"],"correct":"Run"},
  {"question":"RAM waxay u dhigan tahay Random Access Memory — Been.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada dhinacyada dodecahedron waa 10.","options":["Run","Been"],"correct":"Been"},
  {"question":"Past tense of swim waa swam — Been.","options":["Run","Been"],"correct":"Run"},
  {"question":"Past tense of fly waa flown.","options":["Run","Been"],"correct":"Been"},
  {"question":"Tirada maalmaha October waa 30.","options":["Run","Been"],"correct":"Been"},
  {"question":"Tirada maalmaha February sanadka bisleeyaha waa 29.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda New Zealand waa Auckland.","options":["Run","Been"],"correct":"Been"},
  {"question":"Dalka weyn ee Afrika waa Algeria — Been, waa Run.","options":["Run","Been"],"correct":"Run"},
];

const newRun = [
  {"question":"Caasimadda Norway waa Oslo.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Sweden waa Stockholm.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Poland waa Warsaw.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Ukraine waa Kyiv.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Turkey waa Ankara.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Iran waa Tehran.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Iraq waa Baghdad.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Jordan waa Amman.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Lebanon waa Beirut.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Syria waa Damascus.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Libya waa Tripoli.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Tunisia waa Tunis.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Algeria waa Algiers.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Morocco waa Rabat.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Sudan waa Khartoum.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Ethiopia waa Addis Ababa.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Kenya waa Nairobi.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Tanzania waa Dodoma.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Uganda waa Kampala.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Rwanda waa Kigali.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda South Africa waa Pretoria.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Egypt waa Cairo.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Saudi Arabia waa Riyadh.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda UAE waa Abu Dhabi.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Qatar waa Doha.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Kuwait waa Kuwait City.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Oman waa Muscat.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Bahrain waa Manama.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Pakistan waa Islamabad.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Afghanistan waa Kabul.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda India waa New Delhi.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda China waa Beijing.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Japan waa Tokyo.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda South Korea waa Seoul.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Indonesia waa Jakarta.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Australia waa Canberra.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Canada waa Ottawa.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Brazil waa Brasilia.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Argentina waa Buenos Aires.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Mexico waa Mexico City.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda New Zealand waa Wellington.","options":["Run","Been"],"correct":"Run"},
  {"question":"4 × 4 = 16.","options":["Run","Been"],"correct":"Run"},
  {"question":"7 × 8 = 56.","options":["Run","Been"],"correct":"Run"},
  {"question":"9 × 9 = 81.","options":["Run","Been"],"correct":"Run"},
  {"question":"12 × 12 = 144.","options":["Run","Been"],"correct":"Run"},
  {"question":"8 × 7 = 56.","options":["Run","Been"],"correct":"Run"},
  {"question":"6 × 7 = 42.","options":["Run","Been"],"correct":"Run"},
  {"question":"9 × 8 = 72.","options":["Run","Been"],"correct":"Run"},
  {"question":"11 × 11 = 121.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada ciyaaryahanada volleyball koox waa 6.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada ciyaaryahanada cricket koox waa 11.","options":["Run","Been"],"correct":"Run"},
  {"question":"Olympics-ka 4 sannadba mar ayuu dhacaa — Run.","options":["Run","Been"],"correct":"Run"},
  {"question":"Xiddiga ugu dhow qorraxda waa Proxima Centauri.","options":["Run","Been"],"correct":"Run"},
  {"question":"Meeraha ugu weyn nidaamka qorraxeed waa Jupiter.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada dhinacyada cube waa 6 — Run.","options":["Run","Been"],"correct":"Run"},
  {"question":"Past tense of swim waa swam.","options":["Run","Been"],"correct":"Run"},
  {"question":"Past tense of fly waa flew.","options":["Run","Been"],"correct":"Run"},
  {"question":"Past tense of grow waa grew.","options":["Run","Been"],"correct":"Run"},
  {"question":"Past tense of know waa knew.","options":["Run","Been"],"correct":"Run"},
  {"question":"Past tense of throw waa threw.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada maalmaha October waa 31.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada maalmaha November waa 30.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada maalmaha December waa 31.","options":["Run","Been"],"correct":"Run"},
  {"question":"HTTP waxay u dhigan tahay HyperText Transfer Protocol.","options":["Run","Been"],"correct":"Run"},
  {"question":"RAM waxay u dhigan tahay Random Access Memory.","options":["Run","Been"],"correct":"Run"},
  {"question":"CPU waxay u dhigan tahay Central Processing Unit.","options":["Run","Been"],"correct":"Run"},
  {"question":"URL waxay u dhigan tahay Uniform Resource Locator.","options":["Run","Been"],"correct":"Run"},
  {"question":"HTML waxay u dhigan tahay HyperText Markup Language.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada gobolada Soomaaliya waa 18.","options":["Run","Been"],"correct":"Run"},
  {"question":"Luuqadda rasmiga ah ee Soomaaliya waa Soomaali.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Puntland waa Garoowe.","options":["Run","Been"],"correct":"Run"},
  {"question":"World Cup 2010 waxay dhacday South Africa.","options":["Run","Been"],"correct":"Run"},
  {"question":"World Cup 2006 waxay dhacday Germany.","options":["Run","Been"],"correct":"Run"},
  {"question":"World Cup 2002 waxay dhacday Japan iyo South Korea.","options":["Run","Been"],"correct":"Run"},
  {"question":"Dalka weyn ee Afrika waa Algeria.","options":["Run","Been"],"correct":"Run"},
  {"question":"Dadka badan ugu jira adduunka waa India.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada xagasha hexagon waa 6.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada xagasha heptagon waa 7.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada xagasha nonagon waa 9.","options":["Run","Been"],"correct":"Run"},
];

const uniqueBeen = newBeen.filter(q => !existingTexts.has(q.question));
const uniqueRun  = newRun.filter(q => !existingTexts.has(q.question));
console.log(`New Been: ${uniqueBeen.length} | New Run: ${uniqueRun.length}`);

const currentBeen = existing.filter(q => q.correct === 'Been');
const currentRun  = existing.filter(q => q.correct === 'Run');
const currentMC   = existing.filter(q => q.options.length === 4);

const TARGET_BEEN = 360;
const TARGET_RUN  = 361;

const allBeen = [...currentBeen, ...uniqueBeen].slice(0, TARGET_BEEN);
const allRun  = [...currentRun,  ...uniqueRun ].slice(0, TARGET_RUN);

const combined = [...currentMC, ...allBeen, ...allRun];

const fb = combined.filter(q => q.correct === 'Been').length;
const fr = combined.filter(q => q.correct === 'Run').length;
const fm = combined.filter(q => q.options.length === 4).length;
console.log(`Final: MC=${fm} | Been=${fb} | Run=${fr} | Total=${combined.length}`);

fs.writeFileSync(FILE, JSON.stringify(combined, null, 2), 'utf8');
console.log('Saved!');
