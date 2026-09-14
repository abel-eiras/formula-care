#!/bin/sh
# Instala Formula Care en Linux descargando el AppImage de la última
# versión publicada en GitHub Releases — sin pasar por gestores de
# paquetes (no se generan .deb/.rpm, solo AppImage).
#
# Uso:
#   curl -fsSL https://raw.githubusercontent.com/abel-eiras/formula-care/main/scripts/install-linux.sh | sh
#
# Necesita conexión a internet (descarga ~150MB) y `curl`.
set -eu

REPO="abel-eiras/formula-care"
APP_NAME="Formula Care"
BIN_NAME="formula-care"
INSTALL_DIR="${FORMULA_CARE_INSTALL_DIR:-$HOME/.local/share/formula-care}"
BIN_LINK_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/128x128/apps"

if [ "$(uname -s)" != "Linux" ]; then
  echo "Este instalador es solo para Linux. En macOS usa el .dmg y en Windows el .exe/.msi de la página de Releases." >&2
  exit 1
fi

if [ "$(uname -m)" != "x86_64" ]; then
  echo "Solo hay AppImage para x86_64 por ahora. Tu arquitectura ($(uname -m)) no está soportada." >&2
  exit 1
fi

command -v curl >/dev/null 2>&1 || { echo "Hace falta 'curl' para instalar. Instálalo y vuelve a intentarlo." >&2; exit 1; }

echo "Buscando la última versión de $APP_NAME..."
RELEASE_JSON=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest")

APPIMAGE_URL=$(printf '%s' "$RELEASE_JSON" \
  | grep -o '"browser_download_url":[[:space:]]*"[^"]*\.AppImage"' \
  | sed 's/.*"\(https[^"]*\)"/\1/' \
  | head -n1)

if [ -z "$APPIMAGE_URL" ]; then
  echo "No se encontró ningún AppImage en la última release de $REPO." >&2
  echo "Comprueba https://github.com/$REPO/releases manualmente." >&2
  exit 1
fi

mkdir -p "$INSTALL_DIR" "$BIN_LINK_DIR" "$DESKTOP_DIR" "$ICON_DIR"

echo "Descargando $APPIMAGE_URL..."
curl -fsSL "$APPIMAGE_URL" -o "$INSTALL_DIR/$BIN_NAME.AppImage"
chmod +x "$INSTALL_DIR/$BIN_NAME.AppImage"

echo "Descargando icono..."
curl -fsSL "https://raw.githubusercontent.com/$REPO/main/src-tauri/icons/128x128.png" \
  -o "$ICON_DIR/$BIN_NAME.png" 2>/dev/null || true

ln -sf "$INSTALL_DIR/$BIN_NAME.AppImage" "$BIN_LINK_DIR/$BIN_NAME"

cat > "$DESKTOP_DIR/$BIN_NAME.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=$APP_NAME
Comment=Gestión de servicios de farmacia (app de escritorio, software libre)
Exec=$INSTALL_DIR/$BIN_NAME.AppImage
Icon=$BIN_NAME
Terminal=false
Categories=Office;Medical;
EOF

echo ""
echo "✓ $APP_NAME instalado en $INSTALL_DIR"
echo "✓ Debería aparecer en el menú de aplicaciones (puede que necesites cerrar sesión o reiniciar el launcher)."
echo "✓ También puedes ejecutarlo desde la terminal con: $BIN_NAME"

case ":$PATH:" in
  *":$BIN_LINK_DIR:"*) ;;
  *)
    echo ""
    echo "⚠️  $BIN_LINK_DIR no está en tu PATH. Añade esta línea a tu ~/.bashrc o ~/.zshrc:"
    echo "    export PATH=\"$BIN_LINK_DIR:\$PATH\""
    ;;
esac

echo ""
echo "Nota: los AppImage necesitan FUSE para ejecutarse directamente. Si al lanzar"
echo "$BIN_NAME ves un error relacionado con FUSE, instala libfuse2 (por ejemplo"
echo "'sudo apt install libfuse2' en Debian/Ubuntu) o consulta https://github.com/AppImage/AppImageKit/wiki/FUSE"
