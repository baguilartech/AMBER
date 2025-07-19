import { jest } from '@jest/globals';

// Mock prom-client before importing anything else
const mockCounter = {
  inc: jest.fn(),
  labels: jest.fn().mockReturnThis()
};

const mockGauge = {
  set: jest.fn(),
  labels: jest.fn().mockReturnThis()
};

const mockHistogram = {
  observe: jest.fn(),
  labels: jest.fn().mockReturnThis()
};

const mockRegister = {
  contentType: 'text/plain; version=0.0.4; charset=utf-8',
  metrics: jest.fn()
};

jest.mock('prom-client', () => ({
  register: mockRegister,
  collectDefaultMetrics: jest.fn(),
  Counter: jest.fn().mockImplementation(() => mockCounter),
  Gauge: jest.fn().mockImplementation(() => mockGauge),
  Histogram: jest.fn().mockImplementation(() => mockHistogram)
}));

// Mock express
const mockApp = {
  get: jest.fn(),
  listen: jest.fn(),
  disable: jest.fn()
};

jest.mock('express', () => jest.fn(() => mockApp));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.mock('../../src/utils/logger', () => ({
  logger: mockLogger
}));

describe('Metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset app mock
    mockApp.get.mockClear();
    mockApp.disable.mockClear();
    mockApp.listen.mockImplementation((...args: any[]) => {
      const callback = args[2];
      if (callback) callback();
    });
    
    // Reset register mock
    (mockRegister.metrics as any).mockResolvedValue('test_metric 1\n');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetModules();
  });

  describe('createMetricsServer', () => {
    it('should create and start metrics server with health and metrics endpoints', async () => {
      const { createMetricsServer } = await import('../../src/utils/metrics');
      
      createMetricsServer(3001);

      // Verify security header is disabled
      expect(mockApp.disable).toHaveBeenCalledWith('x-powered-by');
      
      // Verify endpoints were registered
      expect(mockApp.get).toHaveBeenCalledWith('/health', expect.any(Function));
      expect(mockApp.get).toHaveBeenCalledWith('/metrics', expect.any(Function));
      
      // Verify server was started
      expect(mockApp.listen).toHaveBeenCalledWith(3001, '0.0.0.0', expect.any(Function));
      
      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith('Metrics server started on port 3001');
      expect(mockLogger.info).toHaveBeenCalledWith('Health check: http://localhost:3001/health');
      expect(mockLogger.info).toHaveBeenCalledWith('Metrics endpoint: http://localhost:3001/metrics');
    });

    it('should handle health endpoint requests', async () => {
      const { createMetricsServer } = await import('../../src/utils/metrics');
      
      createMetricsServer(3001);

      // Get the health endpoint handler
      const healthHandler = mockApp.get.mock.calls.find((call: any) => call[0] === '/health')?.[1] as Function;
      expect(healthHandler).toBeDefined();

      // Mock response object
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Call the health endpoint
      healthHandler({}, mockRes);

      // Verify response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number)
      });
    });

    it('should handle metrics endpoint requests successfully', async () => {
      const mockMetrics = 'test_metric 1\n';
      (mockRegister.metrics as any).mockResolvedValue(mockMetrics);

      const { createMetricsServer } = await import('../../src/utils/metrics');
      
      createMetricsServer(3001);

      // Get the metrics endpoint handler
      const metricsHandler = mockApp.get.mock.calls.find((call: any) => call[0] === '/metrics')?.[1] as Function;
      expect(metricsHandler).toBeDefined();

      // Mock response object
      const mockRes = {
        set: jest.fn(),
        end: jest.fn()
      };

      // Call the metrics endpoint
      await metricsHandler({}, mockRes);

      // Verify response
      expect(mockRes.set).toHaveBeenCalledWith('Content-Type', mockRegister.contentType);
      expect(mockRes.end).toHaveBeenCalledWith(mockMetrics);
    });

    it('should handle metrics endpoint errors', async () => {
      const testError = new Error('Metrics generation failed');
      (mockRegister.metrics as any).mockRejectedValue(testError);

      const { createMetricsServer } = await import('../../src/utils/metrics');
      
      createMetricsServer(3001);

      // Get the metrics endpoint handler
      const metricsHandler = mockApp.get.mock.calls.find((call: any) => call[0] === '/metrics')?.[1] as Function;
      expect(metricsHandler).toBeDefined();

      // Mock response object
      const mockRes = {
        set: jest.fn(),
        end: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Call the metrics endpoint
      await metricsHandler({}, mockRes);

      // Verify error handling
      expect(mockLogger.error).toHaveBeenCalledWith('Error generating metrics:', testError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.end).toHaveBeenCalledWith('Error generating metrics');
    });

    it('should set bot status and start uptime interval', async () => {
      const { createMetricsServer } = await import('../../src/utils/metrics');
      
      createMetricsServer(3001);

      // Verify bot status was set to online
      expect(mockGauge.set).toHaveBeenCalledWith(1);

      // Fast-forward time to trigger interval
      jest.advanceTimersByTime(10000);

      // Verify uptime was incremented
      expect(mockCounter.inc).toHaveBeenCalledWith(10);
    });
  });

  describe('Helper Functions', () => {
    beforeEach(async () => {
      // Import the module to initialize the metrics
      await import('../../src/utils/metrics');
    });

    it('should track command execution successfully', async () => {
      const { trackCommand } = await import('../../src/utils/metrics');
      
      trackCommand('play', 'guild123', 1.5, true);

      expect(mockCounter.inc).toHaveBeenCalledWith({
        command: 'play',
        guild_id: 'guild123',
        status: 'success'
      });
      expect(mockHistogram.observe).toHaveBeenCalledWith({ command: 'play' }, 1.5);
    });

    it('should track command execution with error', async () => {
      const { trackCommand } = await import('../../src/utils/metrics');
      
      trackCommand('skip', 'guild456', 0.8, false);

      expect(mockCounter.inc).toHaveBeenCalledWith({
        command: 'skip',
        guild_id: 'guild456',
        status: 'error'
      });
      expect(mockHistogram.observe).toHaveBeenCalledWith({ command: 'skip' }, 0.8);
      expect(mockCounter.inc).toHaveBeenCalledWith({ type: 'command_error', command: 'skip' });
    });

    it('should update guild metrics', async () => {
      const { updateGuildMetrics } = await import('../../src/utils/metrics');
      
      updateGuildMetrics(10, 500);

      expect(mockGauge.set).toHaveBeenCalledWith(10);
      expect(mockGauge.set).toHaveBeenCalledWith(500);
    });

    it('should update voice connections', async () => {
      const { updateVoiceConnections } = await import('../../src/utils/metrics');
      
      updateVoiceConnections(3);

      expect(mockGauge.set).toHaveBeenCalledWith(3);
    });

    it('should update queue length', async () => {
      const { updateQueueLength } = await import('../../src/utils/metrics');
      
      updateQueueLength('guild789', 5);

      expect(mockGauge.set).toHaveBeenCalledWith({ guild_id: 'guild789' }, 5);
    });

    it('should track song play without load duration', async () => {
      const { trackSongPlay } = await import('../../src/utils/metrics');
      
      trackSongPlay('guild123', 'youtube');

      expect(mockCounter.inc).toHaveBeenCalledWith({ guild_id: 'guild123', platform: 'youtube' });
    });

    it('should track song play with load duration', async () => {
      const { trackSongPlay } = await import('../../src/utils/metrics');
      
      trackSongPlay('guild456', 'spotify', 2.5);

      expect(mockCounter.inc).toHaveBeenCalledWith({ guild_id: 'guild456', platform: 'spotify' });
      expect(mockHistogram.observe).toHaveBeenCalledWith({ platform: 'spotify' }, 2.5);
    });

    it('should track song play with zero load duration', async () => {
      const { trackSongPlay } = await import('../../src/utils/metrics');
      
      trackSongPlay('guild789', 'soundcloud', 0);

      expect(mockCounter.inc).toHaveBeenCalledWith({ guild_id: 'guild789', platform: 'soundcloud' });
      expect(mockHistogram.observe).toHaveBeenCalledWith({ platform: 'soundcloud' }, 0);
    });

    it('should track API latency', async () => {
      const { trackApiLatency } = await import('../../src/utils/metrics');
      
      trackApiLatency(0.125);

      expect(mockHistogram.observe).toHaveBeenCalledWith(0.125);
    });

    it('should shutdown metrics', async () => {
      const { shutdownMetrics } = await import('../../src/utils/metrics');
      
      shutdownMetrics();

      expect(mockGauge.set).toHaveBeenCalledWith(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Metrics server shutdown');
    });
  });

  describe('Discord Metrics Objects', () => {
    it('should initialize all metrics objects', async () => {
      const { discordMetrics, botStatus, botUptime } = await import('../../src/utils/metrics');
      
      // Verify all metrics objects are defined
      expect(discordMetrics).toBeDefined();
      expect(discordMetrics.commandsTotal).toBeDefined();
      expect(discordMetrics.messagesTotal).toBeDefined();
      expect(discordMetrics.songsPlayed).toBeDefined();
      expect(discordMetrics.errors).toBeDefined();
      expect(discordMetrics.guildsTotal).toBeDefined();
      expect(discordMetrics.membersTotal).toBeDefined();
      expect(discordMetrics.activeConnections).toBeDefined();
      expect(discordMetrics.queueLength).toBeDefined();
      expect(discordMetrics.commandDuration).toBeDefined();
      expect(discordMetrics.apiLatency).toBeDefined();
      expect(discordMetrics.songLoadDuration).toBeDefined();
      expect(botStatus).toBeDefined();
      expect(botUptime).toBeDefined();
    });
  });
});