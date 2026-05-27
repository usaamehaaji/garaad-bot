const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'questions', 'team.json');
const all = JSON.parse(fs.readFileSync(FILE, 'utf8'));

const mc   = all.filter(q => q.options.length === 4);
const been = all.filter(q => q.correct === 'Been');
const run  = all.filter(q => q.correct === 'Run');
console.log('MC:', mc.length, '| Been:', been.length, '| Run:', run.length);

// ── Target: MC=279, Been=360, Run=361 ──
// Remove 109 Been (keep 360), add 109 Run
const TARGET_BEEN = 360;
const TARGET_RUN  = 361;

// Remove been duplicates: group by "topic keyword" and keep 1 per group
// Simple heuristic: if two Been questions share the same first 15 chars of the question, drop the second
const keptBeen = [];
const seenBeenKey = new Set();
for (const q of been) {
  const key = q.question.slice(0, 20);
  if (!seenBeenKey.has(key)) {
    seenBeenKey.add(key);
    keptBeen.push(q);
  }
}
// Trim or pad to TARGET_BEEN
const finalBeen = keptBeen.slice(0, TARGET_BEEN);
console.log('Kept Been after dedup:', keptBeen.length, '→ using:', finalBeen.length);

// New Run questions to add
const existingTexts = new Set(all.map(q => q.question));
const extraRun = [
  {"question":"5 × 5 = 25.","options":["Run","Been"],"correct":"Run"},
  {"question":"6 × 6 = 36.","options":["Run","Been"],"correct":"Run"},
  {"question":"7 × 7 = 49.","options":["Run","Been"],"correct":"Run"},
  {"question":"10 × 10 = 100.","options":["Run","Been"],"correct":"Run"},
  {"question":"4 × 6 = 24.","options":["Run","Been"],"correct":"Run"},
  {"question":"3 × 8 = 24.","options":["Run","Been"],"correct":"Run"},
  {"question":"9 × 4 = 36.","options":["Run","Been"],"correct":"Run"},
  {"question":"12 × 8 = 96.","options":["Run","Been"],"correct":"Run"},
  {"question":"11 × 9 = 99.","options":["Run","Been"],"correct":"Run"},
  {"question":"6 × 9 = 54.","options":["Run","Been"],"correct":"Run"},
  {"question":"√81 = 9.","options":["Run","Been"],"correct":"Run"},
  {"question":"√100 = 10.","options":["Run","Been"],"correct":"Run"},
  {"question":"√36 = 6.","options":["Run","Been"],"correct":"Run"},
  {"question":"√16 = 4.","options":["Run","Been"],"correct":"Run"},
  {"question":"2⁵ = 32.","options":["Run","Been"],"correct":"Run"},
  {"question":"2⁶ = 64.","options":["Run","Been"],"correct":"Run"},
  {"question":"3² = 9.","options":["Run","Been"],"correct":"Run"},
  {"question":"4² = 16.","options":["Run","Been"],"correct":"Run"},
  {"question":"5² = 25.","options":["Run","Been"],"correct":"Run"},
  {"question":"75% of 200 waa 150.","options":["Run","Been"],"correct":"Run"},
  {"question":"30% of 100 waa 30.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada dhinacyada cube waa 6.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada xagasha triangle waa 3.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada daqiiqadaha saacadda waa 60.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada maalinta Febraayo ee sanadka caadiga waa 28.","options":["Run","Been"],"correct":"Run"},
  {"question":"Past tense of see waa saw.","options":["Run","Been"],"correct":"Run"},
  {"question":"Past tense of break waa broke.","options":["Run","Been"],"correct":"Run"},
  {"question":"Past tense of buy waa bought.","options":["Run","Been"],"correct":"Run"},
  {"question":"Past tense of fall waa fell.","options":["Run","Been"],"correct":"Run"},
  {"question":"Past tense of bring waa brought.","options":["Run","Been"],"correct":"Run"},
  {"question":"Past tense of drive waa drove.","options":["Run","Been"],"correct":"Run"},
  {"question":"Past tense of fight waa fought.","options":["Run","Been"],"correct":"Run"},
  {"question":"Plural of ox waa oxen.","options":["Run","Been"],"correct":"Run"},
  {"question":"Plural of goose waa geese.","options":["Run","Been"],"correct":"Run"},
  {"question":"Plural of leaf waa leaves.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Thailand waa Bangkok.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Philippines waa Manila.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Malaysia waa Kuala Lumpur.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Vietnam waa Hanoi.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Spain waa Madrid.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Italy waa Rome.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Portugal waa Lisbon.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Netherlands waa Amsterdam.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Belgium waa Brussels.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Switzerland waa Bern.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Austria waa Vienna.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Greece waa Athens.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Czech Republic waa Prague.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Denmark waa Copenhagen.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Finland waa Helsinki.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Hungary waa Budapest.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Romania waa Bucharest.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Serbia waa Belgrade.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Croatia waa Zagreb.","options":["Run","Been"],"correct":"Run"},
  {"question":"Meeraha ugu kulul nidaamka qorraxeed waa Venus.","options":["Run","Been"],"correct":"Run"},
  {"question":"Xayawaanka ugu dhaqso badan dhulka waa Cheetah.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada ciyaaryahanada basketball koox waa 5.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada ciyaaryahanada rugby union koox waa 15.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada ilkaha weynta bini'aadamka waa 32.","options":["Run","Been"],"correct":"Run"},
  {"question":"Buurta ugu sarreysa Yurub waa Elbrus.","options":["Run","Been"],"correct":"Run"},
  {"question":"Jasiiradda ugu weyn adduunka waa Greenland.","options":["Run","Been"],"correct":"Run"},
  {"question":"Duleedka ugu kulul adduunka waa Lut Desert.","options":["Run","Been"],"correct":"Run"},
  {"question":"Duleedka ugu qabow adduunka waa Antarctica.","options":["Run","Been"],"correct":"Run"},
  {"question":"Webiga Amazon wuxuu maraa Brazil.","options":["Run","Been"],"correct":"Run"},
  {"question":"Badda ugu qoto dheer adduunka waa Pacific.","options":["Run","Been"],"correct":"Run"},
  {"question":"Danta biyo-macaanka ugu weyn adduunka waa Lake Baikal.","options":["Run","Been"],"correct":"Run"},
  {"question":"Webiga ugu dhaadheer Aasiya waa Yangtze.","options":["Run","Been"],"correct":"Run"},
  {"question":"AI waxay u dhigan tahay Artificial Intelligence.","options":["Run","Been"],"correct":"Run"},
  {"question":"Wi-Fi waxay u dhigan tahay Wireless Fidelity.","options":["Run","Been"],"correct":"Run"},
  {"question":"GPS waxay u dhigan tahay Global Positioning System.","options":["Run","Been"],"correct":"Run"},
  {"question":"PDF waxay u dhigan tahay Portable Document Format.","options":["Run","Been"],"correct":"Run"},
  {"question":"SSD waxay u dhigan tahay Solid State Drive.","options":["Run","Been"],"correct":"Run"},
  {"question":"API waxay u dhigan tahay Application Programming Interface.","options":["Run","Been"],"correct":"Run"},
  {"question":"Suuradda Al-Faatixa waxay leedahay 7 aayad.","options":["Run","Been"],"correct":"Run"},
  {"question":"Dagaalkii Badr wuxuu dhacay sanadkii 2 H.","options":["Run","Been"],"correct":"Run"},
  {"question":"Fataxul Makka wuxuu dhacay sanadkii 8 H.","options":["Run","Been"],"correct":"Run"},
  {"question":"Halqabihii ugu dambeeyay Raashidiin waa Cali.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada Suurtada Makkiyya waa 86.","options":["Run","Been"],"correct":"Run"},
  {"question":"Maqaamka ugu sarreeya Jannadda waa Jannadda Firdaws.","options":["Run","Been"],"correct":"Run"},
  {"question":"Suuradda Al-Kahf waxaa loo akhristaa Jimcaha.","options":["Run","Been"],"correct":"Run"},
  {"question":"Xajigu wuxuu ku beeganyahay bisha Dhul-Xijjah.","options":["Run","Been"],"correct":"Run"},
  {"question":"Aadan (AS) wuxuu ka sameysan yahay ciidda.","options":["Run","Been"],"correct":"Run"},
  {"question":"Nabi Muxamed (CSW) wuxuu u guuray Madiina 622.","options":["Run","Been"],"correct":"Run"},
  {"question":"Gabayga ugu heer sarreeya Soomaalida waa Maanso.","options":["Run","Been"],"correct":"Run"},
  {"question":"Dharka dhaqanka Soomaalida ee haweenka waa Guntiino.","options":["Run","Been"],"correct":"Run"},
  {"question":"Xoolaha ugu muhiimsan dhaqaalaha Soomaalida waa Geela.","options":["Run","Been"],"correct":"Run"},
  {"question":"Cayaarta dhaqanka Soomaalida ee caan baxday caalamka waa Dhaanto.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Jubbaland waa Kismaayo.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Koonfur Galbeed waa Baidoa.","options":["Run","Been"],"correct":"Run"},
  {"question":"Koonfurta iyo Waqooyi Soomaaliya waxay midoobeen 1 Luulyo 1960.","options":["Run","Been"],"correct":"Run"},
  {"question":"Webiga Juba wuxuu galaa Badda Hindiya.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Hirshabeelle waa Jowhar.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda SSC-Khaatumo waa Laascaanood.","options":["Run","Been"],"correct":"Run"},
  {"question":"Magaalada ugu weyn Somaliland waa Hargeysa.","options":["Run","Been"],"correct":"Run"},
  {"question":"World Cup 2026 waxay dhici doontaa USA/Canada/Mexico.","options":["Run","Been"],"correct":"Run"},
  {"question":"World Cup 2018 waxay dhacday Russia.","options":["Run","Been"],"correct":"Run"},
  {"question":"World Cup 2014 waxay dhacday Brazil.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tennis Australian Open waa Grand Slam-ka koowaad ee sanadka.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada ciyaaryahanada American football koox waa 11.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada ciyaaryahanada hockey (field) koox waa 11.","options":["Run","Been"],"correct":"Run"},
  {"question":"Brazil wuxuu FIFA World Cup 5 jeer ku guulaystay.","options":["Run","Been"],"correct":"Run"},
  {"question":"Olympics-ka 4 sannadba mar ayuu dhacaa.","options":["Run","Been"],"correct":"Run"},
  {"question":"World Cup 2022 ku guulaystay kooxda Argentina.","options":["Run","Been"],"correct":"Run"},
  {"question":"1 kilometer waxay la mid tahay 1000 mitir.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada xagasha pentagon waa 5.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada xagasha octagon waa 8.","options":["Run","Been"],"correct":"Run"},
  {"question":"25% of 400 waa 100.","options":["Run","Been"],"correct":"Run"},
  {"question":"10% of 500 waa 50.","options":["Run","Been"],"correct":"Run"}
];

// Filter unique
const existingTxt = new Set(all.map(q => q.question));
const uniqueRun = extraRun.filter(q => !existingTxt.has(q.question));
console.log('Unique new Run:', uniqueRun.length);

// Combine: MC + trimmed Been + existing Run + new Run
const allRun = [...run, ...uniqueRun];
const finalRun = allRun.slice(0, TARGET_RUN);
console.log('Final Run:', finalRun.length);

const combined = [...mc, ...finalBeen, ...finalRun];
console.log('Total:', combined.length);

// Stats
const b = combined.filter(q => q.correct === 'Been').length;
const r = combined.filter(q => q.correct === 'Run').length;
const m = combined.filter(q => q.options.length === 4).length;
console.log(`MC: ${m} | Been: ${b} | Run: ${r} | Total: ${combined.length}`);

fs.writeFileSync(FILE, JSON.stringify(combined, null, 2), 'utf8');
console.log('Saved!');
