#!/bin/zsh
set -e
echo "Stage: Post-clone start..."

# Debug: ver dónde estoy parado y qué hay en el workspace
echo "PWD: $(pwd)"
echo "CI_WORKSPACE: $CI_WORKSPACE"
ls -la "$CI_WORKSPACE"

# Instalar Node versión estable usada en RN
brew install node@18
brew link --overwrite node@18

# Instalar Yarn y CocoaPods
brew install yarn cocoapods

# Ir a la raíz del repo (donde está package.json)
cd "$CI_WORKSPACE/repository" || {
  echo "❌ No existe $CI_WORKSPACE/repository"
  exit 1
}

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
