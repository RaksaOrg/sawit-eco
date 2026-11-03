import 'react-native-url-polyfill/auto';
import './src/devtools/reactotron';
import React, { useEffect } from 'react';
import ReactNative from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { RootNavigator } from './src/navigation/RootNavigator';
import { mobilePaperTheme } from './src/theme';
import { initOutbox, getPendingCount } from './src/core/offline/outbox';
import { flushOutbox } from './src/core/offline/actions';
import { useMobileAppStore } from './src/state/store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10 * 60 * 1000, retry: 2 },
    mutations: { retry: 1 },
  },
});

const NativeSplashScreen = (ReactNative as unknown as { NativeModules: { SplashScreen?: { hide?: () => void } } }).NativeModules.SplashScreen as { hide?: () => void } | undefined;

export default function App() {
  const loadSession = useMobileAppStore((state) => state.loadSession);
  const setPendingSyncCount = useMobileAppStore((state) => state.setPendingSyncCount);
  const isAuthenticated = useMobileAppStore((state) => state.isAuthenticated);

  useEffect(() => {
    loadSession();
    initOutbox()
      .then(getPendingCount)
      .then(setPendingSyncCount)
      .catch(() => setPendingSyncCount(0))
      .finally(() => {
        NativeSplashScreen?.hide?.();
      });
  }, [loadSession, setPendingSyncCount]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && isAuthenticated) {
        flushOutbox().catch(() => undefined);
      }
    });
    return unsubscribe;
  }, [isAuthenticated]);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={mobilePaperTheme}>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer onReady={() => NativeSplashScreen?.hide?.()}>
            <RootNavigator />
          </NavigationContainer>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
