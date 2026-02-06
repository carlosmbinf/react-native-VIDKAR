/**
 * Dashboard Module Exports
 * Punto de entrada centralizado para todos los componentes del dashboard
 */

// Componente principal
export { default as DashBoardPrincipal } from './DashBoardPrincipal';

// Componentes reutilizables
export { default as KPICard } from './KPICard';
export { default as ChartSkeleton } from './ChartSkeleton';
export { default as CustomSegmentedButtons } from './CustomSegmentedButtons';

// Utilidades
export { formatLargeNumber, getDynamicFontSize, detectPeriodType } from './utils/formatUtils';

// Estilos (para uso en componentes externos si es necesario)
export {
    dashboardStyles,
    kpiCardStyles,
    segmentedButtonsStyles,
    chartStyles,
    statsStyles,
    chartSkeletonStyles
} from './styles/dashboardStyles';

// Export por defecto del componente principal
export { default } from './DashBoardPrincipal';
