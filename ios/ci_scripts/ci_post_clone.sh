#!/bin/zsh
set -e
echo "Stage: Post-clone start..."

# --- Debug ---
echo "PWD: $(pwd)"
echo "Repo: $CI_PRIMARY_REPOSITORY_PATH"
echo "Build Number: $CI_BUILD_NUMBER"

# --- Instalar Node 22, Yarn y CocoaPods ---
brew install node@22 yarn cocoapods
brew link --overwrite node@22

# --- PATH para usar Node 22 ---
export PATH="/usr/local/opt/node@22/bin:$PATH"
echo "Usando Node:"
node -v
npm -v

# --- Instalar watchman ---
if ! command -v watchman &> /dev/null
then
  echo "📦 Instalando watchman con Homebrew..."
  brew install watchman
else
  echo "✅ Watchman ya está instalado."
fi

# --- Aumentar límite de archivos abiertos ---
ulimit -n 65536
echo "ulimit actual: $(ulimit -n)"

# --- Ir a la raíz del repo ---
cd "$CI_PRIMARY_REPOSITORY_PATH"

# --- Instalar dependencias JS ---
npm install --legacy-peer-deps -f

# --- Instalar pods ---
cd ios
pod install

# --- Actualizar build number y marketing version ---
xcrun agvtool new-version -all $CI_BUILD_NUMBER
MARKETING_VERSION="1.0.$CI_BUILD_NUMBER"
xcrun agvtool new-marketing-version $MARKETING_VERSION

# --- Variables para Archive ---
WORKSPACE_PATH="$CI_PRIMARY_REPOSITORY_PATH/ios/Vidkar.xcworkspace"
SCHEME="Vidkar"
ARCHIVE_DIR="$CI_PRIMARY_REPOSITORY_PATH/archives"
mkdir -p "$ARCHIVE_DIR"

# --- Build & Archive ---
echo "🏗 Ejecutando build y generando archive..."
xcodebuild -workspace "$WORKSPACE_PATH" \
           -scheme "$SCHEME" \
           -configuration Release \
           -archivePath "$ARCHIVE_DIR/$SCHEME.xcarchive" \
           clean archive

echo "✅ Archive generado en $ARCHIVE_DIR/$SCHEME.xcarchive"

# --- Subir a TestFlight ---
# Requiere Apple ID y App-Specific Password en variables de entorno:
# APPLE_ID, APP_SPECIFIC_PASSWORD
if [[ -n "$APPLE_ID" && -n "$APP_SPECIFIC_PASSWORD" ]]; then
  echo "🚀 Subiendo a TestFlight..."
  xcrun altool --upload-app \
    -f "$ARCHIVE_DIR/$SCHEME.xcarchive/Products/Applications/$SCHEME.app" \
    -t ios \
    -u "$APPLE_ID" \
    -p "$APP_SPECIFIC_PASSWORD" \
    --verbose
  echo "✅ Upload a TestFlight completado."
else
  echo "⚠️ APPLE_ID o APP_SPECIFIC_PASSWORD no configurados. Se omite upload a TestFlight."
fi

echo "Stage: Post-clone done."
exit 0
