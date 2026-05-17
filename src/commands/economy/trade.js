// =====================================================================
// AMARKA: ?trade — Garaad Predict (UP / DOWN Binary Trading)
// Flow: asset → amount modal → time → direction → confirm → lock
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser }     = require('../../economy/econStore');
const { getMarketSnapshot, getPrice } = require('../../economy/market');
const { getActivePrediction, WIN_MULTI, LOSE_MULTI, ASSET_LABEL } = require('../../economy/prediction');
const pfmt = n => Math.round(n).toLocaleString();

const ASSETS = ['btc', 'gold'];

// ── Embed: Market overview ─────────────────────────────────────────

function buildMarketEmbed(d) {
    const snap = getMarketSnapshot();

    const lines = snap.map(({ asset, price, change, spark }) => {
        const ind = change > 0 ? `🟢 +${change.toFixed(1)}%`
                  : change < 0 ? `🔴 ${change.toFixed(1)}%`
                  : '⬜ 0.0%';
        const sig = change > 2   ? ' 📈 *Kor u jeedaa*'
                  : change < -2  ? ' ⚠️ *Hoos u dhacayaa*'
                  : '';
        return `${ASSET_LABEL[asset]}  **${pfmt(price)} BTC**  ${ind}\n\`${spark}\`${sig}`;
    });

    return new EmbedBuilder()
        .setTitle('📊 Garaad Predict — Suuqa Lacagta')
        .setColor('#1a1a2e')
        .setDescription(
            lines.join('\n\n') +
            `\n\n₿ BTC: **${pfmt(d.btc || 0)}** | 🥇 Gold: **${pfmt(d.gold || 0)}**\n\n` +
            `**⬇️ Asset dooro si aad u saadaaliso:**`
        )
        .setFooter({ text: 'Garaad Predict • Dooro asset → dhig → UP / DOWN → sug natiijahaaga' });
}

// ── Embed: Stake type (kept for backward compat) ──────────────────

function buildStakeTypeEmbed(asset, d) {
    const price = getPrice(asset);
    const assetBal = d[asset] || 0;
    return new EmbedBuilder()
        .setTitle(`📊 Saadaalinta ${ASSET_LABEL[asset]}`)
        .setColor('#2980b9')
        .setDescription(
            `**Qiimaha hadda:** ${pfmt(price)} BTC\n\n` +
            `${ASSET_LABEL[asset]}: **${assetBal}**\n\n` +
            `**Sidee baad lacagta dhigaysaa?**`
        )
        .setFooter({ text: 'Garaad Predict' });
}

// ── Embed: Time selection ──────────────────────────────────────────

function buildTimeEmbed(asset, stakeType, stakeAmount, stakeUsd) {
    const stakeLabel = `${ASSET_LABEL[asset]} ${stakeAmount} (≈ ${pfmt(stakeUsd)} BTC)`;
    return new EmbedBuilder()
        .setTitle(`⏱️ Dooro Waqtiga — ${ASSET_LABEL[asset]}`)
        .setColor('#8e44ad')
        .setDescription(
            `**Stake:** ${stakeLabel}\n\n` +
            `Immisa daqiiqo baad sugi doontaa?\n\n` +
            `> 🟡 **5 daqiiqo** — Xasilloon\n` +
            `> 🔴 **10 daqiiqo** — Muddo dheer, fursad weyn\n` +
            `> 🟣 **15 daqiiqo** — Dheerna, khatartu yartahay\n` +
            `> ⭐ **30 daqiiqo** — Dheer, fursad ugu weyn`
        )
        .setFooter({ text: 'Garaad Predict • Ugu yaraan 5 daqiiqo' });
}

// ── Embed: Direction ──────────────────────────────────────────────

