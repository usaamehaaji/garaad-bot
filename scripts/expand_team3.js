const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'questions', 'team.json');
const existing = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const existingTexts = new Set(existing.map(q => q.question));
console.log('Current:', existing.length);

const newQ = [
  // ── MC: Diinta Islaamka dheeraad ──
  {"question":"Suuradda Al-Kahf waxaa loo akhristaa?","options":["Isniinta","Talaadada","Arbacada","Jimcaha"],"correct":"Jimcaha"},
  {"question":"Tirada aayada suuradda Al-Faatixa waa?","options":["5","6","7","8"],"correct":"7"},
  {"question":"Nabi Ibraahim (AS) wuxuu dhistay Kacbada kuma?","options":["Xagga Madiina","Makkadda Mukarrama","Kudus","Shaam"],"correct":"Makkadda Mukarrama"},
  {"question":"Xajigu wuxuu ku beeganyahay bisha?","options":["Ramadaan","Shawwaal","Dhul-Qacda","Dhul-Xijjah"],"correct":"Dhul-Xijjah"},
  {"question":"Aadan (AS) wuxuu ka sameysan yahay?","options":["Dhuxusha","Biyaha","Doogga","Ciidda"],"correct":"Ciidda"},
  {"question":"Xiddigta ugu dhow qorraxda (solar system) waa?","options":["Sirius","Vega","Alpha Centauri","Proxima Centauri"],"correct":"Proxima Centauri"},
  {"question":"Suuradda Al-Baqarah waa suurad? ","options":["Makkiyya","Madaniyya","Labadaba","Midna ma aha"],"correct":"Madaniyya"},
  {"question":"Tirada Suurtada Makkiyya ee Qur'aanka waa?","options":["66","86","92","96"],"correct":"86"},
  {"question":"Maqaamka ugu sarreeya ee Jannadda waa?","options":["Jannadda Cadn","Jannadda Firdaws","Jannadda Naciim","Jannadda Khuld"],"correct":"Jannadda Firdaws"},
  {"question":"Ismiil oo ka mid ah asmaa'ul-xusna macnahiisu waa?","options":["Ogaanshaha","Daawashada","Maqalka","Gacanka"],"correct":"Daawashada"},
  // ── MC: Taariikhda Islaamka ──
  {"question":"Dagaalkii Badr wuxuu dhacay sanadkii Hijriga?","options":["1 H","2 H","3 H","4 H"],"correct":"2 H"},
  {"question":"Fataxul Makka wuxuu dhacay sanadkii Hijriga?","options":["6 H","7 H","8 H","9 H"],"correct":"8 H"},
  {"question":"Halqabihii ugu dambeeyay (4aad) Raashidiin waa?","options":["Cumar","Cali","Cismaan","Muaawiya"],"correct":"Cali"},
  {"question":"Sida uu tahay Imaam Bukhaari wuxuu dhalay sanadkii Milaadig?","options":["184","194","204","214"],"correct":"194"},
  {"question":"Nabi Muxamed (CSW) wuxuu u guuray Madiina sanadkii?","options":["610","615","620","622"],"correct":"622"},
  // ── MC: Juqraafiyad dheeraad ──
  {"question":"Badda ugu qaarkiis (qoto dheer) adduunka waa?","options":["Atlantic","Arctic","Indian","Pacific"],"correct":"Pacific"},
  {"question":"Buurta ugu sarreysa Yurub waa?","options":["Mont Blanc","Matterhorn","Elbrus","Ben Nevis"],"correct":"Elbrus"},
  {"question":"Webiga ugu dhaadheer Aasiya waa?","options":["Ganges","Mekong","Yangtze","Yellow River"],"correct":"Yangtze"},
  {"question":"Dalka adduunka ugu fog xeebta (landlocked) waa?","options":["Switzerland","Kazakhstan","Mongolia","Liechtenstein"],"correct":"Kazakhstan"},
  {"question":"Jasiiradda ugu weyn adduunka waa?","options":["Borneo","Madagascar","New Guinea","Greenland"],"correct":"Greenland"},
  {"question":"Badda ugu cusub adduunka waa?","options":["Red Sea","Caspian Sea","Baltic Sea","Arabian Sea"],"correct":"Baltic Sea"},
  {"question":"Wabiga Amazon wuxuu maraa?","options":["Kolombiya","Venezuela","Ecuador","Brazil"],"correct":"Brazil"},
  {"question":"Duleedka ugu kulul adduunka (hottest place) waa?","options":["Sahara","Death Valley","Lut Desert","Atacama"],"correct":"Lut Desert"},
  {"question":"Duleedka ugu qabow adduunka waa?","options":["Alaska","Greenland","Siberia","Antarctica"],"correct":"Antarctica"},
  {"question":"Danta adduunka ee biyo-macaanka ugu weyn waa?","options":["Amazon","Congo","Nile","Lake Baikal"],"correct":"Lake Baikal"},
  // ── MC: Dhaqanka Soomaalida ──
  {"question":"Gabayga ugu heer sarreeya Soomaalida waxaa loo yaqaan?","options":["Geeraar","Jiifto","Buraanbur","Maanso"],"correct":"Maanso"},
  {"question":"Dharka dhaqanka Soomaalida ee haweenka waa?","options":["Gambar","Diraa","Guntiino","Dhaadheer"],"correct":"Guntiino"},
  {"question":"Cayaarta dhaqanka Soomaalida ee ugu caan baxday caalamka waa?","options":["Qulqul","Buraanbur","Dhaanto","Biyasheeg"],"correct":"Dhaanto"},
  {"question":"Hiddaha Soomaalida ee aad loola xidha carruurnimada waa?","options":["Subagsasho","Magacaynta","Guursiga","Wiilasha"],"correct":"Magacaynta"},
  {"question":"Xoolaha ugu muhiimsan dhaqaalaha Soomaalida dhaqanka ahaan waa?","options":["Lo'da","Adiga","Geela","Idaha"],"correct":"Geela"},
  // ── BEEN dheeraad ──
  {"question":"Suuradda Al-Faatixa waxay leedahay 6 aayad.","options":["Run","Been"],"correct":"Been"},
  {"question":"Dagaalkii Badr wuxuu dhacay sanadkii 3 H.","options":["Run","Been"],"correct":"Been"},
  {"question":"Fataxul Makka wuxuu dhacay sanadkii 7 H.","options":["Run","Been"],"correct":"Been"},
  {"question":"Halqabihii ugu dambeeyay Raashidiin waa Cismaan.","options":["Run","Been"],"correct":"Been"},
  {"question":"Buurta ugu sarreysa Yurub waa Mont Blanc.","options":["Run","Been"],"correct":"Been"},
  {"question":"Jasiiradda ugu weyn adduunka waa Borneo.","options":["Run","Been"],"correct":"Been"},
  {"question":"Duleedka ugu kulul adduunka waa Sahara.","options":["Run","Been"],"correct":"Been"},
  {"question":"Duleedka ugu qabow adduunka waa Siberia.","options":["Run","Been"],"correct":"Been"},
  {"question":"Webiga Amazon wuxuu maraa Venezuela.","options":["Run","Been"],"correct":"Been"},
  {"question":"Badda ugu qaarkiis adduunka waa Atlantic.","options":["Run","Been"],"correct":"Been"},
  {"question":"Buurta ugu sarreysa Yurub waa Matterhorn.","options":["Run","Been"],"correct":"Been"},
  {"question":"Danta adduunka ee biyo-macaanka ugu weyn waa Amazon.","options":["Run","Been"],"correct":"Been"},
  {"question":"Dharka dhaqanka Soomaalida ee haweenka waa Diraa.","options":["Run","Been"],"correct":"Been"},
  {"question":"Xoolaha ugu muhiimsan dhaqaalaha Soomaalida waa Lo'da.","options":["Run","Been"],"correct":"Been"},
  {"question":"Gabayga ugu heer sarreeya Soomaalida waa Buraanbur.","options":["Run","Been"],"correct":"Been"},
  {"question":"Cayaarta dhaqanka Soomaalida ee caan baxday waa Buraanbur.","options":["Run","Been"],"correct":"Been"},
  {"question":"Nabi Muxamed (CSW) wuxuu u guuray Madiina 610.","options":["Run","Been"],"correct":"Been"},
  {"question":"Aadan (AS) wuxuu ka sameysan yahay biyaha.","options":["Run","Been"],"correct":"Been"},
  {"question":"Tirada Suurtada Makkiyya waa 66.","options":["Run","Been"],"correct":"Been"},
  {"question":"Maqaamka ugu sarreeya Jannadda waa Jannadda Cadn.","options":["Run","Been"],"correct":"Been"},
  {"question":"Jasiiradda Greenland waxay ka mid tahay Yurub.","options":["Run","Been"],"correct":"Been"},
  {"question":"Dalka Kazakhstan waa ugu fog xeebta (smallest landlocked).","options":["Run","Been"],"correct":"Been"},
  {"question":"Webiga Yangtze waxuu maraa Hindiya.","options":["Run","Been"],"correct":"Been"},
  {"question":"Caasimadda Serbia waa Zagreb.","options":["Run","Been"],"correct":"Been"},
  {"question":"Caasimadda Croatia waa Belgrade.","options":["Run","Been"],"correct":"Been"},
  {"question":"Caasimadda Hungary waa Cluj-Napoca.","options":["Run","Been"],"correct":"Been"},
  {"question":"Caasimadda Romania waa Bucharest — Been, waa Run.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada aayada suuradda Al-Faatixa waa 6.","options":["Run","Been"],"correct":"Been"},
  {"question":"Suuradda Al-Kahf waxaa loo akhristaa Isniinta.","options":["Run","Been"],"correct":"Been"},
  {"question":"Xajigu wuxuu ku beeganyahay bisha Ramadaan.","options":["Run","Been"],"correct":"Been"},
  // ── RUN dheeraad ──
  {"question":"Suuradda Al-Faatixa waxay leedahay 7 aayad.","options":["Run","Been"],"correct":"Run"},
  {"question":"Dagaalkii Badr wuxuu dhacay sanadkii 2 H.","options":["Run","Been"],"correct":"Run"},
  {"question":"Fataxul Makka wuxuu dhacay sanadkii 8 H.","options":["Run","Been"],"correct":"Run"},
  {"question":"Halqabihii ugu dambeeyay Raashidiin waa Cali.","options":["Run","Been"],"correct":"Run"},
  {"question":"Buurta ugu sarreysa Yurub waa Elbrus.","options":["Run","Been"],"correct":"Run"},
  {"question":"Jasiiradda ugu weyn adduunka waa Greenland.","options":["Run","Been"],"correct":"Run"},
  {"question":"Duleedka ugu kulul adduunka waa Lut Desert.","options":["Run","Been"],"correct":"Run"},
  {"question":"Duleedka ugu qabow adduunka waa Antarctica.","options":["Run","Been"],"correct":"Run"},
  {"question":"Webiga Amazon wuxuu maraa Brazil.","options":["Run","Been"],"correct":"Run"},
  {"question":"Badda ugu qaarkiis adduunka waa Pacific.","options":["Run","Been"],"correct":"Run"},
  {"question":"Danta adduunka ee biyo-macaanka ugu weyn waa Lake Baikal.","options":["Run","Been"],"correct":"Run"},
  {"question":"Dharka dhaqanka Soomaalida ee haweenka waa Guntiino.","options":["Run","Been"],"correct":"Run"},
  {"question":"Xoolaha ugu muhiimsan dhaqaalaha Soomaalida waa Geela.","options":["Run","Been"],"correct":"Run"},
  {"question":"Gabayga ugu heer sarreeya Soomaalida waa Maanso.","options":["Run","Been"],"correct":"Run"},
  {"question":"Cayaarta dhaqanka Soomaalida ee caan baxday caalamka waa Dhaanto.","options":["Run","Been"],"correct":"Run"},
  {"question":"Nabi Muxamed (CSW) wuxuu u guuray Madiina 622.","options":["Run","Been"],"correct":"Run"},
  {"question":"Aadan (AS) wuxuu ka sameysan yahay ciidda.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada Suurtada Makkiyya waa 86.","options":["Run","Been"],"correct":"Run"},
  {"question":"Maqaamka ugu sarreeya Jannadda waa Jannadda Firdaws.","options":["Run","Been"],"correct":"Run"},
  {"question":"Webiga ugu dhaadheer Aasiya waa Yangtze.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Serbia waa Belgrade.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Croatia waa Zagreb.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Hungary waa Budapest.","options":["Run","Been"],"correct":"Run"},
  {"question":"Caasimadda Romania waa Bucharest.","options":["Run","Been"],"correct":"Run"},
  {"question":"Suuradda Al-Kahf waxaa loo akhristaa Jimcaha.","options":["Run","Been"],"correct":"Run"},
  {"question":"Xajigu wuxuu ku beeganyahay bisha Dhul-Xijjah.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada daqiiqadaha saacadda waa 60.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada sanadaha qarni waa 100.","options":["Run","Been"],"correct":"Run"},
  {"question":"25% of 400 waa 100.","options":["Run","Been"],"correct":"Run"},
  {"question":"10% of 500 waa 50.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada xagasha pentagon waa 5.","options":["Run","Been"],"correct":"Run"},
  {"question":"Tirada xagasha octagon waa 8.","options":["Run","Been"],"correct":"Run"}
];

const unique = newQ.filter(q => !existingTexts.has(q.question));
console.log('New unique:', unique.length);
const combined = [...existing, ...unique];
console.log('Total:', combined.length);
fs.writeFileSync(FILE, JSON.stringify(combined, null, 2), 'utf8');
console.log('Done!');
