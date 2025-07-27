/**
 * Monitoring and observability utilities for AMBER Discord Bot
 * Integrates with Prometheus, Sentry, and ELK stack
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import type { Request, Response } from 'express';
import type { Client } from 'discord.js';
import { logger } from './logger';

// Prometheus metrics collector
export class MetricsCollector {
  private static instance: MetricsCollector;
  private readonly metrics: Map<string, number | string> = new Map();

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  // Command execution metrics
  public incrementCommandUsage(command: string): void {
    const key = `command_${command}_total`;
    const current = (this.metrics.get(key) as number) || 0;
    this.metrics.set(key, current + 1);
  }

  // Music playback metrics
  public incrementSongPlayed(service: string): void {
    const key = `songs_played_${service}_total`;
    const current = (this.metrics.get(key) as number) || 0;
    this.metrics.set(key, current + 1);
  }

  // Queue metrics
  public setQueueLength(length: number): void {
    this.metrics.set('music_queue_length', length);
  }

  // Bot metrics
  public setGuildCount(count: number): void {
    this.metrics.set('discord_guilds_total', count);
  }

  public setUserCount(count: number): void {
    this.metrics.set('discord_users_total', count);
  }

  // Get metrics in Prometheus format
  public getPrometheusMetrics(): string {
    let output = '';
    
    this.metrics.forEach((value, key) => {
      output += `# HELP ${key} AMBER Discord Bot metric\n`;
      output += `# TYPE ${key} gauge\n`;
      output += `${key} ${value}\n\n`;
    });

    return output;
  }

  // Get metrics as JSON for ELK (aligned with Elasticsearch mappings)
  public getMetricsJSON(): { 
    timestamp: string; 
    service_name: string; 
    log_source: string;
    event_type: string;
    metrics: Record<string, number | string>; 
    version: string;
    message: string;
  } {
    const result: Record<string, number | string> = {};
    this.metrics.forEach((value, key) => {
      result[key] = value;
    });
    return {
      timestamp: new Date().toISOString(),
      service_name: 'amber-discord-bot',
      log_source: 'application',
      event_type: 'metrics',
      metrics: result,
      version: process.env.npm_package_version || '1.1.4',
      message: 'Application metrics collection'
    };
  }
}

// Health check utilities
export class HealthCheck {
  public static getHealthStatus(discordClient?: Client) {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.1.4',
      environment: process.env.NODE_ENV || 'development',
      discord_connection: this.checkDiscordConnection(discordClient),
      services: {
        spotify: this.checkSpotifyService(),
        youtube: this.checkYouTubeService(),
        soundcloud: this.checkSoundCloudService()
      }
    };
  }

  private static checkDiscordConnection(discordClient?: Client): string {
    if (!discordClient) {
      return 'not_initialized';
    }
    
    // Check if client is ready and connected
    if (discordClient.isReady?.()) {
      return 'connected';
    }
    
    // Check WebSocket connection status
    if (discordClient.ws?.status === 0) { // READY state
      return 'connected';
    }
    
    return 'disconnected';
  }

  private static checkSpotifyService(): string {
    try {
      // Check if Spotify credentials are configured
      if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
        return 'not_configured';
      }
      
      // For now, just check configuration - could be extended to test API call
      return 'configured';
    } catch (_error) {
      return 'error';
    }
  }

  private static checkYouTubeService(): string {
    // YouTube service uses ytdl-core which doesn't require API keys
    // Always available since it doesn't depend on external configuration
    return 'available';
  }

  private static checkSoundCloudService(): string {
    try {
      // Check if SoundCloud client ID is configured
      if (!process.env.SOUNDCLOUD_CLIENT_ID) {
        return 'not_configured';
      }
      
      // For now, just check configuration - could be extended to test API call
      return 'configured';
    } catch (_error) {
      return 'error';
    }
  }
}

// Sentry integration
export class ErrorTracking {
  public static init(): void {
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.SENTRY_ENVIRONMENT || 'production',
        release: process.env.npm_package_version || '1.1.4',
        // Tracing configuration (required for profiling)
        tracesSampleRate: 1.0,
        // Profiling configuration (Sentry v9 API)
        profilesSampleRate: 1.0,
        // Enable PII data collection for better profiling context
        sendDefaultPii: true,
        integrations: [
          // Enable profiling - must be first for proper initialization
          nodeProfilingIntegration(),
          // HTTP request tracing for API calls (YouTube, Spotify, Discord) - only if available
          ...(typeof Sentry.httpIntegration === 'function' ? [Sentry.httpIntegration()] : []),
          // Express.js tracing for metrics endpoint - only if available
          ...(typeof Sentry.expressIntegration === 'function' ? [Sentry.expressIntegration()] : []),
          // Node.js built-ins tracing - only if available
          ...(typeof Sentry.nativeNodeFetchIntegration === 'function' ? [Sentry.nativeNodeFetchIntegration()] : []),
          // Console integration for structured logging - only if available
          ...(typeof Sentry.consoleIntegration === 'function' ? [Sentry.consoleIntegration()] : [])
        ],
        beforeSend(event) {
          // Filter out sensitive information
          if (event.user) {
            delete event.user.ip_address;
          }
          return event;
        },
        beforeSendTransaction(transaction) {
          // Filter out sensitive data from transaction traces
          if (transaction.contexts?.trace?.data) {
            // Remove sensitive headers
            const data = transaction.contexts.trace.data;
            if (data['http.request.header.authorization']) {
              data['http.request.header.authorization'] = '[Filtered]';
            }
            if (data['http.request.header.cookie']) {
              data['http.request.header.cookie'] = '[Filtered]';
            }
          }
          return transaction;
        }
      });
    }
  }

  public static captureException(error: Error, context?: Record<string, unknown>): void {
    if (context) {
      Sentry.setContext('additional_data', context);
    }
    Sentry.captureException(error);
  }

  public static setUser(userId: string, username?: string): void {
    Sentry.setUser({
      id: userId,
      username: username
    });
  }

  public static addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      timestamp: Date.now() / 1000
    });
  }

  // Custom tracing for Discord bot operations
  public static startSpan<T>(name: string, operation: string, callback: () => T): T {
    return Sentry.startSpan({
      name,
      op: operation,
      attributes: {
        service: 'discord-bot'
      }
    }, callback);
  }

  public static traceCommand<T>(commandName: string, guildId: string, userId: string, callback: () => T): T {
    debugLog(`[SENTRY] Creating TRANSACTION for command: ${commandName} in guild ${guildId} by user ${userId}`);
    return Sentry.startSpan({
      name: `Discord Command: ${commandName}`,
      op: 'discord.command',
      forceTransaction: true,
      attributes: {
        'discord.command': commandName,
        'discord.guild_id': guildId,
        'discord.user_id': userId,
        service: 'discord-bot'
      }
    }, () => {
      debugLog(`[SENTRY] Command TRANSACTION active: ${commandName}`);
      try {
        const result = callback();
        debugLog(`[SENTRY] Command TRANSACTION success: ${commandName}`);
        return result;
      } catch (error) {
        debugLog(`[SENTRY] Command TRANSACTION error: ${commandName}, ${error}`);
        throw error;
      }
    });
  }

  public static traceMusicOperation<T>(operation: string, service: string, callback: () => T, track?: string): T {
    debugLog(`[SENTRY] Creating TRANSACTION for music: ${operation} (${service}) - ${track ?? 'unknown'}`);
    return Sentry.startSpan({
      name: `Music: ${operation}`,
      op: 'music.operation',
      forceTransaction: true,
      attributes: {
        'music.operation': operation,
        'music.service': service,
        'music.track': track ?? 'unknown',
        service: 'discord-bot'
      }
    }, () => {
      debugLog(`[SENTRY] Music TRANSACTION active: ${operation}`);
      try {
        const result = callback();
        debugLog(`[SENTRY] Music TRANSACTION success: ${operation}`);
        return result;
      } catch (error) {
        debugLog(`[SENTRY] Music TRANSACTION error: ${operation}, ${error}`);
        throw error;
      }
    });
  }

  public static traceApiCall<T>(service: string, endpoint: string, callback: () => T): T {
    debugLog(`[SENTRY] Creating TRANSACTION for API: ${service} (${endpoint})`);
    return Sentry.startSpan({
      name: `API Call: ${service}`,
      op: 'http.client',
      forceTransaction: true,
      attributes: {
        'api.service': service,
        'api.endpoint': endpoint,
        service: 'discord-bot'
      }
    }, () => {
      debugLog(`[SENTRY] API TRANSACTION active: ${service}`);
      try {
        const result = callback();
        debugLog(`[SENTRY] API TRANSACTION success: ${service}`);
        return result;
      } catch (error) {
        debugLog(`[SENTRY] API TRANSACTION error: ${service}, ${error}`);
        throw error;
      }
    });
  }

  // Manual profiling control (for CPU-intensive operations)
  public static withProfiling<T>(name: string, callback: () => T): T {
    return Sentry.startSpan({
      name,
      op: 'function',
      attributes: {
        'profiling.enabled': true,
        service: 'discord-bot'
      }
    }, () => {
      // The profiling happens automatically within spans when nodeProfilingIntegration is enabled
      return callback();
    });
  }
}

// ELK Stack integration via HTTP or structured logging
export class LogShipper {
  public static async sendLog(level: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
    // Create structured log entry (aligned with Logstash mapping)
    const logEntry = {
      timestamp: new Date().toISOString(),
      loglevel: level,
      message,
      service_name: 'amber-discord-bot',
      log_source: 'application',
      event_type: 'application_log',
      version: process.env.npm_package_version || '1.1.4',
      environment: process.env.NODE_ENV || 'development',
      ...metadata
    };

    // Send to ELK stack via HTTP if configured
    if (process.env.ELK_HOST) {
      const elkPort = process.env.ELK_PORT || '8080';
      const elkUrl = `http://${process.env.ELK_HOST}:${elkPort}`;
      
      try {
        const response = await fetch(elkUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(logEntry)
        });

        if (!response.ok) {
          console.warn('Failed to send log to ELK Stack:', response.statusText);
        }
      } catch (error) {
        console.warn('Error sending log to ELK Stack:', error);
      }
    } else {
      // Fallback to console logging for Filebeat collection
      console.log(JSON.stringify(logEntry));
    }
  }

  public static async sendEvent(event: string, data: Record<string, unknown>): Promise<void> {
    return this.sendLog('info', `Event: ${event}`, { 
      event_type: 'application_event',
      application_event: event,
      ...data 
    });
  }
}

// Export the metrics collector instance
export const metrics = MetricsCollector.getInstance();

// DRY helper for debug logging
const debugLog = (message: string) => {
  if (process.env.LOG_LEVEL === 'debug') {
    console.log(message);
  }
};

// DRY helper for consistent log message formatting
export const LogContext = {
  command: (command: string, guildId: string, userId: string) => 
    `${command} command by ${userId} in guild ${guildId}`,
  
  operation: (operation: string, guildId: string, details?: string) => {
    const baseMessage = `${operation} operation in guild ${guildId}`;
    return details ? `${baseMessage}: ${details}` : baseMessage;
  },
    
  service: (service: string, operation: string, details?: string) => {
    const baseMessage = `${service} ${operation}`;
    return details ? `${baseMessage}: ${details}` : baseMessage;
  }
};

// DRY helper for error logging with automatic Sentry capture
export class SentryLogger {
  public static error(message: string, error?: Error, context?: Record<string, unknown>) {
    logger.error(message, error);
    if (error) {
      ErrorTracking.captureException(error, {
        errorType: 'operational_error',
        message,
        ...context
      });
    } else {
      // If no error object, create a descriptive message for Sentry Issues
      Sentry.captureMessage(`Operational Issue: ${message}`, 'error');
    }
  }

  public static warn(message: string, context?: Record<string, unknown>) {
    logger.warn(message);
    Sentry.captureMessage(`Warning: ${message}`, 'warning');
    if (context) {
      Sentry.setContext('warning_context', context);
    }
  }
}

// Removed heartbeat - only flush transactions needed

// Sentry will auto-flush with 100% capture rate - no manual flush transactions needed

// Capture custom events for all major operations
export class SentryCapture {
  public static captureInfo(message: string, data?: Record<string, unknown>) {
    debugLog(`[SENTRY] Creating TRANSACTION for info: ${message}`);
    Sentry.startSpan({
      name: `Info: ${message}`,
      op: 'info.capture',
      forceTransaction: true,
      attributes: {
        service: 'discord-bot',
        message,
        ...data
      }
    }, () => {
      // Only set context, don't create duplicate events
      if (data) {
        Sentry.setContext('operation_data', data);
      }
    });
  }
  
  public static captureOperation(operation: string, service: string, data?: Record<string, unknown>) {
    debugLog(`[SENTRY] Creating TRANSACTION for operation: ${operation} (${service})`);
    Sentry.startSpan({
      name: `Operation: ${operation}`,
      op: 'operation.capture',
      forceTransaction: true,
      attributes: {
        service: 'discord-bot',
        operation,
        service_name: service,
        timestamp: new Date().toISOString(),
        ...data
      }
    }, () => {
      // Only set context, don't create duplicate events
      Sentry.setContext('operation_info', {
        operation,
        service,
        timestamp: new Date().toISOString(),
        ...data
      });
    });
  }
}

// Middleware for Express metrics endpoint
export function createMetricsEndpoint() {
  return (_req: Request, res: Response) => {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics.getPrometheusMetrics());
  };
}

// Middleware for Express health endpoint
export function createHealthEndpoint() {
  return (_req: Request, res: Response) => {
    res.json(HealthCheck.getHealthStatus());
  };
}