function buildDirectionEmbed(asset, stakeType, stakeAmount, stakeUsd, minutes) {
    const price = getPrice(asset);
    const stakeLabel = `${stakeAmount} ${asset.toUpperCase()} (≈ ${pfmt(stakeUsd)} BTC)`;
    return new EmbedBuilder()
        .setTitle(`🎯 Dooro Jihada — ${ASSET_LABEL[asset]}`)
        .setColor('#e67e22')
        .setDescription(
            `**Asset:** ${ASSET_LABEL[asset]}\n` +
            `**Stake:** ${stakeLabel}\n` +
            `**Waqti:** ${minutes} daqiiqo\n` +
            `**Qiimaha hadda:** ${pfmt(price)} BTC\n\n` +
            `⬆️ **KOR U KAC** — Waxaad saadaalinaysaa qiimahu kor buu u kacayaa\n` +
            `⬇️ **HOOS U DHAC** — Waxaad saadaalinaysaa qiimahu hoos buu u dhacayaa`
        )
        .setFooter({ text: 'Garaad Predict' });
}

// ── Embed: Confirm ────────────────────────────────────────────────

function buildConfirmEmbed(asset, stakeType, stakeAmount, stakeUsd, minutes, direction) {
    const price     = getPrice(asset);
    const dirLabel  = direction === 'up' ? '⬆️ KOR U KAC' : '⬇️ HOOS U DHAC';
    const winPay    = Math.floor(stakeUsd * WIN_MULTI);
    const losePay   = Math.floor(stakeUsd * LOSE_MULTI);
    const stakeLabel = `${stakeAmount} ${asset.toUpperCase()} (≈ ${pfmt(stakeUsd)} BTC)`;
    return new EmbedBuilder()
        .setTitle('📌 Saadaasha La Xidhay — Xaqiijin')
        .setColor('#27ae60')
        .setDescription(
            `🥇 **Asset:** ${ASSET_LABEL[asset]}\n` +
            `📊 **Qiimaha:** ${pfmt(price)} BTC\n` +
            `💰 **Khatarta (Stake):** ${stakeLabel}\n` +
            `⏱️ **Muddada:** ${minutes} daqiiqo\n` +
            `🎯 **Saadaal:** ${dirLabel}\n\n` +
            `🏆 **Haddii aad guulaysato:** +${pfmt(winPay - stakeUsd)} BTC faa'iido → wadarta: **${pfmt(winPay)} BTC**\n` +
            `💀 **Haddii aad guuldarreysato:** -${pfmt(stakeUsd - losePay)} BTC khasaaro → hadhaaga: **${pfmt(losePay)} BTC**\n\n` +
            `⚡ **Saadaasha waa la xidhay (LOCKED)**`
        )
        .setFooter({ text: 'Garaad Predict • Marka la xiro lama beddeli karo' });
}

// ── Embed: Active prediction ──────────────────────────────────────

function buildActiveEmbed(pred) {
    const remaining = Math.max(0, pred.endTime - Date.now());
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    const dirLabel = pred.direction === 'up' ? '⬆️ KOR U KAC' : '⬇️ HOOS U DHAC';
    return new EmbedBuilder()
        .setTitle('⏳ Saadaalin Firfircoon — Sug!')
        .setColor('#f39c12')
        .setDescription(
            `📌 **Asset:**        ${ASSET_LABEL[pred.asset]}\n` +
            `📊 **Galitaanka:**   ${pfmt(pred.entryPrice)} BTC\n` +
            `🎯 **Saadaal:**      ${dirLabel}\n` +
            `💰 **Stake:**        ${pfmt(pred.stakeUsd)} BTC\n` +
            `⏱️ **Inta kale:**    **${mins}m ${secs}s**\n\n` +
            `🔔 Waqtigii dhammaado, DM + channel fariin ayaad helaysaa!`
        )
        .setFooter({ text: 'Garaad Predict • Waxba la beddeli karo marka la xidhay' });
}

// ── Embed: Asset Shop ─────────────────────────────────────────────

function buildShopEmbed(d) {
    const snap = getMarketSnapshot();
    const lines = snap.map(({ asset, price }) => {
        const units = d[asset] || 0;
        return `${ASSET_LABEL[asset]}  **${pfmt(price)} BTC** — Haysataa: **${units}**`;
    });
    return new EmbedBuilder()
        .setTitle('🛒 Asset Shop — Iibso Assets')
        .setColor('#27ae60')
        .setDescription(
            lines.join('\n') +
            `\n\n₿ BTC: **${pfmt(d.btc || 0)}** | 🥇 Gold: **${pfmt(d.gold || 0)}**\n\n` +
            `Immisa baad iibsanaysaa?`
        )
        .setFooter({ text: 'Garaad Economy • Qiimaha suuqa ayaa la isticmaalaa' });
}

