import { config } from 'dotenv';
import { BotConfig, APIKeys } from '../types';
import { logger } from './logger';

config();

export const botConfig: BotConfig = {
  prefix: process.env.BOT_PREFIX || '!',
  maxQueueSize: parseInt(process.env.MAX_QUEUE_SIZE || '100'),
  defaultVolume: parseFloat(process.env.DEFAULT_VOLUME || '0.5'),
  autoLeaveTimeout: parseInt(process.env.AUTO_LEAVE_TIMEOUT || '300000'),
  logLevel: (process.env.LOG_LEVEL as BotConfig['logLevel']) || 'info'
};

export const apiKeys: APIKeys = {
  discord: {
    token: process.env.DISCORD_TOKEN!,
    clientId: process.env.DISCORD_CLIENT_ID!
  },
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY!
  },
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID!,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET!
  },
  soundcloud: process.env.SOUNDCLOUD_CLIENT_ID ? {
    clientId: process.env.SOUNDCLOUD_CLIENT_ID
  } : undefined
};

export function validateConfig(): void {
  const requiredEnvVars = [
    'DISCORD_TOKEN',
    'DISCORD_CLIENT_ID',
    'YOUTUBE_API_KEY',
    'SPOTIFY_CLIENT_ID',
    'SPOTIFY_CLIENT_SECRET'
  ];

  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  logger.info('Configuration validation successful');
}