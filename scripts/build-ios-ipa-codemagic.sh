#!/usr/bin/env bash

set -euo pipefail

workspace_path="${XCODE_WORKSPACE:-Vidkar.xcworkspace}"
scheme_name="${XCODE_SCHEME:-Vidkar}"
development_team="${APPLE_TEAM_ID:-4TWB6RN383}"
build_root="${CM_BUILD_DIR:-$PWD}/build/ios"
archive_path="$build_root/xcarchive/${scheme_name}.xcarchive"
ipa_directory="$build_root/ipa"
result_bundle_path="$build_root/results/${scheme_name}.xcresult"
export_options_path="$build_root/export-options.plist"
log_path="${CM_BUILD_DIR:-$PWD}/build-ipa.log"

if [[ "$workspace_path" != /* && "$workspace_path" != ios/* ]]; then
  workspace_path="ios/$workspace_path"
fi

if [[ ! -d "$workspace_path" ]]; then
  echo "No se encontró el workspace iOS: $workspace_path" >&2
  exit 1
fi

: "${APP_STORE_CONNECT_KEY_IDENTIFIER:?Falta APP_STORE_CONNECT_KEY_IDENTIFIER de la integración de Codemagic}"
: "${APP_STORE_CONNECT_ISSUER_ID:?Falta APP_STORE_CONNECT_ISSUER_ID de la integración de Codemagic}"
: "${APP_STORE_CONNECT_PRIVATE_KEY:?Falta APP_STORE_CONNECT_PRIVATE_KEY de la integración de Codemagic}"

key_directory="$(mktemp -d)"
auth_key_path="$key_directory/AuthKey_${APP_STORE_CONNECT_KEY_IDENTIFIER}.p8"
cleanup() {
  rm -rf "$key_directory"
}
trap cleanup EXIT

if [[ -f "$APP_STORE_CONNECT_PRIVATE_KEY" ]]; then
  cp "$APP_STORE_CONNECT_PRIVATE_KEY" "$auth_key_path"
else
  printf '%s' "$APP_STORE_CONNECT_PRIVATE_KEY" > "$auth_key_path"
fi
chmod 600 "$auth_key_path"

rm -rf "$archive_path" "$ipa_directory" "$result_bundle_path"
mkdir -p "$(dirname "$archive_path")" "$ipa_directory" "$(dirname "$result_bundle_path")"

cat > "$export_options_path" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>destination</key>
  <string>export</string>
  <key>manageAppVersionAndBuildNumber</key>
  <false/>
  <key>method</key>
  <string>app-store-connect</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>stripSwiftSymbols</key>
  <true/>
  <key>teamID</key>
  <string>$development_team</string>
  <key>uploadSymbols</key>
  <true/>
</dict>
</plist>
PLIST

xcode_authentication_args=(
  -allowProvisioningUpdates
  -authenticationKeyPath "$auth_key_path"
  -authenticationKeyID "$APP_STORE_CONNECT_KEY_IDENTIFIER"
  -authenticationKeyIssuerID "$APP_STORE_CONNECT_ISSUER_ID"
)

echo "Construyendo $scheme_name desde $workspace_path con firma automática"

xcodebuild \
  -workspace "$workspace_path" \
  -scheme "$scheme_name" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$archive_path" \
  -resultBundlePath "$result_bundle_path" \
  "${xcode_authentication_args[@]}" \
  archive \
  COMPILER_INDEX_STORE_ENABLE=NO \
  DEVELOPMENT_TEAM="$development_team" \
  CODE_SIGN_STYLE=Automatic \
  2>&1 | tee "$log_path"

xcodebuild \
  -exportArchive \
  -archivePath "$archive_path" \
  -exportPath "$ipa_directory" \
  -exportOptionsPlist "$export_options_path" \
  "${xcode_authentication_args[@]}" \
  2>&1 | tee -a "$log_path"

if ! find "$ipa_directory" -maxdepth 1 -name '*.ipa' -type f -print -quit | grep -q .; then
  echo "El archive terminó, pero no se generó ningún IPA en $ipa_directory." >&2
  exit 1
fi

echo "IPA generado correctamente en $ipa_directory"
