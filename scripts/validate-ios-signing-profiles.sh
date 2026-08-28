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

profile_supports_app_group() {
  local decoded_profile="$1"
  local app_group="$2"

  /usr/libexec/PlistBuddy -c 'Print :Entitlements:com.apple.security.application-groups' "$decoded_profile" 2>/dev/null \
    | grep -Fq "$app_group"
}

for bundle_identifier in "$@"; do
  profile_found=false

  for profile in "${profiles[@]}"; do
    decoded_profile="$(mktemp)"
    application_identifier=""
    profile_matches=false

    if security cms -D -i "$profile" > "$decoded_profile" 2>/dev/null; then
      application_identifier="$(/usr/libexec/PlistBuddy -c 'Print :Entitlements:application-identifier' "$decoded_profile" 2>/dev/null || true)"
    fi

    profile_bundle_identifier="${application_identifier#*.}"

    if matches_bundle_identifier "$profile_bundle_identifier" "$bundle_identifier"; then
      profile_matches=true
      if [[ "$bundle_identifier" == "com.vidkar" || "$bundle_identifier" == "com.vidkar.ExpoWidgetsTarget" ]]; then
        profile_matches=false
        profile_supports_app_group "$decoded_profile" "group.com.vidkar" && profile_matches=true
      fi

      if [[ "$profile_matches" == true ]]; then
        profile_found=true
        rm -f "$decoded_profile"
        break
      fi
    fi

    rm -f "$decoded_profile"
  done

  if [[ "$profile_found" != true ]]; then
    if [[ "$bundle_identifier" == "com.vidkar" || "$bundle_identifier" == "com.vidkar.ExpoWidgetsTarget" ]]; then
      echo "El perfil App Store para $bundle_identifier no incluye el App Group group.com.vidkar." >&2
      echo "Activa App Groups para el App ID en Apple Developer, asigna group.com.vidkar y regenera/sincroniza el perfil en Codemagic." >&2
    else
      echo "Falta un perfil App Store para $bundle_identifier." >&2
    fi
    echo "Cárgalo o créalo en Codemagic > Team settings > Code signing identities > iOS provisioning profiles y vuelve a ejecutar el build." >&2
    exit 1
  fi

done

echo "Perfiles de aprovisionamiento disponibles para: $*"
