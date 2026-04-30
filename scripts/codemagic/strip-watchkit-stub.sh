#!/usr/bin/env bash

set -euo pipefail

ARCHIVE_PATH="${1:-${ARCHIVE_PATH:-}}"
WATCH_ICON_CONTENTS_PATH="${WATCH_ICON_CONTENTS_PATH:-ios/VidkarWatch/Assets.xcassets/AppIcon.appiconset/Contents.json}"

if [ -z "$ARCHIVE_PATH" ]; then
  echo "Falta la ruta del xcarchive. Uso: strip-watchkit-stub.sh <archivo.xcarchive>"
  exit 1
fi

if [ ! -d "$ARCHIVE_PATH" ]; then
  echo "No existe el xcarchive: $ARCHIVE_PATH"
  exit 1
fi

if [ -f "$WATCH_ICON_CONTENTS_PATH" ]; then
  if ! grep -Eq '"size"[[:space:]]*:[[:space:]]*"50x50"' "$WATCH_ICON_CONTENTS_PATH"; then
    echo "El catalogo del Apple Watch no contiene el icono 50x50 requerido para 44mm: $WATCH_ICON_CONTENTS_PATH"
    exit 1
  fi

  if ! grep -Eq '"subtype"[[:space:]]*:[[:space:]]*"44mm"' "$WATCH_ICON_CONTENTS_PATH"; then
    echo "El catalogo del Apple Watch no contiene la variante 44mm esperada: $WATCH_ICON_CONTENTS_PATH"
    exit 1
  fi
fi

stub_paths="$(find "$ARCHIVE_PATH/Products/Applications" -type d -path '*/Watch/*.app/_WatchKitStub' -print 2>/dev/null || true)"

if [ -z "$stub_paths" ]; then
  echo "No se encontro _WatchKitStub dentro del xcarchive."
  exit 0
fi

echo "Eliminando _WatchKitStub del xcarchive antes del export:"
printf '%s\n' "$stub_paths"

while IFS= read -r stub_path; do
  [ -z "$stub_path" ] && continue
  rm -rf "$stub_path"
done <<EOF
$stub_paths
EOF

remaining_stubs="$(find "$ARCHIVE_PATH/Products/Applications" -type d -path '*/Watch/*.app/_WatchKitStub' -print 2>/dev/null || true)"

if [ -n "$remaining_stubs" ]; then
  echo "No se pudieron eliminar todos los _WatchKitStub del xcarchive:"
  printf '%s\n' "$remaining_stubs"
  exit 1
fi

echo "_WatchKitStub eliminado correctamente del xcarchive."