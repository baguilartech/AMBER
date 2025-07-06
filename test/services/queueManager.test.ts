import { QueueManager } from '../../src/services/queueManager';
import { Song } from '../../src/types';

describe('QueueManager', () => {
  let queueManager: QueueManager;
  let mockSong: Song;

  beforeEach(() => {
    queueManager = new QueueManager();
    mockSong = {
      title: 'Test Song',
      artist: 'Test Artist',
      url: 'https://youtube.com/watch?v=test',
      duration: 180,
      thumbnail: 'https://test.com/thumb.jpg',
      requestedBy: 'TestUser',
      platform: 'youtube'
    };
  });

  describe('getQueue', () => {
    it('should create a new queue for a guild', () => {
      const queue = queueManager.getQueue('test-guild');
      
      expect(queue).toBeDefined();
      expect(queue.songs).toHaveLength(0);
      expect(queue.currentIndex).toBe(0);
      expect(queue.isPlaying).toBe(false);
      expect(queue.isPaused).toBe(false);
      expect(queue.volume).toBe(0.5);
    });

    it('should return the same queue for the same guild', () => {
      const queue1 = queueManager.getQueue('test-guild');
      const queue2 = queueManager.getQueue('test-guild');
      
      expect(queue1).toBe(queue2);
    });
  });

  describe('addSong', () => {
    it('should add a song to the queue', () => {
      const result = queueManager.addSong('test-guild', mockSong);
      const queue = queueManager.getQueue('test-guild');
      
      expect(result).toBe(true);
      expect(queue.songs).toHaveLength(1);
      expect(queue.songs[0]).toBe(mockSong);
    });

    it('should not add song when queue is full', () => {
      // Fill the queue to max capacity
      for (let i = 0; i < 100; i++) {
        queueManager.addSong('test-guild', { ...mockSong, title: `Song ${i}` });
      }
      
      const result = queueManager.addSong('test-guild', mockSong);
      
      expect(result).toBe(false);
    });
  });

  describe('getCurrentSong', () => {
    it('should return null when queue is empty', () => {
      const song = queueManager.getCurrentSong('test-guild');
      
      expect(song).toBeNull();
    });

    it('should return the current song', () => {
      queueManager.addSong('test-guild', mockSong);
      const song = queueManager.getCurrentSong('test-guild');
      
      expect(song).toBe(mockSong);
    });
  });

  describe('skip', () => {
    it('should skip to the next song', () => {
      const song2 = { ...mockSong, title: 'Second Song' };
      queueManager.addSong('test-guild', mockSong);
      queueManager.addSong('test-guild', song2);
      
      const nextSong = queueManager.skip('test-guild');
      
      expect(nextSong).toBe(song2);
    });

    it('should return null when no next song', () => {
      queueManager.addSong('test-guild', mockSong);
      
      const nextSong = queueManager.skip('test-guild');
      
      expect(nextSong).toBeNull();
    });

    it('should return null when queue is empty', () => {
      const nextSong = queueManager.skip('test-guild');
      
      expect(nextSong).toBeNull();
    });
  });

  describe('previous', () => {
    it('should go to previous song when currentIndex > 0', () => {
      const song2 = { ...mockSong, title: 'Second Song' };
      queueManager.addSong('test-guild', mockSong);
      queueManager.addSong('test-guild', song2);
      
      // Create a scenario where currentIndex = 1
      // First get the queue and manually adjust currentIndex for testing
      const queue = queueManager.getQueue('test-guild');
      queue.currentIndex = 1; // Manually set to second song
      
      const prevSong = queueManager.previous('test-guild');
      
      expect(prevSong).toBe(mockSong);
      expect(queue.currentIndex).toBe(0);
    });

    it('should return null when at first song', () => {
      queueManager.addSong('test-guild', mockSong);
      
      const prevSong = queueManager.previous('test-guild');
      
      expect(prevSong).toBeNull();
    });
  });

  describe('shuffle', () => {
    it('should shuffle the queue', () => {
      const songs = Array.from({ length: 10 }, (_, i) => ({
        ...mockSong,
        title: `Song ${i}`
      }));
      
      songs.forEach(song => queueManager.addSong('test-guild', song));
      
      const originalOrder = queueManager.getQueue('test-guild').songs.map(s => s.title);
      queueManager.shuffle('test-guild');
      const shuffledOrder = queueManager.getQueue('test-guild').songs.map(s => s.title);
      
      expect(shuffledOrder).not.toEqual(originalOrder);
      expect(shuffledOrder).toHaveLength(originalOrder.length);
    });

    it('should handle shuffle when currentSong is null (line 131)', () => {
      // Add songs but ensure no current song (empty queue scenario)
      const songs = Array.from({ length: 3 }, (_, i) => ({
        ...mockSong,
        title: `Song ${i}`
      }));
      
      songs.forEach(song => queueManager.addSong('test-guild', song));
      
      // Clear the queue to simulate no current song scenario
      const queue = queueManager.getQueue('test-guild');
      queue.songs = songs;
      queue.currentIndex = -1; // No current song
      
      queueManager.shuffle('test-guild');
      
      // Should still shuffle all songs without a current song at the beginning
      expect(queue.songs).toHaveLength(3);
      expect(queue.currentIndex).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear the queue', () => {
      queueManager.addSong('test-guild', mockSong);
      queueManager.clear('test-guild');
      
      const queue = queueManager.getQueue('test-guild');
      
      expect(queue.songs).toHaveLength(0);
      expect(queue.currentIndex).toBe(0);
      expect(queue.isPlaying).toBe(false);
      expect(queue.isPaused).toBe(false);
    });
  });

  describe('setVolume', () => {
    it('should set the volume', () => {
      queueManager.setVolume('test-guild', 0.8);
      const queue = queueManager.getQueue('test-guild');
      
      expect(queue.volume).toBe(0.8);
    });

    it('should clamp volume to valid range', () => {
      queueManager.setVolume('test-guild', 1.5);
      expect(queueManager.getQueue('test-guild').volume).toBe(1);
      
      queueManager.setVolume('test-guild', -0.5);
      expect(queueManager.getQueue('test-guild').volume).toBe(0);
    });
  });

  describe('removeSong', () => {
    it('should remove a song from the queue', () => {
      const song2 = { ...mockSong, title: 'Second Song' };
      queueManager.addSong('test-guild', mockSong);
      queueManager.addSong('test-guild', song2);
      
      const removed = queueManager.removeSong('test-guild', 0);
      const queue = queueManager.getQueue('test-guild');
      
      expect(removed).toBe(mockSong);
      expect(queue.songs).toHaveLength(1);
      expect(queue.songs[0]).toBe(song2);
    });

    it('should return null for invalid index', () => {
      const removed = queueManager.removeSong('test-guild', 10);
      
      expect(removed).toBeNull();
    });

    it('should adjust currentIndex when removing song before current', () => {
      const song2 = { ...mockSong, title: 'Second Song' };
      const song3 = { ...mockSong, title: 'Third Song' };
      queueManager.addSong('test-guild', mockSong);
      queueManager.addSong('test-guild', song2);
      queueManager.addSong('test-guild', song3);
      
      const queue = queueManager.getQueue('test-guild');
      queue.currentIndex = 2; // Set to third song
      
      const removed = queueManager.removeSong('test-guild', 0); // Remove first song
      
      expect(removed).toBe(mockSong);
      expect(queue.currentIndex).toBe(1); // Should decrease by 1
    });

    it('should reset currentIndex when removing current song at end', () => {
      const song2 = { ...mockSong, title: 'Second Song' };
      queueManager.addSong('test-guild', mockSong);
      queueManager.addSong('test-guild', song2);
      
      const queue = queueManager.getQueue('test-guild');
      queue.currentIndex = 1; // Set to second song
      
      const removed = queueManager.removeSong('test-guild', 1); // Remove second song
      
      expect(removed).toBe(song2);
      expect(queue.currentIndex).toBe(0); // Should reset to 0
    });
  });

  describe('getNextSong', () => {
    it('should return next song in queue', () => {
      const song2 = { ...mockSong, title: 'Second Song' };
      queueManager.addSong('test-guild', mockSong);
      queueManager.addSong('test-guild', song2);
      
      const nextSong = queueManager.getNextSong('test-guild');
      
      expect(nextSong).toBe(song2);
    });

    it('should return null when no next song', () => {
      queueManager.addSong('test-guild', mockSong);
      
      const nextSong = queueManager.getNextSong('test-guild');
      
      expect(nextSong).toBeNull();
    });
  });

  describe('advance', () => {
    it('should advance to next song', () => {
      const song2 = { ...mockSong, title: 'Second Song' };
      queueManager.addSong('test-guild', mockSong);
      queueManager.addSong('test-guild', song2);
      
      const nextSong = queueManager.advance('test-guild');
      const queue = queueManager.getQueue('test-guild');
      
      expect(nextSong).toBe(song2);
      expect(queue.songs).toHaveLength(1); // First song should be removed
      expect(queue.songs[0]).toBe(song2);
      expect(queue.currentIndex).toBe(0);
    });

    it('should return null when no songs to advance', () => {
      const result = queueManager.advance('test-guild');
      
      expect(result).toBeNull();
    });

    it('should handle advancing when at end of queue', () => {
      queueManager.addSong('test-guild', mockSong);
      
      const result = queueManager.advance('test-guild');
      const queue = queueManager.getQueue('test-guild');
      
      expect(result).toBeNull();
      expect(queue.songs).toHaveLength(0);
      expect(queue.currentIndex).toBe(0);
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue status', () => {
      queueManager.addSong('test-guild', mockSong);
      const status = queueManager.getQueueStatus('test-guild');
      
      expect(status).toEqual({
        currentSong: mockSong,
        queueLength: 1,
        isPlaying: false,
        isPaused: false,
        volume: 0.5
      });
    });
  });
});