// Mock Sentry before importing
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setContext: jest.fn(),
  setUser: jest.fn(),
  addBreadcrumb: jest.fn(),
  startSpan: jest.fn(),
  httpIntegration: jest.fn(() => 'http-integration'),
  expressIntegration: jest.fn(() => 'express-integration'),
  nativeNodeFetchIntegration: jest.fn(() => 'fetch-integration'),
  consoleIntegration: jest.fn(() => 'console-integration')
}));

// Mock fetch for LogShipper tests
global.fetch = jest.fn();

import * as Sentry from '@sentry/node';
import { Request, Response } from 'express';
import {
  MetricsCollector,
  HealthCheck,
  ErrorTracking,
  LogShipper,
  metrics,
  createMetricsEndpoint,
  createHealthEndpoint
} from '../../src/utils/monitoring';

describe('Monitoring Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.SENTRY_DSN;
    delete process.env.SENTRY_ENVIRONMENT;
    delete process.env.ELK_HOST;
    delete process.env.ELK_PORT;
    delete process.env.npm_package_version;
    delete process.env.NODE_ENV;
    delete process.env.SPOTIFY_CLIENT_ID;
    delete process.env.SPOTIFY_CLIENT_SECRET;
    delete process.env.SOUNDCLOUD_CLIENT_ID;
    
    // Ensure process.env is properly restored
    if (process.env.constructor !== Object) {
      const originalEnv = require('process').env;
      Object.defineProperty(process, 'env', {
        value: originalEnv,
        configurable: true,
        writable: true
      });
    }
  });

  describe('MetricsCollector', () => {
    let collector: MetricsCollector;

    beforeEach(() => {
      // Get a fresh instance for each test
      collector = MetricsCollector.getInstance();
      // Clear metrics between tests
      (collector as any).metrics.clear();
    });

    it('should be a singleton', () => {
      const instance1 = MetricsCollector.getInstance();
      const instance2 = MetricsCollector.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should increment command usage metrics', () => {
      collector.incrementCommandUsage('play');
      collector.incrementCommandUsage('play');
      collector.incrementCommandUsage('skip');

      const metrics = collector.getMetricsJSON();
      expect(metrics.metrics['command_play_total']).toBe(2);
      expect(metrics.metrics['command_skip_total']).toBe(1);
    });

    it('should increment song played metrics', () => {
      collector.incrementSongPlayed('youtube');
      collector.incrementSongPlayed('spotify');
      collector.incrementSongPlayed('youtube');

      const metrics = collector.getMetricsJSON();
      expect(metrics.metrics['songs_played_youtube_total']).toBe(2);
      expect(metrics.metrics['songs_played_spotify_total']).toBe(1);
    });

    it('should set queue length metrics', () => {
      collector.setQueueLength(5);
      
      const metrics = collector.getMetricsJSON();
      expect(metrics.metrics['music_queue_length']).toBe(5);
    });

    it('should set guild count metrics', () => {
      collector.setGuildCount(10);
      
      const metrics = collector.getMetricsJSON();
      expect(metrics.metrics['discord_guilds_total']).toBe(10);
    });

    it('should set user count metrics', () => {
      collector.setUserCount(100);
      
      const metrics = collector.getMetricsJSON();
      expect(metrics.metrics['discord_users_total']).toBe(100);
    });

    it('should generate Prometheus format metrics', () => {
      collector.incrementCommandUsage('play');
      collector.setQueueLength(3);

      const prometheus = collector.getPrometheusMetrics();
      
      expect(prometheus).toContain('# HELP command_play_total AMBER Discord Bot metric');
      expect(prometheus).toContain('# TYPE command_play_total gauge');
      expect(prometheus).toContain('command_play_total 1');
      expect(prometheus).toContain('music_queue_length 3');
    });

    it('should generate JSON format metrics with metadata', () => {
      process.env.npm_package_version = '1.2.3';
      collector.incrementCommandUsage('test');

      const json = collector.getMetricsJSON();
      
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('service_name', 'amber-discord-bot');
      expect(json).toHaveProperty('version', '1.2.3');
      expect(json).toHaveProperty('metrics');
      expect(json.metrics['command_test_total']).toBe(1);
      expect(new Date(json.timestamp)).toBeInstanceOf(Date);
    });

    it('should use default version when npm_package_version is not set', () => {
      const json = collector.getMetricsJSON();
      expect(json.version).toBe('1.1.4');
    });
  });

  describe('HealthCheck', () => {
    it('should return health status with all required fields', () => {
      process.env.npm_package_version = '2.0.0';
      process.env.NODE_ENV = 'production';
      // Set service environment variables for "configured" status
      process.env.SPOTIFY_CLIENT_ID = 'test-spotify-id';
      process.env.SPOTIFY_CLIENT_SECRET = 'test-spotify-secret';
      process.env.SOUNDCLOUD_CLIENT_ID = 'test-soundcloud-id';

      // Mock Discord client for testing
      const mockDiscordClient = {
        isReady: jest.fn().mockReturnValue(true),
        ws: { status: 0 } // READY state
      } as any;
      
      const health = HealthCheck.getHealthStatus(mockDiscordClient);
      
      expect(health).toHaveProperty('status', 'healthy');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('memory');
      expect(health).toHaveProperty('version', '2.0.0');
      expect(health).toHaveProperty('environment', 'production');
      expect(health).toHaveProperty('discord_connection', 'connected');
      expect(health).toHaveProperty('services');
      
      expect(health.services).toHaveProperty('spotify', 'configured');
      expect(health.services).toHaveProperty('youtube', 'available');
      expect(health.services).toHaveProperty('soundcloud', 'configured');
      
      expect(typeof health.uptime).toBe('number');
      expect(typeof health.memory).toBe('object');
      expect(new Date(health.timestamp)).toBeInstanceOf(Date);
    });

    it('should use default values when environment variables are not set', () => {
      delete process.env.npm_package_version;
      delete process.env.NODE_ENV;

      const health = HealthCheck.getHealthStatus();
      
      expect(health.version).toBe('1.1.4');
      expect(health.environment).toBe('development');
    });

    it('should include memory usage details', () => {
      const health = HealthCheck.getHealthStatus();
      
      expect(health.memory).toHaveProperty('rss');
      expect(health.memory).toHaveProperty('heapTotal');
      expect(health.memory).toHaveProperty('heapUsed');
      expect(health.memory).toHaveProperty('external');
    });

    it('should handle Discord connection states', () => {
      // Test not_initialized
      const healthNoClient = HealthCheck.getHealthStatus();
      expect(healthNoClient.discord_connection).toBe('not_initialized');

      // Test connected via isReady
      const mockReadyClient = {
        isReady: jest.fn().mockReturnValue(true),
        ws: { status: 1 } // Not READY state
      } as any;
      const healthReady = HealthCheck.getHealthStatus(mockReadyClient);
      expect(healthReady.discord_connection).toBe('connected');

      // Test connected via WebSocket status
      const mockWSClient = {
        isReady: jest.fn().mockReturnValue(false),
        ws: { status: 0 } // READY state
      } as any;
      const healthWS = HealthCheck.getHealthStatus(mockWSClient);
      expect(healthWS.discord_connection).toBe('connected');

      // Test disconnected
      const mockDisconnectedClient = {
        isReady: jest.fn().mockReturnValue(false),
        ws: { status: 1 } // Not READY state
      } as any;
      const healthDisconnected = HealthCheck.getHealthStatus(mockDisconnectedClient);
      expect(healthDisconnected.discord_connection).toBe('disconnected');
    });

    it('should handle Spotify service configuration states', () => {
      // Test not_configured - no env vars
      delete process.env.SPOTIFY_CLIENT_ID;
      delete process.env.SPOTIFY_CLIENT_SECRET;
      const healthNotConfigured = HealthCheck.getHealthStatus();
      expect(healthNotConfigured.services.spotify).toBe('not_configured');

      // Test not_configured - missing CLIENT_SECRET
      process.env.SPOTIFY_CLIENT_ID = 'test-id';
      delete process.env.SPOTIFY_CLIENT_SECRET;
      const healthMissingSecret = HealthCheck.getHealthStatus();
      expect(healthMissingSecret.services.spotify).toBe('not_configured');

      // Test not_configured - missing CLIENT_ID
      delete process.env.SPOTIFY_CLIENT_ID;
      process.env.SPOTIFY_CLIENT_SECRET = 'test-secret';
      const healthMissingId = HealthCheck.getHealthStatus();
      expect(healthMissingId.services.spotify).toBe('not_configured');
    });

    it('should handle SoundCloud service configuration states', () => {
      // Test not_configured
      delete process.env.SOUNDCLOUD_CLIENT_ID;
      const healthNotConfigured = HealthCheck.getHealthStatus();
      expect(healthNotConfigured.services.soundcloud).toBe('not_configured');

      // Test configured
      process.env.SOUNDCLOUD_CLIENT_ID = 'test-soundcloud-id';
      const healthConfigured = HealthCheck.getHealthStatus();
      expect(healthConfigured.services.soundcloud).toBe('configured');
    });

    it('should handle service check errors', () => {
      // Instead of breaking process.env globally, let's test the error paths differently
      // We'll test individual service methods that might throw errors
      
      // Test YouTube service error handling
      const healthYouTube = HealthCheck.getHealthStatus();
      expect(healthYouTube.services.youtube).toBe('available'); // YouTube should always be available
      
      // Test services with missing partial config (edge cases)
      process.env.SPOTIFY_CLIENT_ID = 'test-id';
      delete process.env.SPOTIFY_CLIENT_SECRET;
      const healthPartialSpotify = HealthCheck.getHealthStatus();
      expect(healthPartialSpotify.services.spotify).toBe('not_configured');
      
      // Test completely missing config
      delete process.env.SPOTIFY_CLIENT_ID;
      delete process.env.SPOTIFY_CLIENT_SECRET;
      delete process.env.SOUNDCLOUD_CLIENT_ID;
      const healthNoConfig = HealthCheck.getHealthStatus();
      expect(healthNoConfig.services.spotify).toBe('not_configured');
      expect(healthNoConfig.services.soundcloud).toBe('not_configured');
      expect(healthNoConfig.services.youtube).toBe('available');
    });

    it('should handle Spotify service errors', () => {
      // Mock individual property access to throw errors
      const originalSpotifyId = process.env.SPOTIFY_CLIENT_ID;
      const originalSpotifySecret = process.env.SPOTIFY_CLIENT_SECRET;
      
      // Create a getter that throws an error
      Object.defineProperty(process.env, 'SPOTIFY_CLIENT_ID', {
        get() {
          throw new Error('Environment access error');
        },
        configurable: true
      });

      const health = HealthCheck.getHealthStatus();
      expect(health.services.spotify).toBe('error');

      // Restore original values
      Object.defineProperty(process.env, 'SPOTIFY_CLIENT_ID', {
        value: originalSpotifyId,
        configurable: true,
        writable: true
      });
      Object.defineProperty(process.env, 'SPOTIFY_CLIENT_SECRET', {
        value: originalSpotifySecret,
        configurable: true,
        writable: true
      });
    });

    it('should handle SoundCloud service errors', () => {
      // Mock individual property access to throw errors
      const originalSoundcloudId = process.env.SOUNDCLOUD_CLIENT_ID;
      
      // Create a getter that throws an error
      Object.defineProperty(process.env, 'SOUNDCLOUD_CLIENT_ID', {
        get() {
          throw new Error('Environment access error');
        },
        configurable: true
      });

      const health = HealthCheck.getHealthStatus();
      expect(health.services.soundcloud).toBe('error');

      // Restore original value
      Object.defineProperty(process.env, 'SOUNDCLOUD_CLIENT_ID', {
        value: originalSoundcloudId,
        configurable: true,
        writable: true
      });
    });


  });

  describe('ErrorTracking', () => {
    it('should initialize Sentry when DSN is provided', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      process.env.SENTRY_ENVIRONMENT = 'test';
      process.env.npm_package_version = '1.0.0';

      ErrorTracking.init();

      expect(Sentry.init).toHaveBeenCalledWith({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
        tracesSampleRate: 1.0,
        profilesSampleRate: 1.0,
        sendDefaultPii: true,
        release: '1.0.0',
        integrations: expect.any(Array),
        beforeSend: expect.any(Function),
        beforeSendTransaction: expect.any(Function)
      });
    });

    it('should not initialize Sentry when DSN is not provided', () => {
      ErrorTracking.init();
      expect(Sentry.init).not.toHaveBeenCalled();
    });

    it('should use default environment when not specified', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      delete process.env.SENTRY_ENVIRONMENT;

      ErrorTracking.init();

      expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({
        environment: 'production'
      }));
    });

    it('should filter out IP address in beforeSend hook', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      ErrorTracking.init();

      const initCall = (Sentry.init as jest.Mock).mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      const event = {
        user: {
          id: 'user123',
          ip_address: '192.168.1.1'
        }
      };

      const result = beforeSend(event);
      expect(result.user).not.toHaveProperty('ip_address');
      expect(result.user).toHaveProperty('id', 'user123');
    });

    it('should handle events without user in beforeSend hook', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      ErrorTracking.init();

      const initCall = (Sentry.init as jest.Mock).mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      const event = { message: 'test error' };
      const result = beforeSend(event);
      expect(result).toEqual(event);
    });

    it('should capture exceptions', () => {
      const error = new Error('Test error');
      ErrorTracking.captureException(error);

      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should capture exceptions with context', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'play' };

      ErrorTracking.captureException(error, context);

      expect(Sentry.setContext).toHaveBeenCalledWith('additional_data', context);
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should set user information', () => {
      ErrorTracking.setUser('user123', 'testuser');

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: 'user123',
        username: 'testuser'
      });
    });

    it('should set user information without username', () => {
      ErrorTracking.setUser('user123');

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: 'user123',
        username: undefined
      });
    });

    it('should add breadcrumbs', () => {
      const data = { songId: '123' };
      ErrorTracking.addBreadcrumb('Song played', 'music', data);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'Song played',
        category: 'music',
        data: data,
        timestamp: expect.any(Number)
      });
    });

    it('should add breadcrumbs without data', () => {
      ErrorTracking.addBreadcrumb('User joined', 'user');

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'User joined',
        category: 'user',
        data: undefined,
        timestamp: expect.any(Number)
      });
    });

    it('should filter sensitive data in beforeSendTransaction hook', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      ErrorTracking.init();

      const initCall = (Sentry.init as jest.Mock).mock.calls[0][0];
      const beforeSendTransaction = initCall.beforeSendTransaction;

      const transaction = {
        contexts: {
          trace: {
            data: {
              'http.request.header.authorization': 'Bearer secret-token',
              'http.request.header.cookie': 'session=abc123',
              'http.request.header.user-agent': 'Mozilla/5.0'
            }
          }
        }
      };

      const result = beforeSendTransaction(transaction);
      expect(result.contexts.trace.data['http.request.header.authorization']).toBe('[Filtered]');
      expect(result.contexts.trace.data['http.request.header.cookie']).toBe('[Filtered]');
      expect(result.contexts.trace.data['http.request.header.user-agent']).toBe('Mozilla/5.0');
    });

    it('should handle transactions without trace context in beforeSendTransaction hook', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      ErrorTracking.init();

      const initCall = (Sentry.init as jest.Mock).mock.calls[0][0];
      const beforeSendTransaction = initCall.beforeSendTransaction;

      const transaction = { name: 'test transaction' };
      const result = beforeSendTransaction(transaction);
      expect(result).toEqual(transaction);
    });

    it('should initialize with all available integrations', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/456';
      process.env.SENTRY_ENVIRONMENT = 'test-integrations';
      
      ErrorTracking.init();

      const initCall = (Sentry.init as jest.Mock).mock.calls[0][0];
      expect(initCall.integrations).toEqual(expect.arrayContaining([
        'http-integration',
        'express-integration', 
        'fetch-integration',
        'console-integration'
      ]));
    });

    it('should initialize with only available integrations when some are missing', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/789';
      
      // Mock scenario where some integrations are not available
      const originalSentry = jest.requireMock('@sentry/node');
      const mockSentryWithMissingIntegrations = {
        ...originalSentry,
        httpIntegration: undefined, // Make this undefined
        expressIntegration: jest.fn(() => 'express-integration'),
        nativeNodeFetchIntegration: undefined, // Make this undefined  
        consoleIntegration: jest.fn(() => 'console-integration'),
        init: jest.fn()
      };
      
      // Temporarily replace the mocked Sentry module
      jest.doMock('@sentry/node', () => mockSentryWithMissingIntegrations);
      
      // Re-import the module to get the updated mock
      jest.resetModules();
      const { ErrorTracking } = require('../../src/utils/monitoring');
      
      ErrorTracking.init();

      const initCall = mockSentryWithMissingIntegrations.init.mock.calls[0][0];
      expect(initCall.integrations).toEqual(expect.arrayContaining([
        'express-integration',
        'console-integration'
      ]));
      expect(initCall.integrations).not.toEqual(expect.arrayContaining([
        'http-integration',
        'fetch-integration'
      ]));
      
      // Restore original mock
      jest.doMock('@sentry/node', () => originalSentry);
      jest.resetModules();
    });

    it('should initialize with no optional integrations when none are available', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/999';
      
      // Mock scenario where no optional integrations are available
      const originalSentry = jest.requireMock('@sentry/node');
      const mockSentryWithNoIntegrations = {
        ...originalSentry,
        httpIntegration: undefined,
        expressIntegration: undefined, 
        nativeNodeFetchIntegration: undefined,
        consoleIntegration: undefined,
        init: jest.fn()
      };
      
      // Temporarily replace the mocked Sentry module
      jest.doMock('@sentry/node', () => mockSentryWithNoIntegrations);
      
      // Re-import the module to get the updated mock
      jest.resetModules();
      const { ErrorTracking } = require('../../src/utils/monitoring');
      
      ErrorTracking.init();

      const initCall = mockSentryWithNoIntegrations.init.mock.calls[0][0];
      // Should only contain the nodeProfilingIntegration (which is always present)
      expect(initCall.integrations).toHaveLength(1);
      
      // Restore original mock
      jest.doMock('@sentry/node', () => originalSentry);
      jest.resetModules();
    });

    it('should execute startSpan with custom tracing', () => {
      const mockCallback = jest.fn().mockReturnValue('test-result');
      (Sentry.startSpan as jest.Mock).mockImplementation((_, callback) => callback());

      const result = ErrorTracking.startSpan('test-span', 'test-operation', mockCallback);

      expect(Sentry.startSpan).toHaveBeenCalledWith({
        name: 'test-span',
        op: 'test-operation',
        attributes: {
          service: 'discord-bot'
        }
      }, expect.any(Function));
      expect(result).toBe('test-result');
    });

    it('should execute traceCommand with Discord command tracing', () => {
      const mockCallback = jest.fn().mockReturnValue('command-result');
      (Sentry.startSpan as jest.Mock).mockImplementation((_, callback) => callback());

      const result = ErrorTracking.traceCommand('play', 'guild123', 'user456', mockCallback);

      expect(Sentry.startSpan).toHaveBeenCalledWith({
        name: 'Discord Command: play',
        op: 'discord.command',
        forceTransaction: true,
        attributes: {
          'discord.command': 'play',
          'discord.guild_id': 'guild123',
          'discord.user_id': 'user456',
          service: 'discord-bot'
        }
      }, expect.any(Function));
      expect(result).toBe('command-result');
    });

    it('should execute traceMusicOperation with music tracing', () => {
      const mockCallback = jest.fn().mockReturnValue('music-result');
      (Sentry.startSpan as jest.Mock).mockImplementation((_, callback) => callback());

      const result = ErrorTracking.traceMusicOperation('play', 'youtube', mockCallback, 'test-track');

      expect(Sentry.startSpan).toHaveBeenCalledWith({
        name: 'Music: play',
        op: 'music.operation',
        forceTransaction: true,
        attributes: {
          'music.operation': 'play',
          'music.service': 'youtube',
          'music.track': 'test-track',
          service: 'discord-bot'
        }
      }, expect.any(Function));
      expect(result).toBe('music-result');
    });

    it('should execute traceMusicOperation without track name', () => {
      const mockCallback = jest.fn().mockReturnValue('music-result');
      (Sentry.startSpan as jest.Mock).mockImplementation((_, callback) => callback());

      const result = ErrorTracking.traceMusicOperation('skip', 'spotify', mockCallback);

      expect(Sentry.startSpan).toHaveBeenCalledWith({
        name: 'Music: skip',
        op: 'music.operation',
        forceTransaction: true,
        attributes: {
          'music.operation': 'skip',
          'music.service': 'spotify',
          'music.track': 'unknown',
          service: 'discord-bot'
        }
      }, expect.any(Function));
      expect(result).toBe('music-result');
    });

    it('should execute traceApiCall with API call tracing', () => {
      const mockCallback = jest.fn().mockReturnValue('api-result');
      (Sentry.startSpan as jest.Mock).mockImplementation((_, callback) => callback());

      const result = ErrorTracking.traceApiCall('spotify', '/api/tracks', mockCallback);

      expect(Sentry.startSpan).toHaveBeenCalledWith({
        name: 'API Call: spotify',
        op: 'http.client',
        forceTransaction: true,
        attributes: {
          'api.service': 'spotify',
          'api.endpoint': '/api/tracks',
          service: 'discord-bot'
        }
      }, expect.any(Function));
      expect(result).toBe('api-result');
    });

    it('should execute withProfiling with profiling tracing', () => {
      const mockCallback = jest.fn().mockReturnValue('profiling-result');
      (Sentry.startSpan as jest.Mock).mockImplementation((_, innerCallback) => innerCallback());

      const result = ErrorTracking.withProfiling('cpu-intensive-task', mockCallback);

      expect(Sentry.startSpan).toHaveBeenCalledWith({
        name: 'cpu-intensive-task',
        op: 'function',
        attributes: {
          'profiling.enabled': true,
          service: 'discord-bot'
        }
      }, expect.any(Function));
      expect(result).toBe('profiling-result');
    });

    it('should handle errors in traceCommand and log debug', () => {
      const originalLogLevel = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'debug';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const mockCallback = jest.fn().mockImplementation(() => {
        throw new Error('Test command error');
      });
      (Sentry.startSpan as jest.Mock).mockImplementation((_, callback) => callback());

      expect(() => {
        ErrorTracking.traceCommand('play', 'guild123', 'user456', mockCallback);
      }).toThrow('Test command error');

      expect(consoleSpy).toHaveBeenCalledWith('[SENTRY] Command TRANSACTION error: play, Error: Test command error');
      
      consoleSpy.mockRestore();
      process.env.LOG_LEVEL = originalLogLevel;
    });

    it('should handle errors in traceMusicOperation and log debug', () => {
      const originalLogLevel = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'debug';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const mockCallback = jest.fn().mockImplementation(() => {
        throw new Error('Test music error');
      });
      (Sentry.startSpan as jest.Mock).mockImplementation((_, callback) => callback());

      expect(() => {
        ErrorTracking.traceMusicOperation('play', 'youtube', mockCallback, 'test-track');
      }).toThrow('Test music error');

      expect(consoleSpy).toHaveBeenCalledWith('[SENTRY] Music TRANSACTION error: play, Error: Test music error');
      
      consoleSpy.mockRestore();
      process.env.LOG_LEVEL = originalLogLevel;
    });

    it('should handle errors in traceApiCall and log debug', () => {
      const originalLogLevel = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'debug';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const mockCallback = jest.fn().mockImplementation(() => {
        throw new Error('Test API error');
      });
      (Sentry.startSpan as jest.Mock).mockImplementation((_, callback) => callback());

      expect(() => {
        ErrorTracking.traceApiCall('spotify', '/api/tracks', mockCallback);
      }).toThrow('Test API error');

      expect(consoleSpy).toHaveBeenCalledWith('[SENTRY] API TRANSACTION error: spotify, Error: Test API error');
      
      consoleSpy.mockRestore();
      process.env.LOG_LEVEL = originalLogLevel;
    });

    it('should log debug messages when debug mode is enabled', () => {
      const originalLogLevel = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'debug';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const mockCallback = jest.fn().mockReturnValue('result');
      (Sentry.startSpan as jest.Mock).mockImplementation((_, callback) => callback());

      ErrorTracking.traceCommand('play', 'guild123', 'user456', mockCallback);

      expect(consoleSpy).toHaveBeenCalledWith('[SENTRY] Creating TRANSACTION for command: play in guild guild123 by user user456');
      
      consoleSpy.mockRestore();
      process.env.LOG_LEVEL = originalLogLevel;
    });
  });

  describe('SentryCapture', () => {
    it('should capture info with data and log debug', () => {
      const { SentryCapture } = require('../../src/utils/monitoring');
      const originalLogLevel = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'debug';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const setContextSpy = jest.spyOn(Sentry, 'setContext');
      (Sentry.startSpan as jest.Mock).mockImplementation((_, callback) => callback());

      SentryCapture.captureInfo('Test info message', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalledWith('[SENTRY] Creating TRANSACTION for info: Test info message');
      expect(setContextSpy).toHaveBeenCalledWith('operation_data', { key: 'value' });
      
      consoleSpy.mockRestore();
      setContextSpy.mockRestore();
      process.env.LOG_LEVEL = originalLogLevel;
    });

    it('should capture info without data', () => {
      const { SentryCapture } = require('../../src/utils/monitoring');
      const setContextSpy = jest.spyOn(Sentry, 'setContext');
      (Sentry.startSpan as jest.Mock).mockImplementation((_, callback) => callback());

      SentryCapture.captureInfo('Test info without data');

      expect(setContextSpy).not.toHaveBeenCalled();
      
      setContextSpy.mockRestore();
    });

    it('should capture operation with data and log debug', () => {
      const { SentryCapture } = require('../../src/utils/monitoring');
      const originalLogLevel = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'debug';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const setContextSpy = jest.spyOn(Sentry, 'setContext');
      (Sentry.startSpan as jest.Mock).mockImplementation((_, callback) => callback());

      SentryCapture.captureOperation('test-operation', 'discord-service', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalledWith('[SENTRY] Creating TRANSACTION for operation: test-operation (discord-service)');
      expect(setContextSpy).toHaveBeenCalledWith('operation_info', expect.objectContaining({
        operation: 'test-operation',
        service: 'discord-service',
        key: 'value'
      }));
      
      consoleSpy.mockRestore();
      setContextSpy.mockRestore();
      process.env.LOG_LEVEL = originalLogLevel;
    });

    it('should capture operation without data', () => {
      const { SentryCapture } = require('../../src/utils/monitoring');
      const setContextSpy = jest.spyOn(Sentry, 'setContext');
      (Sentry.startSpan as jest.Mock).mockImplementation((_, callback) => callback());

      SentryCapture.captureOperation('simple-operation', 'test-service');

      expect(setContextSpy).toHaveBeenCalledWith('operation_info', expect.objectContaining({
        operation: 'simple-operation',
        service: 'test-service'
      }));
      
      setContextSpy.mockRestore();
    });
  });

  describe('SentryLogger', () => {
    it('should handle warn method with context', () => {
      const { SentryLogger } = require('../../src/utils/monitoring');
      const loggerSpy = jest.spyOn(require('../../src/utils/logger').logger, 'warn');
      const captureMessageSpy = jest.spyOn(Sentry, 'captureMessage');
      const setContextSpy = jest.spyOn(Sentry, 'setContext');
      
      SentryLogger.warn('Test warning', { contextKey: 'contextValue' });
      
      expect(loggerSpy).toHaveBeenCalledWith('Test warning');
      expect(captureMessageSpy).toHaveBeenCalledWith('Warning: Test warning', 'warning');
      expect(setContextSpy).toHaveBeenCalledWith('warning_context', { contextKey: 'contextValue' });
      
      loggerSpy.mockRestore();
      captureMessageSpy.mockRestore();
      setContextSpy.mockRestore();
    });

    it('should handle warn method without context', () => {
      const { SentryLogger } = require('../../src/utils/monitoring');
      const loggerSpy = jest.spyOn(require('../../src/utils/logger').logger, 'warn');
      const captureMessageSpy = jest.spyOn(Sentry, 'captureMessage');
      const setContextSpy = jest.spyOn(Sentry, 'setContext');
      
      SentryLogger.warn('Test warning without context');
      
      expect(loggerSpy).toHaveBeenCalledWith('Test warning without context');
      expect(captureMessageSpy).toHaveBeenCalledWith('Warning: Test warning without context', 'warning');
      expect(setContextSpy).not.toHaveBeenCalled();
      
      loggerSpy.mockRestore();
      captureMessageSpy.mockRestore();
      setContextSpy.mockRestore();
    });

    it('should handle error method with error object and context', () => {
      const { SentryLogger } = require('../../src/utils/monitoring');
      const loggerSpy = jest.spyOn(require('../../src/utils/logger').logger, 'error');
      const captureExceptionSpy = jest.spyOn(require('../../src/utils/monitoring').ErrorTracking, 'captureException');
      
      const testError = new Error('Test error');
      const context = { userId: '123', action: 'test' };
      
      SentryLogger.error('Something went wrong', testError, context);
      
      expect(loggerSpy).toHaveBeenCalledWith('Something went wrong', testError);
      expect(captureExceptionSpy).toHaveBeenCalledWith(testError, {
        errorType: 'operational_error',
        message: 'Something went wrong',
        ...context
      });
      
      loggerSpy.mockRestore();
      captureExceptionSpy.mockRestore();
    });

    it('should handle error method without error object', () => {
      const { SentryLogger } = require('../../src/utils/monitoring');
      const loggerSpy = jest.spyOn(require('../../src/utils/logger').logger, 'error');
      const captureMessageSpy = jest.spyOn(Sentry, 'captureMessage');
      
      SentryLogger.error('Operational issue occurred');
      
      expect(loggerSpy).toHaveBeenCalledWith('Operational issue occurred', undefined);
      expect(captureMessageSpy).toHaveBeenCalledWith('Operational Issue: Operational issue occurred', 'error');
      
      loggerSpy.mockRestore();
      captureMessageSpy.mockRestore();
    });
  });

  describe('LogContext', () => {
    it('should format operation with details', () => {
      const { LogContext } = require('../../src/utils/monitoring');
      const result = LogContext.operation('test-op', 'guild-123', 'extra details');
      expect(result).toBe('test-op operation in guild guild-123: extra details');
    });

    it('should format operation without details', () => {
      const { LogContext } = require('../../src/utils/monitoring');
      const result = LogContext.operation('test-op', 'guild-123');
      expect(result).toBe('test-op operation in guild guild-123');
    });

    it('should format service with details', () => {
      const { LogContext } = require('../../src/utils/monitoring');
      const result = LogContext.service('spotify', 'search', 'for song');
      expect(result).toBe('spotify search: for song');
    });

    it('should format service without details', () => {
      const { LogContext } = require('../../src/utils/monitoring');
      const result = LogContext.service('spotify', 'search');
      expect(result).toBe('spotify search');
    });

    it('should format command consistently', () => {
      const { LogContext } = require('../../src/utils/monitoring');
      const result = LogContext.command('play', 'guild-123', 'user-456');
      expect(result).toBe('play command by user-456 in guild guild-123');
    });
  });

  describe('LogShipper', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockClear();
    });

    it('should not send logs when ELK_HOST is not configured', async () => {
      delete process.env.ELK_HOST;
      await LogShipper.sendLog('info', 'Test message');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should send logs to ELK stack when configured', async () => {
      process.env.ELK_HOST = 'localhost';
      process.env.ELK_PORT = '9200';
      process.env.npm_package_version = '1.0.0';
      process.env.NODE_ENV = 'test';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      const metadata = { userId: '123' };
      await LogShipper.sendLog('error', 'Test error', metadata);

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:9200', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: expect.stringContaining('"loglevel":"error"')
      });

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody).toMatchObject({
        loglevel: 'error',
        message: 'Test error',
        service_name: 'amber-discord-bot',
        version: '1.0.0',
        environment: 'test',
        userId: '123'
      });
      expect(requestBody.timestamp).toBeDefined();
    });

    it('should use default port when ELK_PORT is not set', async () => {
      process.env.ELK_HOST = 'elasticsearch';
      delete process.env.ELK_PORT;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      await LogShipper.sendLog('info', 'Test message');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://elasticsearch:8080',
        expect.any(Object)
      );
    });

    it('should handle fetch errors gracefully', async () => {
      process.env.ELK_HOST = 'localhost';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await LogShipper.sendLog('info', 'Test message');

      expect(consoleSpy).toHaveBeenCalledWith('Error sending log to ELK Stack:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle HTTP errors gracefully', async () => {
      process.env.ELK_HOST = 'localhost';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      });

      await LogShipper.sendLog('info', 'Test message');

      expect(consoleSpy).toHaveBeenCalledWith('Failed to send log to ELK Stack:', 'Internal Server Error');
      consoleSpy.mockRestore();
    });

    it('should send events as info logs', async () => {
      process.env.ELK_HOST = 'localhost';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      const eventData = { command: 'play', guild: 'test-guild' };
      await LogShipper.sendEvent('command_executed', eventData);

      expect(global.fetch).toHaveBeenCalled();
      
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody).toMatchObject({
        loglevel: 'info',
        message: 'Event: command_executed',
        event_type: 'application_event',
        application_event: 'command_executed',
        command: 'play',
        guild: 'test-guild'
      });
    });

    it('should use default values when environment variables are not set', async () => {
      process.env.ELK_HOST = 'localhost';
      delete process.env.npm_package_version;
      delete process.env.NODE_ENV;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      await LogShipper.sendLog('info', 'Test message');

      expect(global.fetch).toHaveBeenCalled();
      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      
      expect(body.version).toBe('1.1.4');
      expect(body.environment).toBe('development');
    });
  });

  describe('Express Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockRequest = {};
      mockResponse = {
        set: jest.fn(),
        send: jest.fn(),
        json: jest.fn()
      };
    });

    describe('createMetricsEndpoint', () => {
      it('should return middleware function that serves Prometheus metrics', () => {
        const middleware = createMetricsEndpoint();
        expect(typeof middleware).toBe('function');

        // Add some test metrics
        metrics.incrementCommandUsage('test');
        
        middleware(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.set).toHaveBeenCalledWith(
          'Content-Type', 
          'text/plain; version=0.0.4; charset=utf-8'
        );
        expect(mockResponse.send).toHaveBeenCalledWith(
          expect.stringContaining('command_test_total 1')
        );
      });

      it('should serve empty metrics when no metrics are recorded', () => {
        // Clear metrics
        (metrics as any).metrics.clear();
        
        const middleware = createMetricsEndpoint();
        middleware(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.set).toHaveBeenCalledWith(
          'Content-Type', 
          'text/plain; version=0.0.4; charset=utf-8'
        );
        expect(mockResponse.send).toHaveBeenCalledWith('');
      });
    });

    describe('createHealthEndpoint', () => {
      it('should return middleware function that serves health status', () => {
        const middleware = createHealthEndpoint();
        expect(typeof middleware).toBe('function');

        middleware(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'healthy',
            timestamp: expect.any(String),
            uptime: expect.any(Number),
            memory: expect.any(Object),
            version: expect.any(String),
            environment: expect.any(String),
            discord_connection: 'not_initialized', // No Discord client passed
            services: expect.objectContaining({
              spotify: 'not_configured', // No env vars set in test
              youtube: 'available',
              soundcloud: 'not_configured' // No env vars set in test
            })
          })
        );
      });
    });
  });

  describe('Exported metrics instance', () => {
    it('should export a singleton metrics instance', () => {
      expect(metrics).toBe(MetricsCollector.getInstance());
    });

    it('should allow direct usage of metrics instance', () => {
      metrics.incrementCommandUsage('direct-test');
      const json = metrics.getMetricsJSON();
      expect(json.metrics['command_direct-test_total']).toBe(1);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete monitoring workflow', () => {
      // Setup environment
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      process.env.ELK_HOST = 'localhost';
      process.env.npm_package_version = '2.0.0';

      // Initialize error tracking
      ErrorTracking.init();

      // Record some metrics
      metrics.incrementCommandUsage('play');
      metrics.incrementSongPlayed('youtube');
      metrics.setQueueLength(5);
      metrics.setGuildCount(10);
      metrics.setUserCount(100);

      // Add error tracking context
      ErrorTracking.setUser('user123', 'testuser');
      ErrorTracking.addBreadcrumb('Command executed', 'command', { command: 'play' });

      // Verify metrics collection
      const metricsJson = metrics.getMetricsJSON();
      expect(metricsJson.metrics['command_play_total']).toBe(1);
      expect(metricsJson.metrics['songs_played_youtube_total']).toBe(1);
      expect(metricsJson.metrics['music_queue_length']).toBe(5);

      // Verify health check
      const health = HealthCheck.getHealthStatus();
      expect(health.status).toBe('healthy');
      expect(health.version).toBe('2.0.0');

      // Verify Sentry initialization
      expect(Sentry.init).toHaveBeenCalled();
      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: 'user123',
        username: 'testuser'
      });
      expect(Sentry.addBreadcrumb).toHaveBeenCalled();
    });

    it('should work properly in minimal environment', () => {
      // Clear all environment variables
      delete process.env.SENTRY_DSN;
      delete process.env.ELK_HOST;
      delete process.env.npm_package_version;
      delete process.env.NODE_ENV;

      // Initialize (should not fail)
      ErrorTracking.init();

      // Record metrics (should work)
      metrics.incrementCommandUsage('minimal');
      const metricsJson = metrics.getMetricsJSON();
      expect(metricsJson.metrics['command_minimal_total']).toBe(1);
      expect(metricsJson.version).toBe('1.1.4');

      // Get health status (should work)
      const health = HealthCheck.getHealthStatus();
      expect(health.status).toBe('healthy');
      expect(health.environment).toBe('development');

      // Error tracking should not fail
      ErrorTracking.captureException(new Error('Test'));
      ErrorTracking.setUser('user123');
      ErrorTracking.addBreadcrumb('Test breadcrumb', 'test');

      expect(Sentry.init).not.toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });
});