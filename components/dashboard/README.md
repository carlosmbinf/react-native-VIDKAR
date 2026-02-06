# Dashboard Component Structure

Este directorio contiene todos los componentes relacionados con el Dashboard de análisis de consumo VPN/Proxy.

## 📁 Estructura de Archivos

```
dashboard/
├── DashBoardPrincipal.js          # Componente principal del dashboard
├── KPICard.jsx                     # Tarjetas de KPIs con animaciones
├── ChartSkeleton.jsx              # Skeleton loader para gráficas
├── CustomSegmentedButtons.jsx     # Tabs personalizados (compatible RN Paper v4)
├── utils/
│   └── formatUtils.js             # Funciones de formateo de números
└── styles/
    └── dashboardStyles.js         # Estilos organizados por componente
```

## 🧩 Componentes

### **DashBoardPrincipal** (Principal)
Componente raíz que orquesta todo el dashboard. Maneja:
- Fetch de datos desde Meteor
- Estado global (loading, refreshing, selectedView)
- Cálculo de KPIs
- Renderizado condicional según vista seleccionada

**Props:**
- `type`: String - Tipo de análisis ('VPN', 'PROXY', 'General')

### **KPICard**
Tarjetas animadas para mostrar KPIs principales.

**Props:**
- `title`: String - Título del KPI
- `value`: Number/String - Valor a mostrar
- `subtitle`: String - Subtítulo opcional
- `icon`: String - Nombre del ícono (MaterialCommunityIcons)
- `color`: String - Color del gradiente (hex)
- `trend`: Number - Porcentaje de tendencia
- `delay`: Number - Delay de animación (ms)
- `isLargeNumber`: Boolean - Aplicar formato de números grandes

**Características:**
- Animación de entrada (fade + scale)
- Gradientes dinámicos
- Tamaño de fuente adaptativo
- Formato automático GB/TB

### **ChartSkeleton**
Placeholder animado mientras cargan los datos.

**Características:**
- Animación de pulso continua
- Múltiples líneas de diferente ancho
- Diseño minimalista

### **CustomSegmentedButtons**
Sistema de tabs compatible con React Native Paper v4.

**Props:**
- `value`: String - Valor actual seleccionado
- `onValueChange`: Function - Callback al cambiar selección
- `buttons`: Array - `[{value, label, icon}]`

**Características:**
- Estilos de selección activa
- Íconos de MaterialCommunityIcons
- Responsive y accesible

## 🛠️ Utilidades

### **formatUtils.js**

#### `formatLargeNumber(value)`
Convierte automáticamente GB a TB cuando el valor >= 1000 GB.

```javascript
formatLargeNumber(7439.48) // → "7.26 TB"
formatLargeNumber(845.50)  // → "845.50 GB"
```

#### `getDynamicFontSize(value)`
Calcula tamaño de fuente óptimo según longitud del texto.

```javascript
getDynamicFontSize("123456")     // → 28px
getDynamicFontSize("12345678")   // → 24px
getDynamicFontSize("1234567890") // → 20px
```

## 🎨 Estilos

Todos los estilos están organizados en `styles/dashboardStyles.js` agrupados por componente:

- `dashboardStyles` - Container principal y layout general
- `kpiCardStyles` - Estilos de KPI Cards
- `segmentedButtonsStyles` - Estilos de tabs
- `chartStyles` - Estilos de gráficas (LineChart, PieChart)
- `statsStyles` - Estilos del grid de estadísticas
- `chartSkeletonStyles` - Estilos del skeleton loader

### Paleta de Colores
- **Principal**: `#4CAF50` (Verde - VPN)
- **Secundario**: `#2196F3` (Azul - Proxy)
- **Fondo**: `#0a0e1a` → `#1a1f2e`
- **Cards**: `#1a1f2e`
- **Texto primario**: `#fff`
- **Texto secundario**: `#ffffff99`

## 📊 Configuración de Charts

El dashboard usa `react-native-chart-kit` con configuraciones personalizadas:

```javascript
const chartConfig = {
  backgroundColor: "#1e1e1e",
  backgroundGradientFrom: "#2a323d",
  backgroundGradientTo: "#1a1f2e",
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  // ... más configuraciones
};
```

## 🔄 Flujo de Datos

1. **Fetch**: `Meteor.call('getDatosDashboardByUser', type, ...)`
2. **Procesamiento**: Extracción de VPN/Proxy, cálculo de KPIs
3. **Estado**: Actualización de arrays `x`, `y`, `yProxy` y `kpiData`
4. **Renderizado**: Condicional según `selectedView` y disponibilidad de datos

## 🚀 Uso

```javascript
import DashBoardPrincipal from './components/dashboard/DashBoardPrincipal';

<DashBoardPrincipal type="General" />
```

## 📝 Notas Técnicas

- **Compatibilidad**: React Native Paper v4.7.2
- **Animaciones**: Animated API nativa de React Native
- **Gradientes**: `react-native-linear-gradient`
- **Íconos**: `react-native-vector-icons/MaterialCommunityIcons`
- **Charts**: `react-native-chart-kit` v6.12.0

## 🔧 Mejoras Futuras

- [ ] Filtros de tiempo (24h, 7d, 30d)
- [ ] Exportar datos (CSV/PDF)
- [ ] Gráficos interactivos con tooltips
- [ ] Comparativas temporales
- [ ] Dark/Light mode toggle
- [ ] Cache de datos con AsyncStorage
