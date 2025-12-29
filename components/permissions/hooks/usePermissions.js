import { useState, useEffect, useCallback } from 'react';
import { Platform, Linking, Alert } from 'react-native';
import {
  check,
  request,
  requestMultiple,
  openSettings,
  RESULTS,
} from 'react-native-permissions';
import {
  NATIVE_PERMISSIONS,
  PERMISSIONS_CONFIG,
  isPermissionBlocked,
  isPermissionGranted,
  canRequestPermission,
} from '../utils/permissionsConfig';

/**
 * Hook centralizado para gestión de permisos
 * Cumple con mejores prácticas de UX de Android y iOS
 */
export const usePermissions = () => {
  const [permissionsStatus, setPermissionsStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [allGranted, setAllGranted] = useState(false);

  // ✅ Verificar estado actual de todos los permisos
  const checkAllPermissions = useCallback(async () => {
    setLoading(true);
    const statuses = {};

    try {
      for (const [key, nativePermission] of Object.entries(NATIVE_PERMISSIONS)) {
        // ✅ NUEVO: Manejo especial para notificaciones en Android < 13
        if (key === 'NOTIFICATIONS' && !nativePermission) {
          // Android < 13 no requiere permiso explícito, considerarlo otorgado
          statuses[key] = RESULTS.GRANTED;
          console.log('📱 [Permissions] Android < 13 detectado, notificaciones consideradas otorgadas');
          continue;
        }

        if (!nativePermission) continue; // Skip si no aplica en esta plataforma/versión

        const status = await check(nativePermission);
        statuses[key] = status;
        
        console.log(`🔐 [Permissions] ${key}: ${status}`);
      }

      setPermissionsStatus(statuses);

      // Verificar si todos los permisos obligatorios están otorgados
      const requiredPermissions = Object.keys(PERMISSIONS_CONFIG).filter(
        (key) => PERMISSIONS_CONFIG[key].required
      );

      const allRequiredGranted = requiredPermissions.every((key) =>
        isPermissionGranted(statuses[key])
      );

      console.log('✅ [Permissions] Todos los permisos requeridos otorgados:', allRequiredGranted);
      setAllGranted(allRequiredGranted);
    } catch (error) {
      console.error('❌ [usePermissions] Error checking permissions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Solicitar un permiso individual con rationale
  const requestSinglePermission = useCallback(
    async (permissionType, showRationale = true) => {
      const nativePermission = NATIVE_PERMISSIONS[permissionType];
      const config = PERMISSIONS_CONFIG[permissionType];

      if (!config) {
        console.warn(`[usePermissions] Unknown permission type: ${permissionType}`);
        return RESULTS.UNAVAILABLE;
      }

      // ✅ NUEVO: Manejo especial para notificaciones en Android < 13
      if (permissionType === 'NOTIFICATIONS' && !nativePermission) {
        console.log('📱 [Permissions] Android < 13: notificaciones no requieren permiso explícito');
        setPermissionsStatus((prev) => ({ ...prev, [permissionType]: RESULTS.GRANTED }));
        return RESULTS.GRANTED;
      }

      if (!nativePermission) {
        console.warn(`[usePermissions] Permission ${permissionType} not available on this platform`);
        return RESULTS.UNAVAILABLE;
      }

      setLoading(true);

      try {
        const currentStatus = await check(nativePermission);
        console.log(`🔍 [Permissions] Checking ${permissionType}: ${currentStatus}`);

        // Si ya está otorgado, no hacer nada
        if (isPermissionGranted(currentStatus)) {
          console.log(`✅ [Permissions] ${permissionType} ya otorgado`);
          setPermissionsStatus((prev) => ({ ...prev, [permissionType]: currentStatus }));
          setLoading(false);
          return currentStatus;
        }

        // Si está bloqueado, mostrar diálogo para ir a Settings
        if (isPermissionBlocked(currentStatus)) {
          console.log(`🚫 [Permissions] ${permissionType} está bloqueado`);
          setLoading(false);
          Alert.alert(
            config.title,
            config.blockedMessage,
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Abrir Configuración',
                onPress: () => {
                  console.log('⚙️ [Permissions] Abriendo Settings...');
                  openSettings();
                },
              },
            ],
            { cancelable: true }
          );
          return currentStatus;
        }

        // ✅ MODIFICADO: Mostrar rationale SIEMPRE para permisos críticos
        if (showRationale && config.rationale) {
          console.log(`💬 [Permissions] Mostrando rationale para ${permissionType}`);
          return new Promise((resolve) => {
            Alert.alert(
              config.rationale.title,
              config.rationale.message,
              [
                {
                  text: config.rationale.buttonNegative,
                  style: 'cancel',
                  onPress: () => {
                    console.log(`❌ [Permissions] Usuario canceló ${permissionType}`);
                    setLoading(false);
                    resolve(RESULTS.DENIED);
                  },
                },
                {
                  text: config.rationale.buttonPositive,
                  onPress: async () => {
                    console.log(`✅ [Permissions] Solicitando ${permissionType}...`);
                    try {
                      const result = await request(nativePermission);
                      console.log(`📋 [Permissions] Resultado de ${permissionType}: ${result}`);
                      setPermissionsStatus((prev) => ({ ...prev, [permissionType]: result }));
                      setLoading(false);
                      resolve(result);
                    } catch (error) {
                      console.error(`❌ [Permissions] Error al solicitar ${permissionType}:`, error);
                      setLoading(false);
                      resolve(RESULTS.UNAVAILABLE);
                    }
                  },
                },
              ],
              { cancelable: false }
            );
          });
        }

        // Solicitar permiso directamente (sin rationale)
        console.log(`🔔 [Permissions] Solicitando ${permissionType} directamente...`);
        const result = await request(nativePermission);
        console.log(`📋 [Permissions] Resultado de ${permissionType}: ${result}`);
        setPermissionsStatus((prev) => ({ ...prev, [permissionType]: result }));
        setLoading(false);
        return result;
      } catch (error) {
        console.error(`❌ [usePermissions] Error requesting ${permissionType}:`, error);
        setLoading(false);
        return RESULTS.UNAVAILABLE;
      }
    },
    []
  );

  // ✅ Solicitar múltiples permisos en batch (optimizado para iOS)
  const requestMultiplePermissions = useCallback(async (permissionTypes) => {
    setLoading(true);

    try {
      console.log('📦 [Permissions] Solicitando múltiples permisos:', permissionTypes);
      
      // ✅ NUEVO: Filtrar notificaciones si no aplican en Android < 13
      const validPermissionTypes = permissionTypes.filter((type) => {
        const nativePermission = NATIVE_PERMISSIONS[type];
        if (type === 'NOTIFICATIONS' && !nativePermission) {
          console.log('📱 [Permissions] Omitiendo NOTIFICATIONS en Android < 13');
          // Marcar como otorgado automáticamente
          setPermissionsStatus((prev) => ({ ...prev, [type]: RESULTS.GRANTED }));
          return false;
        }
        return nativePermission !== null && nativePermission !== undefined;
      });

      if (validPermissionTypes.length === 0) {
        console.log('⚠️ [Permissions] No hay permisos válidos para solicitar');
        setLoading(false);
        return {};
      }

      const nativePermissionsToRequest = validPermissionTypes
        .map((type) => NATIVE_PERMISSIONS[type])
        .filter((p) => p !== null && p !== undefined);

      console.log('🔐 [Permissions] Permisos nativos a solicitar:', nativePermissionsToRequest);

      const results = await requestMultiple(nativePermissionsToRequest);
      console.log('📋 [Permissions] Resultados:', results);

      // Mapear resultados de vuelta a los tipos originales
      const mappedResults = {};
      validPermissionTypes.forEach((type) => {
        const nativePermission = NATIVE_PERMISSIONS[type];
        if (nativePermission && results[nativePermission]) {
          mappedResults[type] = results[nativePermission];
        }
      });

      console.log('🗺️ [Permissions] Resultados mapeados:', mappedResults);
      setPermissionsStatus((prev) => ({ ...prev, ...mappedResults }));
      setLoading(false);
      return mappedResults;
    } catch (error) {
      console.error('❌ [usePermissions] Error requesting multiple permissions:', error);
      setLoading(false);
      return {};
    }
  }, []);

  // ✅ Verificar si se deben solicitar permisos al iniciar la app
  const shouldRequestPermissions = useCallback(() => {
    const requiredPermissions = Object.keys(PERMISSIONS_CONFIG).filter(
      (key) => PERMISSIONS_CONFIG[key].required
    );

    const needsPermissions = requiredPermissions.some((key) => {
      const status = permissionsStatus[key];
      return !isPermissionGranted(status);
    });

    console.log('❓ [Permissions] ¿Necesita solicitar permisos?:', needsPermissions);
    return needsPermissions;
  }, [permissionsStatus]);

  // Verificar permisos al montar el hook
  useEffect(() => {
    console.log('🚀 [usePermissions] Inicializando verificación de permisos...');
    checkAllPermissions();
  }, [checkAllPermissions]);

  return {
    permissionsStatus,
    loading,
    allGranted,
    checkAllPermissions,
    requestSinglePermission,
    requestMultiplePermissions,
    shouldRequestPermissions,
    openSettings,
  };
};

export default usePermissions;
