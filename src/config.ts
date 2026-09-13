import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  discordToken: process.env.DISCORD_TOKEN || '',
  discordClientId: process.env.DISCORD_CLIENT_ID || '',
  discordAppId: process.env.DISCORD_APP_ID || '',
  discordPublicKey: process.env.DISCORD_PUBLIC_KEY || '',
  discordChannelId: process.env.DISCORD_CHANNEL_ID || '',
  welcomeChannelId: process.env.WELCOME_CHANNEL_ID || process.env.DISCORD_CHANNEL_ID || '',
  welcomeBackgroundPath: process.env.WELCOME_BACKGROUND_PATH || 'public/welcome-background.png',
  welcomeForegroundPath: process.env.WELCOME_FOREGROUND_PATH || '',
  welcomeFontFamily: process.env.WELCOME_FONT_FAMILY || 'Trebuchet MS',
  welcomeFontPath: process.env.WELCOME_FONT_PATH || '',
  welcomeTitleFontPath: process.env.WELCOME_TITLE_FONT_PATH || '',
  welcomeTitleFontFamily: process.env.WELCOME_TITLE_FONT_FAMILY || 'WelcomeTitle',
  ganknowCreatorUrl: process.env.GANKNOW_CREATOR_URL || 'https://ganknow.com/karamelt',
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || '3600000')
};

export function validateConfig(): void {
  if (!config.discordToken) throw new Error('DISCORD_TOKEN is required');
  if (!config.discordChannelId) throw new Error('DISCORD_CHANNEL_ID is required');
}
