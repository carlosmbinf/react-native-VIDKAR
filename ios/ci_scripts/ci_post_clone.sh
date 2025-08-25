#!/bin/zsh
set -e
echo "Stage: Post-clone start..."

# Debug
echo "PWD: $(pwd)"
echo "Repo: $CI_PRIMARY_REPOSITORY_PATH"
echo "Build Number: $CI_BUILD_NUMBER"

# Instalar Node (versión estable para RN), Yarn y CocoaPods
brew install node@18 yarn cocoapods
brew link --overwrite node@18

# Ir a la raíz del repo (donde está package.json)
cd "$CI_PRIMARY_REPOSITORY_PATH"

# Instalar dependencias JS
echo "Using npm..."
npm install --legacy-peer-deps -f

# Instalar pods
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update

# === Actualizar versión iOS ===
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"

# 1️⃣ Actualizar el build number (CFBundleVersion)
xcrun agvtool new-version -all $CI_BUILD_NUMBER
echo "CFBundleVersion set to $CI_BUILD_NUMBER"

# 2️⃣ Actualizar la versión de marketing (CFBundleShortVersionString)
MARKETING_VERSION="1.0.$CI_BUILD_NUMBER"  # <- ajusta el "1.0" si quieres otro prefijo
xcrun agvtool new-marketing-version $MARKETING_VERSION
echo "CFBundleShortVersionString set to $MARKETING_VERSION"

echo "Stage: Post-clone done."
exit 0
