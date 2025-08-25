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
if [ -f yarn.lock ]; then
  echo "Using yarn..."
  yarn install --frozen-lockfile
else
  echo "Using npm..."
  npm ci
fi

# Instalar pods
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update

echo "Stage: Post-clone done."
exit 0
