#!/bin/zsh
set -e
echo "Stage: Post-clone start..."

# Debug: ver dónde estoy parado y qué hay en el workspace
echo "PWD: $(pwd)"
echo "CI_PRIMARY_REPOSITORY_PATH: $CI_PRIMARY_REPOSITORY_PATH"
ls -la "$CI_PRIMARY_REPOSITORY_PATH"

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

echo "Stage: Post-clone done."
exit 0
