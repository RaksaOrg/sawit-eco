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

## Android Release Signing

Release builds use a private Android keystore. Do not commit the keystore or its passwords.

Generate a keystore from `apps/mobile/android`:

```sh
keytool -genkeypair -v -storetype PKCS12 -keystore app/release.keystore -alias sawit-eco -keyalg RSA -keysize 2048 -validity 10000
```

Gradle reads these properties from `~/.gradle/gradle.properties` or environment variables:

```properties
AAB_RELEASE_STORE_FILE=release.keystore
AAB_RELEASE_STORE_PASSWORD=<keystore-password>
AAB_RELEASE_KEY_ALIAS=sawit-eco
AAB_RELEASE_KEY_PASSWORD=<key-password>
```

Store the keystore at `apps/mobile/android/app/release.keystore`, or set `AAB_RELEASE_STORE_FILE` to its absolute path. Keep a secure backup; losing the signing key can prevent updates to an existing Play Store app.

Build the signed Android App Bundle from `apps/mobile`:

```sh
npm run build:android:bundle
```

Output: `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`.
