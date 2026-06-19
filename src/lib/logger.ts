const isTest = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production';

export const logger = {
  error: (...args: unknown[]) => {
    if (!isTest) {
      console.error(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (!isTest && !isProd) {
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (!isTest && !isProd) {
      console.warn(...args);
    }
  }
};
