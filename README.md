# HomeInventory

A React Native application for managing home inventory built with Expo.

## Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn
- EAS CLI (install with `make install-eas`)
- For iOS builds: Xcode and iOS development tools
- For Android builds: Android Studio and Android SDK

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

