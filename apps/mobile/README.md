# Mobile Application (React Native / Expo Fiori-Inspired)

React Native 0.76+ / Expo SDK 52 + React Native Paper.

## Architecture

- **Theme:** `apps/mobile/src/theme/tokens.ts` (Foundation, Semantic, Component tokens)
- **Adapter:** `apps/mobile/src/theme/index.ts` (MD3-Fiori theme bridge)
- **Components:** `apps/mobile/src/components/AppComponents.tsx` (`App*` inventory)
- **Navigation:** `apps/mobile/src/navigation/RootNavigator.tsx` (Permission-driven bottom tabs)
- **Offline Outbox:** `apps/mobile/src/core/offline/outbox.ts` (Local SQLite queue)
- **Secure Storage:** `apps/mobile/src/core/api/client.ts` (`expo-secure-store`)
- **Screens:**
  - `TodayScreen.tsx`
  - `AttendanceScreen.tsx`
  - `LearningScreen.tsx`
  - `CommerceScreen.tsx`
  - `ProfileScreen.tsx`
  - `ApprovalScreen.tsx`
