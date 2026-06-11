interface JestMock {
  fn: (impl?: (...args: never[]) => unknown) => {
    mockImplementation: (impl: (...args: never[]) => unknown) => unknown;
  } & ((...args: never[]) => unknown);
}
declare const jest: JestMock;

export const PiSdkBase = jest.fn().mockImplementation(() => ({
  connect: jest.fn(),
  createPayment: jest.fn(),
}));
