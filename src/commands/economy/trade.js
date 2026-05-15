// =====================================================================
// AMARKA: ?trade — Garaad Predict (UP / DOWN Binary Trading)
// Flow: asset → amount modal → time → direction → confirm → lock
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser }     = require('../../economy/econStore');
const { getMarketSnapshot, getPrice } = require('../../economy/market');
const { getActivePrediction, WIN_MULTI, LOSE_MULTI, ASSET_LABEL } = require('../../economy/prediction');
const { fmt } = require('../../utils/helpers');

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
        return `${ASSET_LABEL[asset]}  **$${fmt(price)}**  ${ind}\n\`${spark}\`${sig}`;
    });

    return new EmbedBuilder()
        .setTitle('📊 Garaad Predict — Suuqa Lacagta')
        .setColor('#1a1a2e')
        .setDescription(
            lines.join('\n\n') +
            `\n\n💵 USD-kaaga: **$${fmt(d.usd)}**\n\n` +
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
            `**Qiimaha hadda:** $${fmt(price)}\n\n` +
            `💵 USD-kaaga: **$${fmt(d.usd)}**\n` +
            `${ASSET_LABEL[asset]}: **${assetBal}**\n\n` +
            `**Sidee baad lacagta dhigaysaa?**`
        )
        .setFooter({ text: 'Garaad Predict' });
}

// ── Embed: Time selection ──────────────────────────────────────────

function buildTimeEmbed(asset, stakeType, stakeAmount, stakeUsd) {
    const stakeLabel = stakeType === 'usd'
        ? `💵 $${fmt(stakeAmount)} USD`
        : `${ASSET_LABEL[asset]} ${stakeAmount} (≈ $${fmt(stakeUsd)} USD)`;
    return new EmbedBuilder()
        .setTitle(`⏱️ Dooro Waqtiga — ${ASSET_LABEL[asset]}`)
        .setColor('#8e44ad')
        .setDescription(
            `**Stake:** ${stakeLabel}\n\n` +
            `Immisa daqiiqo baad sugi doontaa?\n\n` +
            `> 🔵 **1 daqiiqo** — Degdeg, khatarta badan\n` +
            `> 🟢 **3 daqiiqo** — Dhexdhexaad\n` +
            `> 🟡 **5 daqiiqo** — Xasilloon\n` +
            `> 🔴 **10 daqiiqo** — Muddo dheer, fursad weyn`
        )
        .setFooter({ text: 'Garaad Predict' });
}

// ── Embed: Direction ──────────────────────────────────────────────

function buildDirectionEmbed(asset, stakeType, stakeAmount, stakeUsd, minutes) {
    const price = getPrice(asset);
    const stakeLabel = stakeType === 'usd'
        ? `$${fmt(stakeAmount)} USD`
        : `${stakeAmount} ${asset.toUpperCase()} (≈ $${fmt(stakeUsd)})`;
    return new EmbedBuilder()
        .setTitle(`🎯 Dooro Jihada — ${ASSET_LABEL[asset]}`)
        .setColor('#e67e22')
        .setDescription(
            `**Asset:** ${ASSET_LABEL[asset]}\n` +
            `**Stake:** ${stakeLabel}\n` +
            `**Waqti:** ${minutes} daqiiqo\n` +
            `**Qiimaha hadda:** $${fmt(price)}\n\n` +
            `⬆️ **UP** — Waxaad saadaalinaysaa qiimahu kor buu u kacayaa\n` +
            `⬇️ **DOWN** — Waxaad saadaalinaysaa qiimahu hoos buu u dhacayaa`
        )
        .setFooter({ text: 'Garaad Predict' });
}

// ── Embed: Confirm ────────────────────────────────────────────────

function buildConfirmEmbed(asset, stakeType, stakeAmount, stakeUsd, minutes, direction) {
    const price     = getPrice(asset);
    const dirLabel  = direction === 'up' ? '⬆️ UP' : '⬇️ DOWN';
    const winPay    = Math.floor(stakeUsd * WIN_MULTI);
    const losePay   = Math.floor(stakeUsd * LOSE_MULTI);
    const stakeLabel = stakeType === 'usd'
        ? `$${fmt(stakeAmount)} USD`
        : `${stakeAmount} ${asset.toUpperCase()} (≈ $${fmt(stakeUsd)})`;
    return new EmbedBuilder()
        .setTitle('✅ Xidh Saadaalinta — Confirm')
        .setColor('#27ae60')
        .setDescription(
            `📌 **Asset:**     ${ASSET_LABEL[asset]}\n` +
            `📊 **Qiimaha:**   $${fmt(price)}\n` +
            `💰 **Stake:**     ${stakeLabel}\n` +
            `⏱️ **Waqti:**     ${minutes} daqiiqo\n` +
            `🎯 **Saadaal:**   ${dirLabel}\n\n` +
            `🏆 **Haddii WIN:**  +$${fmt(winPay - stakeUsd)} faa'iido → dib: **$${fmt(winPay)}**\n` +
            `💀 **Haddii LOSE:** -$${fmt(stakeUsd - losePay)} khasaaro → dib: **$${fmt(losePay)}**\n\n` +
            `⚡ Ma diyaar baad tahay?`
        )
        .setFooter({ text: 'Garaad Predict • Ka dib LOCK, waxba la beddeli karo' });
}

