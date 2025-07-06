describe('Config - Fresh Import Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;
  
  beforeEach(() => {
    originalEnv = { ...process.env };
    // Clear module cache
    jest.resetModules();
  });
  
  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    jest.resetModules();
  });

  describe('soundcloud configuration', () => {
    it('should include soundcloud config when SOUNDCLOUD_CLIENT_ID is set', () => {
      process.env.DISCORD_TOKEN = 'test_token';
      process.env.DISCORD_CLIENT_ID = 'test_client_id';
      process.env.YOUTUBE_API_KEY = 'test_youtube_key';
      process.env.SPOTIFY_CLIENT_ID = 'test_spotify_id';
      process.env.SPOTIFY_CLIENT_SECRET = 'test_spotify_secret';
      process.env.SOUNDCLOUD_CLIENT_ID = 'test_soundcloud_id';
      
      const { apiKeys } = require('../../src/utils/config');
      
      expect(apiKeys.soundcloud).toBeDefined();
      expect(apiKeys.soundcloud.clientId).toBe('test_soundcloud_id');
    });

    it('should exclude soundcloud config when SOUNDCLOUD_CLIENT_ID is not set', () => {
      process.env.DISCORD_TOKEN = 'test_token';
      process.env.DISCORD_CLIENT_ID = 'test_client_id';
      process.env.YOUTUBE_API_KEY = 'test_youtube_key';
      process.env.SPOTIFY_CLIENT_ID = 'test_spotify_id';
      process.env.SPOTIFY_CLIENT_SECRET = 'test_spotify_secret';
      process.env.SOUNDCLOUD_CLIENT_ID = '';  // Set to empty string instead of delete
      
      const { apiKeys } = require('../../src/utils/config');
      
      expect(apiKeys.soundcloud).toBeUndefined();
    });
  });

  describe('validateConfig', () => {
    it('should not throw when all required env vars are present', () => {
      process.env.DISCORD_TOKEN = 'test_token';
      process.env.DISCORD_CLIENT_ID = 'test_client_id';
      process.env.YOUTUBE_API_KEY = 'test_youtube_key';
      process.env.SPOTIFY_CLIENT_ID = 'test_spotify_id';
      process.env.SPOTIFY_CLIENT_SECRET = 'test_spotify_secret';
      
      const { validateConfig } = require('../../src/utils/config');
      
      expect(() => validateConfig()).not.toThrow();
    });

    it('should throw when required env vars are missing', () => {
      process.env.DISCORD_TOKEN = '';  // Set to empty string
      process.env.DISCORD_CLIENT_ID = '';  // Set to empty string
      process.env.YOUTUBE_API_KEY = 'test_youtube_key';
      process.env.SPOTIFY_CLIENT_ID = 'test_spotify_id';
      process.env.SPOTIFY_CLIENT_SECRET = 'test_spotify_secret';
      
      const { validateConfig } = require('../../src/utils/config');
      
      expect(() => validateConfig()).toThrow('Missing required environment variables: DISCORD_TOKEN, DISCORD_CLIENT_ID');
    });

    it('should throw when only one required env var is missing', () => {
      process.env.DISCORD_TOKEN = '';  // Set to empty string
      process.env.DISCORD_CLIENT_ID = 'test_client_id';
      process.env.YOUTUBE_API_KEY = 'test_youtube_key';
      process.env.SPOTIFY_CLIENT_ID = 'test_spotify_id';
      process.env.SPOTIFY_CLIENT_SECRET = 'test_spotify_secret';
      
      const { validateConfig } = require('../../src/utils/config');
      
      expect(() => validateConfig()).toThrow('Missing required environment variables: DISCORD_TOKEN');
    });
  });

  describe('botConfig with all branches', () => {
    it('should use environment values when set', () => {
      process.env.BOT_PREFIX = '!custom';
      process.env.MAX_QUEUE_SIZE = '200';
      process.env.DEFAULT_VOLUME = '0.7';
      process.env.AUTO_LEAVE_TIMEOUT = '600000';
      process.env.LOG_LEVEL = 'debug';
      
      const { botConfig } = require('../../src/utils/config');
      
      expect(botConfig.prefix).toBe('!custom');
      expect(botConfig.maxQueueSize).toBe(200);
      expect(botConfig.defaultVolume).toBe(0.7);
      expect(botConfig.autoLeaveTimeout).toBe(600000);
      expect(botConfig.logLevel).toBe('debug');
    });

    it('should use default values when env vars not set', () => {
      // Don't set any config env vars
      delete process.env.BOT_PREFIX;
      delete process.env.MAX_QUEUE_SIZE;
      delete process.env.DEFAULT_VOLUME;
      delete process.env.AUTO_LEAVE_TIMEOUT;
      delete process.env.LOG_LEVEL;
      
      const { botConfig } = require('../../src/utils/config');
      
      expect(botConfig.prefix).toBe('!');
      expect(botConfig.maxQueueSize).toBe(100);
      expect(botConfig.defaultVolume).toBe(0.5);
      expect(botConfig.autoLeaveTimeout).toBe(300000);
      expect(botConfig.logLevel).toBe('info');
    });

    it('should use default values when env vars are empty strings', () => {
      process.env.BOT_PREFIX = '';
      process.env.MAX_QUEUE_SIZE = '';
      process.env.DEFAULT_VOLUME = '';
      process.env.AUTO_LEAVE_TIMEOUT = '';
      process.env.LOG_LEVEL = '';
      
      const { botConfig } = require('../../src/utils/config');
      
      expect(botConfig.prefix).toBe('!');
      expect(botConfig.maxQueueSize).toBe(100);
      expect(botConfig.defaultVolume).toBe(0.5);
      expect(botConfig.autoLeaveTimeout).toBe(300000);
      expect(botConfig.logLevel).toBe('info');
    });
  });
});