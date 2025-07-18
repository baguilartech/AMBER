export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    // Read LOG_LEVEL directly from environment to avoid circular dependency with config
    const envLogLevel = process.env.LOG_LEVEL || 'info';
    this.logLevel = this.getLogLevel(envLogLevel);
  }

  private getLogLevel(level: string): LogLevel {
    switch (level) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (level <= this.logLevel) {
      const timestamp = new Date().toISOString();
      const levelName = LogLevel[level];
      console.log(`[${timestamp}] [${levelName}] ${message}`, ...args);
    }
  }

  private logWithHyperlink(level: LogLevel, message: string, url: string, ...args: unknown[]): void {
    if (level <= this.logLevel) {
      const timestamp = new Date().toISOString();
      const levelName = LogLevel[level];
      console.log(`[${timestamp}] [${levelName}] ${message} \x1b]8;;${url}\x1b\\${url}\x1b]8;;\x1b\\`, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  infoWithLink(message: string, url: string, ...args: unknown[]): void {
    this.logWithHyperlink(LogLevel.INFO, message, url, ...args);
  }
}

export const logger = new Logger();