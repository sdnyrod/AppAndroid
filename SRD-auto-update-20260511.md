# Session Recovery Document — Auto Update Implementation
**Date:** May 11, 2026  
**Developers:** MANUS e SIDNEY

## Request
Implement automatic app update system with two mechanisms:
1. **OTA Updates (EAS Update)** — For JavaScript/React Native code changes, updates are downloaded and applied automatically without going through the App Store/Play Store.
2. **Force Update Check** — For native version changes, the app checks the backend for minimum required version and shows a blocking modal directing users to the store.

## Changes Made

### Mobile App (AppAndroid)

| File | Change |
|------|--------|
| `package.json` | Added `expo-updates` dependency (~0.27.5) |
| `app.json` | Added `updates.url` and `runtimeVersion` config for EAS Update |
| `eas.json` | Added `channel` config for development, preview, and production profiles |
| `src/hooks/useOTAUpdate.ts` | **NEW** — Hook that checks for OTA updates on launch and foreground resume |
| `src/components/ForceUpdateCheck.tsx` | **NEW** — Component that checks backend for version requirements, shows blocking modal for force updates or dismissible prompt for optional updates |
| `src/constants/config.ts` | Updated APP_VERSION to 1.2.0, added IOS_STORE_URL and ANDROID_STORE_URL |
| `App.tsx` | Added `useOTAUpdate` hook and wrapped AppNavigator with `ForceUpdateCheck` |

### Backend (CREW)

| File | Change |
|------|--------|
| `drizzle/schema.ts` | Added `mobileAppVersions` table with platform, minVersion, latestVersion, storeUrl, forceUpdate, updateMessage fields |
| `server/routers.ts` | Added `mobile.checkVersion` public endpoint that compares app version against minimum/latest |

### Database
- Created `mobileAppVersions` table
- Seeded with initial records for iOS (v1.2.0) and Android (v1.2.0)

## How It Works

### OTA Updates (EAS Update)
1. App launches → `useOTAUpdate` hook runs
2. Checks EAS Update server for new JS bundle
3. If available, downloads in background
4. Shows alert: "Update Available — The app will restart to apply the update"
5. User taps "Restart Now" → app reloads with new code
6. Also re-checks when app returns to foreground

### Force Update Check
1. App launches → `ForceUpdateCheck` component calls `mobile.checkVersion`
2. Backend compares `currentVersion` against `minVersion` and `latestVersion`
3. If below `minVersion` AND `forceUpdate=true` → **Blocking modal** (cannot dismiss, must update)
4. If below `latestVersion` but above `minVersion` → **Dismissible prompt** (can tap "Later")
5. Tapping "Update" opens the App Store / Play Store link

### Admin Control
To force an update, update the `mobileAppVersions` table:
```sql
UPDATE mobileAppVersions 
SET minVersion = '1.3.0', latestVersion = '1.3.0', forceUpdate = 1, 
    updateMessage = 'Critical security update. Please update immediately.',
    updatedAt = UNIX_TIMESTAMP() * 1000
WHERE mobileAppPlatform = 'ios';
```

## Status
- [x] OTA Update hook implemented
- [x] Force Update backend endpoint created and tested
- [x] Force Update component implemented
- [x] Database seeded with initial version records
- [ ] Commit and push to GitHub
- [ ] Trigger preview build
