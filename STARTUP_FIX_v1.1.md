# v1.1 startup fix

This revision fixes the full-screen `Connecting to CloudMGWR...` loop/flicker.

Root cause: `DashboardPage` calls `refresh()`. In v1.0, `refresh()` set the global auth `loading=true`. That made `ProtectedLayout` replace the dashboard with `LoadingScreen`, unmounting the dashboard. When refresh finished, the dashboard mounted again and immediately called `refresh()` again, producing a repeat loop. React StrictMode in local development also duplicated initial effects and made the flicker more visible.

Fixes:
- Global `loading` now means only the one-time Cognito startup session check.
- Profile refreshes no longer trigger the full-screen auth loader.
- `/me` loads without blocking the entire app after Cognito session detection.
- Root StrictMode wrapper is removed to avoid duplicate development-only auth network effects.
