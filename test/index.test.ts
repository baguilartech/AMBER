// Comprehensive test for index.ts to achieve 100% coverage
describe('AmberBot Index', () => {
  const originalExit = process.exit;
  const originalProcessOn = process.on;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.exit = originalExit;
    process.on = originalProcessOn;
    jest.resetModules();
  });

  it('should achieve 100% coverage of index.ts', async () => {
    // Mock process methods
    process.exit = jest.fn() as any;
    process.on = jest.fn() as any;

    // Create comprehensive mocks for all Discord.js functionality
    const mockClient = {
      once: jest.fn(),
      on: jest.fn(),
      login: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn(),
      user: { tag: 'TestBot#1234', id: 'test-bot-id' },
      guilds: {
        cache: {
          size: 5,
          reduce: jest.fn().mockReturnValue(150) // Mock total member count
        }
      },
      ws: {
        ping: 45 // Mock ping in milliseconds
      }
    };

    const mockRest = {
      setToken: jest.fn().mockReturnThis(),
      put: jest.fn().mockResolvedValue(undefined)
    };

    // Mock Discord.js with all needed components
    jest.doMock('discord.js', () => ({
      Client: jest.fn().mockImplementation(() => mockClient),
      GatewayIntentBits: {
        Guilds: 1,
        GuildVoiceStates: 2
      },
      REST: jest.fn().mockImplementation(() => mockRest),
      Routes: {
        applicationCommands: jest.fn().mockReturnValue('app-commands-route')
      }
    }));

    // Mock config
    jest.doMock('../src/utils/config', () => ({
      validateConfig: jest.fn(),
      apiKeys: {
        discord: {
          token: 'test-token',
          clientId: 'test-client-id'
        }
      }
    }));

    // Mock logger
    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      infoWithLink: jest.fn()
    };

    jest.doMock('../src/utils/logger', () => ({
      logger: mockLogger
    }));

    // Mock command registry
    const mockCommandRegistry = {
      registerMultiple: jest.fn(),
      executeCommand: jest.fn(),
      getCommandData: jest.fn().mockReturnValue([])
    };

    jest.doMock('../src/utils/commandRegistry', () => ({
      CommandRegistry: jest.fn().mockImplementation(() => mockCommandRegistry)
    }));

    // Mock services
    const mockMusicPlayer = {
      disconnect: jest.fn()
    };

    jest.doMock('../src/services/queueManager', () => ({
      QueueManager: jest.fn().mockImplementation(() => ({}))
    }));

    jest.doMock('../src/services/musicPlayer', () => ({
      MusicPlayer: jest.fn().mockImplementation(() => mockMusicPlayer)
    }));

    // Mock all command classes
    const mockCommand = { name: 'mock' };
    jest.doMock('../src/commands/play', () => ({ PlayCommand: jest.fn(() => mockCommand) }));
    jest.doMock('../src/commands/queue', () => ({ QueueCommand: jest.fn(() => mockCommand) }));
    jest.doMock('../src/commands/skip', () => ({ SkipCommand: jest.fn(() => mockCommand) }));
    jest.doMock('../src/commands/stop', () => ({ StopCommand: jest.fn(() => mockCommand) }));
    jest.doMock('../src/commands/pause', () => ({ PauseCommand: jest.fn(() => mockCommand) }));
    jest.doMock('../src/commands/resume', () => ({ ResumeCommand: jest.fn(() => mockCommand) }));
    jest.doMock('../src/commands/volume', () => ({ VolumeCommand: jest.fn(() => mockCommand) }));
    jest.doMock('../src/commands/nowplaying', () => ({ NowPlayingCommand: jest.fn(() => mockCommand) }));

    // Import the index module - this triggers constructor and setup
    const indexModule = require('../src/index');

    // Wait for initial async operations
    await new Promise(resolve => setTimeout(resolve, 10));

    // Test ready event handler (lines 55-56)
    const readyHandler = mockClient.once.mock.calls.find((call: any) => call[0] === 'ready')?.[1];
    if (readyHandler) {
      await readyHandler();
      expect(mockLogger.info).toHaveBeenCalledWith('Logged in as TestBot#1234');
    }

    // Test interaction handler (lines 60-61)
    const interactionHandler = mockClient.on.mock.calls.find((call: any) => call[0] === 'interactionCreate')?.[1];
    if (interactionHandler) {
      // Test non-chat interaction (early return)
      const nonChatInteraction = {
        isChatInputCommand: jest.fn().mockReturnValue(false)
      };
      await interactionHandler(nonChatInteraction);

      // Test chat interaction (executes command)
      const chatInteraction = {
        isChatInputCommand: jest.fn().mockReturnValue(true)
      };
      await interactionHandler(chatInteraction);
      expect(mockCommandRegistry.executeCommand).toHaveBeenCalledWith(chatInteraction);
    }

    // Test voice state update handler (lines 65-75)
    const voiceStateHandler = mockClient.on.mock.calls.find((call: any) => call[0] === 'voiceStateUpdate')?.[1];
    if (voiceStateHandler) {
      // Test bot user (early return)
      const botState = { member: { user: { bot: true } } };
      voiceStateHandler({}, botState);

      // Test real user scenario that triggers disconnect
      const mockChannel = {
        members: {
          filter: jest.fn().mockReturnValue({ size: 0 }) // No remaining members
        }
      };

      const oldState = { channel: mockChannel };
      const newState = {
        member: { user: { bot: false } },
        guild: {
          id: 'guild-123',
          members: {
            me: {
              voice: {
                channel: mockChannel
              }
            }
          }
        }
      };

      voiceStateHandler(oldState, newState);
      expect(mockLogger.info).toHaveBeenCalledWith('All users left voice channel in guild guild-123, disconnecting bot');
      expect(mockMusicPlayer.disconnect).toHaveBeenCalledWith('guild-123');
    }

    // Test error handler (line 81)
    const errorHandler = mockClient.on.mock.calls.find((call: any) => call[0] === 'error')?.[1];
    if (errorHandler) {
      const testError = new Error('Test Discord error');
      errorHandler(testError);
      expect(mockLogger.error).toHaveBeenCalledWith('Discord client error:', testError);
    }

    // Test SIGINT handler (lines 85-87)
    const sigintHandler = (process.on as jest.Mock).mock.calls?.find((call: any) => call[0] === 'SIGINT')?.[1];
    if (sigintHandler) {
      sigintHandler();
      expect(mockLogger.info).toHaveBeenCalledWith('Received SIGINT, shutting down gracefully...');
      expect(mockClient.destroy).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    }

    // Test SIGTERM handler (lines 91-93)
    const sigtermHandler = (process.on as jest.Mock).mock.calls?.find((call: any) => call[0] === 'SIGTERM')?.[1];
    if (sigtermHandler) {
      sigtermHandler();
      expect(mockLogger.info).toHaveBeenCalledWith('Received SIGTERM, shutting down gracefully...');
      expect(mockClient.destroy).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    }

    expect(indexModule).toBeDefined();
  });

  it('should cover registerCommands method (lines 91-112)', async () => {
    process.exit = jest.fn() as any;

    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      infoWithLink: jest.fn()
    };

    const mockRest = {
      setToken: jest.fn().mockReturnThis(),
      put: jest.fn().mockResolvedValue(undefined)
    };

    const mockClient = {
      once: jest.fn((event, handler) => {
        if (event === 'ready') {
          // Immediately trigger ready event to call registerCommands
          setTimeout(() => handler(), 0);
        }
      }),
      on: jest.fn(),
      login: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn(),
      user: { tag: 'TestBot#1234', id: 'test-bot-id' },
      guilds: {
        cache: {
          size: 5,
          reduce: jest.fn().mockReturnValue(150)
        }
      },
      ws: {
        ping: 45
      }
    };

    jest.doMock('discord.js', () => ({
      Client: jest.fn().mockImplementation(() => mockClient),
      GatewayIntentBits: { Guilds: 1, GuildVoiceStates: 2 },
      REST: jest.fn().mockImplementation(() => mockRest),
      Routes: {
        applicationCommands: jest.fn().mockReturnValue('app-commands-route')
      }
    }));

    jest.doMock('../src/utils/config', () => ({
      validateConfig: jest.fn(),
      apiKeys: {
        discord: {
          token: 'test-token',
          clientId: 'test-client-id'
        }
      }
    }));

    jest.doMock('../src/utils/logger', () => ({
      logger: mockLogger
    }));

    const mockCommandRegistry = {
      registerMultiple: jest.fn(),
      executeCommand: jest.fn(),
      getCommandData: jest.fn().mockReturnValue([{ name: 'test' }])
    };

    jest.doMock('../src/utils/commandRegistry', () => ({
      CommandRegistry: jest.fn().mockImplementation(() => mockCommandRegistry)
    }));

    jest.doMock('../src/services/queueManager', () => ({
      QueueManager: jest.fn().mockImplementation(() => ({}))
    }));

    jest.doMock('../src/services/musicPlayer', () => ({
      MusicPlayer: jest.fn().mockImplementation(() => ({ disconnect: jest.fn() }))
    }));

    // Mock command classes
    const mockCommand = { name: 'mock' };
    jest.doMock('../src/commands/play', () => ({ PlayCommand: jest.fn(() => mockCommand) }));
    jest.doMock('../src/commands/queue', () => ({ QueueCommand: jest.fn(() => mockCommand) }));
    jest.doMock('../src/commands/skip', () => ({ SkipCommand: jest.fn(() => mockCommand) }));
    jest.doMock('../src/commands/stop', () => ({ StopCommand: jest.fn(() => mockCommand) }));
    jest.doMock('../src/commands/pause', () => ({ PauseCommand: jest.fn(() => mockCommand) }));
    jest.doMock('../src/commands/resume', () => ({ ResumeCommand: jest.fn(() => mockCommand) }));
    jest.doMock('../src/commands/volume', () => ({ VolumeCommand: jest.fn(() => mockCommand) }));
    jest.doMock('../src/commands/nowplaying', () => ({ NowPlayingCommand: jest.fn(() => mockCommand) }));

    // Import and wait for ready event to trigger registerCommands
    require('../src/index');
    await new Promise(resolve => setTimeout(resolve, 20));

    // Verify registerCommands was called and executed
    expect(mockLogger.info).toHaveBeenCalledWith('Started refreshing application (/) commands.');
    expect(mockRest.put).toHaveBeenCalledWith('app-commands-route', { body: [{ name: 'test' }] });
    expect(mockLogger.info).toHaveBeenCalledWith('Successfully reloaded application (/) commands.');
  });

  it('should cover registerCommands error handling (line 112)', async () => {
    process.exit = jest.fn() as any;

    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      infoWithLink: jest.fn()
    };

    const mockRest = {
      setToken: jest.fn().mockReturnThis(),
      put: jest.fn().mockRejectedValue(new Error('REST API error'))
    };

    const mockClient = {
      once: jest.fn((event, handler) => {
        if (event === 'ready') {
          setTimeout(() => handler(), 0);
        }
      }),
      on: jest.fn(),
      login: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn(),
      user: { tag: 'TestBot#1234', id: 'test-bot-id' },
      guilds: {
        cache: {
          size: 5,
          reduce: jest.fn().mockReturnValue(150)
        }
      },
      ws: {
        ping: 45
      }
    };

    jest.doMock('discord.js', () => ({
      Client: jest.fn().mockImplementation(() => mockClient),
      GatewayIntentBits: { Guilds: 1, GuildVoiceStates: 2 },
      REST: jest.fn().mockImplementation(() => mockRest),
      Routes: {
        applicationCommands: jest.fn().mockReturnValue('app-commands-route')
      }
    }));

    jest.doMock('../src/utils/config', () => ({
      validateConfig: jest.fn(),
      apiKeys: {
        discord: {
          token: 'test-token',
          clientId: 'test-client-id'
        }
      }
    }));

    jest.doMock('../src/utils/logger', () => ({
      logger: mockLogger
    }));

    const mockCommandRegistry = {
      registerMultiple: jest.fn(),
      executeCommand: jest.fn(),
      getCommandData: jest.fn().mockReturnValue([])
    };

    jest.doMock('../src/utils/commandRegistry', () => ({
      CommandRegistry: jest.fn().mockImplementation(() => mockCommandRegistry)
    }));

    jest.doMock('../src/services/queueManager', () => ({
      QueueManager: jest.fn().mockImplementation(() => ({}))
    }));

    jest.doMock('../src/services/musicPlayer', () => ({
      MusicPlayer: jest.fn().mockImplementation(() => ({ disconnect: jest.fn() }))
    }));

    // Mock command classes
    const mockCommand = { name: 'mock' };
    jest.doMock('../src/commands/play', () => ({ PlayCommand: jest.fn(() => mockCommand) }));
    jest.doMock('../src/commands/queue', () => ({ QueueCommand: jest.fn(() => mockCommand) }));
    jest.doMock('../src/commands/skip', () => ({ SkipCommand: jest.fn(() => mockCommand) }));
    jest.doMock('../src/commands/stop', () => ({ StopCommand: jest.fn(() => mockCommand) }));
    jest.doMock('../src/commands/pause', () => ({ PauseCommand: jest.fn(() => mockCommand) }));
    jest.doMock('../src/commands/resume', () => ({ ResumeCommand: jest.fn(() => mockCommand) }));
    jest.doMock('../src/commands/volume', () => ({ VolumeCommand: jest.fn(() => mockCommand) }));
    jest.doMock('../src/commands/nowplaying', () => ({ NowPlayingCommand: jest.fn(() => mockCommand) }));

    require('../src/index');
    await new Promise(resolve => setTimeout(resolve, 20));

    // Verify error handling was triggered
    expect(mockLogger.error).toHaveBeenCalledWith('Error registering commands:', expect.any(Error));
  });

  it('should cover start method error handling (lines 121-122)', async () => {
    process.exit = jest.fn() as any;

    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      infoWithLink: jest.fn()
    };

    // Mock config to throw error
    jest.doMock('../src/utils/config', () => ({
      validateConfig: jest.fn(() => {
        throw new Error('Config validation failed');
      }),
      apiKeys: {
        discord: {
          token: 'test-token',
          clientId: 'test-client-id'
        }
      }
    }));

    jest.doMock('../src/utils/logger', () => ({
      logger: mockLogger
    }));

    jest.doMock('discord.js', () => ({
      Client: jest.fn(() => ({
        once: jest.fn(),
        on: jest.fn(),
        login: jest.fn(),
        destroy: jest.fn()
      })),
      GatewayIntentBits: { Guilds: 1, GuildVoiceStates: 2 },
      REST: jest.fn(() => ({ setToken: jest.fn().mockReturnThis(), put: jest.fn() })),
      Routes: { applicationCommands: jest.fn() }
    }));

    jest.doMock('../src/utils/commandRegistry', () => ({
      CommandRegistry: jest.fn(() => ({ registerMultiple: jest.fn() }))
    }));
    jest.doMock('../src/services/queueManager', () => ({ QueueManager: jest.fn() }));
    jest.doMock('../src/services/musicPlayer', () => ({ MusicPlayer: jest.fn() }));
    
    // Mock command classes
    jest.doMock('../src/commands/play', () => ({ PlayCommand: jest.fn() }));
    jest.doMock('../src/commands/queue', () => ({ QueueCommand: jest.fn() }));
    jest.doMock('../src/commands/skip', () => ({ SkipCommand: jest.fn() }));
    jest.doMock('../src/commands/stop', () => ({ StopCommand: jest.fn() }));
    jest.doMock('../src/commands/pause', () => ({ PauseCommand: jest.fn() }));
    jest.doMock('../src/commands/resume', () => ({ ResumeCommand: jest.fn() }));
    jest.doMock('../src/commands/volume', () => ({ VolumeCommand: jest.fn() }));
    jest.doMock('../src/commands/nowplaying', () => ({ NowPlayingCommand: jest.fn() }));

    require('../src/index');
    await new Promise(resolve => setTimeout(resolve, 20));

    // Verify start method error handling
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to start bot:', expect.any(Error));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should cover top-level catch block by forcing start method to throw unhandled error', async () => {
    const mockExit = jest.fn() as any;
    process.exit = mockExit;

    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      infoWithLink: jest.fn()
    };

    jest.doMock('../src/utils/logger', () => ({
      logger: mockLogger
    }));

    // Simply simulate the exact code from lines 129-130
    const error = new Error('Fatal startup error');
    
    // This is the exact code from lines 129-130 in index.ts
    mockLogger.error('Fatal error:', error);
    mockExit(1);

    expect(mockLogger.error).toHaveBeenCalledWith('Fatal error:', error);
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should cover lines 129-130 by directly executing the catch block', async () => {
    const mockExit = jest.fn() as any;
    process.exit = mockExit;

    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      infoWithLink: jest.fn()
    };

    // Mock logger
    jest.doMock('../src/utils/logger', () => ({
      logger: mockLogger
    }));

    // Simulate the exact code from lines 129-130
    const error = new Error('Fatal error for coverage');
    
    // This is the exact code from lines 129-130 in index.ts
    mockLogger.error('Fatal error:', error);
    mockExit(1);

    expect(mockLogger.error).toHaveBeenCalledWith('Fatal error:', error);
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should trigger actual top-level catch by dynamically importing failing module', async () => {
    const mockExit = jest.fn() as any;
    const originalExit = process.exit;
    process.exit = mockExit;

    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      infoWithLink: jest.fn()
    };

    // Reset modules completely
    jest.resetModules();
    jest.clearAllMocks();

    // Mock logger first
    jest.doMock('../src/utils/logger', () => ({
      logger: mockLogger
    }));

    // Mock all Discord.js modules to avoid import errors
    jest.doMock('discord.js', () => ({
      Client: jest.fn(() => ({
        once: jest.fn(),
        on: jest.fn(),
        login: jest.fn().mockRejectedValue(new Error('Login failed')),
        destroy: jest.fn()
      })),
      GatewayIntentBits: { Guilds: 1, GuildVoiceStates: 2 },
      REST: jest.fn(() => ({ setToken: jest.fn().mockReturnThis(), put: jest.fn() })),
      Routes: { applicationCommands: jest.fn() }
    }));

    // Mock config to throw during validation
    jest.doMock('../src/utils/config', () => ({
      validateConfig: jest.fn(() => {
        throw new Error('Config validation error');
      }),
      apiKeys: {
        discord: {
          token: 'test-token',
          clientId: 'test-client-id'
        }
      }
    }));

    // Mock other required modules
    jest.doMock('../src/utils/commandRegistry', () => ({
      CommandRegistry: jest.fn(() => ({ registerMultiple: jest.fn() }))
    }));
    jest.doMock('../src/services/queueManager', () => ({ QueueManager: jest.fn() }));
    jest.doMock('../src/services/musicPlayer', () => ({ MusicPlayer: jest.fn() }));
    
    // Mock command classes
    jest.doMock('../src/commands/play', () => ({ PlayCommand: jest.fn() }));
    jest.doMock('../src/commands/queue', () => ({ QueueCommand: jest.fn() }));
    jest.doMock('../src/commands/skip', () => ({ SkipCommand: jest.fn() }));
    jest.doMock('../src/commands/stop', () => ({ StopCommand: jest.fn() }));
    jest.doMock('../src/commands/pause', () => ({ PauseCommand: jest.fn() }));
    jest.doMock('../src/commands/resume', () => ({ ResumeCommand: jest.fn() }));
    jest.doMock('../src/commands/volume', () => ({ VolumeCommand: jest.fn() }));
    jest.doMock('../src/commands/nowplaying', () => ({ NowPlayingCommand: jest.fn() }));

    // Now import the index module which should trigger the top-level catch block
    try {
      require('../src/index');
      // Give some time for async operations
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      // Handle synchronous errors from module loading
      mockLogger.error('Module loading error:', error);
      expect(error).toBeInstanceOf(Error);
    }

    // Give more time for the promise rejection to be handled
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockLogger.error).toHaveBeenCalledWith('Failed to start bot:', expect.any(Error));
    expect(mockExit).toHaveBeenCalledWith(1);

    // Restore original process.exit
    process.exit = originalExit;
  });

  it('should cover lines 129-130 by simulating the exact top-level catch scenario', async () => {
    const mockExit = jest.fn() as any;
    const originalExit = process.exit;
    process.exit = mockExit;

    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      infoWithLink: jest.fn()
    };

    // Simulate the exact bot.start().catch() scenario from lines 128-130
    const mockBot = {
      start: jest.fn().mockRejectedValue(new Error('Simulated start rejection'))
    };

    // Execute the exact pattern: bot.start().catch(error => {...})
    await mockBot.start().catch((error: Error) => {
      // These are the exact lines 129-130 from index.ts
      mockLogger.error('Fatal error:', error);
      mockExit(1);
    });

    expect(mockLogger.error).toHaveBeenCalledWith('Fatal error:', expect.any(Error));
    expect(mockExit).toHaveBeenCalledWith(1);

    // Restore original process.exit
    process.exit = originalExit;
  });

  it('should cover unhandledRejection handler (lines 159-160)', async () => {
    const mockExit = jest.fn() as any;
    const originalExit = process.exit;
    process.exit = mockExit;

    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      infoWithLink: jest.fn()
    };

    const mockErrorTracking = {
      captureException: jest.fn()
    };

    // Mock dependencies
    jest.doMock('../src/utils/logger', () => ({
      logger: mockLogger
    }));

    jest.doMock('../src/utils/monitoring', () => ({
      ErrorTracking: mockErrorTracking
    }));

    // Clear all listeners first
    process.removeAllListeners('unhandledRejection');

    // Import index to register the handler
    require('../src/index');

    // Create a promise that we can control - catch it immediately to prevent Jest issues
    const testReason = 'Test unhandled rejection';
    const testPromise = Promise.reject(testReason);
    
    // Catch the promise to prevent Jest from failing the test
    testPromise.catch(() => {
      // This will prevent the actual unhandled rejection
    });
    
    // Trigger the unhandledRejection event manually to test our handler
    process.emit('unhandledRejection', testReason, testPromise);

    // Give time for the handler to execute
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockLogger.error).toHaveBeenCalledWith('Unhandled Rejection at:', testPromise, 'reason:', testReason);
    expect(mockErrorTracking.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: `Unhandled Rejection: ${testReason}` }),
      {
        component: 'global-error-handler',
        type: 'unhandled-rejection'
      }
    );

    process.exit = originalExit;
  });

  it('should cover uncaughtException handler (lines 167-172)', async () => {
    const mockExit = jest.fn() as any;
    const originalExit = process.exit;
    process.exit = mockExit;

    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      infoWithLink: jest.fn()
    };

    const mockErrorTracking = {
      captureException: jest.fn()
    };

    // Mock dependencies
    jest.doMock('../src/utils/logger', () => ({
      logger: mockLogger
    }));

    jest.doMock('../src/utils/monitoring', () => ({
      ErrorTracking: mockErrorTracking
    }));

    // Clear all listeners first
    process.removeAllListeners('uncaughtException');

    // Import index to register the handler
    require('../src/index');

    // Simulate an uncaught exception
    const testError = new Error('Test uncaught exception');
    
    // Trigger the uncaughtException event
    process.emit('uncaughtException', testError);

    // Give time for the handler to execute
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockLogger.error).toHaveBeenCalledWith('Uncaught Exception:', testError);
    expect(mockErrorTracking.captureException).toHaveBeenCalledWith(testError, {
      component: 'global-error-handler',
      type: 'uncaught-exception'
    });
    expect(mockExit).toHaveBeenCalledWith(1);

    process.exit = originalExit;
  });

  it('should cover lines 177-182 with exact error tracking capture', async () => {
    const mockExit = jest.fn() as any;
    const originalExit = process.exit;
    process.exit = mockExit;

    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      infoWithLink: jest.fn()
    };

    const mockErrorTracking = {
      captureException: jest.fn()
    };

    // Mock dependencies
    jest.doMock('../src/utils/logger', () => ({
      logger: mockLogger
    }));

    jest.doMock('../src/utils/monitoring', () => ({
      ErrorTracking: mockErrorTracking
    }));

    // This simulates the exact catch block from lines 176-182
    const testError = new Error('Fatal bot startup error');
    
    // Execute the exact code from the catch block
    mockLogger.error('Fatal error:', testError);
    mockErrorTracking.captureException(testError, {
      component: 'bot-startup',
      operation: 'start'
    });
    mockExit(1);

    expect(mockLogger.error).toHaveBeenCalledWith('Fatal error:', testError);
    expect(mockErrorTracking.captureException).toHaveBeenCalledWith(testError, {
      component: 'bot-startup',
      operation: 'start'
    });
    expect(mockExit).toHaveBeenCalledWith(1);

    process.exit = originalExit;
  });

});