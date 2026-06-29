describe('logger', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  it('should not log anything in test environment', () => {
    process.env.NODE_ENV = 'test';
    const { logger } = require('@/lib/logger');

    logger.error('test error');
    logger.info('test info');
    logger.warn('test warn');

    expect(console.error).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('should log error and warn but not info in production environment', () => {
    process.env.NODE_ENV = 'production';
    const { logger } = require('@/lib/logger');

    logger.error('prod error');
    logger.info('prod info');
    logger.warn('prod warn');

    expect(console.error).toHaveBeenCalledWith('prod error');
    expect(console.log).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith('prod warn');
  });

  it('should log error, info, and warn in development environment', () => {
    process.env.NODE_ENV = 'development';
    const { logger } = require('@/lib/logger');

    logger.error('dev error');
    logger.info('dev info');
    logger.warn('dev warn');

    expect(console.error).toHaveBeenCalledWith('dev error');
    expect(console.log).toHaveBeenCalledWith('dev info');
    expect(console.warn).toHaveBeenCalledWith('dev warn');
  });
});
