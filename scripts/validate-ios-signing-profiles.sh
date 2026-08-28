#!/bin/bash
set -euo pipefail

profile_directory="$HOME/Library/MobileDevice/Provisioning Profiles"

if [[ "$#" -eq 0 ]]; then
  echo "Se debe indicar al menos un bundle identifier para validar la firma iOS." >&2
  exit 1
fi

if [[ ! -d "$profile_directory" ]]; then
  echo "No se encontraron perfiles de aprovisionamiento instalados por Codemagic." >&2
  exit 1
fi

profiles=()
while IFS= read -r -d '' profile; do
  profiles+=("$profile")
done < <(find "$profile_directory" -maxdepth 1 -name '*.mobileprovision' -type f -print0)

if [[ "${#profiles[@]}" -eq 0 ]]; then
  echo "No se encontraron perfiles de aprovisionamiento instalados por Codemagic." >&2
  exit 1
fi

matches_bundle_identifier() {
  local profile_bundle_identifier="$1"
  local requested_bundle_identifier="$2"

  [[ "$profile_bundle_identifier" == "$requested_bundle_identifier" ]]
}

for bundle_identifier in "$@"; do
  profile_found=false

  for profile in "${profiles[@]}"; do
    decoded_profile="$(mktemp)"
    application_identifier=""

    if security cms -D -i "$profile" > "$decoded_profile" 2>/dev/null; then
      application_identifier="$(/usr/libexec/PlistBuddy -c 'Print :Entitlements:application-identifier' "$decoded_profile" 2>/dev/null || true)"
    fi

    rm -f "$decoded_profile"
    profile_bundle_identifier="${application_identifier#*.}"

    if matches_bundle_identifier "$profile_bundle_identifier" "$bundle_identifier"; then
      profile_found=true
      break
    fi
  done

  if [[ "$profile_found" != true ]]; then
    echo "Falta un perfil App Store para $bundle_identifier." >&2
    echo "Cárgalo o créalo en Codemagic > Team settings > Code signing identities > iOS provisioning profiles y vuelve a ejecutar el build." >&2
    exit 1
  fi

done

echo "Perfiles de aprovisionamiento disponibles para: $*"
