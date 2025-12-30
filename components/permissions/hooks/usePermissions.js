import { useState, useCallback, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import { 
  PERMISSIONS_CONFIG, 
  NATIVE_PERMISSIONS, // ✅ AGREGAR esta importación
  getRequiredPermissions, 
  isPermissionGranted,
  isPermissionsLibraryAvailable,
  check,
  request,
  openSettings,
  RESULTS
} from '../utils/permissionsConfig';

const usePermissions = () => {
  const [permissionsStatus, setPermissionsStatus] = useState({});
  const [loading, setLoading] = useState(false);
  
  // ✅ Validar disponibilidad de la librería al inicializar
  const [libraryError, setLibraryError] = useState(!isPermissionsLibraryAvailable());

  useEffect(() => {
    // ✅ Re-validar disponibilidad al montar
    const isAvailable = isPermissionsLibraryAvailable();
    setLibraryError(!isAvailable);
    
    if (!isAvailable) {
      console.error('❌ [usePermissions] Librería react-native-permissions no disponible');
      console.error('   Verifica que esté instalada: npm install react-native-permissions');
      console.error('   Y que auto-linking haya funcionado: npx pod-install (iOS)');
    }
  }, []);

  // ✅ Mapear resultado de react-native-permissions a estado legible
  const mapPermissionResult = (result) => {
    switch (result) {
      case RESULTS.GRANTED:
      case 'granted':
        return 'granted';
      case RESULTS.LIMITED:
      case 'limited':
        return 'limited';
      case RESULTS.DENIED:
      case 'denied':
        return 'denied';
      case RESULTS.BLOCKED:
      case 'blocked':
        return 'blocked';
      case RESULTS.UNAVAILABLE:
      case 'unavailable':
      default:
        return 'unavailable';
    }
  };

  // ✅ MODIFICADO: Agregar validación en todas las funciones
  const checkAllPermissions = useCallback(async () => {
    if (libraryError) {
      console.error('❌ [Permissions] Librería no disponible, no se pueden verificar permisos');
      return {};
    }

    try {
      console.log('🔄 [Permissions] Verificando estado de permisos...');
      
      const requiredPermissions = getRequiredPermissions();
      
      if (requiredPermissions.length === 0) {
        console.error('❌ [Permissions] No hay permisos válidos para verificar');
        return {};
      }

      const statuses = {};

      for (const permission of requiredPermissions) {
        // ✅ CORRECCIÓN: Obtener permission nativa de NATIVE_PERMISSIONS
        const nativePermission = NATIVE_PERMISSIONS[permission.id];
        
        if (!nativePermission) {
          console.warn(`⚠️ [Permissions] ${permission.id} no tiene permission nativa válida (puede ser Android <13 para NOTIFICATIONS)`);
          statuses[permission.id] = 'granted'; // ✅ Si no existe, asumir granted (ej. Android <13 sin POST_NOTIFICATIONS)
          continue;
        }

        try {
          const result = await check(nativePermission);
          statuses[permission.id] = mapPermissionResult(result);
          console.log(`  ✓ ${permission.id}: ${statuses[permission.id]}`);
        } catch (error) {
          console.error(`❌ [Permissions] Error checking ${permission.id}:`, error.message);
          statuses[permission.id] = 'unavailable';
        }
      }

      setPermissionsStatus(statuses);
      console.log('✅ [Permissions] Verificación completada');
      return statuses;
    } catch (error) {
      console.error('❌ [usePermissions] Error general:', error.message || error);
      return {};
    }
  }, [libraryError]);

  // ✅ Solicitar un permiso individual
  const requestSinglePermission = useCallback(async (permissionType, autoCheck = true) => {
    if (libraryError) {
      Alert.alert(
        'Permisos no disponibles',
        'No se pueden solicitar permisos porque la librería no está configurada correctamente.\n\nVerifica:\n1. npm install react-native-permissions\n2. npx pod-install (iOS)\n3. Rebuild de la app'
      );
      return 'unavailable';
    }

    try {
      console.log(`📦 [Permissions] Solicitando: ${permissionType}`);
      
      // ✅ CORRECCIÓN: Obtener permission nativa de NATIVE_PERMISSIONS
      const nativePermission = NATIVE_PERMISSIONS[permissionType];
      
      if (!nativePermission) {
        console.warn(`⚠️ [Permissions] ${permissionType} no tiene permission nativa válida`);
        // ✅ Si no existe (ej. NOTIFICATIONS en Android <13), asumir granted
        return 'granted';
      }

      setLoading(true);

      const result = await request(nativePermission);
      const status = mapPermissionResult(result);

      console.log(`  ${permissionType}: ${status}`);

      setPermissionsStatus((prev) => ({
        ...prev,
        [permissionType]: status,
      }));

      setLoading(false);

      if (autoCheck) {
        setTimeout(() => checkAllPermissions(), 500);
      }

      return status;
    } catch (error) {
      console.error(`❌ [usePermissions] Error requesting ${permissionType}:`, error.message);
      setLoading(false);
      return 'unavailable';
    }
  }, [checkAllPermissions, libraryError]);

  // ✅ Solicitar múltiples permisos
  const requestMultiplePermissions = useCallback(async (permissionTypes) => {
    if (libraryError) {
      Alert.alert(
        'Permisos no disponibles',
        'No se pueden solicitar permisos porque la librería no está configurada correctamente.'
      );
      return {};
    }

    try {
      console.log(`📦 [Permissions] Solicitando múltiples:`, permissionTypes);
      
      setLoading(true);
      const results = {};

      for (const type of permissionTypes) {
        // ✅ CORRECCIÓN: Obtener permission nativa de NATIVE_PERMISSIONS
        const nativePermission = NATIVE_PERMISSIONS[type];
        
        if (!nativePermission) {
          console.warn(`⚠️ [Permissions] Omitiendo ${type} (no requerido en esta plataforma/versión)`);
          results[type] = 'granted'; // ✅ Asumir granted si no aplica
          continue;
        }

        try {
          const result = await request(nativePermission);
          results[type] = mapPermissionResult(result);
          console.log(`  ${type}: ${results[type]}`);

          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`❌ [Permissions] Error ${type}:`, error.message);
          results[type] = 'unavailable';
        }
      }

      setPermissionsStatus((prev) => ({ ...prev, ...results }));
      setLoading(false);

      setTimeout(() => checkAllPermissions(), 1000);

      return results;
    } catch (error) {
      console.error('❌ [usePermissions] Error múltiple:', error.message);
      setLoading(false);
      return {};
    }
  }, [checkAllPermissions, libraryError]);

  // ✅ Abrir configuración
  const openSystemSettings = useCallback(async () => {
    if (libraryError) {
      Alert.alert(
        'Configuración no disponible',
        'No se puede abrir la configuración del sistema porque la librería de permisos no está disponible.'
      );
      return;
    }

    try {
      console.log('⚙️ [Permissions] Abriendo configuración del sistema...');
      await openSettings();
    } catch (error) {
      console.error('❌ [Permissions] Error abriendo settings:', error.message);
      Alert.alert(
        'Error',
        'No se pudo abrir la configuración del sistema. Por favor, hazlo manualmente:\n\nAjustes > Apps > VidKar > Permisos'
      );
    }
  }, [libraryError]);

  // ✅ Verificar si todos granted
  const allGranted = useCallback(() => {
    if (libraryError) return false;

    const requiredPermissions = getRequiredPermissions();
    
    if (requiredPermissions.length === 0) {
      return false;
    }

    return requiredPermissions.every((permission) =>
      isPermissionGranted(permissionsStatus[permission.id])
    );
  }, [permissionsStatus, libraryError]);

  // ✅ Check inicial
  useEffect(() => {
    if (!libraryError) {
      checkAllPermissions();
    }
  }, [checkAllPermissions, libraryError]);

  return {
    permissionsStatus,
    loading,
    allGranted: allGranted(),
    libraryError, // ✅ Exponer estado de error para UI
    checkAllPermissions,
    requestSinglePermission,
    requestMultiplePermissions,
    openSettings: openSystemSettings,
  };
};

export default usePermissions;
