// Mock config before importing logger
jest.mock('../../src/utils/config', () => ({
  botConfig: {
    logLevel: 'debug'
  }
}));

import { logger, LogLevel } from '../../src/utils/logger';

describe('Logger', () => {
  let consoleSpy: jest.SpyInstance;
  let originalConsole: Console;

  beforeEach(() => {
    originalConsole = global.console;
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    global.console = originalConsole;
  });

  describe('logging methods', () => {
    it('should log error messages', () => {
      logger.error('Test error message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[ERROR\] Test error message/)
      );
    });

    it('should log warning messages', () => {
      logger.warn('Test warning message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[WARN\] Test warning message/)
      );
    });

    it('should log info messages', () => {
      logger.info('Test info message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[INFO\] Test info message/)
      );
    });

    it('should log debug messages when level is debug', () => {
      // Set environment to debug level
      const originalLogLevel = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'debug';
      
      // Re-import logger to get new instance with debug level
      jest.resetModules();
      const { logger: debugLogger } = require('../../src/utils/logger');
      
      debugLogger.debug('Test debug message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[DEBUG\] Test debug message/)
      );
      
      // Restore original log level
      process.env.LOG_LEVEL = originalLogLevel;
    });

    it('should include additional arguments', () => {
      const extraData = { key: 'value' };
      logger.info('Test message', extraData);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[INFO\] Test message/),
        extraData
      );
    });
  });

  describe('log level filtering', () => {
    it('should respect log level hierarchy', () => {
      // Set environment to error level
      const originalLogLevel = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'error';
      
      // Re-import logger to get new instance with error level
      jest.resetModules();
      const { logger: errorLogger } = require('../../src/utils/logger');
      
      consoleSpy.mockClear();
      
      errorLogger.error('Should appear');
      errorLogger.warn('Should not appear');
      errorLogger.info('Should not appear');
      errorLogger.debug('Should not appear');
      
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[ERROR\] Should appear/)
      );
      
      // Restore original log level
      process.env.LOG_LEVEL = originalLogLevel;
    });

    it('should handle warn level', () => {
      // Set environment to warn level
      const originalLogLevel = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'warn';
      
      // Re-import logger to get new instance with warn level
      jest.resetModules();
      const { logger: warnLogger } = require('../../src/utils/logger');
      
      consoleSpy.mockClear();
      
      warnLogger.error('Should appear');
      warnLogger.warn('Should appear');
      warnLogger.info('Should not appear');
      warnLogger.debug('Should not appear');
      
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      
      // Restore original log level
      process.env.LOG_LEVEL = originalLogLevel;
    });

    it('should handle invalid log level and default to info', () => {
      // Set environment to invalid level
      const originalLogLevel = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'invalid';
      
      // Re-import logger to get new instance with invalid level
      jest.resetModules();
      const { logger: defaultLogger } = require('../../src/utils/logger');
      
      consoleSpy.mockClear();
      
      defaultLogger.info('Should appear');
      defaultLogger.debug('Should not appear');
      
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[INFO\] Should appear/)
      );
      
      // Restore original log level
      process.env.LOG_LEVEL = originalLogLevel;
    });
  });

  describe('LogLevel enum', () => {
    it('should have correct numeric values', () => {
      expect(LogLevel.ERROR).toBe(0);
      expect(LogLevel.WARN).toBe(1);
      expect(LogLevel.INFO).toBe(2);
      expect(LogLevel.DEBUG).toBe(3);
    });
  });

  describe('getLogLevel private method coverage', () => {
    it('should cover all switch cases', () => {
      // Test all valid log levels by setting environment and re-importing
      ['error', 'warn', 'info', 'debug'].forEach(level => {
        const originalLogLevel = process.env.LOG_LEVEL;
        process.env.LOG_LEVEL = level;
        
        jest.resetModules();
        const { logger } = require('../../src/utils/logger');
        expect(logger).toBeDefined();
        
        process.env.LOG_LEVEL = originalLogLevel;
      });
    });
  });
});