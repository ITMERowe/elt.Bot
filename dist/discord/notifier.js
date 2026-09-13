"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPostNotification = sendPostNotification;
const discord_js_1 = require("discord.js");
const config_1 = require("../config");
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
    function formatWatermark(d) {
        const date = d ? new Date(d) : new Date();
        const opts = { year: '2-digit', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
        return `luv karamel`;
    }
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
    const cta = (config_1.config.ganknowCreatorUrl && config_1.config.ganknowCreatorUrl.toLowerCase().includes('karamelt'))
        ? 'View on Ganknow and support me ❤️'
        : 'View on Ganknow';
    fields.push({ name: '\u200b', value: shorten(cta) || '' });
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
