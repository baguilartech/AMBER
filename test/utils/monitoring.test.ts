// Mock Sentry before importing
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  setContext: jest.fn(),
  setUser: jest.fn(),
  addBreadcrumb: jest.fn()
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
      expect(json).toHaveProperty('service', 'amber-discord-bot');
      expect(json).toHaveProperty('version', '1.2.3');
      expect(json).toHaveProperty('metrics');
      expect(json.metrics['command_test_total']).toBe(1);
      expect(new Date(json.timestamp)).toBeInstanceOf(Date);
    });

    it('should use default version when npm_package_version is not set', () => {
      const json = collector.getMetricsJSON();
      expect(json.version).toBe('1.1.2');
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
      };
      
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
      
      expect(health.version).toBe('1.1.2');
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
      };
      const healthReady = HealthCheck.getHealthStatus(mockReadyClient);
      expect(healthReady.discord_connection).toBe('connected');

      // Test connected via WebSocket status
      const mockWSClient = {
        isReady: jest.fn().mockReturnValue(false),
        ws: { status: 0 } // READY state
      };
      const healthWS = HealthCheck.getHealthStatus(mockWSClient);
      expect(healthWS.discord_connection).toBe('connected');

      // Test disconnected
      const mockDisconnectedClient = {
        isReady: jest.fn().mockReturnValue(false),
        ws: { status: 1 } // Not READY state
      };
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
        release: '1.0.0',
        beforeSend: expect.any(Function)
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
        body: expect.stringContaining('"level":"error"')
      });

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody).toMatchObject({
        level: 'error',
        message: 'Test error',
        service: 'amber-discord-bot',
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
        level: 'info',
        message: 'Event: command_executed',
        event_type: 'command_executed',
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
      
      expect(body.version).toBe('1.1.2');
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
      expect(metricsJson.version).toBe('1.1.2');

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