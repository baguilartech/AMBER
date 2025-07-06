import { 
  formatDuration, 
  formatVolume, 
  capitalizeFirst, 
  joinArtistNames,
  createMusicEmbed,
  createNowPlayingEmbed,
  createQueueEmbed
} from '../../src/utils/formatters';
import { Song } from '../../src/types';

describe('Formatters', () => {
  describe('formatDuration', () => {
    it('should format seconds to mm:ss format', () => {
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(125)).toBe('2:05');
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(59)).toBe('0:59');
    });

    it('should format hours to hh:mm:ss format', () => {
      expect(formatDuration(3661)).toBe('1:01:01');
      expect(formatDuration(7200)).toBe('2:00:00');
      expect(formatDuration(3600)).toBe('1:00:00');
    });

    it('should handle edge cases', () => {
      expect(formatDuration(3599)).toBe('59:59');
      expect(formatDuration(36000)).toBe('10:00:00');
    });
  });

  describe('formatVolume', () => {
    it('should format volume as percentage', () => {
      expect(formatVolume(0.5)).toBe('50%');
      expect(formatVolume(0.0)).toBe('0%');
      expect(formatVolume(1.0)).toBe('100%');
      expect(formatVolume(0.75)).toBe('75%');
    });

    it('should round to nearest integer', () => {
      expect(formatVolume(0.333)).toBe('33%');
      expect(formatVolume(0.666)).toBe('67%');
      expect(formatVolume(0.999)).toBe('100%');
    });
  });

  describe('capitalizeFirst', () => {
    it('should capitalize first letter', () => {
      expect(capitalizeFirst('hello')).toBe('Hello');
      expect(capitalizeFirst('world')).toBe('World');
      expect(capitalizeFirst('youtube')).toBe('Youtube');
      expect(capitalizeFirst('spotify')).toBe('Spotify');
    });

    it('should handle edge cases', () => {
      expect(capitalizeFirst('')).toBe('');
      expect(capitalizeFirst('a')).toBe('A');
      expect(capitalizeFirst('HELLO')).toBe('HELLO');
    });

    it('should not affect other characters', () => {
      expect(capitalizeFirst('hELLO')).toBe('HELLO');
      expect(capitalizeFirst('soundCloud')).toBe('SoundCloud');
    });
  });

  describe('joinArtistNames', () => {
    it('should join artist names with commas', () => {
      const artists = [
        { name: 'Artist 1' },
        { name: 'Artist 2' },
        { name: 'Artist 3' }
      ];
      expect(joinArtistNames(artists)).toBe('Artist 1, Artist 2, Artist 3');
    });

    it('should handle single artist', () => {
      const artists = [{ name: 'Solo Artist' }];
      expect(joinArtistNames(artists)).toBe('Solo Artist');
    });

    it('should handle empty array', () => {
      expect(joinArtistNames([])).toBe('');
    });
  });

  describe('createMusicEmbed', () => {
    it('should create embed with correct properties', () => {
      const embed = createMusicEmbed('Test Title');
      
      expect(embed.data.title).toBe('Test Title');
      expect(embed.data.color).toBe(0x0099ff);
      expect(embed.data.timestamp).toBeDefined();
    });
  });

  describe('createNowPlayingEmbed', () => {
    it('should create now playing embed with song details', () => {
      const song: Song = {
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'https://test.com/song',
        duration: 180,
        thumbnail: 'https://test.com/thumb.jpg',
        requestedBy: 'testuser',
        platform: 'youtube'
      };

      const embed = createNowPlayingEmbed(song);
      
      expect(embed.data.title).toBe('🎵 Now Playing');
      expect(embed.data.description).toBe('**Test Song** by Test Artist');
      expect(embed.data.thumbnail?.url).toBe('https://test.com/thumb.jpg');
      
      const fields = embed.data.fields || [];
      expect(fields).toHaveLength(3);
      expect(fields[0]).toEqual({
        name: 'Duration',
        value: '3:00',
        inline: true
      });
      expect(fields[1]).toEqual({
        name: 'Platform',
        value: 'Youtube',
        inline: true
      });
      expect(fields[2]).toEqual({
        name: 'Requested by',
        value: 'testuser',
        inline: true
      });
    });

    it('should handle song without thumbnail', () => {
      const song: Song = {
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'https://test.com/song',
        duration: 180,
        requestedBy: 'testuser',
        platform: 'spotify'
      };

      const embed = createNowPlayingEmbed(song);
      
      expect(embed.data.thumbnail).toBeUndefined();
    });
  });

  describe('createQueueEmbed', () => {
    it('should create queue embed with songs', () => {
      const songs: Song[] = [
        {
          title: 'Song 1',
          artist: 'Artist 1',
          url: 'https://test.com/song1',
          duration: 180,
          requestedBy: 'user1',
          platform: 'youtube'
        },
        {
          title: 'Song 2',
          artist: 'Artist 2',
          url: 'https://test.com/song2',
          duration: 240,
          requestedBy: 'user2',
          platform: 'spotify'
        }
      ];

      const embed = createQueueEmbed(songs, 0);
      
      expect(embed.data.title).toBe('📋 Music Queue');
      expect(embed.data.description).toContain('▶️ **Song 1** by Artist 1');
      expect(embed.data.description).toContain('2. **Song 2** by Artist 2');
      expect(embed.data.footer).toBeUndefined();
    });

    it('should handle empty queue', () => {
      const embed = createQueueEmbed([], 0);
      
      expect(embed.data.title).toBe('📋 Music Queue');
      expect(embed.data.description).toBe('The queue is empty.');
    });

    it('should limit display to 10 songs and show footer', () => {
      const songs: Song[] = Array.from({ length: 15 }, (_, i) => ({
        title: `Song ${i + 1}`,
        artist: `Artist ${i + 1}`,
        url: `https://test.com/song${i + 1}`,
        duration: 180,
        requestedBy: `user${i + 1}`,
        platform: 'youtube' as const
      }));

      const embed = createQueueEmbed(songs, 0);
      
      expect(embed.data.description).toContain('▶️ **Song 1** by Artist 1');
      expect(embed.data.description).toContain('10. **Song 10** by Artist 10');
      expect(embed.data.description).not.toContain('Song 11');
      expect(embed.data.footer?.text).toBe('... and 5 more songs');
    });

    it('should show current song indicator', () => {
      const songs: Song[] = [
        {
          title: 'Song 1',
          artist: 'Artist 1',
          url: 'https://test.com/song1',
          duration: 180,
          requestedBy: 'user1',
          platform: 'youtube'
        },
        {
          title: 'Song 2',
          artist: 'Artist 2',
          url: 'https://test.com/song2',
          duration: 240,
          requestedBy: 'user2',
          platform: 'spotify'
        }
      ];

      const embed = createQueueEmbed(songs, 1);
      
      expect(embed.data.description).toContain('1. **Song 1** by Artist 1');
      expect(embed.data.description).toContain('▶️ **Song 2** by Artist 2');
    });
  });
});