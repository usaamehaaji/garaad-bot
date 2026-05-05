/**
 * Ku dar 300 su'aalo cusub solo.json (197 hore + 300 = 497)
 * 75 Run/Been + 225 MCQ — kaliya solo.json
 * node scripts/build-solo-300.js
 */
const fs = require('fs');
const path = require('path');

const soloPath = path.join(__dirname, '..', 'data', 'questions', 'solo.json');
const existing = JSON.parse(fs.readFileSync(soloPath, 'utf8'));

function tf(q, isTrue) {
    return {
        question: q,
        options: ['Run', 'Been'],
        correct: isTrue ? 'Run' : 'Been',
    };
}

function mcq(q, correct, wrong3) {
    const opts = [correct, ...wrong3];
    for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return { question: q, options: opts, correct };
}

function pickWrongCapitals(correct, pool, n = 3) {
    const rest = pool.filter((c) => c !== correct);
    const sh = [...rest].sort(() => Math.random() - 0.5);
    return sh.slice(0, n);
}

const TF_TARGET = 75;
const MCQ_TARGET = 225;

// ── 75 Run / Been (Soomaali + guud) ──
const tfList = [
    ['Qorraxdu waxay ka soo baxdaa galbeed oo ay dhacdo bari.', false],
    ['Biyaha 100°C (heerkulka badda 1 atm) ayay ku karkaraan.', true],
    ['Soomaaliya waxay leedahay xuduud badeed.', true],
    ['Afrika waa qaaradda ugu weyn adduunka.', false],
    ['Qur\'aanka wuxuu leeyahay 114 suuradood.', true],
    ['Maalmuhu 24 saacadood ayay qaataan dhulka (qiyaas ahaan).', true],
    ['Dayaxu wuxuu iftiiminayaa naftiisa sida qorraxda.', false],
    ['Oksijiinta waa gaas aadanaha neefsashada u baahan.', true],
    ['Wadnaha wuxuu ku yaalaa dhinaca midig ee laabta (caadi ahaan).', false],
    ['Kelyaha waxay ka saaraan wasakhda dhiigga.', true],
    ['Xisaabta: 12 × 12 = 144.', true],
    ['Xisaabta: 0 ÷ 5 = 5.', false],
    ['Ingiriis: jamaca "child" waa "children".', true],
    ['Caasimadda Kenya waa Nairobi.', true],
    ['Caasimadda Itoobiya waa Nairobi.', false],
    ['Muqdisho waa caasimadda dowlad-goboleedka Soomaaliya (Federaal).', true],
    ['Soomaaliya waxay xornimada ka heshay Talyaaniga sanadkii 1960.', true],
    ['Xasan Cali Khayre wuxuu xilligii 2017–2020 u ahaa R/Wasaaraha Xukuumadda Federaalka Soomaaliya.', true],
    ['Xasan Cali Khayre wuxuu xilligaas u ahaa Madaxweyne Soomaaliya.', false],
    ['Ururka Qaramada Midoobay (UN) wuxuu caawiyaa nabadda iyo horumarinta.', true],
    ['NATO waa urur ganacsi oo keliya (ma aha mid militariga ah).', false],
    ['Qorraxda waa xiddig (star) sida xiddigaha kale.', true],
    ['Dayaxu waa xiddig iskiis iftiiminaya.', false],
    ['Saddex-xagal gudihiisa wadarta xaglaha waa 180°.', true],
    ['Labajibbaar wuxuu leeyahay 6 dhinac oo isku dherer ah.', false],
    ['Webiga Niil waa mid ka mid ah webiyada ugu waaweyn Afrika.', true],
    ['Badweynta Hindiya waxay u dhaxaysaa Hindiya iyo Afrika.', false],
    ['Koonfur Afrika waxay hore u lahayd nidaam apartheid.', true],
    ['Hargeysa waa caasimadda Somaliland (ma aha caasimadda Federaalka).', true],
    ['HTTPS wuxuu isticmaalaa encryption badanaa (TLS).', true],
    ['Bluetooth wuxuu u baahan yahay internet si uu u shaqeeyo.', false],
    ['DNS wuxuu u tarjumayaa magaca domain → cinwaanka IP.', true],
    ['RAM waa xusuus ku meel gaar ah (ma aha kayd joogto oo keliya).', true],
    ['Phishing waa isku day lagu khiyaaneeyo dadka.', true],
    ['2FA wuxuu xoojiyaa amniga akoonka.', true],
    ['Password "123456" waa mid amaan ah.', false],
    ['Backup-ka xogta waa caado wanaagsan.', true],
    ['GPS wuxuu isticmaalaa dayaxyo satellite.', true],
    ['Wi‑Fi iyo internet waa isku macno.', false],
    ['JSON waa qaab xog (ma aha luqad barnaamij oo buuxa).', true],
    ['HTML waa luqad calaamadeyn (markup) webka.', true],
    ['Linux waa nidaam hawleed oo furan badanaa.', true],
    ['Malware waa barnaamij xun.', true],
    ['Firewall wuxuu caawiyaa ilaalinta shabakadda.', true],
    ['CPU waa "Central Processing Unit".', true],
    ['GPU wuxuu caawiyaa xisaabinta sawirrada iyo AI.', true],
    ['SSD inta badan waa ka dhaqso badan HDD.', true],
    ['SQL injection waa nooc weerar ah.', true],
    ['HTTPS bog kasta wuxuu ka dhigan yahay in uu sax yahay (100%).', false],
    ['Cookies waxay kaydiyaan macluumaad goobaha.', true],
    ['Incognito mode wuxuu ka dhigayaa inaad noqotid qarsoon 100%.', false],
    ['Cloud storage wuxuu kaydiyaa xog server fog.', true],
    ['Blockchain wuxuu isticmaalaa silsilad blocks.', true],
    ['Bitcoin waa nooc cryptocurrency ah.', true],
    ['AI (sirdoonka macmalka ah) wuxuu isticmaali karaa barashada mashiinka.', true],
    ['Machine learning waa qayb ka mid ah AI.', true],
    ['Overfitting waa dhibaato marka moodel uu xasuusto tabaruka.', true],
    ['Correlation macnaheedu waa isku mid causation.', false],
    ['Unicode wuxuu taageerayaa xarfaha luqado badan.', true],
    ['UTF-8 waa encoding caan ah.', true],
    ['Big O notation wuxuu qiyaasaa xawaaraha algorithm.', true],
    ['Stack waa LIFO.', true],
    ['Queue waa FIFO.', true],
    ['Recursion wuxuu u baahan yahay xaalad saldhig (base case).', true],
    ['Deadlock waa dhibaato is xannibaada thread-yada.', true],
    ['Virtual memory wuxuu isticmaalaa disk sida xusuus dheeri ah.', true],
    ['Garbage collection wuxuu xoreeyaa xusuusta aan loo baahnayn.', true],
    ['REST waa qaab API oo caan ah.', true],
    ['GraphQL waa luqad weydiimo API ah.', true],
    ['Docker wuxuu isticmaalaa containers.', true],
    ['Kubernetes wuxuu maareeyaa containers.', true],
    ['Git waa nidaam maamulka nooca (version control).', true],
    ['OAuth waa hab galitaan (login) oo caan ah.', true],
    ['JWT waa nooc token authentication ah.', true],
    ['Zero-day vulnerability waa cilad aan weli la hakin.', true],
    ['Penetration testing waa tijaabo amni.', true],
    ['GDPR waa sharciga ilaalinta xogta Yurub.', true],
    ['PII waa macluumaad shakhsi oo xasaasi ah.', true],
    ['Encryption wuxuu ka dhigayaa xogta mid adag in la akhriyo.', true],
    ['Hashing iyo encryption waa isku macno.', false],
    ['VPN wuxuu xoojin karaa qarsoodiga isku xirka.', true],
    ['DDoS wuxuu buuxiyaa server si uu u istaago.', true],
    ['Ransomware wuxuu cadaysaa faylasha ilaa lacag.', true],
    ['Antivirus wuxuu caawiyaa ogaanshaha barnaamijyada xun.', true],
    ['Email SPF/DKIM waxay caawiyaan ka hortagga spoofing.', true],
    ['Quantum computing wuxuu isticmaalaa qubits.', true],
    ['Classical bit wuxuu ahaan karaa 0 ama 1.', true],
];

