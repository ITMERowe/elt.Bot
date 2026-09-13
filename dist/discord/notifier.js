"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPostNotification = sendPostNotification;
exports.sendWelcomeNotification = sendWelcomeNotification;
exports.sendForbiddenChannelWarning = sendForbiddenChannelWarning;
const discord_js_1 = require("discord.js");
const config_1 = require("../config");
const welcomeBanner_1 = require("./welcomeBanner");
function shorten(s, max = 300) {
    if (!s)
        return null;
    return s.length > max ? s.slice(0, max - 3) + '...' : s;
}
/**
 * Send a polished post embed.
 * Layout requested by user:
 *  - Title: "New Post: [title]" (linked)
 *  - Large image (post.image || post.thumbnail)
 *  - Small CTA field below image with a link button
 */
async function sendPostNotification(client, channelId, post, options = {}) {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !(channel instanceof discord_js_1.TextChannel || channel instanceof discord_js_1.NewsChannel)) {
        throw new Error('Configured channel not found or not a text or announcement channel');
    }
    const title = post.title || 'New Ganknow Post';
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(`New Post: ${title}`)
        .setURL(post.url)
        .setColor(0x1f385b);
    // show the post image full-width when available
    const imageUrl = post.image || post.thumbnail;
    if (imageUrl)
        embed.setImage(imageUrl);
    // fields: CTA (locked badge removed until detection is reliable)
    const fields = [];
    fields.push({ name: '\u200b', value: shorten(config_1.config.discordPostCta) || '' });
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setLabel('View Post').setStyle(discord_js_1.ButtonStyle.Link).setURL(post.url));
    const message = await channel.send({ embeds: [embed.setFields(fields)], components: [row] });
    if (options.autoPublish !== false && channel instanceof discord_js_1.NewsChannel) {
        try {
            await message.crosspost();
            console.info('[INFO] Published announcement message', message.id);
        }
        catch (err) {
            console.warn('[WARN] Message sent but automatic publishing failed:', err instanceof Error ? err.message : err);
        }
    }
}
async function sendWelcomeNotification(client, channelId, member) {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !(channel instanceof discord_js_1.TextChannel || channel instanceof discord_js_1.NewsChannel)) {
        throw new Error('Configured channel not found or not a text or announcement channel');
    }
    const banner = await (0, welcomeBanner_1.createWelcomeBanner)(member);
    const message = await channel.send({ files: [{ attachment: banner, name: 'welcome.png' }] });
    if (channel instanceof discord_js_1.NewsChannel) {
        try {
            await message.crosspost();
        }
        catch (err) {
            console.warn('[WARN] Welcome sent but automatic publishing failed:', err instanceof Error ? err.message : err);
        }
    }
}
async function sendForbiddenChannelWarning(client, channelId) {
    if (!channelId)
        return;
    const channel = await client.channels.fetch(channelId);
    if (!channel || !(channel instanceof discord_js_1.TextChannel || channel instanceof discord_js_1.NewsChannel)) {
        throw new Error('Forbidden channel not found or not a text or announcement channel');
    }
    const message = await channel.send('⚠️ **Warning:** This channel is not for chatting. Please do not post messages here. Messages in this channel may result in an automatic ban.');
    if (channel instanceof discord_js_1.NewsChannel) {
        try {
            await message.crosspost();
        }
        catch (err) {
            console.warn('[WARN] Warning sent but automatic publishing failed:', err instanceof Error ? err.message : err);
        }
    }
}
