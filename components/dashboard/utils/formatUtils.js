/**
 * Función para formatear valores grandes
 * Convierte automáticamente GB a TB cuando el valor es >= 1000 GB
 * @param {number|string} value - Valor numérico a formatear
 * @returns {string} - Valor formateado con unidad (GB o TB)
 */
export const formatLargeNumber = (value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value;
    
    if (numValue >= 1000) {
        return (numValue / 1024).toFixed(2) + ' TB';
    }
    return numValue.toFixed(2) + ' GB';
};

/**
 * Función para determinar tamaño de fuente según longitud del texto
 * Ajusta dinámicamente el tamaño para evitar overflow en números grandes
 * @param {any} value - Valor a medir
 * @returns {number} - Tamaño de fuente en px
 */
export const getDynamicFontSize = (value) => {
    const stringValue = String(value);
    const length = stringValue.length;
    
    if (length <= 6) return 28;
    if (length <= 8) return 24;
    if (length <= 10) return 20;
    return 18;
};

/**
 * Detecta el tipo de período basado en el formato de las etiquetas
 * @param {Array} labels - Array de etiquetas de tiempo
 * @returns {Object} - {type: string, label: string, icon: string, color: string, description: string}
 */
export const detectPeriodType = (labels) => {
    if (!labels || labels.length === 0) {
        return { 
            type: 'DESCONOCIDO', 
            label: 'Sin datos', 
            icon: 'calendar-blank', 
            color: '#757575',
            description: 'No hay datos disponibles'
        };
    }

    const firstLabel = String(labels[0]);
    
    // Formato de día del mes: "01", "02", "28" (1-2 dígitos)
    if (/^\d{1,2}$/.test(firstLabel) && labels.length <= 31) {
        return { 
            type: 'DIA', 
            label: 'Por Día', 
            icon: 'calendar-today',
            color: '#FF9800',
            description: 'Datos del mes actual'
        };
    }
    
    // Formato de mes: "01/2026", "12/2025" (MM/YYYY)
    if (/^\d{2}\/\d{4}$/.test(firstLabel)) {
        return { 
            type: 'MES', 
            label: 'Por Mes', 
            icon: 'calendar-month',
            color: '#2196F3',
            description: 'Histórico mensual'
        };
    }
    
    // Formato de hora del día: "00:00", "23:59"
    if (/^\d{2}:\d{2}$/.test(firstLabel)) {
        return { 
            type: 'HORA', 
            label: 'Por Hora', 
            icon: 'clock-outline',
            color: '#9C27B0',
            description: 'Últimas 24 horas'
        };
    }
    
    // Formato de año: "2025", "2026"
    if (/^\d{4}$/.test(firstLabel)) {
        return { 
            type: 'AÑO', 
            label: 'Por Año', 
            icon: 'calendar',
            color: '#4CAF50',
            description: 'Histórico anual'
        };
    }
    
    // Por defecto
    return { 
        type: 'GENERAL', 
        label: 'General', 
        icon: 'chart-line',
        color: '#607D8B',
        description: 'Análisis general'
    };
};
