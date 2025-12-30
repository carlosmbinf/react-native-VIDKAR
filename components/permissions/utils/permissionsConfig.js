import { Platform } from 'react-native';

// ✅ Intentar importar funciones de forma segura
let PERMISSIONS, check, request, openSettings, RESULTS;

try {
  const permissionsModule = require('react-native-permissions');
  PERMISSIONS = permissionsModule?.PERMISSIONS;
  check = permissionsModule?.check;
  request = permissionsModule?.request;
  openSettings = permissionsModule?.openSettings;
  RESULTS = permissionsModule?.RESULTS;
  
  if (!PERMISSIONS || !check || !request || !RESULTS) {
    throw new Error('Módulo react-native-permissions incompleto');
  }
} catch (error) {
  console.error('❌ [permissionsConfig] Error cargando react-native-permissions:', error.message);
  
  // ✅ FALLBACK: Valores mock para evitar crashes
  PERMISSIONS = { ANDROID: {}, IOS: {} };
  check = async () => 'unavailable';
  request = async () => 'unavailable';
  openSettings = async () => console.warn('openSettings no disponible');
  RESULTS = {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
    UNAVAILABLE: 'unavailable',
    LIMITED: 'limited',
  };
}

// ✅ NUEVO: Función de validación manual (reemplaza isPermissionsLibraryAvailable)
export const isPermissionsLibraryAvailable = () => {
  try {
    // Verificar que las funciones críticas existan y sean funciones
    return (
      typeof PERMISSIONS === 'object' &&
      typeof check === 'function' &&
      typeof request === 'function' &&
      typeof RESULTS === 'object'
    );
  } catch (error) {
    console.error('❌ [permissionsConfig] Error validando librería:', error);
    return false;
  }
};

/**
 * Configuración centralizada de permisos por plataforma
 * Cumple con estándares de Google Play y App Store
 */

export const PERMISSION_TYPES = {
  LOCATION: 'LOCATION',
  LOCATION_BACKGROUND: 'LOCATION_BACKGROUND',
  CAMERA: 'CAMERA',
  GALLERY: 'GALLERY',
  NOTIFICATIONS: 'NOTIFICATIONS',
};

// ✅ Mapeo de permisos nativos por plataforma
export const NATIVE_PERMISSIONS = {
  [PERMISSION_TYPES.LOCATION]: Platform.select({
    android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
    ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
  }),
  [PERMISSION_TYPES.LOCATION_BACKGROUND]: Platform.select({
    android: PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION,
    ios: PERMISSIONS.IOS.LOCATION_ALWAYS,
  }),
  [PERMISSION_TYPES.CAMERA]: Platform.select({
    android: PERMISSIONS.ANDROID.CAMERA,
    ios: PERMISSIONS.IOS.CAMERA,
  }),
  [PERMISSION_TYPES.GALLERY]: Platform.select({
    android: parseInt(Platform.Version, 10) >= 33
      ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
      : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
    ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
  }),
  [PERMISSION_TYPES.NOTIFICATIONS]: Platform.select({
    android: parseInt(Platform.Version, 10) >= 33
      ? PERMISSIONS.ANDROID.POST_NOTIFICATIONS
      : null, // No requerido en Android < 13
    ios: PERMISSIONS.IOS.NOTIFICATIONS,
  }),
};

