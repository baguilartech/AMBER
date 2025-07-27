import { QueueCommand } from '../../src/commands/queue';
import { QueueManager } from '../../src/services/queueManager';
import { ChatInputCommandInteraction } from 'discord.js';
import { Song } from '../../src/types';

jest.mock('../../src/services/queueManager');

describe('QueueCommand', () => {
  let queueCommand: QueueCommand;
  let mockQueueManager: jest.Mocked<QueueManager>;
  let mockInteraction: jest.Mocked<ChatInputCommandInteraction>;

  beforeEach(() => {
    mockQueueManager = new QueueManager() as jest.Mocked<QueueManager>;
    queueCommand = new QueueCommand(mockQueueManager);

    mockInteraction = {
      guildId: 'test-guild',
      user: {
        id: 'test-user-id',
        username: 'testuser'
      },
      reply: jest.fn(),
      editReply: jest.fn().mockResolvedValue(undefined),
      deferReply: jest.fn().mockResolvedValue(undefined),
      isRepliable: jest.fn().mockReturnValue(true),
      replied: false,
      deferred: false
    } as any;

    jest.clearAllMocks();
  });

  describe('data', () => {
    it('should have correct command data', () => {
      const data = queueCommand.data;
      
      expect(data.name).toBe('queue');
      expect(data.description).toBe('Show the current music queue');
    });
  });

  describe('execute', () => {
    it('should reply with empty queue message when queue is empty', async () => {
      mockQueueManager.getQueue.mockReturnValue({
        songs: [],
        currentIndex: 0,
        isPlaying: false,
        isPaused: false,
        volume: 0.5
      });

      await queueCommand.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'The queue is empty.',
        flags: [1 << 6] // MessageFlags.Ephemeral
      });
    });

    it('should display queue with songs', async () => {
      const mockSongs: Song[] = [
        {
          title: 'Song 1',
          artist: 'Artist 1',
          url: 'https://youtube.com/watch?v=1',
          duration: 180,
          requestedBy: 'User1',
          platform: 'youtube'
        },
        {
          title: 'Song 2',
          artist: 'Artist 2',
          url: 'https://spotify.com/track/2',
          duration: 240,
          requestedBy: 'User2',
          platform: 'spotify'
        }
      ];

      mockQueueManager.getQueue.mockReturnValue({
        songs: mockSongs,
        currentIndex: 0,
        isPlaying: true,
        isPaused: false,
        volume: 0.8
      });

      await queueCommand.execute(mockInteraction);

      const call = mockInteraction.reply.mock.calls[0][0] as any;
      expect(call.embeds).toHaveLength(1);
      expect(call.embeds[0].data.title).toBe('📋 Music Queue');
      expect(call.embeds[0].data.description).toContain('▶️ **Song 1** by Artist 1');
      expect(call.embeds[0].data.description).toContain('2. **Song 2** by Artist 2');
      expect(call.embeds[0].data.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Total Songs',
            value: '2'
          }),
          expect.objectContaining({
            name: 'Status',
            value: 'Playing'
          }),
          expect.objectContaining({
            name: 'Volume',
            value: '80%'
          })
        ])
      );
    });

    it('should show paused status when queue is paused', async () => {
      const mockSongs: Song[] = [{
        title: 'Song 1',
        artist: 'Artist 1',
        url: 'https://youtube.com/watch?v=1',
        duration: 180,
        requestedBy: 'User1',
        platform: 'youtube'
      }];

      mockQueueManager.getQueue.mockReturnValue({
        songs: mockSongs,
        currentIndex: 0,
        isPlaying: true,
        isPaused: true,
        volume: 0.5
      });

      await queueCommand.execute(mockInteraction);

      const call = mockInteraction.reply.mock.calls[0][0] as any;
      expect(call.embeds).toHaveLength(1);
      expect(call.embeds[0].data.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Status',
            value: 'Paused'
          })
        ])
      );
    });

    it('should limit display to 10 songs and show count of remaining', async () => {
      const mockSongs: Song[] = Array.from({ length: 15 }, (_, i) => ({
        title: `Song ${i + 1}`,
        artist: `Artist ${i + 1}`,
        url: `https://youtube.com/watch?v=${i + 1}`,
        duration: 180,
        requestedBy: `User${i + 1}`,
        platform: 'youtube' as const
      }));

      mockQueueManager.getQueue.mockReturnValue({
        songs: mockSongs,
        currentIndex: 0,
        isPlaying: false,
        isPaused: false,
        volume: 0.5
      });

      await queueCommand.execute(mockInteraction);

      const call = mockInteraction.reply.mock.calls[0][0] as any;
      expect(call.embeds).toHaveLength(1);
      expect(call.embeds[0].data.description).toContain('▶️ **Song 1** by Artist 1');
      expect(call.embeds[0].data.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Total Songs',
            value: '15'
          })
        ])
      );
      expect(call.embeds[0].data.footer.text).toBe('... and 5 more songs');
    });

    it('should handle errors gracefully', async () => {
      mockQueueManager.getQueue.mockImplementation(() => {
        throw new Error('Test error');
      });

      // Mock the handleError method
      const handleErrorSpy = jest.spyOn(queueCommand as any, 'handleError').mockImplementation();

      await queueCommand.execute(mockInteraction);

      expect(handleErrorSpy).toHaveBeenCalledWith(mockInteraction, expect.any(Error), 'queue');
      handleErrorSpy.mockRestore();
    });

    it('should handle reply failures gracefully', async () => {
      const mockSongs: Song[] = [{
        title: 'Song 1',
        artist: 'Artist 1',
        url: 'https://youtube.com/watch?v=1',
        duration: 180,
        requestedBy: 'User1',
        platform: 'youtube'
      }];

      mockQueueManager.getQueue.mockReturnValue({
        songs: mockSongs,
        currentIndex: 0,
        isPlaying: false,
        isPaused: false,
        volume: 0.5
      });

      mockInteraction.reply.mockRejectedValue(new Error('Reply failed'));

      // Mock the handleError method
      const handleErrorSpy = jest.spyOn(queueCommand as any, 'handleError').mockImplementation();

      await queueCommand.execute(mockInteraction);

      expect(handleErrorSpy).toHaveBeenCalledWith(mockInteraction, expect.any(Error), 'queue');
      handleErrorSpy.mockRestore();
    });
  });
});