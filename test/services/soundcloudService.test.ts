import { SoundCloudService } from '../../src/services/soundcloudService';
import { Song } from '../../src/types';

// Mock dependencies
jest.mock('../../src/utils/config', () => ({
  apiKeys: {
    soundcloud: {
      clientId: 'test-client-id'
    }
  }
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../../src/services/serviceFactory', () => ({
  ServiceFactory: {
    createSong: jest.fn((data) => data)
  }
}));

// Mock fetch
global.fetch = jest.fn();

describe('SoundCloudService', () => {
  let soundcloudService: SoundCloudService;
  
  // Get the logger mock reference
  const mockLogger = require('../../src/utils/logger').logger;

  const mockTrack = {
    title: 'Test Track',
    user: { username: 'Test User' },
    permalink_url: 'https://soundcloud.com/test-user/test-track',
    duration: 180000,
    artwork_url: 'https://test.com/artwork.jpg'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    soundcloudService = new SoundCloudService();
  });

  describe('constructor', () => {
    it('should initialize with client ID from config', () => {
      expect(soundcloudService).toBeInstanceOf(SoundCloudService);
    });

    it('should handle missing soundcloud config (line 13)', () => {
      // Mock config without soundcloud key
      jest.doMock('../../src/utils/config', () => ({
        apiKeys: {} // No soundcloud config
      }));

      // Reset modules to use new mock
      jest.resetModules();
      const { SoundCloudService: TestSoundCloudService } = require('../../src/services/soundcloudService');
      
      const testService = new TestSoundCloudService();
      expect(testService.isConfigured()).toBe(false);
    });
  });

  describe('search', () => {
    it('should search and return songs', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve([mockTrack])
      });

      const songs = await soundcloudService.search('test query');

      expect(songs).toHaveLength(1);
      expect(songs[0].title).toBe('Test Track');
      expect(songs[0].artist).toBe('Test User');
      expect(songs[0].platform).toBe('soundcloud');
      expect(songs[0].duration).toBe(180);
    });

    it('should return empty array when client ID not configured', async () => {
      // Mock config to return null client ID
      jest.doMock('../../src/utils/config', () => ({
        apiKeys: {
          soundcloud: null // No soundcloud config
        }
      }));

      // Reset modules and reimport
      jest.resetModules();
      const { SoundCloudService: UnconfiguredSoundCloudService } = require('../../src/services/soundcloudService');
      const { logger } = require('../../src/utils/logger');
      
      const unconfiguredService = new UnconfiguredSoundCloudService();
      const songs = await unconfiguredService.search('test query');

      expect(songs).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalledWith('SoundCloud client ID not configured, skipping search');
    });

    it('should handle empty search results', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve([])
      });

      const songs = await soundcloudService.search('test query');

      expect(songs).toHaveLength(0);
    });

    it('should handle search errors', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const songs = await soundcloudService.search('test query');

      expect(songs).toHaveLength(0);
    });
  });

  describe('getStreamUrl', () => {
    const mockSong: Song = {
      title: 'Test Song',
      artist: 'Test Artist',
      url: 'https://soundcloud.com/test-user/test-track',
      duration: 180,
      requestedBy: 'user',
      platform: 'soundcloud'
    };

    it('should return stream URL for valid song', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true
      });

      const streamUrl = await soundcloudService.getStreamUrl(mockSong);

      expect(streamUrl).toBe('https://api.soundcloud.com/tracks/test-track/stream?client_id=test-client-id');
    });

    it('should throw error for invalid URL', async () => {
      const invalidSong = { ...mockSong, url: 'invalid-url' };

      await expect(soundcloudService.getStreamUrl(invalidSong)).rejects.toThrow('Invalid SoundCloud URL');
    });

    it('should throw error when stream request fails', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false
      });

      await expect(soundcloudService.getStreamUrl(mockSong)).rejects.toThrow('Failed to get stream URL');
    });

    it('should throw error when client ID not configured', async () => {
      // Create service with no client ID
      const unconfiguredService = new (class extends SoundCloudService {
        constructor() {
          super();
          (this as any).clientId = null;
        }
      })();

      await expect(unconfiguredService.getStreamUrl(mockSong)).rejects.toThrow('SoundCloud client ID not configured');
    });
  });

  describe('validateUrl', () => {
    it('should validate SoundCloud URLs correctly', () => {
      expect(soundcloudService.validateUrl('https://soundcloud.com/user/track')).toBe(true);
      expect(soundcloudService.validateUrl('https://www.soundcloud.com/user/track')).toBe(true);
      expect(soundcloudService.validateUrl('http://soundcloud.com/user/track')).toBe(true);
      
      expect(soundcloudService.validateUrl('https://youtube.com/watch?v=123')).toBe(false);
      expect(soundcloudService.validateUrl('invalid-url')).toBe(false);
    });
  });

  describe('getSongFromUrl', () => {
    it('should get song from valid URL', async () => {
      const url = 'https://soundcloud.com/test-user/test-track';
      
      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({
          ...mockTrack,
          kind: 'track'
        })
      });

      const song = await soundcloudService.getSongFromUrl(url, 'testuser');

      expect(song).not.toBeNull();
      expect(song!.title).toBe('Test Track');
      expect(song!.artist).toBe('Test User');
      expect(song!.requestedBy).toBe('testuser');
      expect(song!.platform).toBe('soundcloud');
    });

    it('should return null for invalid URL', async () => {
      const song = await soundcloudService.getSongFromUrl('invalid-url', 'testuser');
      expect(song).toBeNull();
    });

    it('should return null for non-track response', async () => {
      const url = 'https://soundcloud.com/test-user/test-track';
      
      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({
          kind: 'playlist'
        })
      });

      const song = await soundcloudService.getSongFromUrl(url, 'testuser');

      expect(song).toBeNull();
    });

    it('should return null when fetch fails', async () => {
      const url = 'https://soundcloud.com/test-user/test-track';
      
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const song = await soundcloudService.getSongFromUrl(url, 'testuser');

      expect(song).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error getting song from SoundCloud URL ${url}:`,
        expect.any(Error)
      );
    });

    it('should return null when client ID not configured', async () => {
      // Create service with no client ID
      const unconfiguredService = new (class extends SoundCloudService {
        constructor() {
          super();
          (this as any).clientId = null;
        }
      })();

      const song = await unconfiguredService.getSongFromUrl('https://soundcloud.com/test-user/test-track', 'testuser');

      expect(song).toBeNull();
    });

    it('should handle tracks with missing user data (line 97)', async () => {
      const url = 'https://soundcloud.com/test-user/test-track';
      
      // Mock track with missing user.username
      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({
          title: 'Test Track',
          user: null, // Missing user data
          permalink_url: url,
          duration: 180000,
          artwork_url: 'https://test.com/artwork.jpg',
          kind: 'track'
        })
      });

      const song = await soundcloudService.getSongFromUrl(url, 'testuser');

      expect(song).not.toBeNull();
      expect(song!.artist).toBe('Unknown Artist');
    });
  });

  describe('isConfigured', () => {
    it('should return true when client ID is configured', () => {
      expect(soundcloudService.isConfigured()).toBe(true);
    });

    it('should return false when client ID is not configured', () => {
      // Create service with no client ID
      const unconfiguredService = new (class extends SoundCloudService {
        constructor() {
          super();
          (this as any).clientId = null;
        }
      })();

      expect(unconfiguredService.isConfigured()).toBe(false);
    });
  });
});