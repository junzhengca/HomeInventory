.PHONY: help build-ios build-android build-all build-ios-local build-android-local build-ios-internal-local build-android-internal-local build-all-internal-local build-ios-internal build-android-internal build-all-internal build-ios-internal-local-app build-android-internal-local-app build-all-internal-local-app install-eas install-deps register-device clean

# Default target
help:
	@echo "Available targets:"
	@echo "  make install-deps    - Install all dependencies (with legacy-peer-deps)"
	@echo "  make install-eas     - Install EAS CLI globally"
	@echo "  make register-device - Register a new device on EAS (interactive)"
	@echo "  make build-ios       - Build iOS simulator development client"
	@echo "  make build-android   - Build Android emulator development client"
	@echo "  make build-all       - Build both iOS and Android simulator clients"
	@echo "  make build-ios-local - Build iOS simulator locally (requires local setup)"
	@echo "  make build-android-local - Build Android emulator locally (requires local setup)"
	@echo "  make build-ios-internal-local - Build iOS internal distribution variant locally"
	@echo "  make build-android-internal-local - Build Android internal distribution variant locally"
	@echo "  make build-all-internal-local - Build both iOS and Android internal distribution variants locally"
	@echo "  make build-ios-internal - Build iOS internal distribution IPA (not development client)"
	@echo "  make build-android-internal - Build Android internal distribution APK (not development client)"
	@echo "  make build-all-internal - Build both iOS and Android internal distribution builds"
	@echo "  make build-ios-internal-local-app - Build iOS internal distribution IPA locally (not development client)"
	@echo "  make build-android-internal-local-app - Build Android internal distribution APK locally (not development client)"
	@echo "  make build-all-internal-local-app - Build both iOS and Android internal distribution builds locally"
	@echo "  make clean           - Clean build artifacts"

# Install all dependencies
install-deps:
	@echo "Installing dependencies with legacy-peer-deps..."
	npm install --legacy-peer-deps
	@echo "Dependencies installed!"

# Install EAS CLI
install-eas:
	@echo "Installing EAS CLI..."
	npm install -g eas-cli
	@echo "EAS CLI installed. Run 'eas login' to authenticate."

# Register a new device on EAS
register-device:
	@echo "Registering a new device on EAS..."
	@echo "This will prompt you to select the platform and provide device information."
	eas device:create

# Build iOS simulator development client (cloud build)
build-ios:
	@echo "Building iOS simulator development client..."
	eas build --profile development --platform ios

# Build Android emulator development client (cloud build)
build-android:
	@echo "Building Android emulator development client..."
	eas build --profile development --platform android

# Build both iOS and Android simulator clients
build-all: build-ios build-android
	@echo "All builds completed!"

# Build iOS simulator development client locally
build-ios-local:
	@echo "Building iOS simulator development client locally..."
	eas build --profile development --platform ios --local

# Build Android emulator development client locally
build-android-local:
	@echo "Building Android emulator development client locally..."
	eas build --profile development --platform android --local

# Build iOS internal distribution variant locally
build-ios-internal-local:
	@echo "Building iOS internal distribution variant locally..."
	eas build --profile development --platform ios --local

# Build Android internal distribution variant locally
build-android-internal-local:
	@echo "Building Android internal distribution variant locally..."
	eas build --profile development --platform android --local

# Build both iOS and Android internal distribution variants locally
build-all-internal-local: build-ios-internal-local build-android-internal-local
	@echo "All internal distribution builds completed!"

# Build iOS internal distribution IPA (not development client) - cloud build
build-ios-internal:
	@echo "Building iOS internal distribution IPA (not development client)..."
	eas build --profile internal --platform ios

# Build Android internal distribution APK (not development client) - cloud build
build-android-internal:
	@echo "Building Android internal distribution APK (not development client)..."
	eas build --profile internal --platform android

# Build both iOS and Android internal distribution builds (not development clients)
build-all-internal: build-ios-internal build-android-internal
	@echo "All internal distribution builds completed!"

# Build iOS internal distribution IPA locally (not development client)
build-ios-internal-local-app:
	@echo "Building iOS internal distribution IPA locally (not development client)..."
	eas build --profile internal --platform ios --local

# Build Android internal distribution APK locally (not development client)
build-android-internal-local-app:
	@echo "Building Android internal distribution APK locally (not development client)..."
	eas build --profile internal --platform android --local

# Build both iOS and Android internal distribution builds locally (not development clients)
build-all-internal-local-app: build-ios-internal-local-app build-android-internal-local-app
	@echo "All internal distribution builds completed!"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf .expo
	rm -rf dist
	rm -rf build
	@echo "Clean complete!"

