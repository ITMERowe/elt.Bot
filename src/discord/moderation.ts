import { Guild, Message } from 'discord.js';
import { config } from '../config';

const activeBans = new Set<string>();

async function deleteMemberMessagesFromGuild(
  guild: Guild,
  authorId: string,
  authorTag: string,
  maxAgeMs?: number
): Promise<number> {
  const channels = await guild.channels.fetch();
  let deleted = 0;
  const cutoff = maxAgeMs === undefined ? undefined : Date.now() - maxAgeMs;

  for (const channel of channels.values()) {
    if (!channel || !channel.isTextBased() || !('messages' in channel)) continue;

    try {
      let before: string | undefined;
      while (true) {
        const batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
        if (batch.size === 0) break;

        for (const candidate of batch.values()) {
          if (candidate.author.id !== authorId) continue;
          if (cutoff !== undefined && candidate.createdTimestamp < cutoff) continue;
          try {
            await candidate.delete();
            deleted++;
          } catch (err) {
            console.warn('[WARN] Failed to delete a message from', authorTag, 'in channel', channel.id, err instanceof Error ? err.message : err);
          }
        }

        const oldest = batch.last();
        if (!oldest || batch.size < 100) break;
        before = oldest.id;
      }
    } catch (err) {
      console.warn('[WARN] Could not scan channel', channel.id, 'for', authorTag, err instanceof Error ? err.message : err);
    }
  }

  return deleted;
}

export async function handleForbiddenChannelMessage(message: Message): Promise<void> {
  if (!config.forbiddenChannelIds.includes(message.channelId) || message.author.bot) return;

  if (!message.guild || !message.member) {
    console.warn('[WARN] Cannot ban forbidden-channel author without a guild member record:', message.author.tag);
    return;
  }

  const banKey = `${message.guildId}:${message.author.id}`;
  if (activeBans.has(banKey)) return;
  activeBans.add(banKey);

  try {
    const isMentionEscalation = message.mentions.everyone || message.mentions.users.size > 0;
    if (isMentionEscalation) {
      const deleted = await deleteMemberMessagesFromGuild(message.guild, message.author.id, message.author.tag);
      console.info('[INFO] Deleted', deleted, 'messages from', message.author.tag, 'across accessible server channels');

      await message.member.ban({
        deleteMessageSeconds: 604_800,
        reason: 'Mentioned everyone or a user in a forbidden channel'
      });
      console.info('[INFO] Banned', message.author.tag, 'for a forbidden-channel mention', message.channelId);
    } else {
      const deleted = await deleteMemberMessagesFromGuild(message.guild, message.author.id, message.author.tag, 60 * 60 * 1000);
      await message.member.timeout(60 * 60 * 1000, 'Chatted in a forbidden channel');
      console.info('[INFO] Deleted', deleted, 'recent messages and timed out', message.author.tag, 'for one hour');
    }
  } catch (err) {
    console.error('[ERROR] Failed to ban forbidden-channel author:', err instanceof Error ? err.message : err);
  } finally {
    activeBans.delete(banKey);
  }
}