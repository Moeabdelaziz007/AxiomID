export const logger = {
  error: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error(...args);
    }
  },
  info: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(...args);
    }
  }
};
