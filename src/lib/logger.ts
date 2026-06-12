export const logger = {
  error: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(...args);
    }
  }
};
