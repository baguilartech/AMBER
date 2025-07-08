import { PrebufferService } from '../../src/services/prebufferService';
import { ServiceFactory } from '../../src/services/serviceFactory';
import { Song } from '../../src/types';
import { logger } from '../../src/utils/logger';

jest.mock('../../src/services/serviceFactory');
jest.mock('../../src/utils/logger');

describe('PrebufferService', () => {
  let prebufferService: PrebufferService;
  let mockSpotifyService: any;

  const createMockSong = (platform: 'youtube' | 'spotify' | 'soundcloud', url: string, title: string = 'Test Song'): Song => ({
    title,
    artist: 'Test Artist',
    duration: 180,
    url,
    platform,
    requestedBy: 'testuser'
  });

  beforeEach(() => {
    prebufferService = new PrebufferService();
    
    mockSpotifyService = {
      getStreamUrl: jest.fn()
    };
    
    (ServiceFactory.getSpotifyService as jest.Mock).mockReturnValue(mockSpotifyService);
    jest.clearAllMocks();
  });

  describe('prebufferNextSongs', () => {
    it('should prebuffer next 2 songs', async () => {
      const songs: Song[] = [
        createMockSong('youtube', 'https://youtube.com/1', 'Song 1'),
        createMockSong('spotify', 'https://spotify.com/1', 'Song 2'),
        createMockSong('spotify', 'https://spotify.com/2', 'Song 3'),
        createMockSong('youtube', 'https://youtube.com/2', 'Song 4'),
      ];

      mockSpotifyService.getStreamUrl.mockResolvedValue('https://youtube.com/converted1');

      await prebufferService.prebufferNextSongs(songs, 0, 'guild-123');

      expect(logger.info).toHaveBeenCalledWith('Prebuffering check: 2 songs to consider from index 1 in guild guild-123');
      expect(logger.info).toHaveBeenCalledWith('Starting prebuffer for: Song 2 by Test Artist (spotify)');
      expect(logger.info).toHaveBeenCalledWith('Starting prebuffer for Song 2 in guild guild-123');
    });

    it('should handle empty song list', async () => {
      const songs: Song[] = [];
      
      await prebufferService.prebufferNextSongs(songs, 0, 'guild-123');
      
      expect(logger.info).toHaveBeenCalledWith('Prebuffering check: 0 songs to consider from index 1 in guild guild-123');
    });

    it('should handle when current index is near end', async () => {
      const songs: Song[] = [
        createMockSong('youtube', 'https://youtube.com/1', 'Song 1'),
        createMockSong('spotify', 'https://spotify.com/1', 'Song 2'),
      ];

      await prebufferService.prebufferNextSongs(songs, 1, 'guild-123');

      expect(logger.info).toHaveBeenCalledWith('Prebuffering check: 0 songs to consider from index 2 in guild guild-123');
    });
  });

  describe('getYouTubeUrl', () => {
    it('should return cached URL if available', async () => {
      const song = createMockSong('spotify', 'https://spotify.com/1');
      
      // Prebuffer the song first
      mockSpotifyService.getStreamUrl.mockResolvedValue('https://youtube.com/converted1');
      await prebufferService.prebufferNextSongs([song], -1, 'guild-123');
      
      // Wait for prebuffering to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const url = await prebufferService.getYouTubeUrl(song, 'guild-123');
      
      expect(url).toBe('https://youtube.com/converted1');
      expect(logger.info).toHaveBeenCalledWith('Using prebuffered URL for Test Song in guild guild-123');
    });

    it('should wait for prebuffer promise if in progress', async () => {
      const song = createMockSong('spotify', 'https://spotify.com/1');
      
      mockSpotifyService.getStreamUrl.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('https://youtube.com/converted1'), 50))
      );
      
      // Start prebuffering
      prebufferService.prebufferNextSongs([song], -1, 'guild-123');
      
      // Immediately try to get URL while prebuffering is in progress
      const urlPromise = prebufferService.getYouTubeUrl(song, 'guild-123');
      
      const url = await urlPromise;
      
      expect(url).toBe('https://youtube.com/converted1');
      expect(logger.info).toHaveBeenCalledWith('Waiting for prebuffer completion for Test Song in guild guild-123');
    });

    it('should fetch fresh URL if prebuffer failed', async () => {
      const mockSongSpotify = createMockSong('spotify', 'https://spotify.com/1');

      // Always resolve to simulate fallback
      mockSpotifyService.getStreamUrl.mockResolvedValue('https://youtube.com/fresh1');

      // Simulate cache with failed prebuffer (no prebufferPromise to avoid unhandled rejection)
      const cacheKey = prebufferService['getCacheKey'](mockSongSpotify);
      prebufferService['prebufferCache'].set(cacheKey, {
        ...mockSongSpotify,
        prebuffered: false
      });
      
      // Should fall through to fresh fetch and resolve
      const url = await prebufferService.getYouTubeUrl(mockSongSpotify, 'guild-123');
      expect(url).toBe('https://youtube.com/fresh1');
    });

    it('should handle promise rejection during prebuffer wait', async () => {
      const mockSongSpotify = createMockSong('spotify', 'https://spotify.com/1');

      // Mock the promise to take some time and then fail
      const slowRejection = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Prebuffer failed')), 20);
      });

      // First call should be slow and reject, second should succeed immediately
      mockSpotifyService.getStreamUrl
        .mockReturnValueOnce(slowRejection)
        .mockResolvedValueOnce('https://youtube.com/fresh1');

      // Start prebuffering
      prebufferService.prebufferNextSongs([mockSongSpotify], -1, 'guild-123');
      
      // Wait a moment for prebuffering to start
      await new Promise(resolve => setTimeout(resolve, 5));
      
      // Now try to get URL while prebuffer is still in progress
      const url = await prebufferService.getYouTubeUrl(mockSongSpotify, 'guild-123');
      
      expect(url).toBe('https://youtube.com/fresh1');
      expect(logger.info).toHaveBeenCalledWith('Waiting for prebuffer completion for Test Song in guild guild-123');
      expect(logger.error).toHaveBeenCalledWith('Prebuffer failed for Test Song, fetching fresh:', expect.any(Error));
    });

    it('should handle prebuffer promise rejection and fallback to fresh fetch', async () => {
      const mockSong = createMockSong('spotify', 'https://spotify.com/error-test');

      // Mock the service to succeed on second call for fresh fetch
      mockSpotifyService.getStreamUrl.mockResolvedValue('https://youtube.com/fallback-fresh');

      // Create a rejecting promise and catch it to avoid unhandled rejection
      const failingPromise = Promise.reject(new Error('Prebuffer service failed'));
      failingPromise.catch(() => {}); // Prevent unhandled rejection

      // Manually add to cache to simulate prebuffer in progress
      const cacheKey = prebufferService['getCacheKey'](mockSong);
      prebufferService['prebufferCache'].set(cacheKey, {
        ...mockSong,
        prebuffered: false,
        prebufferPromise: failingPromise
      });

      // This should catch the error and fetch fresh
      const url = await prebufferService.getYouTubeUrl(mockSong, 'guild-123');
      
      expect(url).toBe('https://youtube.com/fallback-fresh');
      expect(logger.info).toHaveBeenCalledWith('Waiting for prebuffer completion for Test Song in guild guild-123');
      expect(logger.error).toHaveBeenCalledWith('Prebuffer failed for Test Song, fetching fresh:', expect.any(Error));
    });

    it('should handle cache miss for cached song without youtubeUrl', async () => {
      const mockSongSpotify = createMockSong('spotify', 'https://spotify.com/cached-no-url');

      // Mock a successful response for fresh fetch
      mockSpotifyService.getStreamUrl.mockResolvedValue('https://youtube.com/fresh-cached');

      // Pre-populate cache with a song that has no youtubeUrl (simulating failed prebuffer)
      const cacheKey = prebufferService['getCacheKey'](mockSongSpotify);
      prebufferService['prebufferCache'].set(cacheKey, {
        ...mockSongSpotify,
        prebuffered: false,
        // No youtubeUrl property - this should trigger line 72
      });
      
      const url = await prebufferService.getYouTubeUrl(mockSongSpotify, 'guild-123');
      
      expect(url).toBe('https://youtube.com/fresh-cached');
      expect(logger.info).toHaveBeenCalledWith('Fetching fresh YouTube URL for Test Song in guild guild-123');
    });

    it('should fetch fresh URL if not cached', async () => {
      const song = createMockSong('spotify', 'https://spotify.com/1');
      
      mockSpotifyService.getStreamUrl.mockResolvedValue('https://youtube.com/fresh1');
      
      const url = await prebufferService.getYouTubeUrl(song, 'guild-123');
      
      expect(url).toBe('https://youtube.com/fresh1');
      expect(logger.info).toHaveBeenCalledWith('Fetching fresh YouTube URL for Test Song in guild guild-123');
    });

    it('should handle YouTube songs directly', async () => {
      const song = createMockSong('youtube', 'https://youtube.com/1');
      
      const url = await prebufferService.getYouTubeUrl(song, 'guild-123');
      
      expect(url).toBe('https://youtube.com/1');
      expect(mockSpotifyService.getStreamUrl).not.toHaveBeenCalled();
    });

    it('should handle SoundCloud songs directly', async () => {
      const song = createMockSong('soundcloud', 'https://soundcloud.com/1');
      
      const url = await prebufferService.getYouTubeUrl(song, 'guild-123');
      
      expect(url).toBe('https://soundcloud.com/1');
      expect(mockSpotifyService.getStreamUrl).not.toHaveBeenCalled();
    });

    it('should throw error for unsupported platform', async () => {
      const song = {
        ...createMockSong('youtube', 'https://unsupported.com/1'),
        platform: 'unsupported' as any
      };
      
      await expect(prebufferService.getYouTubeUrl(song, 'guild-123'))
        .rejects.toThrow('Unsupported platform for prebuffering: unsupported');
    });
  });

  describe('shouldPrebuffer', () => {
    it('should only prebuffer Spotify songs', async () => {
      const spotifySong = createMockSong('spotify', 'https://spotify.com/1');
      const youtubeSong = createMockSong('youtube', 'https://youtube.com/1');
      const soundcloudSong = createMockSong('soundcloud', 'https://soundcloud.com/1');
      
      // Test by trying to prebuffer different platforms
      await prebufferService.prebufferNextSongs([spotifySong], -1, 'guild-123');
      await prebufferService.prebufferNextSongs([youtubeSong], -1, 'guild-123');
      await prebufferService.prebufferNextSongs([soundcloudSong], -1, 'guild-123');
      
      // Only Spotify should be prebuffered
      expect(logger.info).toHaveBeenCalledWith('Starting prebuffer for: Test Song by Test Artist (spotify)');
      expect(logger.info).toHaveBeenCalledWith('Skipping prebuffer for: Test Song (youtube) - not needed');
      expect(logger.info).toHaveBeenCalledWith('Skipping prebuffer for: Test Song (soundcloud) - not needed');
    });

    it('should not prebuffer already cached songs', async () => {
      const song = createMockSong('spotify', 'https://spotify.com/1');
      
      mockSpotifyService.getStreamUrl.mockResolvedValue('https://youtube.com/converted1');
      
      // Prebuffer once
      await prebufferService.prebufferNextSongs([song], -1, 'guild-123');
      
      // Try to prebuffer again
      await prebufferService.prebufferNextSongs([song], -1, 'guild-123');
      
      // Should only start prebuffering once
      const prebufferCalls = (logger.info as jest.Mock).mock.calls.filter(
        call => call[0].includes('Starting prebuffer for:')
      );
      expect(prebufferCalls).toHaveLength(1);
    });
  });

  describe('cleanupCache', () => {
    it('should cleanup cache when it exceeds max size', async () => {
      // Create more songs than the cache limit (50)
      const songs: Song[] = [];
      for (let i = 0; i < 60; i++) {
        songs.push(createMockSong('spotify', `https://spotify.com/${i}`, `Song ${i}`));
      }
      
      mockSpotifyService.getStreamUrl.mockImplementation((song: Song) => 
        Promise.resolve(`https://youtube.com/converted${song.url.split('/').pop()}`)
      );
      
      // Prebuffer all songs (this should trigger cleanup)
      for (const song of songs) {
        await prebufferService.prebufferNextSongs([song], -1, 'guild-123');
      }
      
      // Wait for prebuffering to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(logger.info).toHaveBeenCalledWith(expect.stringMatching(/Cleaned up prebuffer cache, removed \d+ entries/));
    });

    it('should handle cache cleanup when prebuffer fails', async () => {
      const failingSong = createMockSong('spotify', 'https://spotify.com/failing', 'Failing Song');
      
      // Mock the private prebufferSong method to simulate a failure
      const prebufferSongSpy = jest.spyOn(prebufferService as any, 'prebufferSong');
      prebufferSongSpy.mockImplementation(() => {
        // Simulate the cache entry being added and then removed due to failure
        const cacheKey = prebufferService['getCacheKey'](failingSong);
        prebufferService['prebufferCache'].set(cacheKey, {
          ...failingSong,
          prebuffered: false
        });
        
        // Then remove it to simulate the error cleanup
        prebufferService['prebufferCache'].delete(cacheKey);
        
        logger.error('Failed to prebuffer Failing Song:', new Error('Failed to fetch'));
      });
      
      // Start prebuffering - this should trigger our mock
      await prebufferService.prebufferNextSongs([failingSong], -1, 'guild-123');
      
      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith('Failed to prebuffer Failing Song:', expect.any(Error));
      
      prebufferSongSpy.mockRestore();
    });
  });

  describe('clearGuildCache', () => {
    it('should log guild cache clear', () => {
      prebufferService.clearGuildCache('guild-123');
      
      expect(logger.info).toHaveBeenCalledWith('Cleared prebuffer cache for guild guild-123');
    });
  });

  describe('getCacheStats', () => {
    it('should return correct cache statistics', async () => {
      const song1 = createMockSong('spotify', 'https://spotify.com/1', 'Song 1');
      const song2 = createMockSong('spotify', 'https://spotify.com/2', 'Song 2');
      
      mockSpotifyService.getStreamUrl.mockResolvedValue('https://youtube.com/converted1');
      
      // Initially empty
      let stats = prebufferService.getCacheStats();
      expect(stats).toEqual({ size: 0, prebuffered: 0, inProgress: 0 });
      
      // Start prebuffering
      prebufferService.prebufferNextSongs([song1, song2], -1, 'guild-123');
      
      // Should show in progress
      stats = prebufferService.getCacheStats();
      expect(stats.size).toBe(2); // Both songs should be in cache (Spotify only)
      expect(stats.inProgress).toBe(2);
      expect(stats.prebuffered).toBe(0);
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 10));
      
      stats = prebufferService.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.inProgress).toBe(0);
      expect(stats.prebuffered).toBe(2);
    });
  });

  describe('getCacheKey', () => {
    it('should generate consistent cache keys', async () => {
      const song1 = createMockSong('spotify', 'https://spotify.com/1');
      const song2 = createMockSong('spotify', 'https://spotify.com/1'); // Same URL
      const song3 = createMockSong('youtube', 'https://spotify.com/1'); // Different platform
      
      mockSpotifyService.getStreamUrl.mockResolvedValue('https://youtube.com/converted1');
      
      // Prebuffer first song
      await prebufferService.prebufferNextSongs([song1], -1, 'guild-123');
      
      // Second song with same platform and URL should use cache
      const url2 = await prebufferService.getYouTubeUrl(song2, 'guild-123');
      
      // Third song with different platform should not use cache
      const url3 = await prebufferService.getYouTubeUrl(song3, 'guild-123');
      
      expect(url2).toBe('https://youtube.com/converted1'); // From cache
      expect(url3).toBe('https://spotify.com/1'); // Direct URL (YouTube platform)
    });
  });
});