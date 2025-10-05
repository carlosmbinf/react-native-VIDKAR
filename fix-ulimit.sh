#!/bin/bash

echo "🔧 Configurando entorno para React Native en macOS..."

# 1. Instalar watchman si no está
if ! command -v watchman &> /dev/null
then
  echo "📦 Instalando watchman con Homebrew..."
  brew install watchman
else
  echo "✅ Watchman ya está instalado."
fi

# 2. Aumentar límite de archivos abiertos en la shell (permanente)
SHELL_RC="$HOME/.zshrc"
if ! grep -q "ulimit -n 65536" "$SHELL_RC"; then
  echo "⚙️  Configurando ulimit en $SHELL_RC..."
  echo "ulimit -n 65536" >> "$SHELL_RC"
else
  echo "✅ ulimit ya está configurado en $SHELL_RC."
fi

# 3. Crear un LaunchAgent para aplicar límite en todo el sistema (sesión gráfica incluida)
PLIST="$HOME/Library/LaunchAgents/limit.maxfiles.plist"
if [ ! -f "$PLIST" ]; then
  echo "📝 Creando $PLIST..."
  mkdir -p "$HOME/Library/LaunchAgents"
  cat <<EOF > "$PLIST"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>limit.maxfiles</string>
    <key>ProgramArguments</key>
    <array>
        <string>launchctl</string>
        <string>limit</string>
        <string>maxfiles</string>
        <string>65536</string>
        <string>65536</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF
  launchctl load -w "$PLIST"
else
  echo "✅ LaunchAgent ya existe en $PLIST."
fi

echo "🎉 Listo. Reinicia tu terminal y/o sesión de usuario para aplicar cambios."

