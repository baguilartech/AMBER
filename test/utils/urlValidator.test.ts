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
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&pp=ygUZYWxvYm9pIHdhbnQgdG8gbG92ZSByZW1peA%3D%3D',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLmD2D7TD_w-757L2wNJGEfPuaOInGz5w2',
        'https://youtu.be/dQw4w9WgXcQ?t=30'
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
        'https://youtu.be/',
        'https://youtube.com/embed/'
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
        'https://open.spotify.com/album/37i9dQZF1DXcBWIGoYBM5M',
        'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
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
        'https://spotify.com/invalid',
        'https://open.spotify.com/',
        'https://spotify.com/track/',
        'https://open.spotify.com/album/'
      ];

      invalidUrls.forEach(url => {
        expect(URLValidator.validateSpotify(url)).toBe(false);
      });
    });
  });

  describe('validateSoundCloud', () => {
    it('should validate SoundCloud URLs correctly', () => {
      const validUrls = [
        'https://soundcloud.com/user/track-name',
        'https://www.soundcloud.com/user/track-name',
        'http://soundcloud.com/user/track-name',
        'https://soundcloud.com/artist/song-title-123'
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
        'https://soundcloud.com/',
        'https://soundcloud.com/user/',
        'https://soundcloud.com/invalid/path/too/deep'
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
        'https://soundcloud.com/user/track-name'
      ];

      validUrls.forEach(url => {
        expect(URLValidator.validateAnyMusicUrl(url)).toBe(true);
      });
    });

    it('should reject unsupported URLs', () => {
      const invalidUrls = [
        'https://example.com/video',
        'https://music.apple.com/track/123',
        'https://bandcamp.com/track/123',
        'invalid-url',
        'https://google.com'
      ];

      invalidUrls.forEach(url => {
        expect(URLValidator.validateAnyMusicUrl(url)).toBe(false);
      });
    });
  });

  describe('getPlatformFromUrl', () => {
    it('should return correct platform for YouTube URLs', () => {
      const youtubeUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://youtube.com/embed/dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&pp=ygUZYWxvYm9pIHdhbnQgdG8gbG92ZSByZW1peA%3D%3D',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s'
      ];

      youtubeUrls.forEach(url => {
        expect(URLValidator.getPlatformFromUrl(url)).toBe('youtube');
      });
    });

    it('should return correct platform for Spotify URLs', () => {
      const spotifyUrls = [
        'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh',
        'https://spotify.com/album/37i9dQZF1DXcBWIGoYBM5M',
        'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'
      ];

      spotifyUrls.forEach(url => {
        expect(URLValidator.getPlatformFromUrl(url)).toBe('spotify');
      });
    });

    it('should return correct platform for SoundCloud URLs', () => {
      const soundcloudUrls = [
        'https://soundcloud.com/user/track-name',
        'https://www.soundcloud.com/artist/song-title'
      ];

      soundcloudUrls.forEach(url => {
        expect(URLValidator.getPlatformFromUrl(url)).toBe('soundcloud');
      });
    });

    it('should return null for unsupported URLs', () => {
      const unsupportedUrls = [
        'https://example.com/video',
        'https://music.apple.com/track/123',
        'invalid-url',
        'https://google.com'
      ];

      unsupportedUrls.forEach(url => {
        expect(URLValidator.getPlatformFromUrl(url)).toBeNull();
      });
    });
  });
}); 