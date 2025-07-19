import { PlayCommand } from '../../src/commands/play';
import { QueueManager } from '../../src/services/queueManager';
import { MusicPlayer } from '../../src/services/musicPlayer';
import { ServiceFactory } from '../../src/services/serviceFactory';
import { ChatInputCommandInteraction, GuildMember, VoiceChannel, Guild } from 'discord.js';

// Mock dependencies
jest.mock('../../src/services/queueManager');
jest.mock('../../src/services/musicPlayer');
jest.mock('../../src/services/serviceFactory');
jest.mock('@discordjs/voice');

describe('PlayCommand', () => {
  let playCommand: PlayCommand;
  let mockQueueManager: jest.Mocked<QueueManager>;
  let mockMusicPlayer: jest.Mocked<MusicPlayer>;
  let mockInteraction: any;
  let mockMember: any;
  let mockVoiceChannel: any;
  let mockGuild: any;

  beforeEach(() => {
    mockQueueManager = new QueueManager() as jest.Mocked<QueueManager>;
    mockMusicPlayer = new MusicPlayer(mockQueueManager) as jest.Mocked<MusicPlayer>;
    playCommand = new PlayCommand(mockQueueManager, mockMusicPlayer);

    // Mock voice channel
    mockVoiceChannel = {
      id: 'test-channel'
    };

    // Mock guild
    mockGuild = {
      voiceAdapterCreator: jest.fn()
    };

    // Mock member
    mockMember = {
      voice: {
        channel: mockVoiceChannel
      },
      user: {
        username: 'TestUser'
      }
    };

    // Mock interaction
    mockInteraction = {
      options: {
        getString: jest.fn()
      },
      member: mockMember,
      guildId: 'test-guild',
      reply: jest.fn(),
      deferReply: jest.fn(),
      editReply: jest.fn(),
      guild: mockGuild
    };

    jest.clearAllMocks();
  });

  describe('data', () => {
    it('should have correct command data', () => {
      const data = playCommand.data;
      
      expect(data.name).toBe('play');
      expect(data.description).toBe('Play a song or add it to the queue');
    });
  });

  describe('execute', () => {
    it('should reply with error if user not in voice channel', async () => {
      mockMember.voice.channel = null;
      mockInteraction.options.getString.mockReturnValue('test song');

      await playCommand.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'You need to be in a voice channel to play music!',
        flags: [1 << 6] // MessageFlags.Ephemeral
      });
    });

    it('should defer reply and search for songs', async () => {
      mockInteraction.options.getString.mockReturnValue('test song');
      
      // Mock successful search results
      const mockSearchResults = [{
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'https://youtube.com/watch?v=test',
        duration: 180,
        requestedBy: 'TestUser',
        platform: 'youtube' as const
      }];

      // Mock service factory methods
      (ServiceFactory.handleServiceUrl as jest.Mock).mockResolvedValue(mockSearchResults);
      (ServiceFactory.getAllServices as jest.Mock).mockReturnValue([]);
      (ServiceFactory.getSpotifyService as jest.Mock).mockReturnValue({
        validateUrl: jest.fn().mockReturnValue(false)
      });
      (ServiceFactory.getSoundCloudService as jest.Mock).mockReturnValue({
        isConfigured: jest.fn().mockReturnValue(false)
      });

      mockQueueManager.addSong.mockReturnValue(true);
      mockQueueManager.getQueue.mockReturnValue({
        songs: [],
        currentIndex: 0,
        isPlaying: false,
        isPaused: false,
        volume: 0.5
      });

      const { joinVoiceChannel } = require('@discordjs/voice');
      const mockConnection = { subscribe: jest.fn() };
      joinVoiceChannel.mockReturnValue(mockConnection);

      mockMusicPlayer.waitForConnection.mockResolvedValue(undefined);
      mockMusicPlayer.play.mockResolvedValue(undefined);

      await playCommand.execute(mockInteraction);

      expect(mockInteraction.deferReply).toHaveBeenCalled();
      expect(mockQueueManager.addSong).toHaveBeenCalled();
    });

    it('should reply with error if no songs found', async () => {
      mockInteraction.options.getString.mockReturnValue('nonexistent song');
      
      // Mock empty search results
      (ServiceFactory.handleServiceUrl as jest.Mock).mockResolvedValue([]);
      (ServiceFactory.getAllServices as jest.Mock).mockReturnValue([]);
      (ServiceFactory.getSpotifyService as jest.Mock).mockReturnValue({
        validateUrl: jest.fn().mockReturnValue(false)
      });
      (ServiceFactory.getSoundCloudService as jest.Mock).mockReturnValue({
        isConfigured: jest.fn().mockReturnValue(false)
      });

      await playCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith('No songs found for your query.');
    });

    it('should reply with error if queue is full', async () => {
      mockInteraction.options.getString.mockReturnValue('test song');
      
      // Mock successful search results
      const mockSearchResults = [{
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'https://youtube.com/watch?v=test',
        duration: 180,
        requestedBy: 'TestUser',
        platform: 'youtube' as const
      }];

      // Mock service factory methods
      (ServiceFactory.handleServiceUrl as jest.Mock).mockResolvedValue(mockSearchResults);
      (ServiceFactory.getAllServices as jest.Mock).mockReturnValue([]);
      (ServiceFactory.getSpotifyService as jest.Mock).mockReturnValue({
        validateUrl: jest.fn().mockReturnValue(false)
      });
      (ServiceFactory.getSoundCloudService as jest.Mock).mockReturnValue({
        isConfigured: jest.fn().mockReturnValue(false)
      });

      // Mock queue full
      mockQueueManager.addSong.mockReturnValue(false);

      await playCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith('Queue is full! Please try again later.');
    });

    it('should add song to queue when already playing', async () => {
      mockInteraction.options.getString.mockReturnValue('test song');
      
      const mockSearchResults = [{
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'https://youtube.com/watch?v=test',
        duration: 180,
        requestedBy: 'TestUser',
        platform: 'youtube' as const
      }];

      (ServiceFactory.handleServiceUrl as jest.Mock).mockResolvedValue(mockSearchResults);
      (ServiceFactory.getAllServices as jest.Mock).mockReturnValue([]);
      (ServiceFactory.getSpotifyService as jest.Mock).mockReturnValue({
        validateUrl: jest.fn().mockReturnValue(false)
      });
      (ServiceFactory.getSoundCloudService as jest.Mock).mockReturnValue({
        isConfigured: jest.fn().mockReturnValue(false)
      });

      mockQueueManager.addSong.mockReturnValue(true);
      mockQueueManager.getQueue.mockReturnValue({
        songs: [mockSearchResults[0]],
        currentIndex: 0,
        isPlaying: true,
        isPaused: false,
        volume: 0.5
      });

      await playCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Added to queue: **Test Song** by **Test Artist** (Position: 1)'
      });
    });

    it('should handle Spotify playlist URLs', async () => {
      const playlistUrl = 'https://open.spotify.com/playlist/test123';
      mockInteraction.options.getString.mockReturnValue(playlistUrl);
      
      const mockPlaylistSongs = [{
        title: 'Playlist Song',
        artist: 'Playlist Artist',
        url: 'https://youtube.com/watch?v=playlist',
        duration: 200,
        requestedBy: 'TestUser',
        platform: 'spotify' as const
      }];

      const mockSpotifyService = {
        validateUrl: jest.fn().mockReturnValue(true),
        getPlaylistSongs: jest.fn().mockResolvedValue(mockPlaylistSongs)
      };

      (ServiceFactory.handleServiceUrl as jest.Mock).mockResolvedValue([]);
      (ServiceFactory.getSpotifyService as jest.Mock).mockReturnValue(mockSpotifyService);
      (ServiceFactory.getAllServices as jest.Mock).mockReturnValue([]);
      (ServiceFactory.getSoundCloudService as jest.Mock).mockReturnValue({
        isConfigured: jest.fn().mockReturnValue(false)
      });

      mockQueueManager.addSong.mockReturnValue(true);
      mockQueueManager.getQueue.mockReturnValue({
        songs: [],
        currentIndex: 0,
        isPlaying: false,
        isPaused: false,
        volume: 0.5
      });

      const { joinVoiceChannel } = require('@discordjs/voice');
      const mockConnection = { subscribe: jest.fn() };
      joinVoiceChannel.mockReturnValue(mockConnection);

      mockMusicPlayer.waitForConnection.mockResolvedValue(undefined);
      mockMusicPlayer.play.mockResolvedValue(undefined);

      await playCommand.execute(mockInteraction);

      expect(mockSpotifyService.getPlaylistSongs).toHaveBeenCalledWith(playlistUrl, 'TestUser');
    });

    it('should handle service search with unconfigured SoundCloud', async () => {
      mockInteraction.options.getString.mockReturnValue('test song');
      
      const mockYouTubeService = {
        search: jest.fn().mockResolvedValue([{
          title: 'YouTube Song',
          artist: 'YouTube Artist',
          url: 'https://youtube.com/watch?v=yt',
          duration: 180,
          requestedBy: 'TestUser',
          platform: 'youtube' as const
        }])
      };

      const mockSoundCloudService = {
        isConfigured: jest.fn().mockReturnValue(false)
      };

      (ServiceFactory.handleServiceUrl as jest.Mock).mockResolvedValue([]);
      (ServiceFactory.getSpotifyService as jest.Mock).mockReturnValue({
        validateUrl: jest.fn().mockReturnValue(false)
      });
      (ServiceFactory.getAllServices as jest.Mock).mockReturnValue([mockYouTubeService, mockSoundCloudService]);
      (ServiceFactory.getSoundCloudService as jest.Mock).mockReturnValue(mockSoundCloudService);

      mockQueueManager.addSong.mockReturnValue(true);
      mockQueueManager.getQueue.mockReturnValue({
        songs: [],
        currentIndex: 0,
        isPlaying: false,
        isPaused: false,
        volume: 0.5
      });

      const { joinVoiceChannel } = require('@discordjs/voice');
      const mockConnection = { subscribe: jest.fn() };
      joinVoiceChannel.mockReturnValue(mockConnection);

      mockMusicPlayer.waitForConnection.mockResolvedValue(undefined);
      mockMusicPlayer.play.mockResolvedValue(undefined);

      await playCommand.execute(mockInteraction);

      expect(mockYouTubeService.search).toHaveBeenCalledWith('test song');
    });

    it('should handle errors gracefully', async () => {
      mockInteraction.options.getString.mockReturnValue('test song');
      
      (ServiceFactory.handleServiceUrl as jest.Mock).mockRejectedValue(new Error('Service error'));

      const handleErrorSpy = jest.spyOn(playCommand as any, 'handleError').mockImplementation();

      await playCommand.execute(mockInteraction);

      expect(handleErrorSpy).toHaveBeenCalledWith(mockInteraction, expect.any(Error), 'play');
      handleErrorSpy.mockRestore();
    });

    it('should handle defer reply errors gracefully', async () => {
      mockInteraction.options.getString.mockReturnValue('test song');
      mockInteraction.deferReply.mockRejectedValue(new Error('Interaction expired'));
      
      const loggerSpy = jest.spyOn(require('../../src/utils/logger').logger, 'error');

      await playCommand.execute(mockInteraction);

      expect(loggerSpy).toHaveBeenCalledWith('Failed to defer reply - interaction may have expired:', expect.any(Error));
      // Should return early, so no further processing
      expect(mockQueueManager.addSong).not.toHaveBeenCalled();
    });

    it('should not trigger prebuffering when queue is not playing', async () => {
      mockInteraction.options.getString.mockReturnValue('test song');
      
      const mockSearchResults = [{
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'https://youtube.com/watch?v=test',
        duration: 180,
        requestedBy: 'TestUser',
        platform: 'youtube' as const
      }];

      (ServiceFactory.handleServiceUrl as jest.Mock).mockResolvedValue(mockSearchResults);
      (ServiceFactory.getAllServices as jest.Mock).mockReturnValue([]);
      (ServiceFactory.getSpotifyService as jest.Mock).mockReturnValue({
        validateUrl: jest.fn().mockReturnValue(false)
      });
      (ServiceFactory.getSoundCloudService as jest.Mock).mockReturnValue({
        isConfigured: jest.fn().mockReturnValue(false)
      });

      mockQueueManager.addSong.mockReturnValue(true);
      mockQueueManager.getQueue.mockReturnValue({
        songs: [mockSearchResults[0]],
        currentIndex: 0,
        isPlaying: false, // Not playing - this should not trigger prebuffering
        isPaused: false,
        volume: 0.5
      });

      const { joinVoiceChannel } = require('@discordjs/voice');
      const mockConnection = { subscribe: jest.fn() };
      joinVoiceChannel.mockReturnValue(mockConnection);

      mockMusicPlayer.waitForConnection.mockResolvedValue(undefined);
      mockMusicPlayer.play.mockResolvedValue(undefined);

      const triggerPrebufferingSpy = jest.spyOn(mockMusicPlayer, 'triggerPrebuffering');

      await playCommand.execute(mockInteraction);

      // Prebuffering should not be triggered when queue is not playing
      expect(triggerPrebufferingSpy).not.toHaveBeenCalled();
    });

    it('should trigger prebuffering when adding to an already playing queue', async () => {
      mockInteraction.options.getString.mockReturnValue('test song');
      
      const mockSearchResults = [{
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'https://youtube.com/watch?v=test',
        duration: 180,
        requestedBy: 'TestUser',
        platform: 'youtube' as const
      }];

      (ServiceFactory.handleServiceUrl as jest.Mock).mockResolvedValue(mockSearchResults);
      (ServiceFactory.getAllServices as jest.Mock).mockReturnValue([]);
      (ServiceFactory.getSpotifyService as jest.Mock).mockReturnValue({
        validateUrl: jest.fn().mockReturnValue(false)
      });
      (ServiceFactory.getSoundCloudService as jest.Mock).mockReturnValue({
        isConfigured: jest.fn().mockReturnValue(false)
      });

      mockQueueManager.addSong.mockReturnValue(true);
      mockQueueManager.getQueue.mockReturnValue({
        songs: [mockSearchResults[0]],
        currentIndex: 0,
        isPlaying: true, // Playing - this should trigger prebuffering
        isPaused: false,
        volume: 0.5
      });

      const triggerPrebufferingSpy = jest.spyOn(mockMusicPlayer, 'triggerPrebuffering');

      // Use fake timers to control setTimeout
      jest.useFakeTimers();

      // Start the execution
      const executePromise = playCommand.execute(mockInteraction);
      
      // Fast-forward time to trigger the setTimeout
      jest.advanceTimersByTime(150); // Increase the time to ensure setTimeout fires
      
      // Wait for all promises to resolve
      await executePromise;
      
      // Flush any remaining timers
      jest.runAllTimers();

      expect(triggerPrebufferingSpy).toHaveBeenCalledWith('test-guild');

      // Restore real timers
      jest.useRealTimers();
    });
  });
});