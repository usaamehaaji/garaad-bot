# 🧠 Garaad Bot — Discord Quiz Bot

Bot ciyaar aqoon ah oo Af-Soomaali ah Discord. Isticmaalaha wuxuu ku tartami karaa IQ, ciyaari duel, shaqaynin rush mode, iyo quiz koox.

---

## 📁 Structure-ka Faylasha

```
garaad-bot/
├── index.js                  ← Halka bot-ku ka bilaabmo
├── package.json              ← Dependencies
├── .env                      ← Token-kaaga (ha la wadaajin!)
├── .env.example              ← Tusaale .env
│
├── data/
│   ├── questions.json        ← Su'aalaha quiz-ka
│   └── users.json            ← Xogta isticmaalayaasha (si toos ah u abuurma)
│
└── src/
    ├── config.js             ← Habaynta guud (prefix, waqti, abaalmar)
    ├── store.js              ← Xogta wadaagta (userData, active maps)
    │
    ├── utils/
    │   ├── helpers.js        ← Shaqooyinka yaryar (checkUser, getLevel, etc.)
    │   ├── questions.js      ← Maareynta su'aalaha
    │   └── hostQuota.js      ← Xadduuda host-ka maalinlaha ah
    │
    ├── commands/             ← Amarka kasta fayl gaar ah
    │   ├── help.js           ← ?caawin / ?help
    │   ├── profile.js        ← ?profile
    │   ├── statistics.js     ← ?statistics
    │   ├── top.js            ← ?top
    │   ├── today.js          ← ?today
    │   ├── shop.js           ← ?shop
    │   ├── buy.js            ← ?buy
    │   ├── solo.js           ← ?solo
    │   ├── duel.js           ← ?duel
    │   ├── bet.js            ← ?bet
    │   ├── rush.js           ← ?rush
    │   └── quiz.js           ← ?quiz
    │
    ├── games/                ← Ciyaarta logic-keeda
    │   ├── solo.js           ← Ciyaarta solo iyo jawaabta
    │   ├── duel.js           ← Ciyaarta duel
    │   ├── rush.js           ← Rush mode
    │   └── quiz.js           ← Quiz koox (lobby + ciyaar)
    │
    └── handlers/
        ├── messageHandler.js      ← Waxay maareeysaa dhammaan ?amarrada
        └── interactionHandler.js  ← Waxay maareeysaa dhammaan butonada
```

---

## ⚙️ Sida Loo Rakibo (VS Code)

### 1. Node.js rakib
Soo degsado: https://nodejs.org (version 18 ama ka sareeya)

### 2. Faylasha VS Code ku fur
```bash
# Terminal VS Code ku fur (Ctrl + `)
cd garaad-bot
npm install
```

### 3. Discord Developer Portal
1. Tag: https://discord.com/developers/applications
2. **New Application** → Magac ku bixi
3. **Bot** → **Add Bot**
4. **TOKEN** → **Reset Token** → Koobiye
5. **Privileged Gateway Intents** → Fur:
   - `SERVER MEMBERS INTENT`
   - `MESSAGE CONTENT INTENT`

### 4. .env Faylka samee
```bash
cp .env.example .env
```
`.env` faylka fur oo TOKEN-kaaga ku reeb:
```
TOKEN=MTk4NjIy...xaad_token_ah
```

### 5. Bot-ka server-gaaga ku dar
Discord Developer Portal → **OAuth2** → **URL Generator**:
- Scopes: `bot`
- Bot Permissions: `Send Messages`, `Read Messages/View Channels`, `Read Message History`

URL-ka koobiye oo browser-ka ku fur.

### 6. Bilow
```bash
npm start
```

Bot-ku wuxuu soo muujinayaa:
```
╔══════════════════════════════════════╗
║  ✅  Garaad Bot — SHAQAYNAYA         ║
║  🤖  GaraadBot#1234                  ║
╚══════════════════════════════════════╝
```

---

## 🎮 Amarrada

| Amarka | Sharraxaad |
|--------|------------|
| `?solo` | Ciyaar tartan aqooneed (13 su'aalood) |
| `?duel @user` | Dagaal fool-ka-fool (5 su'aalood) |
| `?rush` | Degdeg mode — 14 ilbiriqsi mid kasta |
| `?quiz [6-25]` | Quiz koox — 6–25 qof |
| `?bet [xaddi]` | Khamaar IQ ah |
| `?shop` | Eeg dukaanka |
| `?buy [shay]` | Iibso shay |
| `?trade` | Ganacsi Forex/Crypto oo dhexgal leh |
| `?profile` | Fiiri profile-kaaga |
| `?statistics` | Tirakoobkaaga oo buuxa |
| `?top` | 10-ka ugu sare |
| `?today` | Dhibco bilaash ah (24 saacadood mar) |
| `?caawin` | Caawinaad |
| `?cilada [farriin]` | Soo sheeg cilad — toos ahaan loo soo dirayo admin-ka DM |
| `?admin help` | Liiska sub-command-yada admin-ka (dm, add/remove, list, bugs, reset) |

### 👑 Admin Commands (kaliya admin-yada)

| Sub-amarka | Sharraxaad |
|------------|------------|
| `?admin dm @user [farriin]` | Fariin si toos ah ugu dir user gaar ah |
| `?admin add @user` | Admin cusub ku dar liiska |
| `?admin remove @user` | Admin ka saar liiska |
| `?admin list` | Liiska admin-yada |
| `?admin bugs` | Eeg cilada-yada la soo sheegay |
| `?admin reset @user` | Xog user dib u deji |

Admin user IDs waxay ku jiraan `data/admin.json`. Wax ka bedel halkaas si aad u darto admin cusub.

### 🔔 24h DM Reminder
Bot-ku wuxuu si toos ah ugu soo dirayaa user kasta DM xusuusin ah haddii uusan ciyaarin in ka badan **24 saacadood**.


---

## 🛠️ Wax ka bedel (Habaynta)

Dhammaan habaynta waxay ku jirtaa `src/config.js`:

```js
PREFIX: "?",           // Bedel haddaad rabto (tusaale: "!")
QUIZ_MIN_PLAYERS: 6,   // Tirada ugu yar ee quiz koox
HOST_DAILY_LIMIT: 5,   // Jeer host noqon kartaa maalintiiba
LEVEL_STEP: 200,       // IQ loo baahan yahay Level-ka kor u qaadista
```

---

## ➕ Su'aalo Cusub Ku Dar

`data/questions.json` faylka ku dar:
```json
{
  "question": "Su'aaladaada halkan ku qor?",
  "options": ["Jawaab 1", "Jawaab 2", "Jawaab 3", "Jawaab 4"],
  "correct": "Jawaab 1"
}
```

---

*Garaad Bot v2.0 — Structure cusub, shaqo isla ah* 🧠
