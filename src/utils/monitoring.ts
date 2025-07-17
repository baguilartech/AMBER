/**
 * Monitoring and observability utilities for AMBER Discord Bot
 * Integrates with Prometheus, Sentry, and ELK stack
 */

import * as Sentry from '@sentry/node';
import type { Request, Response } from 'express';

// Prometheus metrics collector
export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Map<string, number | string> = new Map();

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

  // Get metrics as JSON for ELK
  public getMetricsJSON(): { timestamp: string; metrics: Record<string, number | string>; service: string; version: string } {
    const result: Record<string, number | string> = {};
    this.metrics.forEach((value, key) => {
      result[key] = value;
    });
    return {
      timestamp: new Date().toISOString(),
      metrics: result,
      service: 'amber-discord-bot',
      version: process.env.npm_package_version || '1.1.2'
    };
  }
}

// Health check utilities
export class HealthCheck {
  public static getHealthStatus() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.1.2',
      environment: process.env.NODE_ENV || 'development',
      discord_connection: 'connected', // TODO: Check actual Discord connection
      services: {
        spotify: 'connected', // TODO: Check Spotify API
        youtube: 'connected', // TODO: Check YouTube API
        soundcloud: 'connected' // TODO: Check SoundCloud API
      }
    };
  }
}

// Sentry integration
export class ErrorTracking {
  public static init(): void {
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.SENTRY_ENVIRONMENT || 'production',
        tracesSampleRate: 1.0,
        release: process.env.npm_package_version || '1.1.2',
        beforeSend(event) {
          // Filter out sensitive information
          if (event.user) {
            delete event.user.ip_address;
          }
          return event;
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
}

// ELK Stack integration via structured logging
// The ELK stack will collect logs via the Filebeat sidecar container
export class LogShipper {
  public static async sendLog(level: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
    // Create structured log entry for Filebeat to collect
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'amber-discord-bot',
      version: process.env.npm_package_version || '1.1.2',
      environment: process.env.NODE_ENV || 'development',
      ...metadata
    };

    // Output as structured JSON to stdout for Filebeat collection
    console.log(JSON.stringify(logEntry));
  }

  public static async sendEvent(event: string, data: Record<string, unknown>): Promise<void> {
    return this.sendLog('info', `Event: ${event}`, { event_type: event, ...data });
  }
}

// Export the metrics collector instance
export const metrics = MetricsCollector.getInstance();

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