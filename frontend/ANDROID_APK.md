# GHOST CONTROL Android APK

This is the mid-term Android build path for GHOST CONTROL.

The React/Vite UI still runs in a Capacitor WebView. Continuous location tracking is handled by a native Android Foreground Service so GPS heartbeat can continue after the app screen is closed.

## Architecture

- Web UI: React + Vite + Capacitor WebView
- Native bridge: `GhostLocation`
- Background location: Android Foreground Service
- API heartbeat: `POST https://ghost-control.duckdns.org/api/heartbeat`
- Client certificate: Android KeyChain alias selected from the installed `device_a.p12` or `device_b.p12`
- WebView mTLS: `MainActivity` uses the saved KeyChain alias for `ClientCertRequest`

## Install prerequisites

On the build machine:

```bash
cd /opt/ghost-app/ghost-app/frontend
npm install
npm run mobile:sync
```

Open the Android project:

```bash
npm run mobile:open
```

Or build a debug APK when Gradle is installed:

```bash
cd /opt/ghost-app/ghost-app/frontend
npm run mobile:apk
```

If Gradle is not installed, open `frontend/android` in Android Studio and run:

```text
Build > Build Bundle(s) / APK(s) > Build APK(s)
```

Debug APK output:

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

## Pixel setup

1. Install `device_a.p12` or `device_b.p12` on the Pixel.
2. Install the APK directly.
3. Open GHOST CONTROL.
4. Unlock with `1984=`.
5. Select device A or B.
6. Open `CTRL`.
7. In `Android常駐GPS`, tap `証明書選択`.
8. Select the matching certificate alias.
9. Grant location permission.
10. Grant notification permission.
11. In Android app settings, set Location to `Allow all the time` when available.
12. Disable battery optimization for this app.
13. Tap `常駐開始`.

## Operational model

The app has two different status concepts:

- WebSocket status: screen/UI realtime channel. This can disconnect when the WebView is closed.
- Device online status: backend heartbeat freshness. This should stay online while the Android Foreground Service is running.

The backend still marks a device offline when heartbeat is stale for more than two minutes.

## Important security notes

- Do not embed `.p12` files in the APK.
- Keep `device_a.p12` and `device_b.p12` installed in Android KeyChain.
- The native service uses the selected KeyChain alias for mTLS.
- If a device is lost, revoke or rotate the client certificate on the VPS.

## Known follow-up work

- Add a first-run permission wizard for background location and battery optimization.
- Add signed release APK generation.
- Add certificate rotation UI.
- Add a backend endpoint that exposes heartbeat freshness separately from WebSocket state.
