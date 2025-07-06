import { URLValidator } from '../../src/utils/urlValidator';

describe('URLValidator', () => {
  describe('validateYoutube', () => {
    it('should validate YouTube URLs correctly', () => {
      const validUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'https://www.youtube.com/v/dQw4w9WgXcQ',
        'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'http://youtube.com/watch?v=dQw4w9WgXcQ'
      ];

      validUrls.forEach(url => {
        expect(URLValidator.validateYoutube(url)).toBe(true);
      });
    });

    it('should reject invalid YouTube URLs', () => {
      const invalidUrls = [
        'https://spotify.com/track/123',
        'https://soundcloud.com/user/track',
        'invalid-url',
        'https://youtube.com/invalid',
        'https://youtube.com/watch',
        'https://youtube.com/watch?',
        'https://youtube.com/watch?v=',
        'https://youtube.com/watch?v=short'
      ];

      invalidUrls.forEach(url => {
        expect(URLValidator.validateYoutube(url)).toBe(false);
      });
    });
  });

  describe('validateSpotify', () => {
    it('should validate Spotify URLs correctly', () => {
      const validUrls = [
        'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh',
        'https://spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh',
        'https://open.spotify.com/album/4iV5W9uYEdYUVa79Axb7Rh',
        'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
        'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh?si=abc',
        'http://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh'
      ];

      validUrls.forEach(url => {
        expect(URLValidator.validateSpotify(url)).toBe(true);
      });
    });

    it('should reject invalid Spotify URLs', () => {
      const invalidUrls = [
        'https://youtube.com/watch?v=123',
        'https://soundcloud.com/user/track',
        'invalid-url',
        'https://spotify.com/invalid/123',
        'https://open.spotify.com/invalid',
        'https://spotify.com/track',
        'https://spotify.com/track/'
      ];

      invalidUrls.forEach(url => {
        expect(URLValidator.validateSpotify(url)).toBe(false);
      });
    });
  });

  describe('validateSoundCloud', () => {
    it('should validate SoundCloud URLs correctly', () => {
      const validUrls = [
        'https://soundcloud.com/user/track',
        'https://www.soundcloud.com/user/track',
        'http://soundcloud.com/user/track',
        'https://soundcloud.com/user-name/track-name',
        'https://soundcloud.com/user_name/track_name'
      ];

      validUrls.forEach(url => {
        expect(URLValidator.validateSoundCloud(url)).toBe(true);
      });
    });

    it('should reject invalid SoundCloud URLs', () => {
      const invalidUrls = [
        'https://youtube.com/watch?v=123',
        'https://spotify.com/track/123',
        'invalid-url',
        'https://soundcloud.com/user',
        'https://soundcloud.com',
        'https://soundcloud.com/user/',
        'https://soundcloud.com/user/track/extra'
      ];

      invalidUrls.forEach(url => {
        expect(URLValidator.validateSoundCloud(url)).toBe(false);
      });
    });
  });

  describe('validateAnyMusicUrl', () => {
    it('should validate any supported music platform URL', () => {
      const validUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh',
        'https://soundcloud.com/user/track'
      ];

      validUrls.forEach(url => {
        expect(URLValidator.validateAnyMusicUrl(url)).toBe(true);
      });
    });

    it('should reject unsupported URLs', () => {
      const invalidUrls = [
        'https://example.com/video',
        'https://music.apple.com/track/123',
        'invalid-url',
        'https://random-site.com/music'
      ];

      invalidUrls.forEach(url => {
        expect(URLValidator.validateAnyMusicUrl(url)).toBe(false);
      });
    });
  });

  describe('getPlatformFromUrl', () => {
    it('should return correct platform for YouTube URLs', () => {
      expect(URLValidator.getPlatformFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
      expect(URLValidator.getPlatformFromUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
    });

    it('should return correct platform for Spotify URLs', () => {
      expect(URLValidator.getPlatformFromUrl('https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh')).toBe('spotify');
      expect(URLValidator.getPlatformFromUrl('https://spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh')).toBe('spotify');
    });

    it('should return correct platform for SoundCloud URLs', () => {
      expect(URLValidator.getPlatformFromUrl('https://soundcloud.com/user/track')).toBe('soundcloud');
      expect(URLValidator.getPlatformFromUrl('https://www.soundcloud.com/user/track')).toBe('soundcloud');
    });

    it('should return null for unsupported URLs', () => {
      expect(URLValidator.getPlatformFromUrl('https://example.com/video')).toBeNull();
      expect(URLValidator.getPlatformFromUrl('invalid-url')).toBeNull();
      expect(URLValidator.getPlatformFromUrl('https://music.apple.com/track/123')).toBeNull();
    });
  });
}); 