if (tfList.length < TF_TARGET) {
    console.error('Cilad: TF yar:', tfList.length);
    process.exit(1);
}
const tfPick = tfList.slice(0, TF_TARGET).map(([t, ok]) => tf(t, ok));

// ── Caasimado + su'aalo gaar ah ──
const caps = [
    ['Norway', 'Oslo'], ['Sweden', 'Stockholm'], ['Denmark', 'Copenhagen'], ['Finland', 'Helsinki'],
    ['Iceland', 'Reykjavik'], ['Ireland', 'Dublin'], ['Portugal', 'Lisbon'], ['Greece', 'Athens'],
    ['Romania', 'Bucharest'], ['Hungary', 'Budapest'], ['Czechia', 'Prague'], ['Slovakia', 'Bratislava'],
    ['Croatia', 'Zagreb'], ['Serbia', 'Belgrade'], ['Slovenia', 'Ljubljana'], ['Bulgaria', 'Sofia'],
    ['Poland', 'Warsaw'], ['Ukraine', 'Kyiv'], ['Belarus', 'Minsk'], ['Moldova', 'Chișinău'],
    ['Estonia', 'Tallinn'], ['Latvia', 'Riga'], ['Lithuania', 'Vilnius'], ['Turkey', 'Ankara'],
    ['Iran', 'Tehran'], ['Iraq', 'Baghdad'], ['Syria', 'Damascus'], ['Lebanon', 'Beirut'],
    ['Jordan', 'Amman'], ['Israel', 'Jerusalem'], ['Palestine (caan)', 'Ramallah'],
    ['Saudi Arabia', 'Riyadh'], ['UAE', 'Abu Dhabi'], ['Qatar', 'Doha'], ['Kuwait', 'Kuwait City'],
    ['Bahrain', 'Manama'], ['Oman', 'Muscat'], ['Yemen (caan)', "Sana'a"], ['Pakistan', 'Islamabad'],
    ['Afghanistan', 'Kabul'], ['India', 'New Delhi'], ['Bangladesh', 'Dhaka'], ['Sri Lanka', 'Colombo'],
    ['Nepal', 'Kathmandu'], ['Bhutan', 'Thimphu'], ['Myanmar', 'Naypyidaw'], ['Thailand', 'Bangkok'],
    ['Cambodia', 'Phnom Penh'], ['Laos', 'Vientiane'], ['Vietnam', 'Hanoi'], ['Malaysia', 'Kuala Lumpur'],
    ['Singapore', 'Singapore'], ['Indonesia', 'Jakarta'], ['Philippines', 'Manila'], ['Brunei', 'Bandar Seri Begawan'],
    ['China', 'Beijing'], ['Japan', 'Tokyo'], ['South Korea', 'Seoul'], ['North Korea', 'Pyongyang'],
    ['Mongolia', 'Ulaanbaatar'], ['Taiwan (caan)', 'Taipei'], ['Australia', 'Canberra'], ['New Zealand', 'Wellington'],
    ['Canada', 'Ottawa'], ['Mexico', 'Mexico City'], ['Cuba', 'Havana'], ['Jamaica', 'Kingston'],
    ['Brazil', 'Brasília'], ['Argentina', 'Buenos Aires'], ['Chile', 'Santiago'], ['Peru', 'Lima'],
    ['Colombia', 'Bogotá'], ['Venezuela', 'Caracas'], ['Ecuador', 'Quito'], ['Bolivia', 'Sucre'],
    ['Paraguay', 'Asunción'], ['Uruguay', 'Montevideo'], ['Guyana', 'Georgetown'], ['Suriname', 'Paramaribo'],
    ['Egypt', 'Cairo'], ['Libya', 'Tripoli'], ['Tunisia', 'Tunis'], ['Algeria', 'Algiers'], ['Morocco', 'Rabat'],
    ['Sudan', 'Khartoum'], ['South Sudan', 'Juba'], ['Ethiopia', 'Addis Ababa'], ['Eritrea', 'Asmara'],
    ['Djibouti', 'Djibouti'], ['Kenya', 'Nairobi'], ['Uganda', 'Kampala'], ['Rwanda', 'Kigali'],
    ['Burundi', 'Gitega'], ['Tanzania', 'Dodoma'], ['Zambia', 'Lusaka'], ['Zimbabwe', 'Harare'],
    ['Botswana', 'Gaborone'], ['Namibia', 'Windhoek'], ['Mozambique', 'Maputo'], ['Malawi', 'Lilongwe'],
    ['Angola', 'Luanda'], ['DRC', 'Kinshasa'], ['Congo', 'Brazzaville'], ['Gabon', 'Libreville'],
    ['Cameroon', 'Yaoundé'], ['Nigeria', 'Abuja'], ['Ghana', 'Accra'], ['Ivory Coast', 'Yamoussoukro'],
    ['Senegal', 'Dakar'], ['Mali', 'Bamako'], ['Niger', 'Niamey'], ['Chad', "N'Djamena"],
    ['Somalia', 'Muqdisho'], ['Kazakhstan', 'Astana'], ['Uzbekistan', 'Tashkent'], ['Russia', 'Moscow'],
    ['Germany', 'Berlin'], ['France', 'Paris'], ['Italy', 'Rome'], ['Spain', 'Madrid'], ['UK', 'London'],
    ['Netherlands', 'Amsterdam'], ['Belgium', 'Brussels'], ['Switzerland', 'Bern'], ['Austria', 'Vienna'],
    ['Luxembourg', 'Luxembourg City'], ['Malta', 'Valletta'], ['Cyprus', 'Nicosia'], ['Albania', 'Tirana'],
    ['North Macedonia', 'Skopje'], ['Bosnia', 'Sarajevo'], ['Montenegro', 'Podgorica'], ['Georgia', 'Tbilisi'],
    ['Armenia', 'Yerevan'], ['Azerbaijan', 'Baku'], ['United States', 'Washington, D.C.'],
];

