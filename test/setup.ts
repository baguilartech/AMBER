import 'dotenv/config';

// Mock environment variables for testing
process.env.DISCORD_TOKEN = 'test_discord_token';
process.env.DISCORD_CLIENT_ID = 'test_client_id';
process.env.YOUTUBE_API_KEY = 'test_youtube_key';
process.env.SPOTIFY_CLIENT_ID = 'test_spotify_id';
process.env.SPOTIFY_CLIENT_SECRET = 'test_spotify_secret';
// Don't set SOUNDCLOUD_CLIENT_ID in global setup to allow tests to control it
// process.env.SOUNDCLOUD_CLIENT_ID = 'your_soundcloud_client_id_here';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock fetch for API calls
global.fetch = jest.fn();

// Increase timeout for async operations
jest.setTimeout(30000);

// Simple test to prevent empty test suite error
describe('Test Setup', () => {
  it('should have proper test environment setup', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.DISCORD_TOKEN).toBe('test_discord_token');
  });
});