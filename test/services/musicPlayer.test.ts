import { MusicPlayer } from '../../src/services/musicPlayer';
import { QueueManager } from '../../src/services/queueManager';
import { ServiceFactory } from '../../src/services/serviceFactory';
import { Song } from '../../src/types';
import { ErrorHandler } from '../../src/utils/errorHandler';
import { 
  AudioPlayer, 
  AudioPlayerStatus, 
  VoiceConnection, 
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState
} from '@discordjs/voice';

// Mock dependencies
jest.mock('../../src/services/queueManager');
jest.mock('../../src/services/serviceFactory');
jest.mock('../../src/utils/errorHandler');
jest.mock('../../src/utils/logger');
jest.mock('@discordjs/voice', () => ({
  AudioPlayer: jest.fn(),
  AudioPlayerStatus: {
    Playing: 'playing',
    Idle: 'idle',
    Paused: 'paused',
    Buffering: 'buffering'
  },
  VoiceConnectionStatus: {
    Ready: 'ready',
    Connecting: 'connecting',
    Destroyed: 'destroyed'
  },
  createAudioPlayer: jest.fn(),
  createAudioResource: jest.fn(),
  entersState: jest.fn()
}));

describe('MusicPlayer', () => {
  let musicPlayer: MusicPlayer;
  let mockQueueManager: jest.Mocked<QueueManager>;
  let mockAudioPlayer: any;
  let mockVoiceConnection: jest.Mocked<VoiceConnection>;
  let mockMusicService: any;

  const mockSong: Song = {
    title: 'Test Song',
    artist: 'Test Artist',
    url: 'https://test.com/song',
    duration: 180,
    requestedBy: 'user123',
    platform: 'youtube'
  };

  const mockQueue = {
    songs: [mockSong],
    currentIndex: 0,
    isPlaying: false,
    isPaused: false,
    volume: 0.5
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock QueueManager
    mockQueueManager = {
      getCurrentSong: jest.fn(),
      getQueue: jest.fn().mockReturnValue(mockQueue),
      skip: jest.fn(),
      previous: jest.fn(),
      setVolume: jest.fn(),
      clear: jest.fn(),
      advance: jest.fn()
    } as any;

    // Mock AudioPlayer with proper state structure
    mockAudioPlayer = {
      play: jest.fn(),
      pause: jest.fn(),
      unpause: jest.fn(),
      stop: jest.fn(),
      on: jest.fn(),
      state: {
        status: AudioPlayerStatus.Playing,
        resource: {
          volume: {
            setVolume: jest.fn()
          }
        }
      }
    };

    // Mock VoiceConnection
    mockVoiceConnection = {
      subscribe: jest.fn(),
      destroy: jest.fn()
    } as any;

    // Mock MusicService
    mockMusicService = {
      getStreamUrl: jest.fn().mockResolvedValue('https://stream.url')
    };

    // Setup mocks
    (createAudioPlayer as jest.Mock).mockReturnValue(mockAudioPlayer);
    (createAudioResource as jest.Mock).mockReturnValue({
      volume: { setVolume: jest.fn() }
    });
    (ServiceFactory.getServiceByPlatform as jest.Mock).mockReturnValue(mockMusicService);
    (entersState as jest.Mock).mockResolvedValue(undefined);

    musicPlayer = new MusicPlayer(mockQueueManager);
  });

  describe('constructor', () => {
    it('should initialize with queue manager', () => {
      expect(musicPlayer).toBeInstanceOf(MusicPlayer);
    });
  });

  describe('play', () => {
    it('should play current song successfully', async () => {
      mockQueueManager.getCurrentSong.mockReturnValue(mockSong);

      await musicPlayer.play('guild123', mockVoiceConnection);

      expect(mockQueueManager.getCurrentSong).toHaveBeenCalledWith('guild123');
      expect(mockMusicService.getStreamUrl).toHaveBeenCalledWith(mockSong);
      expect(createAudioResource).toHaveBeenCalledWith('https://stream.url', {
        inlineVolume: true
      });
      expect(mockAudioPlayer.play).toHaveBeenCalled();
      expect(mockVoiceConnection.subscribe).toHaveBeenCalledWith(mockAudioPlayer);
      expect(mockQueue.isPlaying).toBe(true);
      expect(mockQueue.isPaused).toBe(false);
    });

    it('should handle no current song', async () => {
      mockQueueManager.getCurrentSong.mockReturnValue(null);

      await musicPlayer.play('guild123', mockVoiceConnection);

      expect(mockQueueManager.getCurrentSong).toHaveBeenCalledWith('guild123');
      expect(mockMusicService.getStreamUrl).not.toHaveBeenCalled();
      expect(mockAudioPlayer.play).not.toHaveBeenCalled();
    });

    it('should handle stream URL error', async () => {
      mockQueueManager.getCurrentSong.mockReturnValue(mockSong);
      mockMusicService.getStreamUrl.mockRejectedValue(new Error('Stream error'));

      await musicPlayer.play('guild123', mockVoiceConnection);

      expect(ErrorHandler.handleVoiceError).toHaveBeenCalledWith('guild123', new Error('Stream error'));
    });
  });

  describe('skip', () => {
    it('should skip to next song', async () => {
      const nextSong: Song = { ...mockSong, title: 'Next Song' };
      const playingQueue = { ...mockQueue, isPlaying: true, songs: [mockSong, nextSong] };
      
      mockQueueManager.getQueue.mockReturnValue(playingQueue);
      mockQueueManager.advance.mockReturnValue(nextSong);
      mockQueueManager.getCurrentSong.mockReturnValue(nextSong);

      const result = await musicPlayer.skip('guild123');

      expect(mockQueueManager.advance).toHaveBeenCalledWith('guild123');
      expect(result).toBe(nextSong);
    });

    it('should stop playback when no next song', async () => {
      const playingQueue = { ...mockQueue, isPlaying: true, songs: [mockSong] };
      
      mockQueueManager.getQueue.mockReturnValue(playingQueue);
      mockQueueManager.advance.mockReturnValue(null);
      
      const stopSpy = jest.spyOn(musicPlayer, 'stop');
      const result = await musicPlayer.skip('guild123');

      expect(mockQueueManager.advance).toHaveBeenCalledWith('guild123');
      expect(stopSpy).toHaveBeenCalledWith('guild123');
      expect(result).toBeNull();
    });

    it('should return null when not playing', async () => {
      const notPlayingQueue = { ...mockQueue, isPlaying: false };
      mockQueueManager.getQueue.mockReturnValue(notPlayingQueue);

      const result = await musicPlayer.skip('guild123');

      expect(result).toBeNull();
      expect(mockQueueManager.skip).not.toHaveBeenCalled();
    });

    it('should return null when no songs in queue', async () => {
      const emptyQueue = { ...mockQueue, isPlaying: true, songs: [] };
      mockQueueManager.getQueue.mockReturnValue(emptyQueue);

      const result = await musicPlayer.skip('guild123');

      expect(result).toBeNull();
      expect(mockQueueManager.skip).not.toHaveBeenCalled();
    });

    it('should stop current player when skipping', async () => {
      const nextSong: Song = { ...mockSong, title: 'Next Song' };
      const playingQueue = { ...mockQueue, isPlaying: true, songs: [mockSong, nextSong] };
      
      mockQueueManager.getQueue.mockReturnValue(playingQueue);
      mockQueueManager.advance.mockReturnValue(nextSong);
      mockQueueManager.getCurrentSong.mockReturnValue(nextSong);
      
      // Set up player and connection in musicPlayer
      (musicPlayer as any).players.set('guild123', mockAudioPlayer);
      (musicPlayer as any).connections.set('guild123', mockVoiceConnection);

      const result = await musicPlayer.skip('guild123');

      expect(mockAudioPlayer.stop).toHaveBeenCalled();
      expect(result).toBe(nextSong);
    });

    it('should cover lines 80-82 when nextSong exists but no connection', async () => {
      const nextSong: Song = { ...mockSong, title: 'Next Song' };
      const playingQueue = { ...mockQueue, isPlaying: true, songs: [mockSong, nextSong] };
      
      mockQueueManager.getQueue.mockReturnValue(playingQueue);
      mockQueueManager.advance.mockReturnValue(nextSong);
      
      // Set up player but NO connection to trigger lines 80-82
      (musicPlayer as any).players.set('guild123', mockAudioPlayer);
      // connections map is empty, so connection will be undefined

      const result = await musicPlayer.skip('guild123');

      expect(mockAudioPlayer.stop).toHaveBeenCalled();
      expect(result).toBe(nextSong);
      // Should not call play because there's no connection
    });
  });

  describe('previous', () => {
    it('should go to previous song', async () => {
      const prevSong: Song = { ...mockSong, title: 'Previous Song' };
      const playingQueue = { ...mockQueue, isPlaying: true };
      
      mockQueueManager.getQueue.mockReturnValue(playingQueue);
      mockQueueManager.previous.mockReturnValue(prevSong);
      mockQueueManager.getCurrentSong.mockReturnValue(prevSong);

      const result = await musicPlayer.previous('guild123');

      expect(mockQueueManager.previous).toHaveBeenCalledWith('guild123');
      expect(result).toBe(prevSong);
    });

    it('should return null when no previous song', async () => {
      const playingQueue = { ...mockQueue, isPlaying: true };
      
      mockQueueManager.getQueue.mockReturnValue(playingQueue);
      mockQueueManager.previous.mockReturnValue(null);

      const result = await musicPlayer.previous('guild123');

      expect(mockQueueManager.previous).toHaveBeenCalledWith('guild123');
      expect(result).toBeNull();
    });

    it('should cover line 101 when not playing', async () => {
      const notPlayingQueue = { ...mockQueue, isPlaying: false };
      
      mockQueueManager.getQueue.mockReturnValue(notPlayingQueue);

      const result = await musicPlayer.previous('guild123');

      expect(result).toBeNull();
      expect(mockQueueManager.previous).not.toHaveBeenCalled();
    });

    it('should stop current player when going to previous', async () => {
      const prevSong: Song = { ...mockSong, title: 'Previous Song' };
      mockQueueManager.previous.mockReturnValue(prevSong);
      mockQueueManager.getCurrentSong.mockReturnValue(prevSong);
      
      // Set up player and connection in musicPlayer
      (musicPlayer as any).players.set('guild123', mockAudioPlayer);
      (musicPlayer as any).connections.set('guild123', mockVoiceConnection);

      const result = await musicPlayer.previous('guild123');

      expect(mockAudioPlayer.stop).toHaveBeenCalled();
      expect(result).toBe(prevSong);
    });
  });

  describe('pause', () => {
    it('should pause playback successfully', () => {
      mockQueue.isPlaying = true;
      mockQueue.isPaused = false;
      
      // Mock the players map
      (musicPlayer as any).players.set('guild123', mockAudioPlayer);

      const result = musicPlayer.pause('guild123');

      expect(mockAudioPlayer.pause).toHaveBeenCalled();
      expect(mockQueue.isPaused).toBe(true);
      expect(result).toBe(true);
    });

    it('should not pause when not playing', () => {
      mockQueue.isPlaying = false;
      mockQueue.isPaused = false;
      
      (musicPlayer as any).players.set('guild123', mockAudioPlayer);

      const result = musicPlayer.pause('guild123');

      expect(mockAudioPlayer.pause).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should not pause when already paused', () => {
      mockQueue.isPlaying = true;
      mockQueue.isPaused = true;
      
      (musicPlayer as any).players.set('guild123', mockAudioPlayer);

      const result = musicPlayer.pause('guild123');

      expect(mockAudioPlayer.pause).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('resume', () => {
    it('should resume playback successfully', () => {
      mockQueue.isPlaying = true;
      mockQueue.isPaused = true;
      
      (musicPlayer as any).players.set('guild123', mockAudioPlayer);

      const result = musicPlayer.resume('guild123');

      expect(mockAudioPlayer.unpause).toHaveBeenCalled();
      expect(mockQueue.isPaused).toBe(false);
      expect(result).toBe(true);
    });

    it('should not resume when not playing', () => {
      mockQueue.isPlaying = false;
      mockQueue.isPaused = true;
      
      (musicPlayer as any).players.set('guild123', mockAudioPlayer);

      const result = musicPlayer.resume('guild123');

      expect(mockAudioPlayer.unpause).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should not resume when not paused', () => {
      mockQueue.isPlaying = true;
      mockQueue.isPaused = false;
      
      (musicPlayer as any).players.set('guild123', mockAudioPlayer);

      const result = musicPlayer.resume('guild123');

      expect(mockAudioPlayer.unpause).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('stop', () => {
    it('should stop playback', () => {
      (musicPlayer as any).players.set('guild123', mockAudioPlayer);

      musicPlayer.stop('guild123');

      expect(mockQueueManager.clear).toHaveBeenCalledWith('guild123');
      expect(mockAudioPlayer.stop).toHaveBeenCalled();
    });

    it('should handle no player', () => {
      musicPlayer.stop('guild123');

      expect(mockAudioPlayer.stop).not.toHaveBeenCalled();
      expect(mockQueueManager.clear).not.toHaveBeenCalled();
    });
  });

  describe('setVolume', () => {
    it('should set volume successfully', () => {
      (musicPlayer as any).players.set('guild123', mockAudioPlayer);

      const result = musicPlayer.setVolume('guild123', 0.8);

      expect(mockAudioPlayer.state.resource.volume.setVolume).toHaveBeenCalledWith(0.8);
      expect(mockQueueManager.setVolume).toHaveBeenCalledWith('guild123', 0.8);
      expect(result).toBe(true);
    });

    it('should handle no player', () => {
      const result = musicPlayer.setVolume('guild123', 0.8);

      expect(mockQueueManager.setVolume).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should handle non-playing player', () => {
      mockAudioPlayer.state.status = AudioPlayerStatus.Idle;
      (musicPlayer as any).players.set('guild123', mockAudioPlayer);

      const result = musicPlayer.setVolume('guild123', 0.8);

      expect(mockQueueManager.setVolume).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect and cleanup', () => {
      (musicPlayer as any).players.set('guild123', mockAudioPlayer);
      (musicPlayer as any).connections.set('guild123', mockVoiceConnection);

      musicPlayer.disconnect('guild123');

      expect(mockVoiceConnection.destroy).toHaveBeenCalled();
      expect(mockAudioPlayer.stop).toHaveBeenCalled();
      expect(mockQueueManager.clear).toHaveBeenCalledWith('guild123');
      expect((musicPlayer as any).players.has('guild123')).toBe(false);
      expect((musicPlayer as any).connections.has('guild123')).toBe(false);
    });
  });

  describe('waitForConnection', () => {
    it('should wait for connection successfully', async () => {
      await musicPlayer.waitForConnection(mockVoiceConnection);

      expect(entersState).toHaveBeenCalledWith(
        mockVoiceConnection,
        VoiceConnectionStatus.Ready,
        30_000
      );
    });

    it('should handle connection timeout', async () => {
      (entersState as jest.Mock).mockRejectedValue(new Error('Connection timeout'));

      await expect(musicPlayer.waitForConnection(mockVoiceConnection)).rejects.toThrow('Connection timeout');
    });
  });

  describe('getOrCreatePlayer events', () => {
    it('should handle player state change events', async () => {
      mockQueueManager.getCurrentSong.mockReturnValue(mockSong);

      // Trigger player creation by calling play
      await musicPlayer.play('guild123', mockVoiceConnection);

      // Verify that event handlers were set up
      expect(mockAudioPlayer.on).toHaveBeenCalledWith('stateChange', expect.any(Function));
      expect(mockAudioPlayer.on).toHaveBeenCalledWith(AudioPlayerStatus.Idle, expect.any(Function));
      expect(mockAudioPlayer.on).toHaveBeenCalledWith('error', expect.any(Function));

      // Trigger the stateChange event handler to cover line 185
      const stateChangeHandler = mockAudioPlayer.on.mock.calls.find((call: any) => call[0] === 'stateChange')?.[1];
      const oldState = { status: AudioPlayerStatus.Buffering };
      const newState = { status: AudioPlayerStatus.Playing };
      stateChangeHandler(oldState, newState);

      // Should log the state change (we can't easily verify logger calls due to mocking)
      expect(mockAudioPlayer.on).toHaveBeenCalledWith('stateChange', expect.any(Function));
    });

    it('should handle player idle event with next song', async () => {
      const nextSong: Song = { ...mockSong, title: 'Next Song' };
      mockQueueManager.getCurrentSong.mockReturnValue(mockSong);
      mockQueueManager.advance.mockReturnValue(nextSong);
      
      const playingQueue = { ...mockQueue, isPlaying: true };
      mockQueueManager.getQueue.mockReturnValue(playingQueue);

      // Trigger player creation and get the idle handler
      await musicPlayer.play('guild123', mockVoiceConnection);
      const idleHandler = mockAudioPlayer.on.mock.calls.find((call: any) => call[0] === AudioPlayerStatus.Idle)?.[1];

      // Set up connection for auto-play
      (musicPlayer as any).connections.set('guild123', mockVoiceConnection);

      // Trigger idle event
      await idleHandler();

      expect(mockQueueManager.advance).toHaveBeenCalledWith('guild123');
    });

    it('should handle player idle event with no next song', async () => {
      mockQueueManager.getCurrentSong.mockReturnValue(mockSong);
      mockQueueManager.advance.mockReturnValue(null);
      
      const playingQueue = { ...mockQueue, isPlaying: true };
      mockQueueManager.getQueue.mockReturnValue(playingQueue);

      // Trigger player creation and get the idle handler
      await musicPlayer.play('guild123', mockVoiceConnection);
      const idleHandler = mockAudioPlayer.on.mock.calls.find((call: any) => call[0] === AudioPlayerStatus.Idle)?.[1];

      // Trigger idle event
      await idleHandler();

      expect(mockQueueManager.advance).toHaveBeenCalledWith('guild123');
      expect(playingQueue.isPlaying).toBe(false);
    });

    it('should handle player error event', async () => {
      mockQueueManager.getCurrentSong.mockReturnValue(mockSong);

      // Trigger player creation and get the error handler
      await musicPlayer.play('guild123', mockVoiceConnection);
      const errorHandler = mockAudioPlayer.on.mock.calls.find((call: any) => call[0] === 'error')?.[1];

      // Trigger error event
      const testError = new Error('Player error');
      errorHandler(testError);

      // Should log the error (we can't easily verify logger calls due to mocking)
      expect(mockAudioPlayer.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('getStreamUrl error handling', () => {
    it('should handle unsupported platform', async () => {
      const unsupportedSong = { ...mockSong, platform: 'unsupported' as any };
      mockQueueManager.getCurrentSong.mockReturnValue(unsupportedSong);
      (ServiceFactory.getServiceByPlatform as jest.Mock).mockReturnValue(null);

      await musicPlayer.play('guild123', mockVoiceConnection);

      expect(ErrorHandler.handleVoiceError).toHaveBeenCalledWith(
        'guild123', 
        expect.objectContaining({
          message: 'Unsupported platform: unsupported'
        })
      );
    });
  });
});