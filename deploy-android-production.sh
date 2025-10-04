#!/bin/bash

# Script para desplegar a Google Play PRODUCCIÓN usando Codemagic
# Este script incrementa la versión, hace commit y push para disparar el build automático de PRODUCCIÓN

set -e

echo "🚀 Iniciando despliegue a Google Play PRODUCCIÓN..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ADVERTENCIA DE PRODUCCIÓN
echo -e "${RED}⚠️  ADVERTENCIA: ESTE ES UN DESPLIEGUE A PRODUCCIÓN ⚠️${NC}"
echo -e "${RED}🔥 La app se subirá directamente a Google Play Store (PRODUCCIÓN)${NC}"
echo -e "${YELLOW}¿Estás seguro de que quieres continuar? (y/N)${NC}"
read -r response

if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}ℹ️  Despliegue cancelado por el usuario${NC}"
    exit 0
fi

# Verificar que estamos en la rama master
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "master" ]; then
    echo -e "${RED}❌ Error: Debes estar en la rama 'master' para hacer el despliegue${NC}"
    echo "Rama actual: $CURRENT_BRANCH"
    exit 1
fi

# Verificar que no hay cambios sin commitear
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ Error: Hay cambios sin commitear${NC}"
    echo "Por favor, commitea todos los cambios antes de continuar"
    git status
    exit 1
fi

# Obtener la versión actual del package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${YELLOW}📦 Versión actual: $CURRENT_VERSION${NC}"

# Para producción, sugerimos usar minor o major
VERSION_TYPE=${1:-minor}
echo -e "${YELLOW}🔄 Incrementando versión ($VERSION_TYPE) para PRODUCCIÓN...${NC}"

# Usar npm version para incrementar automáticamente
NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version)
echo -e "${GREEN}✅ Nueva versión: $NEW_VERSION${NC}"

# Actualizar versionName en Android
echo -e "${YELLOW}🤖 Actualizando versión en Android...${NC}"
cd android/app
# Leer el build.gradle y extraer versionCode actual
CURRENT_VERSION_CODE=$(grep -oP 'versionCode \K\d+' build.gradle)
NEW_VERSION_CODE=$((CURRENT_VERSION_CODE + 1))

echo -e "${YELLOW}📈 Version Code: $CURRENT_VERSION_CODE -> $NEW_VERSION_CODE${NC}"

# Actualizar versionName y versionCode en build.gradle
sed -i.bak "s/versionName \".*\"/versionName \"$NEW_VERSION\"/" build.gradle
sed -i.bak "s/versionCode $CURRENT_VERSION_CODE/versionCode $NEW_VERSION_CODE/" build.gradle
rm build.gradle.bak
cd ../..

# Hacer commit de los cambios de versión
echo -e "${YELLOW}💾 Haciendo commit de la nueva versión...${NC}"
git add package.json package-lock.json android/app/build.gradle
git commit -m "🚀 PRODUCTION Release v$NEW_VERSION

- Bumped version from $CURRENT_VERSION to $NEW_VERSION
- Updated Android versionCode to $NEW_VERSION_CODE
- Ready for Google Play PRODUCTION deployment via Codemagic

[production-release]"

# Crear tag para la release de producción
echo -e "${YELLOW}🏷️  Creando tag para la release...${NC}"
git tag -a "v$NEW_VERSION" -m "Production release v$NEW_VERSION"

# Hacer push para disparar el workflow de Codemagic
echo -e "${YELLOW}🌐 Pushing to GitHub para disparar build de PRODUCCIÓN...${NC}"
git push origin master
git push origin "v$NEW_VERSION"

echo -e "${GREEN}✅ ¡Despliegue a PRODUCCIÓN iniciado!${NC}"
echo ""
echo -e "${RED}🚨 IMPORTANTE: Este build se subirá a GOOGLE PLAY STORE PRODUCCIÓN 🚨${NC}"
echo ""
echo -e "${YELLOW}📋 Próximos pasos:${NC}"
echo "1. 🔍 Monitorea el build en Codemagic: https://codemagic.io/apps"
echo "2. 📱 El AAB se subirá automáticamente a Google Play Store PRODUCCIÓN"
echo "3. 🕐 La app estará disponible para usuarios en ~2-3 horas (después de revisión)"
echo "4. 📧 Recibirás un email cuando el proceso termine"
echo "5. 🏷️  Se creó el tag v$NEW_VERSION para esta release"
echo ""
echo -e "${GREEN}🎉 ¡Build de PRODUCCIÓN en progreso! La versión $NEW_VERSION estará disponible pronto en Google Play Store.${NC}"