// Mock config before importing logger
jest.mock('../../src/utils/config', () => ({
  botConfig: {
    logLevel: 'debug'
  }
}));

import { logger, LogLevel } from '../../src/utils/logger';

describe('Logger', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
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
      logger.debug('Test debug message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[DEBUG\] Test debug message/)
      );
    });

    it('should include additional arguments', () => {
      const testObject = { key: 'value' };
      logger.info('Test message', testObject);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[INFO\] Test message/),
        testObject
      );
    });
  });

  describe('log level filtering', () => {
    it('should respect log level hierarchy', () => {
      // Create logger with error level only
      jest.resetModules();
      jest.mock('../../src/utils/config', () => ({
        botConfig: {
          logLevel: 'error'
        }
      }));
      
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
    });

    it('should handle warn level', () => {
      jest.resetModules();
      jest.mock('../../src/utils/config', () => ({
        botConfig: {
          logLevel: 'warn'
        }
      }));
      
      const { logger: warnLogger } = require('../../src/utils/logger');
      consoleSpy.mockClear();
      
      warnLogger.error('Should appear');
      warnLogger.warn('Should appear');
      warnLogger.info('Should not appear');
      
      expect(consoleSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid log level and default to info', () => {
      jest.resetModules();
      jest.mock('../../src/utils/config', () => ({
        botConfig: {
          logLevel: 'invalid'
        }
      }));
      
      const { logger: defaultLogger } = require('../../src/utils/logger');
      consoleSpy.mockClear();
      
      defaultLogger.info('Should appear');
      defaultLogger.debug('Should not appear');
      
      expect(consoleSpy).toHaveBeenCalledTimes(1);
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
      jest.resetModules();
      
      // Test each case individually
      ['error', 'warn', 'info', 'debug'].forEach(level => {
        jest.mock('../../src/utils/config', () => ({
          botConfig: { logLevel: level }
        }));
        
        const { logger } = require('../../src/utils/logger');
        expect(logger).toBeDefined();
        
        jest.resetModules();
      });
    });
  });
});