# CREW - Android App

Construction Workforce Management mobile application for Android.

## Overview

This is the mobile companion app for the CREW platform (crew-cwm.com). It provides full access to all platform features based on user role, with offline-first architecture for field workers.

## Architecture

- **Framework:** React Native with Expo (SDK 52)
- **Navigation:** React Navigation v7 (role-based tab navigation)
- **State Management:** Zustand (auth + sync stores)
- **API Communication:** tRPC-compatible HTTP client → crew-cwm.com
- **Offline:** AsyncStorage queue with automatic sync on reconnection
- **Auth:** Email/password (same as web system)
- **Secure Storage:** expo-secure-store for tokens

## User Roles

Each role gets a dedicated tab navigator with relevant features:

| Role | Tabs | Key Features |
|------|------|--------------|
| **Super Owner** | Home, Tenants, Revenue, Sales, Settings | Platform-wide management |
| **Admin** | Home, Team, Time, Jobs, More | Tenant management |
| **Supervisor** | Team, Attendance, Dispatch, Reports, More | Field team oversight |
| **Worker** | Clock, Schedule, Hours, Profile | Time tracking & GPS |
| **Salesperson** | Home, Leads, Earnings, Profile | Sales & commissions |
| **Director** | Home, Team, Revenue, Earnings, Profile | Commercial oversight |

## Business Model (In-App)

- App is **FREE** on Google Play
- Users create tenant account and choose plan
- **No payment in-app** — avoids Play Store commission
- 14-day trial starts immediately (no credit card)
- When trial expires → redirects to browser for payment at crew-cwm.com/pricing

## Offline-First Strategy

1. Auth token + user data cached in SecureStore/AsyncStorage
2. All mutations queued locally when offline
3. Network status monitored every 5 seconds
4. On reconnection: queue processed sequentially (FIFO)
5. Failed items retry up to maxRetries, then marked as failed
6. User sees offline banner + pending count

## Getting Started

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Build APK for testing
eas build --platform android --profile preview

# Build AAB for Play Store
eas build --platform android --profile production
```

## Project Structure

```
src/
├── constants/       # App config, API URLs
├── hooks/           # Custom hooks (network, sync)
├── navigation/      # AppNavigator + role-based tabs
│   └── tabs/        # AdminTabs, WorkerTabs, etc.
├── screens/         # Screen components by role
│   ├── auth/        # Login, Register
│   └── shared/      # Placeholder, TrialExpired
├── services/        # API client, offline sync
├── store/           # Zustand stores (auth, sync)
├── types/           # TypeScript interfaces
└── utils/           # Helpers
assets/              # App icons, splash screen
```

## Environment

The app connects to the production CREW backend:
- API: `https://crew-cwm.com`
- tRPC: `https://crew-cwm.com/api/trpc`

## Build & Deploy

1. Configure EAS project: `eas init`
2. Build for testing: `eas build --platform android --profile preview`
3. Build for Play Store: `eas build --platform android --profile production`
4. Submit to Play Store: `eas submit --platform android`

## Play Store Details

- **Package:** com.crewcwm.app
- **Developer Account:** Crew CWM (ID: 6220192455651624714)
- **Category:** Business / Productivity
- **Content Rating:** Everyone