// ✅ Configuración de cada permiso con textos apropiados para stores
export const PERMISSIONS_CONFIG = {
  [PERMISSION_TYPES.LOCATION]: {
    id: PERMISSION_TYPES.LOCATION,
    title: 'Ubicación en Primer Plano',
    icon: 'map-marker',
    required: true, // ✅ Obligatorio para todos
    description: 'Necesitamos acceder a tu ubicación para mostrarte servicios y tiendas cercanas',
    rationale: {
      title: '¿Por qué necesitamos tu ubicación?',
      message:
        'VidKar utiliza tu ubicación para:\n\n' +
        '• Mostrarte tiendas y servicios cerca de ti\n' +
        '• Calcular tiempos de entrega precisos\n' +
        '• Mejorar tu experiencia de compra\n\n' +
        'Tu ubicación solo se usa cuando la app está abierta.',
      buttonPositive: 'Entiendo, continuar',
      buttonNegative: 'Ahora no',
    },
    blockedMessage:
      'Has denegado el permiso de ubicación. Para usar VidKar, por favor habilítalo en Configuración de la aplicación.',
  },

  [PERMISSION_TYPES.LOCATION_BACKGROUND]: {
    id: PERMISSION_TYPES.LOCATION_BACKGROUND,
    title: 'Ubicación en Segundo Plano',
    icon: 'map-marker-radius',
    required: true, // ✅ CAMBIO: Ahora es OBLIGATORIO para todos
    // ✅ ELIMINADO: requiresRole (ya no es solo para cadetes)
    description: 'Para rastrear entregas y mejorar la experiencia del servicio',
    rationale: {
      title: 'Ubicación en Segundo Plano',
      message:
        'VidKar necesita acceder a tu ubicación en segundo plano para:\n\n' +
        '• Rastrear entregas en tiempo real\n' +
        '• Notificarte cuando tu pedido esté cerca\n' +
        '• Optimizar rutas de entrega\n' +
        '• Coordinar con cadetes disponibles\n\n' +
        'Tu ubicación solo se comparte cuando esta el modoCadete activo.',
      buttonPositive: 'Permitir siempre',
      buttonNegative: 'Solo al usar la app',
    },
    blockedMessage:
      'La ubicación en segundo plano está deshabilitada. VidKar necesita este permiso para coordinar entregas. Por favor, habilítalo en Configuración.',
  },

  [PERMISSION_TYPES.CAMERA]: {
    id: PERMISSION_TYPES.CAMERA,
    title: 'Cámara',
    icon: 'camera',
    required: true, // ✅ CAMBIO: Ahora es OBLIGATORIO
    description: 'Para tomar fotos de comprobantes de pago y evidencias',
    rationale: {
      title: '¿Por qué necesitamos la cámara?',
      message:
        'La cámara se utiliza para:\n\n' +
        '• Subir comprobantes de pago\n' +
        '• Enviar evidencias de transferencias\n' +
        '• Escanear códigos QR (futuro)\n\n' +
        'Las fotos solo se usan para validar transacciones.',
      buttonPositive: 'Permitir cámara',
      buttonNegative: 'Ahora no',
    },
    blockedMessage:
      'El acceso a la cámara está bloqueado. Para subir comprobantes, habilítalo en Configuración.',
  },

  [PERMISSION_TYPES.GALLERY]: {
    id: PERMISSION_TYPES.GALLERY,
    title: 'Galería de Fotos',
    icon: 'image-multiple',
    required: true, // ✅ CAMBIO: Ahora es OBLIGATORIO
    description: 'Para seleccionar comprobantes de pago desde tu galería',
    rationale: {
      title: 'Acceso a la Galería',
      message:
        'La App requiere acceso a tu galería para:\n\n' +
        '• Seleccionar comprobantes guardados\n' +
        '• Subir evidencias de pago\n' +
        '• Facilitar el proceso de validación\n\n' +
        'Solo la app tiene acceso a las fotos que selecciones.',
      buttonPositive: 'Permitir acceso',
      buttonNegative: 'Ahora no',
    },
    blockedMessage:
      'El acceso a la galería está bloqueado. Para subir comprobantes, habilítalo en Configuración.',
  },

  [PERMISSION_TYPES.NOTIFICATIONS]: {
    id: PERMISSION_TYPES.NOTIFICATIONS,
    title: 'Notificaciones',
    icon: 'bell',
    required: true,
    description: 'Para informarte sobre el estado de tus pedidos y recargas',
    rationale: {
      title: 'Recibir Notificaciones',
      message:
        'Las notificaciones te permiten:\n\n' +
        '• Recibir actualizaciones de tus pedidos\n' +
        '• Confirmar recargas exitosas\n' +
        '• Alertas de ofertas y promociones\n' +
        '• Mensajes importantes del sistema\n\n' +
        'Puedes desactivarlas en cualquier momento.',
      buttonPositive: 'Activar notificaciones',
      buttonNegative: 'Quizás después',
    },
    blockedMessage:
      'Las notificaciones están deshabilitadas. Para recibir actualizaciones, habilítalas en Configuración.',
  },
};

// ✅ Obtener permisos requeridos según rol del usuario
export const getRequiredPermissions = (userRole = 'user') => {
  return Object.values(PERMISSIONS_CONFIG).filter((permission) => {
    // ✅ Solo filtrar por required, sin importar el rol
    return permission.required === true;
  });
};

// ✅ Obtener permisos opcionales según rol
export const getOptionalPermissions = (userRole = 'user') => {
  return Object.values(PERMISSIONS_CONFIG).filter((permission) => {
    return permission.required === false || !permission.required;
  });
};

// ✅ Verificar si un permiso está bloqueado permanentemente
export const isPermissionBlocked = (status) => {
  return status === RESULTS.BLOCKED;
};

// ✅ Verificar si un permiso está otorgado
export const isPermissionGranted = (status) => {
  return status === RESULTS.GRANTED || status === RESULTS.LIMITED;
};

// ✅ Verificar si se puede solicitar el permiso
export const canRequestPermission = (status) => {
  return status === RESULTS.DENIED || status === RESULTS.UNAVAILABLE;
};

export { PERMISSIONS, check, request, openSettings, RESULTS };
