import Reactotron from 'reactotron-react-native';
import pkg from '../../package.json';

if (__DEV__) {
  const tron = Reactotron.configure({ name: pkg.name })
    .useReactNative()
    .connect();

  // Attach to console for ad-hoc debugging in dev tools
  (console as unknown as { tron?: typeof tron }).tron = tron;
  // eslint-disable-next-line no-console
  console.log('[Reactotron] connected');
}

export default Reactotron;
