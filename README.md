# Cluttr

A React Native application for managing home inventory built with Expo.

## Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn
- EAS CLI (install with `make install-eas`)
- For iOS builds: Xcode and iOS development tools
- For Android builds: Android Studio and Android SDK

## Environment Variables

The following environment variables are required for the application to function properly:

### Google OAuth

The app uses **iOS and Android OAuth client IDs** (not Web client IDs) with custom URI schemes for reliable authentication.

**Required Environment Variables:**
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` - Google OAuth 2.0 iOS Client ID
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` - Google OAuth 2.0 Android Client ID

#### Setting up Google OAuth

**Step 1: Create OAuth Client IDs in Google Cloud Console**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Identity API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Identity API" and enable it

4. **Create iOS OAuth Client ID:**
   - Navigate to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Select **"iOS"** as the application type
   - Enter your iOS bundle identifier: `com.cluttrapp.cluttr`
   - Click "Create"
   - Copy the **Client ID** and set it as `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` in your environment

5. **Create Android OAuth Client ID:**
   - Still in "Credentials", click "Create Credentials" → "OAuth client ID" again
   - Select **"Android"** as the application type
   - Enter your Android package name: `com.cluttrapp.cluttr`
   - For "SHA-1 certificate fingerprint", you'll need to get this from your keystore:
     - For development: Run `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
     - For production: Use your production keystore's SHA-1
   - Click "Create"
   - Copy the **Client ID** and set it as `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` in your environment

**Step 2: Configure Redirect URI**

The app uses a custom URI scheme for OAuth redirects: `com.cluttrapp.cluttr://`

1. **For iOS Client ID:**
   - In Google Cloud Console, edit your iOS OAuth client
   - Under "Authorized redirect URIs", add: `com.cluttrapp.cluttr://`
   - Click "Save"

2. **For Android Client ID:**
   - In Google Cloud Console, edit your Android OAuth client
   - Under "Authorized redirect URIs", add: `com.cluttrapp.cluttr://`
   - Click "Save"

**Step 3: Verify app.json Configuration**

Ensure your `app.json` has the scheme configured (it should already be set):

```json
{
  "expo": {
    "scheme": "com.cluttrapp.cluttr",
    "ios": {
      "bundleIdentifier": "com.cluttrapp.cluttr"
    },
    "android": {
      "package": "com.cluttrapp.cluttr"
    }
  }
}
```

**Important Notes:**
- **Use iOS/Android client IDs, NOT Web client IDs** - Web client IDs don't support custom scheme URIs
- The redirect URI is `com.cluttrapp.cluttr://` (from the `scheme` in `app.json`)
- Both iOS and Android client IDs must have the same redirect URI configured
- The app automatically selects the correct client ID based on the platform (iOS or Android)
- Make sure your bundle identifier (iOS) and package name (Android) match what you configured in Google Cloud Console

**Troubleshooting:**

1. **"Custom scheme URIs are not allowed for 'WEB' client type"**
   - You're using a Web client ID instead of iOS/Android client IDs
   - Create separate iOS and Android OAuth clients in Google Cloud Console

2. **"Something went wrong trying to finish signing in"**
   - Check that the redirect URI `com.cluttrapp.cluttr://` is added to both iOS and Android OAuth clients
   - Verify the bundle identifier/package name matches in both `app.json` and Google Cloud Console
   - Check console logs for `[GoogleAuth]` messages to see what's happening

3. **OAuth flow doesn't redirect back to app**
   - Ensure the `scheme` is set in `app.json`
   - Rebuild the app after changing the scheme: `npx expo prebuild --clean`
   - For development builds, make sure you're using a development build (not Expo Go)

4. **Android SHA-1 Certificate**
   - For development: Use the debug keystore SHA-1
   - For production: Use your production keystore SHA-1
   - You can add multiple SHA-1 fingerprints to the same Android OAuth client

You can set environment variables by creating a `.env` file in the project root, or by setting them in your shell environment before running the app.

### Apple Sign In

The app supports **Apple Sign In** for iOS devices (iOS 13+). Apple Sign In uses native iOS authentication and doesn't require separate client IDs like Google OAuth.

