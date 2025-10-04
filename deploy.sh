#!/bin/bash

# Script principal para despliegues automatizados
# Permite elegir entre iOS TestFlight, Android Internal Testing o Android Producción

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🚀 VIDKAR - Sistema de Despliegue Automatizado${NC}"
echo -e "${PURPLE}================================================${NC}"
echo ""

# Verificar dependencias
echo -e "${YELLOW}🔍 Verificando dependencias...${NC}"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
fi

# Verificar Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git no está instalado${NC}"
    exit 1
fi

# Verificar que estamos en un repositorio Git
if [ ! -d .git ]; then
    echo -e "${RED}❌ No estás en la raíz de un repositorio Git${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Todas las dependencias están disponibles${NC}"
echo ""

# Mostrar estado actual
CURRENT_BRANCH=$(git branch --show-current)
CURRENT_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "No encontrada")

echo -e "${BLUE}📊 Estado Actual:${NC}"
echo -e "   📁 Rama: ${YELLOW}$CURRENT_BRANCH${NC}"
echo -e "   📦 Versión: ${YELLOW}$CURRENT_VERSION${NC}"

# Verificar si hay cambios sin commitear
if [ -n "$(git status --porcelain)" ]; then
    echo -e "   ⚠️  ${YELLOW}Hay cambios sin commitear${NC}"
else
    echo -e "   ✅ ${GREEN}Working directory limpio${NC}"
fi
echo ""

# Menú de opciones
echo -e "${PURPLE}📱 Selecciona el tipo de despliegue:${NC}"
echo ""
echo -e "${BLUE}1)${NC} 📱 ${YELLOW}iOS TestFlight${NC} - Despliegue para testing interno (iOS)"
echo -e "${BLUE}2)${NC} 🤖 ${YELLOW}Android Internal Testing${NC} - Despliegue para testing interno (Android)"
echo -e "${BLUE}3)${NC} 🚀 ${RED}Android PRODUCCIÓN${NC} - Despliegue a Google Play Store (PRODUCCIÓN)"
echo -e "${BLUE}4)${NC} 📋 ${BLUE}Ver logs de Codemagic${NC} - Abrir dashboard de builds"
echo -e "${BLUE}5)${NC} ❌ ${BLUE}Salir${NC}"
echo ""

while true; do
    read -p "$(echo -e "${PURPLE}Elige una opción (1-5): ${NC}")" choice
    
    case $choice in
        1)
            echo ""
            echo -e "${BLUE}🍎 Iniciando despliegue a iOS TestFlight...${NC}"
            echo ""
            read -p "$(echo -e "${YELLOW}Tipo de incremento de versión (patch/minor/major) [patch]: ${NC}")" version_type
            version_type=${version_type:-patch}
            
            ./deploy-ios-testflight.sh "$version_type"
            break
            ;;
        2)
            echo ""
            echo -e "${GREEN}🤖 Iniciando despliegue a Android Internal Testing...${NC}"
            echo ""
            read -p "$(echo -e "${YELLOW}Tipo de incremento de versión (patch/minor/major) [patch]: ${NC}")" version_type
            version_type=${version_type:-patch}
            
            ./deploy-android-internal.sh "$version_type"
            break
            ;;
        3)
            echo ""
            echo -e "${RED}🚨 ADVERTENCIA: DESPLIEGUE A PRODUCCIÓN${NC}"
            echo -e "${RED}Este despliegue subirá la app directamente a Google Play Store${NC}"
            echo ""
            read -p "$(echo -e "${YELLOW}¿Estás seguro? (y/N): ${NC}")" confirm
            
            if [[ "$confirm" =~ ^[Yy]$ ]]; then
                read -p "$(echo -e "${YELLOW}Tipo de incremento de versión (patch/minor/major) [minor]: ${NC}")" version_type
                version_type=${version_type:-minor}
                
                ./deploy-android-production.sh "$version_type"
            else
                echo -e "${BLUE}ℹ️  Despliegue a producción cancelado${NC}"
            fi
            break
            ;;
        4)
            echo ""
            echo -e "${BLUE}📋 Abriendo dashboard de Codemagic...${NC}"
            echo -e "${YELLOW}🌐 URL: https://codemagic.io/apps${NC}"
            
            # Intentar abrir en el navegador (macOS)
            if command -v open &> /dev/null; then
                open "https://codemagic.io/apps"
            else
                echo -e "${YELLOW}ℹ️  Copia y pega la URL en tu navegador${NC}"
            fi
            break
            ;;
        5)
            echo -e "${BLUE}👋 ¡Hasta luego!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Opción inválida. Por favor elige entre 1-5.${NC}"
            ;;
    esac
done

echo ""
echo -e "${PURPLE}🎉 ¡Despliegue completado!${NC}"
echo -e "${YELLOW}📧 Recibirás un email cuando el build termine${NC}"
echo -e "${BLUE}🔍 Puedes monitorear el progreso en: https://codemagic.io/apps${NC}"