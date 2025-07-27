import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export interface Song {
  title: string;
  artist: string;
  url: string;
  duration: number;
  thumbnail?: string;
  requestedBy: string;
  platform: 'youtube' | 'spotify' | 'soundcloud';
}

export interface Queue {
  songs: Song[];
  currentIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  volume: number;
}

export interface BotConfig {
  maxQueueSize: number;
  defaultVolume: number;
  autoLeaveTimeout: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

export interface APIKeys {
  discord: {
    token: string;
    clientId: string;
  };
  youtube: {
    apiKey: string;
  };
  spotify: {
    clientId: string;
    clientSecret: string;
  };
  soundcloud?: {
    clientId: string;
  };
}

export interface MusicService {
  search(query: string): Promise<Song[]>;
  getStreamUrl(song: Song): Promise<string>;
  validateUrl(url: string): boolean;
  getSongFromUrl?(url: string, requestedBy: string): Promise<Song | null>;
}

export interface BaseCommand {
  data: SlashCommandBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}