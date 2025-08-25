#!/bin/bash

# Pre Xcode build script for React Native project
echo "Starting pre-build setup for iOS..."

# Exit on any error
set -e

# Navigate to project root (parent of ios folder)
cd "$(dirname "$0")/../.."

# Install npm dependencies with force flag
echo "Installing npm dependencies..."
npm install -f

# Navigate to iOS directory
echo "Navigating to iOS directory..."
cd ios

# Install CocoaPods dependencies
echo "Installing CocoaPods dependencies..."
pod install

# Clean any previous builds
echo "Cleaning previous builds..."
rm -rf build/
rm -rf DerivedData/

echo "Pre-build setup completed successfully!"