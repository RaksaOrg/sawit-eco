declare module 'reactotron-react-native' {
  const Reactotron: {
    configure: (options?: { name?: string; host?: string; port?: number }) => {
      useReactNative: (options?: Record<string, unknown>) => {
        connect: () => typeof Reactotron;
      };
      connect: () => typeof Reactotron;
    };
    log: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    display: (config: { name: string; value: unknown; preview?: string; important?: boolean }) => void;
  };

  export default Reactotron;
}