// ── Embed: Active prediction ──────────────────────────────────────

function buildActiveEmbed(pred) {
    const remaining = Math.max(0, pred.endTime - Date.now());
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    const dirLabel = pred.direction === 'up' ? '⬆️ UP' : '⬇️ DOWN';
    return new EmbedBuilder()
        .setTitle('⏳ Saadaalin Firfircoon — Sug!')
        .setColor('#f39c12')
        .setDescription(
            `📌 **Asset:**        ${ASSET_LABEL[pred.asset]}\n` +
            `📊 **Galitaanka:**   $${fmt(pred.entryPrice)}\n` +
            `🎯 **Saadaal:**      ${dirLabel}\n` +
            `💰 **Stake:**        $${fmt(pred.stakeUsd)} USD\n` +
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
        return `${ASSET_LABEL[asset]}  **$${fmt(price)}** — Haysataa: **${units}**`;
    });
    return new EmbedBuilder()
        .setTitle('🛒 Asset Shop — Iibso Assets')
        .setColor('#27ae60')
        .setDescription(
            lines.join('\n') +
            `\n\n💵 USD-kaaga: **$${fmt(d.usd)}**\n\n` +
            `Immisa USD baad ku iibsanaysaa?`
        )
        .setFooter({ text: 'Garaad Economy • Qiimaha suuqa ayaa la isticmaalaa' });
}

// ── Embed: Sell Assets ────────────────────────────────────────────

function buildSellEmbed(d) {
    const snap = getMarketSnapshot();
    const lines = snap.map(({ asset, price }) => {
        const units  = d[asset] || 0;
        const usdVal = Math.floor(units * price);
        return `${ASSET_LABEL[asset]}  **$${fmt(price)}** — Haysataa: **${units}** ≈ $${fmt(usdVal)} USD`;
    });
    return new EmbedBuilder()
        .setTitle('💰 Sell Assets — USD ku Badal')
        .setColor('#e67e22')
        .setDescription(
            lines.join('\n') +
            `\n\n💵 USD-kaaga: **$${fmt(d.usd)}**\n\n` +
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

// Main row: assets + controls all in one line (max 5)
function mainRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pred_a_btc_${userId}`)    .setLabel('BTC')        .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`pred_a_gold_${userId}`)   .setLabel('🥇 Gold')    .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`pred_refresh_${userId}`)  .setLabel('🔄 Refresh') .setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`trade_shop_${userId}`)    .setLabel('🛒 Buy')     .setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`trade_sell_${userId}`)    .setLabel('💰 Sell')    .setStyle(ButtonStyle.Secondary),
    );
}

function tradeCloseRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`close_trade_${userId}`).setLabel('❌ Iska xir').setStyle(ButtonStyle.Danger),
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
        new ButtonBuilder().setCustomId(`trade_buy_btc_${userId}`)    .setLabel('BTC')    .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`trade_buy_gold_${userId}`)   .setLabel('🥇 Gold')  .setStyle(ButtonStyle.Secondary),
    );
}

function shopBackRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pred_back_${userId}`).setLabel('🔙 Dib').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`close_trade_${userId}`).setLabel('❌ Iska xir').setStyle(ButtonStyle.Danger),
    );
}

function sellRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`trade_sellasset_btc_${userId}`)    .setLabel('BTC')    .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`trade_sellasset_gold_${userId}`)   .setLabel('🥇 Gold')  .setStyle(ButtonStyle.Secondary),
    );
}

function sellBackRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pred_back_${userId}`).setLabel('🔙 Dib').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`close_trade_${userId}`).setLabel('❌ Iska xir').setStyle(ButtonStyle.Danger),
    );
}

function stakeTypeRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pred_st_usd_${userId}`).setLabel('💵 Dhig USD').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`pred_st_ast_${userId}`).setLabel('🪙 Dhig Asset').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`pred_back_${userId}`).setLabel('🔙 Dib').setStyle(ButtonStyle.Secondary),
    );
}

function timeRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pred_t_1_${userId}`) .setLabel('1 min ⚡').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`pred_t_3_${userId}`) .setLabel('3 min').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`pred_t_5_${userId}`) .setLabel('5 min').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`pred_t_10_${userId}`).setLabel('10 min 🎯').setStyle(ButtonStyle.Success),
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
        new ButtonBuilder().setCustomId(`pred_d_up_${userId}`)  .setLabel('⬆️ UP — Kor').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`pred_d_down_${userId}`).setLabel('⬇️ DOWN — Hoos').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`pred_back_${userId}`)  .setLabel('🔙 Dib').setStyle(ButtonStyle.Secondary),
    );
}

function confirmRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pred_lock_${userId}`)  .setLabel('🔒 LOCK — Xidh').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`pred_cancel_${userId}`).setLabel('❌ Jooji').setStyle(ButtonStyle.Danger),
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
