.PHONY: help build-ios build-android build-all build-ios-local build-android-local install-eas install-deps clean

# Default target
help:
	@echo "Available targets:"
	@echo "  make install-deps    - Install all dependencies (with legacy-peer-deps)"
	@echo "  make install-eas     - Install EAS CLI globally"
	@echo "  make build-ios       - Build iOS simulator development client"
	@echo "  make build-android   - Build Android emulator development client"
	@echo "  make build-all       - Build both iOS and Android simulator clients"
	@echo "  make build-ios-local - Build iOS simulator locally (requires local setup)"
	@echo "  make build-android-local - Build Android emulator locally (requires local setup)"
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

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf .expo
	rm -rf dist
	rm -rf build
	@echo "Clean complete!"

