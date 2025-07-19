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
import { EmbedBuilder } from 'discord.js';

// Mock Discord.js
jest.mock('discord.js', () => ({
  EmbedBuilder: jest.fn().mockImplementation(() => ({
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setColor: jest.fn().mockReturnThis(),
    setThumbnail: jest.fn().mockReturnThis(),
    addFields: jest.fn().mockReturnThis(),
    setFooter: jest.fn().mockReturnThis(),
    setTimestamp: jest.fn().mockReturnThis()
  }))
}));

describe('Formatters', () => {
  describe('formatDuration', () => {
    it('should format duration in minutes and seconds', () => {
      expect(formatDuration(65)).toBe('1:05');
      expect(formatDuration(125)).toBe('2:05');
      expect(formatDuration(3600)).toBe('1:00:00');
      expect(formatDuration(0)).toBe('0:00');
    });

    it('should handle single digit seconds', () => {
      expect(formatDuration(61)).toBe('1:01');
      expect(formatDuration(9)).toBe('0:09');
    });
  });

  describe('formatVolume', () => {
    it('should format volume as percentage', () => {
      expect(formatVolume(0.5)).toBe('50%');
      expect(formatVolume(1.0)).toBe('100%');
      expect(formatVolume(0.0)).toBe('0%');
      expect(formatVolume(0.75)).toBe('75%');
    });

    it('should handle decimal volumes', () => {
      expect(formatVolume(0.333)).toBe('33%');
      expect(formatVolume(0.666)).toBe('67%');
    });
  });

  describe('capitalizeFirst', () => {
    it('should capitalize first letter of string', () => {
      expect(capitalizeFirst('hello')).toBe('Hello');
      expect(capitalizeFirst('world')).toBe('World');
      expect(capitalizeFirst('')).toBe('');
    });

    it('should handle already capitalized strings', () => {
      expect(capitalizeFirst('Hello')).toBe('Hello');
      expect(capitalizeFirst('WORLD')).toBe('WORLD');
    });

    it('should handle single character strings', () => {
      expect(capitalizeFirst('a')).toBe('A');
      expect(capitalizeFirst('A')).toBe('A');
    });
  });

  describe('joinArtistNames', () => {
    it('should join artist names with comma', () => {
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
    it('should create music embed with title', () => {
      const embed = createMusicEmbed('Test Title');
      
      expect(EmbedBuilder).toHaveBeenCalled();
      expect(embed.setTitle).toHaveBeenCalledWith('Test Title');
      expect(embed.setColor).toHaveBeenCalledWith('#0099ff');
    });
  });

  describe('createNowPlayingEmbed', () => {
    it('should create now playing embed with song info', () => {
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
      
      expect(EmbedBuilder).toHaveBeenCalled();
      expect(embed.setTitle).toHaveBeenCalledWith('🎵 Now Playing');
      expect(embed.setDescription).toHaveBeenCalledWith(
        expect.stringContaining('Test Song')
      );
      expect(embed.setThumbnail).toHaveBeenCalledWith('https://test.com/thumb.jpg');
      expect(embed.addFields).toHaveBeenCalled();
    });

    it('should handle song without thumbnail', () => {
      const song: Song = {
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'https://test.com/song',
        duration: 180,
        requestedBy: 'testuser',
        platform: 'youtube'
      };

      const embed = createNowPlayingEmbed(song);
      
      expect(embed.setThumbnail).toHaveBeenCalledWith(null);
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
      
      expect(EmbedBuilder).toHaveBeenCalled();
      expect(embed.setTitle).toHaveBeenCalledWith('📋 Music Queue');
      expect(embed.setDescription).toHaveBeenCalledWith(
        expect.stringContaining('Song 1')
      );
    });

    it('should handle empty queue', () => {
      const embed = createQueueEmbed([], 0);
      
      expect(embed.setDescription).toHaveBeenCalledWith('The queue is empty.');
    });

    it('should limit display to 10 songs', () => {
      const songs: Song[] = Array.from({ length: 15 }, (_, i) => ({
        title: `Song ${i + 1}`,
        artist: `Artist ${i + 1}`,
        url: `https://test.com/song${i + 1}`,
        duration: 180,
        requestedBy: `user${i + 1}`,
        platform: 'youtube' as const
      }));

      const embed = createQueueEmbed(songs, 0);
      
      expect(embed.setFooter).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('5 more songs')
        })
      );
    });
  });
});