const capPool = [...new Set(caps.map((x) => x[1]))];
const mcqs = [];

mcqs.push(
    mcq(
        'Ninkii xilligii 2017–2020 u ahaa R/Wasaaraha Xukuumadda Federaalka Soomaaliya waa kee?',
        'Xasan Cali Khayre',
        ['Cabdullaahi Deni', 'Cumar Cabdirashiid Cali Sharmaarke', 'Maxamed Xuseen Rooble'],
    ),
);

for (const [country, cap] of caps) {
    mcqs.push(mcq(`Waa maxay caasimadda dalka ${country}?`, cap, pickWrongCapitals(cap, capPool)));
}

// Xisaab fudud
let m = 0;
while (mcqs.length < MCQ_TARGET) {
    m++;
    const a = 2 + (m % 11);
    const b = 3 + ((m * 7) % 12);
    const sum = a + b;
    const wrong = [...new Set([sum + 1, sum - 1, sum + 2, sum - 2, a * b])]
        .filter((x) => x !== sum && x >= 0)
        .slice(0, 3)
        .map(String);
    while (wrong.length < 3) wrong.push(String(sum + 10 + wrong.length));
    mcqs.push(mcq(`Waa maxay ${a} + ${b}?`, String(sum), wrong));
}

const additions = tfPick.concat(mcqs.slice(0, MCQ_TARGET));
if (additions.length !== 300) {
    console.error('Tirada khalad:', additions.length);
    process.exit(1);
}

const merged = existing.concat(additions);
fs.writeFileSync(soloPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
console.log('Wadarta solo.json:', merged.length, '(hore:', existing.length, '+ cusub: 300)');
