import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMobileAppStore } from '../state/store';
import { createTranslator } from '../i18n';
import { hasPermission } from '../core/auth/rbac';
import { TodayScreen } from '../screens/TodayScreen';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { LearningScreen } from '../screens/LearningScreen';
import { LearningDetailScreen } from '../screens/LearningDetailScreen';
import { CommerceScreen } from '../screens/CommerceScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ApprovalScreen } from '../screens/ApprovalScreen';
import { DiagnosisScreen } from '../screens/DiagnosisScreen';
import { TaskDetailScreen } from '../screens/TaskDetailScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { AccountManagementScreen } from '../screens/AccountManagementScreen';
import { SelfieVerificationScreen } from '../screens/SelfieVerificationScreen';
import { MobileTask, LearningModule } from '../core/api/hooks';
import { semanticTokens } from '../theme/semantic/tokens';

export type RootStackParamList = {
  MainTabs: undefined;
  TaskDetail: { task: MobileTask };
  Diagnosis: undefined;
  LearningDetail: { module: LearningModule; localUri?: string };
  Approvals: undefined;
  AccountManagement: { verification?: 'success' | 'error'; source?: string } | undefined;
  SelfieVerification: { source?: string; attendanceAction?: 'CHECK_IN' | 'CHECK_OUT' } | undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  const session = useMobileAppStore((s) => s.session);
  const language = useMobileAppStore((s) => s.language);
  const t = createTranslator(language);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const can = (permission: Parameters<typeof hasPermission>[1]) =>
    hasPermission(session?.role, permission);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: semanticTokens.color.brand,
        tabBarInactiveTintColor: semanticTokens.color.textSecondary,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Today: 'today-outline',
            Attendance: 'checkbox-outline',
            Learning: 'school-outline',
            Commerce: 'cart-outline',
            Profile: 'person-outline',
          };
          return (
            <Ionicons name={icons[route.name] || 'ellipse-outline'} size={size} color={color} />
          );
        },
      })}
    >
      <Tab.Screen name="Today" options={{ title: t('tab.today') }}>
        {() => <TodayScreen navigation={navigation} />}
      </Tab.Screen>

      {can('attendance:record_own') ? (
        <Tab.Screen
          name="Attendance"
          component={AttendanceScreen}
          options={{ title: t('tab.attendance') }}
        />
      ) : null}

      {can('learning:view') ? (
        <Tab.Screen name="Learning" options={{ title: t('tab.learning') }}>
          {() => <LearningScreen navigation={navigation} />}
        </Tab.Screen>
      ) : null}

      {can('commerce:view') ? (
        <Tab.Screen
          name="Commerce"
          component={CommerceScreen}
          options={{ title: t('tab.commerce') }}
        />
      ) : null}

      <Tab.Screen name="Profile" options={{ title: t('tab.profile') }}>
        {() => <ProfileScreen navigation={navigation} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const isAuthenticated = useMobileAppStore((s) => s.isAuthenticated);
  const isLoadingSession = useMobileAppStore((s) => s.isLoadingSession);

  if (isLoadingSession) {
    return <LoginScreen />;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="TaskDetail">
        {({ route, navigation }) => <TaskDetailScreen route={route} navigation={navigation} />}
      </Stack.Screen>
      <Stack.Screen name="Diagnosis" component={DiagnosisScreen} />
      <Stack.Screen name="LearningDetail">
        {({ route, navigation }) => <LearningDetailScreen route={route} navigation={navigation} />}
      </Stack.Screen>
      <Stack.Screen name="Approvals" component={ApprovalScreen} />
      <Stack.Screen name="AccountManagement">
        {({ navigation, route }) => (
          <AccountManagementScreen navigation={navigation} route={route} />
        )}
      </Stack.Screen>
      <Stack.Screen name="SelfieVerification">
        {({ navigation, route }) => (
          <SelfieVerificationScreen navigation={navigation} route={route} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
