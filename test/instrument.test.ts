/**
 * Tests for Sentry instrument initialization
 * 
 * Note: This file tests the configuration logic by importing the instrument module
 * and verifying Sentry.init is called with correct parameters.
 */

describe('Sentry Instrument', () => {
  // Mock Sentry before any imports
  const mockSentryInit = jest.fn();
  const mockNodeProfilingIntegration = jest.fn(() => ({ name: 'ProfilingIntegration' }));
  const mockHttpIntegration = jest.fn(() => ({ name: 'Http' }));
  const mockOnUnhandledRejectionIntegration = jest.fn(() => ({ name: 'OnUnhandledRejection' }));
  const mockOnUncaughtExceptionIntegration = jest.fn(() => ({ name: 'OnUncaughtException' }));
  const mockNativeNodeFetchIntegration = jest.fn(() => ({ name: 'NativeNodeFetch' }));
  const mockExpressIntegration = jest.fn(() => ({ name: 'Express' }));
  const mockConsoleIntegration = jest.fn(() => ({ name: 'Console' }));

  beforeAll(() => {
    jest.doMock('@sentry/node', () => ({
      init: mockSentryInit,
      httpIntegration: mockHttpIntegration,
      onUnhandledRejectionIntegration: mockOnUnhandledRejectionIntegration,
      onUncaughtExceptionIntegration: mockOnUncaughtExceptionIntegration,
      nativeNodeFetchIntegration: mockNativeNodeFetchIntegration,
      expressIntegration: mockExpressIntegration,
      consoleIntegration: mockConsoleIntegration,
    }));

    jest.doMock('@sentry/profiling-node', () => ({
      nodeProfilingIntegration: mockNodeProfilingIntegration,
    }));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear any cached modules
    jest.resetModules();
  });

  it('should initialize Sentry with correct DSN and configuration', () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      SENTRY_DSN: "https://test@sentry.prodigalpros.com/2",
      SENTRY_ENVIRONMENT: 'test',
      npm_package_version: '1.0.0'
    };

    // Import instrument to trigger Sentry.init
    require('../src/instrument');

    expect(mockSentryInit).toHaveBeenCalledWith({
      dsn: "https://test@sentry.prodigalpros.com/2",
      environment: 'test',
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
      sampleRate: 1.0,
      maxBreadcrumbs: 100,
      debug: false,
      release: '1.0.0',
      integrations: [
        { name: 'ProfilingIntegration' },
        { name: 'Http' },
        { name: 'OnUnhandledRejection' },
        { name: 'OnUncaughtException' },
        { name: 'NativeNodeFetch' },
        { name: 'Express' },
        { name: 'Console' }
      ],
      sendDefaultPii: true,
      beforeSend: expect.any(Function),
      beforeSendTransaction: expect.any(Function)
    });

    process.env = originalEnv;
  });

  it('should use default environment when not specified', () => {
    const originalEnv = process.env;
    process.env = { 
      ...originalEnv,
      SENTRY_DSN: "https://test@sentry.prodigalpros.com/2"
    };
    delete process.env.SENTRY_ENVIRONMENT;

    require('../src/instrument');

    expect(mockSentryInit).toHaveBeenCalledWith(expect.objectContaining({
      environment: 'production'
    }));

    process.env = originalEnv;
  });

  it('should use default version when npm_package_version not set', () => {
    const originalEnv = process.env;
    process.env = { 
      ...originalEnv,
      SENTRY_DSN: "https://test@sentry.prodigalpros.com/2"
    };
    delete process.env.npm_package_version;

    require('../src/instrument');

    expect(mockSentryInit).toHaveBeenCalledWith(expect.objectContaining({
      release: '1.1.4'
    }));

    process.env = originalEnv;
  });

  it('should include profiling integration', () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      SENTRY_DSN: "https://test@sentry.prodigalpros.com/2"
    };

    require('../src/instrument');

    expect(mockNodeProfilingIntegration).toHaveBeenCalled();
    expect(mockSentryInit).toHaveBeenCalledWith(expect.objectContaining({
      integrations: expect.arrayContaining([{ name: 'ProfilingIntegration' }])
    }));

    process.env = originalEnv;
  });

  it('should configure beforeSend hook to filter IP addresses', () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      SENTRY_DSN: "https://test@sentry.prodigalpros.com/2"
    };

    require('../src/instrument');

    const initCall = mockSentryInit.mock.calls[0][0];
    const beforeSend = initCall.beforeSend;

    const event = {
      user: {
        id: 'user123',
        ip_address: '192.168.1.1'
      }
    };

    const result = beforeSend(event);

    expect(result).toEqual({
      user: {
        id: 'user123'
      }
    });
    expect(result.user.ip_address).toBeUndefined();

    process.env = originalEnv;
  });

  it('should handle events without user in beforeSend hook', () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      SENTRY_DSN: "https://test@sentry.prodigalpros.com/2"
    };

    require('../src/instrument');

    const initCall = mockSentryInit.mock.calls[0][0];
    const beforeSend = initCall.beforeSend;

    const event = {
      message: 'Test event without user'
    };

    const result = beforeSend(event);

    expect(result).toEqual(event);

    process.env = originalEnv;
  });

  it('should configure beforeSendTransaction hook to log transactions', () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      SENTRY_DSN: "https://test@sentry.prodigalpros.com/2"
    };

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    require('../src/instrument');

    const initCall = mockSentryInit.mock.calls[0][0];
    const beforeSendTransaction = initCall.beforeSendTransaction;

    const transaction = {
      transaction: 'test-transaction',
      contexts: {
        trace: {
          op: 'test.operation'
        }
      }
    };

    const result = beforeSendTransaction(transaction);

    expect(result).toEqual(transaction);
    expect(consoleSpy).toHaveBeenCalledWith('[SENTRY] Sending transaction: test-transaction (test.operation)');

    consoleSpy.mockRestore();
    process.env = originalEnv;
  });

  it('should not initialize Sentry when SENTRY_DSN is not provided', () => {
    const originalEnv = process.env;
    process.env = { ...originalEnv };
    delete process.env.SENTRY_DSN;

    require('../src/instrument');

    expect(mockSentryInit).not.toHaveBeenCalled();

    process.env = originalEnv;
  });
});