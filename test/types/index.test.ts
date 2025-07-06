import { Song, Queue, BotConfig, APIKeys, MusicService } from '../../src/types';

describe('Type Definitions', () => {
  describe('Song interface', () => {
    it('should define a valid Song object', () => {
      const song: Song = {
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'https://test.com/song',
        duration: 180,
        thumbnail: 'https://test.com/thumb.jpg',
        requestedBy: 'user123',
        platform: 'youtube'
      };

      expect(song.title).toBe('Test Song');
      expect(song.artist).toBe('Test Artist');
      expect(song.url).toBe('https://test.com/song');
      expect(song.duration).toBe(180);
      expect(song.thumbnail).toBe('https://test.com/thumb.jpg');
      expect(song.requestedBy).toBe('user123');
      expect(song.platform).toBe('youtube');
    });

    it('should allow Song without thumbnail', () => {
      const song: Song = {
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'https://test.com/song',
        duration: 180,
        requestedBy: 'user123',
        platform: 'spotify'
      };

      expect(song.thumbnail).toBeUndefined();
      expect(song.platform).toBe('spotify');
    });

    it('should support all platform types', () => {
      const youtubeSong: Song = {
        title: 'YouTube Song',
        artist: 'Artist',
        url: 'https://youtube.com/song',
        duration: 180,
        requestedBy: 'user123',
        platform: 'youtube'
      };

      const spotifySong: Song = {
        title: 'Spotify Song',
        artist: 'Artist',
        url: 'https://spotify.com/song',
        duration: 180,
        requestedBy: 'user123',
        platform: 'spotify'
      };

      const soundcloudSong: Song = {
        title: 'SoundCloud Song',
        artist: 'Artist',
        url: 'https://soundcloud.com/song',
        duration: 180,
        requestedBy: 'user123',
        platform: 'soundcloud'
      };

      expect(youtubeSong.platform).toBe('youtube');
      expect(spotifySong.platform).toBe('spotify');
      expect(soundcloudSong.platform).toBe('soundcloud');
    });
  });

  describe('Queue interface', () => {
    it('should define a valid Queue object', () => {
      const queue: Queue = {
        songs: [],
        currentIndex: 0,
        isPlaying: false,
        isPaused: false,
        volume: 0.5
      };

      expect(queue.songs).toEqual([]);
      expect(queue.currentIndex).toBe(0);
      expect(queue.isPlaying).toBe(false);
      expect(queue.isPaused).toBe(false);
      expect(queue.volume).toBe(0.5);
    });

    it('should allow Queue with songs', () => {
      const song: Song = {
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'https://test.com/song',
        duration: 180,
        requestedBy: 'user123',
        platform: 'youtube'
      };

      const queue: Queue = {
        songs: [song],
        currentIndex: 0,
        isPlaying: true,
        isPaused: false,
        volume: 0.8
      };

      expect(queue.songs).toHaveLength(1);
      expect(queue.songs[0]).toBe(song);
      expect(queue.isPlaying).toBe(true);
      expect(queue.volume).toBe(0.8);
    });
  });

  describe('BotConfig interface', () => {
    it('should define a valid BotConfig object', () => {
      const config: BotConfig = {
        prefix: '!',
        maxQueueSize: 100,
        defaultVolume: 0.5,
        autoLeaveTimeout: 300000,
        logLevel: 'info'
      };

      expect(config.prefix).toBe('!');
      expect(config.maxQueueSize).toBe(100);
      expect(config.defaultVolume).toBe(0.5);
      expect(config.autoLeaveTimeout).toBe(300000);
      expect(config.logLevel).toBe('info');
    });

    it('should support all log levels', () => {
      const errorConfig: BotConfig = {
        prefix: '!',
        maxQueueSize: 100,
        defaultVolume: 0.5,
        autoLeaveTimeout: 300000,
        logLevel: 'error'
      };

      const warnConfig: BotConfig = {
        prefix: '!',
        maxQueueSize: 100,
        defaultVolume: 0.5,
        autoLeaveTimeout: 300000,
        logLevel: 'warn'
      };

      const debugConfig: BotConfig = {
        prefix: '!',
        maxQueueSize: 100,
        defaultVolume: 0.5,
        autoLeaveTimeout: 300000,
        logLevel: 'debug'
      };

      expect(errorConfig.logLevel).toBe('error');
      expect(warnConfig.logLevel).toBe('warn');
      expect(debugConfig.logLevel).toBe('debug');
    });
  });

  describe('APIKeys interface', () => {
    it('should define a valid APIKeys object', () => {
      const apiKeys: APIKeys = {
        discord: {
          token: 'discord-token',
          clientId: 'discord-client-id'
        },
        youtube: {
          apiKey: 'youtube-api-key'
        },
        spotify: {
          clientId: 'spotify-client-id',
          clientSecret: 'spotify-client-secret'
        }
      };

      expect(apiKeys.discord.token).toBe('discord-token');
      expect(apiKeys.discord.clientId).toBe('discord-client-id');
      expect(apiKeys.youtube.apiKey).toBe('youtube-api-key');
      expect(apiKeys.spotify.clientId).toBe('spotify-client-id');
      expect(apiKeys.spotify.clientSecret).toBe('spotify-client-secret');
      expect(apiKeys.soundcloud).toBeUndefined();
    });

    it('should allow soundcloud configuration', () => {
      const apiKeys: APIKeys = {
        discord: {
          token: 'discord-token',
          clientId: 'discord-client-id'
        },
        youtube: {
          apiKey: 'youtube-api-key'
        },
        spotify: {
          clientId: 'spotify-client-id',
          clientSecret: 'spotify-client-secret'
        },
        soundcloud: {
          clientId: 'soundcloud-client-id'
        }
      };

      expect(apiKeys.soundcloud?.clientId).toBe('soundcloud-client-id');
    });
  });

  describe('MusicService interface', () => {
    it('should define the correct interface structure', () => {
      const mockService: MusicService = {
        search: jest.fn(),
        getStreamUrl: jest.fn(),
        validateUrl: jest.fn()
      };

      expect(typeof mockService.search).toBe('function');
      expect(typeof mockService.getStreamUrl).toBe('function');
      expect(typeof mockService.validateUrl).toBe('function');
    });

    it('should have correct method signatures', async () => {
      const mockSong: Song = {
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'https://test.com/song',
        duration: 180,
        requestedBy: 'user123',
        platform: 'youtube'
      };

      const mockService: MusicService = {
        search: jest.fn().mockResolvedValue([mockSong]),
        getStreamUrl: jest.fn().mockResolvedValue('https://stream.url'),
        validateUrl: jest.fn().mockReturnValue(true)
      };

      const searchResult = await mockService.search('test query');
      const streamUrl = await mockService.getStreamUrl(mockSong);
      const isValidUrl = mockService.validateUrl('https://test.com');

      expect(searchResult).toEqual([mockSong]);
      expect(streamUrl).toBe('https://stream.url');
      expect(isValidUrl).toBe(true);
    });
  });
});