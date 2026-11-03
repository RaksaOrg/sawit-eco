describe('reactotron devtools bootstrap', () => {
  const configure = jest.fn();
  const useReactNative = jest.fn();
  const connect = jest.fn();
  const tron = { name: 'tron' };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    configure.mockReturnValue({ useReactNative });
    useReactNative.mockReturnValue({ connect });
    connect.mockReturnValue(tron);

    jest.doMock('reactotron-react-native', () => ({
      __esModule: true,
      default: { configure },
    }));
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('configures reactotron when __DEV__ is true', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;

    let mod!: typeof import('../../src/devtools/reactotron');
    jest.isolateModules(() => {
      mod = require('../../src/devtools/reactotron');
    });

    expect(configure).toHaveBeenCalledWith({ name: 'sawit-mobile' });
    expect(useReactNative).toHaveBeenCalled();
    expect(connect).toHaveBeenCalled();
    expect((console as unknown as { tron?: unknown }).tron).toBe(tron);
    expect(mod.default).toBeDefined();
  });

  it('skips setup when __DEV__ is false', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;

    jest.isolateModules(() => {
      require('../../src/devtools/reactotron');
    });

    expect(configure).not.toHaveBeenCalled();
  });
});
