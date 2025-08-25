#!/bin/zsh
set -e
echo "Stage: Post-clone start..."

# Instalar Node versión estable usada en RN
brew install node@18
brew link --overwrite node@18

# Instalar Yarn y CocoaPods
brew install yarn cocoapods

# Instalar dependencias JS
cd $CI_WORKSPACE

echo "Using npm..."
npm install -f

# Instalar pods
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update

echo "Stage: Post-clone done."
exit 0
