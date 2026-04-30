#!/usr/bin/env bash

set -euo pipefail

TEAM_ID="${APPLE_TEAM_ID:-4TWB6RN383}"
KEYCHAIN_NAME="codemagic-local-signing.keychain-db"
KEYCHAIN_PATH="$HOME/Library/Keychains/$KEYCHAIN_NAME"
KEYCHAIN_PASSWORD="${CM_KEYCHAIN_PASSWORD:-codemagic-local-signing}"
EXPORT_OPTIONS_PLIST="/Users/builder/export_options.plist"
PROFILES_DIR="$HOME/Library/MobileDevice/Provisioning Profiles"

APP_CERT_PATH="${IOS_APP_CERT_PATH:-credentials/ios/dist-cert.p12}"
WATCH_CERT_PATH="${IOS_WATCH_CERT_PATH:-credentials/ios/VidkarWatch-dist-cert.p12}"
APP_PROFILE_PATH="${IOS_APP_PROFILE_PATH:-credentials/ios/profile.mobileprovision}"
WATCH_PROFILE_PATH="${IOS_WATCH_PROFILE_PATH:-credentials/ios/VidkarWatch-profile.mobileprovision}"

APP_CERT_PASSWORD="${APPLE_DIST_CERT_PASSWORD:-}"
WATCH_CERT_PASSWORD="${APPLE_WATCH_DIST_CERT_PASSWORD:-$APP_CERT_PASSWORD}"

BUNDLE_ID="${BUNDLE_ID:-com.vidkar}"
WATCH_BUNDLE_ID="${WATCH_BUNDLE_ID:-com.vidkar.watchkitapp}"
PROJECT_PATH="${PROJECT_PATH:-ios/Vidkar.xcodeproj}"

require_file() {
  local file_path="$1"
  if [ ! -f "$file_path" ]; then
    echo "No existe el archivo requerido: $file_path"
    exit 1
  fi
}

decode_profile() {
  local profile_path="$1"
  local prefix="$2"
  local plist_path
  plist_path="$(mktemp /tmp/${prefix}.XXXXXX.plist)"
  security cms -D -i "$profile_path" > "$plist_path"

  local uuid
  local name
  uuid="$(/usr/libexec/PlistBuddy -c 'Print :UUID' "$plist_path")"
  name="$(/usr/libexec/PlistBuddy -c 'Print :Name' "$plist_path")"

  cp "$profile_path" "$PROFILES_DIR/$uuid.mobileprovision"

  rm -f "$plist_path"

  printf '%s\n%s\n' "$uuid" "$name"
}

require_file "$APP_CERT_PATH"
require_file "$WATCH_CERT_PATH"
require_file "$APP_PROFILE_PATH"
require_file "$WATCH_PROFILE_PATH"

if [ -z "$APP_CERT_PASSWORD" ]; then
  echo "Falta APPLE_DIST_CERT_PASSWORD en el entorno de Codemagic."
  exit 1
fi

mkdir -p "$PROFILES_DIR"

security delete-keychain "$KEYCHAIN_PATH" >/dev/null 2>&1 || true
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security default-keychain -s "$KEYCHAIN_PATH"
security list-keychains -d user -s "$KEYCHAIN_PATH" login.keychain-db

security import "$APP_CERT_PATH" \
  -k "$KEYCHAIN_PATH" \
  -P "$APP_CERT_PASSWORD" \
  -T /usr/bin/codesign \
  -T /usr/bin/security

security import "$WATCH_CERT_PATH" \
  -k "$KEYCHAIN_PATH" \
  -P "$WATCH_CERT_PASSWORD" \
  -T /usr/bin/codesign \
  -T /usr/bin/security

security set-key-partition-list \
  -S apple-tool:,apple:,codesign: \
  -s \
  -k "$KEYCHAIN_PASSWORD" \
  "$KEYCHAIN_PATH" >/dev/null

mapfile -t APP_PROFILE_INFO < <(decode_profile "$APP_PROFILE_PATH" "app_profile")
mapfile -t WATCH_PROFILE_INFO < <(decode_profile "$WATCH_PROFILE_PATH" "watch_profile")

APP_PROFILE_UUID="${APP_PROFILE_INFO[0]}"
APP_PROFILE_NAME="${APP_PROFILE_INFO[1]}"
WATCH_PROFILE_UUID="${WATCH_PROFILE_INFO[0]}"
WATCH_PROFILE_NAME="${WATCH_PROFILE_INFO[1]}"

cat > "$EXPORT_OPTIONS_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store</string>
  <key>signingStyle</key>
  <string>manual</string>
  <key>signingCertificate</key>
  <string>Apple Distribution</string>
  <key>teamID</key>
  <string>$TEAM_ID</string>
  <key>provisioningProfiles</key>
  <dict>
    <key>$BUNDLE_ID</key>
    <string>$APP_PROFILE_NAME</string>
    <key>$WATCH_BUNDLE_ID</key>
    <string>$WATCH_PROFILE_NAME</string>
  </dict>
</dict>
</plist>
EOF

export PROJECT_PATH TEAM_ID APP_PROFILE_NAME WATCH_PROFILE_NAME KEYCHAIN_PATH

ruby <<'RUBY'
begin
  require 'xcodeproj'
rescue LoadError
  system('gem install xcodeproj --no-document') or abort('No se pudo instalar xcodeproj')
  require 'xcodeproj'
end

project = Xcodeproj::Project.open(ENV.fetch('PROJECT_PATH'))
root_attributes = project.root_object.attributes ||= {}
target_attributes = root_attributes['TargetAttributes'] ||= {}

project.targets.each do |target|
  target_attributes[target.uuid] ||= {}

  profile_name = case target.name
                 when 'Vidkar'
                   ENV.fetch('APP_PROFILE_NAME')
                 when 'VidkarWatch'
                   ENV.fetch('WATCH_PROFILE_NAME')
                 else
                   next
                 end

  target_attributes[target.uuid]['ProvisioningStyle'] = 'Manual'

  target.build_configurations.each do |config|
    config.build_settings['CODE_SIGN_STYLE'] = 'Manual'
    config.build_settings['DEVELOPMENT_TEAM'] = ENV.fetch('TEAM_ID')
    config.build_settings['CODE_SIGN_IDENTITY'] = 'Apple Distribution'
    config.build_settings['PROVISIONING_PROFILE_SPECIFIER'] = profile_name
    config.build_settings['CODE_SIGN_IDENTITY[sdk=iphoneos*]'] = 'Apple Distribution'
    config.build_settings['PROVISIONING_PROFILE_SPECIFIER[sdk=iphoneos*]'] = profile_name
    config.build_settings['OTHER_CODE_SIGN_FLAGS'] = "--keychain #{ENV.fetch('KEYCHAIN_PATH')}"
  end
end

project.save
RUBY

echo "Perfiles instalados:"
echo "- $APP_PROFILE_NAME ($APP_PROFILE_UUID) -> $BUNDLE_ID"
echo "- $WATCH_PROFILE_NAME ($WATCH_PROFILE_UUID) -> $WATCH_BUNDLE_ID"

echo "Identidades disponibles:"
security find-identity -v -p codesigning "$KEYCHAIN_PATH"
