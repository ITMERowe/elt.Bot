import { Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel, NewsChannel, GuildMember } from 'discord.js';
import { Post } from '../ganknow/types';
import { config } from '../config';
import { createWelcomeBanner } from './welcomeBanner';

function shorten(s?: string, max = 300): string | null {
  if (!s) return null;
  return s.length > max ? s.slice(0, max - 3) + '...' : s;
}

/**
 * Send a polished post embed.
 * Layout requested by user:
 *  - Title: "New Post: [title]" (linked)
 *  - Large image (post.image || post.thumbnail)
 *  - Small CTA field below image with a link button
 */
export async function sendPostNotification(
  client: Client,
  channelId: string,
  post: Post,
  options: { autoPublish?: boolean } = {}
) {
  const channel = await client.channels.fetch(channelId);
  if (!channel || !(channel instanceof TextChannel || channel instanceof NewsChannel)) {
    throw new Error('Configured channel not found or not a text or announcement channel');
  }

  const title = post.title || 'New Ganknow Post';

  const embed = new EmbedBuilder()
    .setTitle(`New Post: ${title}`)
    .setURL(post.url)
    .setColor(0x1f385b);

  // show the post image full-width when available
  const imageUrl = post.image || post.thumbnail;
  if (imageUrl) embed.setImage(imageUrl);

  // fields: CTA (locked badge removed until detection is reliable)
  const fields: { name: string; value: string; inline?: boolean }[] = [];

  fields.push({ name: '\u200b', value: shorten(config.discordPostCta) || '' });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel('View Post').setStyle(ButtonStyle.Link).setURL(post.url)
  );

  const message = await channel.send({ embeds: [embed.setFields(fields)], components: [row] });

  if (options.autoPublish !== false && channel instanceof NewsChannel) {
    try {
      await message.crosspost();
      console.info('[INFO] Published announcement message', message.id);
    } catch (err) {
      console.warn('[WARN] Message sent but automatic publishing failed:', err instanceof Error ? err.message : err);
    }
  }
}

export async function sendWelcomeNotification(client: Client, channelId: string, member: GuildMember): Promise<void> {
  const channel = await client.channels.fetch(channelId);
  if (!channel || !(channel instanceof TextChannel || channel instanceof NewsChannel)) {
    throw new Error('Configured channel not found or not a text or announcement channel');
  }

  const banner = await createWelcomeBanner(member);
  const message = await channel.send({ files: [{ attachment: banner, name: 'welcome.png' }] });
  if (channel instanceof NewsChannel) {
    try {
      await message.crosspost();
    } catch (err) {
      console.warn('[WARN] Welcome sent but automatic publishing failed:', err instanceof Error ? err.message : err);
    }
  }
}

export async function sendForbiddenChannelWarning(client: Client, channelId: string): Promise<void> {
  if (!channelId) return;

  const channel = await client.channels.fetch(channelId);
  if (!channel || !(channel instanceof TextChannel || channel instanceof NewsChannel)) {
    throw new Error('Forbidden channel not found or not a text or announcement channel');
  }

  const message = await channel.send(
    '⚠️ **Warning:** This channel is not for chatting. Please do not post messages here. Messages in this channel may result in an automatic ban.'
  );

  if (channel instanceof NewsChannel) {
    try {
      await message.crosspost();
    } catch (err) {
      console.warn('[WARN] Warning sent but automatic publishing failed:', err instanceof Error ? err.message : err);
    }
  }
}