**Required Environment Variables:**
- None required for frontend (Apple Sign In uses the app's bundle identifier automatically)

**Setting up Apple Sign In:**

**Step 1: Enable Sign in with Apple Capability in Xcode**

1. Open your project in Xcode (or run `npx expo prebuild` to generate native projects)
2. Select your iOS target
3. Go to "Signing & Capabilities" tab
4. Click "+ Capability"
5. Add "Sign in with Apple" capability
6. Ensure your bundle identifier matches: `com.cluttrapp.cluttr`

**Step 2: Configure Sign in with Apple in Apple Developer Console**

1. Go to [Apple Developer Console](https://developer.apple.com/account/)
2. Navigate to "Certificates, Identifiers & Profiles"
3. Select "Identifiers" → "App IDs"
4. Find your app identifier (`com.cluttrapp.cluttr`) or create it if it doesn't exist
5. Edit the app identifier and enable "Sign in with Apple" capability
6. Save the changes

**Step 3: Configure Backend Environment Variable**

The backend needs your app's bundle identifier to verify Apple ID tokens:

1. Set `APPLE_CLIENT_ID` or `APPLE_BUNDLE_ID` environment variable in your backend `.env` file:
   ```env
   APPLE_CLIENT_ID=com.cluttrapp.cluttr
   ```
   Or:
   ```env
   APPLE_BUNDLE_ID=com.cluttrapp.cluttr
   ```

**Step 4: Verify app.json Configuration**

Ensure your `app.json` has the correct bundle identifier:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.cluttrapp.cluttr"
    }
  }
}
```

**Important Notes:**
- Apple Sign In is **only available on iOS devices** (iOS 13+)
- The app will show an error message on Android devices indicating Apple Sign In is iOS-only
- Apple may not provide email on subsequent sign-ins (only on first authorization)
- The backend handles users by Apple ID (`appleId`) when email is not available
- No additional client IDs or redirect URIs are needed (unlike Google OAuth)

**Troubleshooting:**

1. **"Apple Sign In is not available on this device"**
   - Ensure you're testing on a real iOS device (not simulator) or iOS 13+ simulator
   - Verify the device has an Apple ID signed in
   - Check that "Sign in with Apple" capability is enabled in Xcode

2. **"Sign in with Apple capability not found"**
   - Run `npx expo prebuild` to generate native iOS project
   - Manually add the capability in Xcode under "Signing & Capabilities"

3. **Backend token verification fails**
   - Verify `APPLE_CLIENT_ID` or `APPLE_BUNDLE_ID` is set in backend environment
   - Ensure the bundle identifier matches exactly: `com.cluttrapp.cluttr`
   - Check backend logs for token verification errors

## Installation

### Install Dependencies

```bash
make install-deps
```

This will install all project dependencies using `npm install --legacy-peer-deps`.

### Install EAS CLI

```bash
make install-eas
```

After installation, authenticate with:
```bash
eas login
```

## Building Internal Distribution Variants Locally

Internal distribution builds are useful for testing and distributing to internal testers without going through app stores.

### Build iOS Internal Distribution

To build an iOS internal distribution variant locally:

```bash
make build-ios-internal-local
```

This will create an iOS build that can be installed on physical iOS devices or simulators.

**Installing on iOS:**

1. After the build completes, locate the generated `.ipa` file in the build output directory
2. For physical devices:
   - Transfer the `.ipa` file to your device
   - Install using Xcode's Devices and Simulators window, or
   - Use a tool like [Apple Configurator 2](https://apps.apple.com/us/app/apple-configurator-2/id1037126344)
3. For simulators:
   - The build will automatically install on the connected simulator, or
   - Drag and drop the `.app` bundle into the simulator

**Note:** For physical iOS devices, you may need to:
- Register your device's UDID in your Apple Developer account
- Configure code signing with your development certificate
- Trust the developer certificate on your device (Settings > General > VPN & Device Management)

### Build Android Internal Distribution

To build an Android internal distribution variant locally:

```bash
make build-android-internal-local
```

This will create an Android APK file that can be installed on Android devices or emulators.

**Installing on Android:**

1. After the build completes, locate the generated `.apk` file in the build output directory
2. For physical devices:
   - Enable "Install from unknown sources" in your device settings
   - Transfer the `.apk` file to your device via USB, email, or cloud storage
   - Open the `.apk` file on your device to install
   - Alternatively, use `adb install path/to/app.apk` from your computer
3. For emulators:
   - Use `adb install path/to/app.apk` to install on a running emulator
   - Or drag and drop the `.apk` file into the emulator window

### Build Both Platforms

To build internal distribution variants for both iOS and Android:

```bash
make build-all-internal-local
```

## Development

### Start Development Server

```bash
npm start
```

Or use platform-specific commands:
- `npm run ios` - Start iOS simulator
- `npm run android` - Start Android emulator
- `npm run web` - Start web version

### Code Quality

```bash
# Format code
npm run format

# Check formatting
npm run format:check

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## Available Make Targets

Run `make help` to see all available targets:

- `make install-deps` - Install all dependencies
- `make install-eas` - Install EAS CLI globally
- `make build-ios` - Build iOS simulator development client (cloud build)
- `make build-android` - Build Android emulator development client (cloud build)
- `make build-all` - Build both iOS and Android simulator clients
- `make build-ios-local` - Build iOS simulator locally
- `make build-android-local` - Build Android emulator locally
- `make build-ios-internal-local` - Build iOS internal distribution variant locally
- `make build-android-internal-local` - Build Android internal distribution variant locally
- `make build-all-internal-local` - Build both iOS and Android internal distribution variants locally
- `make clean` - Clean build artifacts

## Troubleshooting

### Build Issues

If you encounter build errors:

1. Clean build artifacts: `make clean`
2. Reinstall dependencies: `make install-deps`
3. Ensure EAS CLI is up to date: `npm install -g eas-cli@latest`
4. Check that your local development environment is properly configured (Xcode for iOS, Android Studio for Android)

### Installation Issues

**iOS:**
- Ensure your device is registered in your Apple Developer account
- Check that code signing certificates are valid
- Verify the device trusts your developer certificate

**Android:**
- Ensure USB debugging is enabled for physical devices
- Check that "Install from unknown sources" is enabled
- Verify ADB is properly configured and can detect your device

## License

Private project.

