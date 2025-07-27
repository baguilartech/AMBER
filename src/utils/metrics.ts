import { register, collectDefaultMetrics, Counter, Gauge, Histogram } from 'prom-client';
import express from 'express';
import { logger } from './logger';
import { ErrorTracking } from './monitoring';

// Initialize default metrics collection
collectDefaultMetrics({ register });

// Discord Bot specific metrics
export const discordMetrics = {
  // Counters
  commandsTotal: new Counter({
    name: 'discord_bot_commands_total',
    help: 'Total number of commands processed',
    labelNames: ['command', 'guild_id', 'status']
  }),

  messagesReceived: new Counter({
    name: 'discord_bot_messages_received_total',
    help: 'Total number of messages received',
    labelNames: ['guild_id', 'type']
  }),

  messagesSent: new Counter({
    name: 'discord_bot_messages_sent_total',
    help: 'Total number of messages sent by bot',
    labelNames: ['guild_id', 'type']
  }),

  songsPlayed: new Counter({
    name: 'discord_bot_songs_played_total',
    help: 'Total number of songs played',
    labelNames: ['guild_id', 'platform']
  }),

  errors: new Counter({
    name: 'discord_bot_errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'command']
  }),

  // Gauges
  guildsTotal: new Gauge({
    name: 'discord_bot_guilds_total',
    help: 'Number of guilds the bot is in'
  }),

  usersTotal: new Gauge({
    name: 'discord_bot_users_total',
    help: 'Total number of users across all guilds'
  }),

  activeConnections: new Gauge({
    name: 'discord_bot_voice_connections_active',
    help: 'Number of active voice connections'
  }),

  queueLength: new Gauge({
    name: 'discord_bot_queue_length',
    help: 'Current queue length per guild',
    labelNames: ['guild_id']
  }),

  // Histograms
  commandDuration: new Histogram({
    name: 'discord_bot_command_duration_seconds',
    help: 'Time taken to process commands',
    labelNames: ['command'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
  }),

  apiLatency: new Histogram({
    name: 'discord_bot_api_latency_seconds',
    help: 'Discord API latency',
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
  }),

  // Discord API specific metrics
  discordApiRequestDuration: new Histogram({
    name: 'discord_api_request_duration_seconds',
    help: 'Discord API request duration',
    labelNames: ['endpoint', 'method'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
  }),

  discordApiErrors: new Counter({
    name: 'discord_api_errors_total',
    help: 'Discord API errors',
    labelNames: ['status_code', 'endpoint']
  }),

  discordApiRateLimit: new Gauge({
    name: 'discord_api_rate_limit_percentage',
    help: 'Discord API rate limit usage percentage'
  }),

  songLoadDuration: new Histogram({
    name: 'discord_bot_song_load_duration_seconds',
    help: 'Time taken to load and buffer songs',
    labelNames: ['platform'],
    buckets: [1, 5, 10, 30, 60, 120]
  })
};

// Bot status gauge
export const botStatus = new Gauge({
  name: 'discord_bot_status',
  help: 'Discord bot online status (1 = online, 0 = offline)'
});

// Bot uptime counter
export const botUptime = new Counter({
  name: 'discord_bot_uptime_seconds_total',
  help: 'Bot uptime in seconds'
});

// Create metrics server
export function createMetricsServer(port: number): void {
  const app = express();
  
  // Disable X-Powered-By header for security
  app.disable('x-powered-by');

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Metrics endpoint
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.end(metrics);
    } catch (error) {
      logger.error('Error generating metrics:', error);
      ErrorTracking.captureException(error as Error, {
        errorType: 'metrics_generation_error',
        component: 'prometheus_metrics'
      });
      res.status(500).end('Error generating metrics');
    }
  });

  // Start metrics server
  app.listen(port, '0.0.0.0', () => {
    logger.info(`Metrics server started on port ${port}`);
    logger.info(`Health check: http://localhost:${port}/health`);
    logger.info(`Metrics endpoint: http://localhost:${port}/metrics`);
  });

  // Set bot status to online
  botStatus.set(1);
  
  // Update uptime every 10 seconds
  setInterval(() => {
    botUptime.inc(10);
  }, 10000);
}

// Helper function to track command execution
export function trackCommand(command: string, guildId: string, duration: number, success: boolean): void {
  discordMetrics.commandsTotal.inc({
    command,
    guild_id: guildId,
    status: success ? 'success' : 'error'
  });
  
  discordMetrics.commandDuration.observe({ command }, duration);
  
  if (!success) {
    discordMetrics.errors.inc({ type: 'command_error', command });
  }
}

// Helper function to update guild metrics
export function updateGuildMetrics(guilds: number, totalUsers: number): void {
  discordMetrics.guildsTotal.set(guilds);
  discordMetrics.usersTotal.set(totalUsers);
}

// Helper function to track message activity
export function trackMessageReceived(guildId: string, type: string = 'text'): void {
  discordMetrics.messagesReceived.inc({ guild_id: guildId, type });
}

export function trackMessageSent(guildId: string, type: string = 'text'): void {
  discordMetrics.messagesSent.inc({ guild_id: guildId, type });
}

// Helper function to track voice connections
export function updateVoiceConnections(activeConnections: number): void {
  discordMetrics.activeConnections.set(activeConnections);
}

// Helper function to track queue length
export function updateQueueLength(guildId: string, length: number): void {
  discordMetrics.queueLength.set({ guild_id: guildId }, length);
}

// Helper function to track song plays
export function trackSongPlay(guildId: string, platform: string, loadDuration?: number): void {
  discordMetrics.songsPlayed.inc({ guild_id: guildId, platform });
  
  if (loadDuration !== undefined) {
    discordMetrics.songLoadDuration.observe({ platform }, loadDuration);
  }
}

// Helper function to track API latency
export function trackApiLatency(latency: number): void {
  discordMetrics.apiLatency.observe(latency);
}

// Helper function to track Discord API requests
export function trackDiscordApiRequest(endpoint: string, method: string, duration: number, statusCode?: number): void {
  discordMetrics.discordApiRequestDuration.observe({ endpoint, method }, duration);
  
  if (statusCode && statusCode >= 400) {
    discordMetrics.discordApiErrors.inc({ status_code: statusCode.toString(), endpoint });
  }
}

// Helper function to update rate limit status
export function updateRateLimitStatus(percentage: number): void {
  discordMetrics.discordApiRateLimit.set(percentage);
}

// Graceful shutdown
export function shutdownMetrics(): void {
  botStatus.set(0);
  logger.info('Metrics server shutdown');
}