// ── Embed: Sell Assets ────────────────────────────────────────────

function buildSellEmbed(d) {
    const snap = getMarketSnapshot();
    const lines = snap.map(({ asset, price }) => {
        const units  = d[asset] || 0;
        return `${ASSET_LABEL[asset]}  **${pfmt(price)} BTC** — Haysataa: **${units}**`;
    });
    return new EmbedBuilder()
        .setTitle('💰 Sell Assets')
        .setColor('#e67e22')
        .setDescription(
            lines.join('\n') +
            `\n\n₿ BTC: **${pfmt(d.btc || 0)}** | 🥇 Gold: **${pfmt(d.gold || 0)}**\n\n` +
            `Asset dooro si aad u iibsato qiimaha suuqa.`
        )
        .setFooter({ text: 'Garaad Economy • Qiimaha suuqa ayaa la isticmaalaa' });
}

// ── Rows ──────────────────────────────────────────────────────────

function assetRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pred_a_btc_${userId}`)    .setLabel('BTC')    .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`pred_a_gold_${userId}`)   .setLabel('🥇 Gold')  .setStyle(ButtonStyle.Secondary),
    );
}

function usdAssetRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pred_ua_btc_${userId}`)    .setLabel('BTC')    .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`pred_ua_gold_${userId}`)   .setLabel('🥇 Gold')  .setStyle(ButtonStyle.Secondary),
    );
}

// Row 1: assets + refresh
function mainRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pred_a_btc_${userId}`)   .setLabel('BTC')        .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`pred_a_gold_${userId}`)  .setLabel('🥇 Gold')    .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`pred_refresh_${userId}`) .setLabel('🔄 Refresh') .setStyle(ButtonStyle.Primary),
    );
}

// Row 2: buy + sell + close
function tradeCloseRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`trade_shop_${userId}`)   .setLabel('🛒 Buy')     .setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`trade_sell_${userId}`)   .setLabel('💰 Sell')    .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`close_trade_${userId}`)  .setLabel('❌ Iska xir').setStyle(ButtonStyle.Danger),
    );
}

function controlRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pred_refresh_${userId}`).setLabel('🔄 Refresh') .setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`trade_shop_${userId}`)  .setLabel('🛒 Buy')     .setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`trade_sell_${userId}`)  .setLabel('💰 Sell')    .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`close_trade_${userId}`) .setLabel('❌ Iska xir').setStyle(ButtonStyle.Danger),
    );
}

function shopRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`trade_buy_btc_${userId}`)  .setLabel('BTC')        .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`trade_buy_gold_${userId}`) .setLabel('🥇 Gold')    .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`pred_back_${userId}`)      .setLabel('🔙 Dib')     .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`close_trade_${userId}`)    .setLabel('❌ Iska xir').setStyle(ButtonStyle.Danger),
    );
}

function shopBackRow(userId) { return shopRow(userId); }

function sellRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`trade_sellasset_btc_${userId}`)  .setLabel('BTC')        .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`trade_sellasset_gold_${userId}`) .setLabel('🥇 Gold')    .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`pred_back_${userId}`)            .setLabel('🔙 Dib')     .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`close_trade_${userId}`)          .setLabel('❌ Iska xir').setStyle(ButtonStyle.Danger),
    );
}

function sellBackRow(userId) { return sellRow(userId); }

function stakeTypeRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pred_st_usd_${userId}`).setLabel('₿ Dhig BTC').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`pred_st_ast_${userId}`).setLabel('🪙 Dhig Asset').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`pred_back_${userId}`).setLabel('🔙 Dib').setStyle(ButtonStyle.Secondary),
    );
}

function timeRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pred_t_5_${userId}`) .setLabel('5 min').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`pred_t_10_${userId}`).setLabel('10 min 🎯').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`pred_t_15_${userId}`).setLabel('15 min').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`pred_t_30_${userId}`).setLabel('30 min ⭐').setStyle(ButtonStyle.Danger),
    );
}

function backRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pred_back_${userId}`).setLabel('🔙 Dib').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`close_trade_${userId}`).setLabel('❌ Jooji').setStyle(ButtonStyle.Danger),
    );
}

function directionRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pred_d_up_${userId}`)  .setLabel('⬆️ KOR U KAC').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`pred_d_down_${userId}`).setLabel('⬇️ HOOS U DHAC').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`pred_back_${userId}`)  .setLabel('🔙 Dib').setStyle(ButtonStyle.Secondary),
    );
}

function confirmRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pred_lock_${userId}`)  .setLabel('🔒 LOCK — Xidh').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`pred_cancel_${userId}`).setLabel('❌ Jooji').setStyle(ButtonStyle.Danger),
    );
}

// ── Disclaimer embed ──────────────────────────────────────────────

function buildDisclaimerEmbed() {
    return new EmbedBuilder()
        .setTitle('⚠️ Garaad Predict — Ogolaanshaha Khatarta')
        .setColor('#e67e22')
        .setDescription(
            `**Saadaalinta kasta waxay leedahay faa'iido iyo khataro.**\n\n` +
            `Kahor intaadan xidhin saadaalin kasta, **natiijada dhamaan** — faa'iido든 qasaaro든 — waa in adigu shakhsi ahaan aqbasho.\n\n` +
            `**Mas'uuliyadda fulinta, maamulka, iyo go'aanka ugu dambeeya** waxay rasmiga ahaan kugu xidhan tahay adiga.\n\n` +
            `📌 _Saadaalinta waxaa lagu maamulay si xirfadaysan, istiraatijiyad leh, iyo xisaab ku saleysan khatarta si loo xoojiyo xasilloonida iyo fursadda._\n\n` +
            `Ma aqbasaysaa xaaladdan?`
        )
        .setFooter({ text: 'Garaad Predict • Aqbal si aad u sii wadato' });
}

function disclaimerRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`trade_accept_${userId}`).setLabel('✅ Aqbal — Gal Suuqa').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`close_trade_${userId}`) .setLabel('❌ Jooji')             .setStyle(ButtonStyle.Danger),
    );
}

// ── Command entry ─────────────────────────────────────────────────

module.exports = async function tradeCmd(message) {
    const userId = message.author.id;
    checkEconUser(userId);
    const d = econData[userId];

    const active = getActivePrediction(userId);
    if (active) {
        return message.reply({
            embeds:     [buildActiveEmbed(active)],
            components: [controlRow(userId)],
        });
    }

    return message.reply({
        embeds:     [buildMarketEmbed(d)],
        components: [mainRow(userId), tradeCloseRow(userId)],
    });
};

// ── Named exports for interactionHandler ─────────────────────────

module.exports.buildDisclaimerEmbed = buildDisclaimerEmbed;
module.exports.disclaimerRow        = disclaimerRow;
module.exports.ASSETS              = ASSETS;
module.exports.ASSET_LABEL         = ASSET_LABEL;
module.exports.buildMarketEmbed    = buildMarketEmbed;
module.exports.buildStakeTypeEmbed = buildStakeTypeEmbed;
module.exports.buildTimeEmbed      = buildTimeEmbed;
module.exports.buildDirectionEmbed = buildDirectionEmbed;
module.exports.buildConfirmEmbed   = buildConfirmEmbed;
module.exports.buildActiveEmbed    = buildActiveEmbed;
module.exports.buildShopEmbed      = buildShopEmbed;
module.exports.buildSellEmbed      = buildSellEmbed;
module.exports.assetRow            = assetRow;
module.exports.usdAssetRow         = usdAssetRow;
module.exports.mainRow             = mainRow;
module.exports.tradeCloseRow       = tradeCloseRow;
module.exports.sellRow             = sellRow;
module.exports.sellBackRow         = sellBackRow;
module.exports.controlRow          = controlRow;
module.exports.shopRow             = shopRow;
module.exports.shopBackRow         = shopBackRow;
module.exports.stakeTypeRow        = stakeTypeRow;
module.exports.timeRow             = timeRow;
module.exports.backRow             = backRow;
module.exports.directionRow        = directionRow;
module.exports.confirmRow          = confirmRow;
