declare module 'react-native' {
  export const StyleSheet: any;
  export const View: any;
  export const Text: any;
  export const ScrollView: any;
  export const TouchableOpacity: any;
  export const Image: any;
  export const TextInput: any;
  export const ActivityIndicator: any;
  export const FlatList: any;
  export const Alert: any;
  export const Platform: any;
  export const Dimensions: any;
  export const Modal: any;
  export const Pressable: any;
  export type ViewStyle = any;
  export type TextStyle = any;
  export type ImageStyle = any;
}

declare module 'react-native-paper' {
  export const MD3LightTheme: any;
  export const MD3DarkTheme: any;
  export const useTheme: any;
  export const PaperProvider: any;
  export const Card: any;
  export const Button: any;
  export const Text: any;
  export const TextInput: any;
  export const Chip: any;
  export const Badge: any;
  export const Surface: any;
  export const Divider: any;
  export const ProgressBar: any;
  export const Avatar: any;
  export const IconButton: any;
  export const Snackbar: any;
  export const SegmentedButtons: any;
  export const Checkbox: any;
  export const RadioButton: any;
  export const Switch: any;
  export const Menu: any;
  export const Dialog: any;
  export const Portal: any;
  export const List: any;
}

declare module '@react-navigation/native' {
  export const NavigationContainer: any;
  export function useNavigation<T = any>(): T;
  export function useRoute<T = any>(): T;
  export function useIsFocused(): boolean;
  export function useFocusEffect(effect: () => void | (() => void)): void;
  export const createNavigationContainerRef: any;
}

declare module '@react-navigation/bottom-tabs' {
  export function createBottomTabNavigator<T = any>(): any;
}

declare module '@react-navigation/native-stack' {
  export function createNativeStackNavigator<T = any>(): any;
  export type NativeStackNavigationProp<T = any, K = any> = any;
}

declare module '@tanstack/react-query' {
  export const QueryClient: any;
  export const QueryClientProvider: any;
  export const useQuery: any;
  export const useMutation: any;
  export const useQueryClient: any;
}

declare module 'react-native-safe-area-context' {
  export const SafeAreaProvider: any;
  export const SafeAreaView: any;
  export const useSafeAreaInsets: any;
}

declare module '@react-native-community/netinfo' {
  const NetInfo: any;
  export default NetInfo;
}

declare module 'expo-secure-store' {
  export function getItemAsync(key: string): Promise<string | null>;
  export function setItemAsync(key: string, value: string): Promise<void>;
  export function deleteItemAsync(key: string): Promise<void>;
}

declare module 'expo-sqlite' {
  export interface SQLiteDatabase {
    execAsync: (sql: string) => Promise<any>;
    runAsync: (sql: string, ...params: any[]) => Promise<any>;
    getFirstAsync: <T = any>(sql: string, ...params: any[]) => Promise<T | null>;
    getAllAsync: <T = any>(sql: string, ...params: any[]) => Promise<T[]>;
  }
  export function openDatabaseAsync(name: string): Promise<SQLiteDatabase>;
  export const openDatabaseSync: any;
  export function openDatabase(name: string): any;
}

declare module 'expo-image-picker' {
  export const launchCameraAsync: any;
  export const launchImageLibraryAsync: any;
  export const MediaTypeOptions: any;
}

declare module 'expo-camera' {
  export const Camera: {
    requestCameraPermissionsAsync: () => Promise<{ granted: boolean }>;
  };
  export const CameraView: any;
}

declare module 'expo-av' {
  export namespace Audio {
    export type Recording = any;
    export type Sound = any;
    export const Recording: any;
    export const Sound: any;
    export const setAudioModeAsync: any;
    export function requestPermissionsAsync(): Promise<{ status: string; granted: boolean }>;
    export const RecordingOptionsPresets: {
      HIGH_QUALITY: any;
      LOW_QUALITY: any;
    };
  }
  export const Video: any;
}

declare module 'expo-font' {
  export const useFonts: any;
  export const loadAsync: any;
}

declare module 'expo-network' {
  export const getNetworkStateAsync: any;
}

declare module 'expo-asset' {
  export const Asset: any;
}

declare module '@expo/vector-icons' {
  export const MaterialCommunityIcons: any;
  export const Ionicons: any;
  export const Feather: any;
}

declare module 'zustand' {
  export function create<T = any>(fn?: any): any;
}

declare module 'react-hook-form' {
  export function useForm<T = any>(options?: any): any;
  export const Controller: any;
}

declare module '@hookform/resolvers/zod' {
  export const zodResolver: any;
}

declare module 'react-native-screens' {
  export const enableScreens: any;
}

declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: any;
  export default AsyncStorage;
}
