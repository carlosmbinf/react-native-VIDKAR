import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, BackHandler } from 'react-native';
import { Surface, Text, Button, ProgressBar, Portal, Dialog } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import PermissionsIntroScreen from './screens/PermissionsIntroScreen';
import PermissionCard from './components/PermissionCard';
import usePermissions from './hooks/usePermissions';
import {
  PERMISSIONS_CONFIG,
  getRequiredPermissions,
  isPermissionGranted,
  isPermissionBlocked,
  PERMISSION_TYPES,
} from './utils/permissionsConfig';
import PermissionsGate from '../PermissionsGate';
import { openSettings as openNativeSettings } from 'react-native-permissions';

/**
 * Componente principal orchestrator de permisos
 * Maneja flujo completo: intro → solicitud → confirmación
 */
const PermissionsManager = ({ onComplete, userRole = 'user', initialScreen = 'intro' }) => {
  const [currentScreen, setCurrentScreen] = useState(initialScreen); // 'intro' | 'request' | 'summary'
  const [showExitDialog, setShowExitDialog] = useState(false);

  const {
    permissionsStatus,
    loading,
    allGranted,
    checkAllPermissions,
    requestSinglePermission,
    requestMultiplePermissions,
    openSettings,
  } = usePermissions();

  // ✅ TODOS los permisos son requeridos
  const requiredPermissions = getRequiredPermissions(userRole);
  const grantedCount = requiredPermissions.filter((permission) =>
    isPermissionGranted(permissionsStatus[permission.id])
  ).length;
  const progress = requiredPermissions.length > 0 ? grantedCount / requiredPermissions.length : 0;

  // ✅ Detectar permisos bloqueados (crítico)
  const blockedPermissions = requiredPermissions.filter((permission) =>
    isPermissionBlocked(permissionsStatus[permission.id])
  );
  const hasBlockedPermissions = blockedPermissions.length > 0;

  // ✅ Manejar botón de retroceso de Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentScreen === 'request') {
        setShowExitDialog(true);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [currentScreen]);

  // ✅ Auto-avanzar a summary SOLO si TODOS los permisos están granted
  useEffect(() => {
    if (allGranted && currentScreen === 'request') {
      setCurrentScreen('summary');
    }
  }, [allGranted, currentScreen]);

  // ✅ Manejar "Continuar" desde intro
  const handleContinueFromIntro = () => {
    setCurrentScreen('request');
  };

  // ✅ Solicitar permiso individual
  const handleRequestPermission = async (permissionType) => {
    await requestSinglePermission(permissionType, true);
    await checkAllPermissions();
  };

  // ✅ Solicitar TODOS los permisos en secuencia correcta
  const handleRequestAllPermissions = async () => {
    try {
      console.log('📦 [PermissionsManager] Solicitando TODOS los permisos en secuencia...');

      // ✅ PASO 1: Solicitar LOCATION foreground primero
      const locationStatus = await requestSinglePermission(PERMISSION_TYPES.LOCATION, false);
      console.log(`  ✓ LOCATION foreground: ${locationStatus}`);

      // ✅ PASO 2: Solo si LOCATION foreground fue granted, solicitar BACKGROUND
      if (locationStatus === 'granted' || locationStatus === 'limited') {
        console.log('  → LOCATION foreground granted, solicitando BACKGROUND...');
        const backgroundStatus = await requestSinglePermission(PERMISSION_TYPES.LOCATION_BACKGROUND, false);
        console.log(`  ✓ LOCATION background: ${backgroundStatus}`);
      } else {
        console.warn('  ⚠️ LOCATION foreground denegado, NO se puede solicitar BACKGROUND');
      }

      // ✅ PASO 3: Solicitar resto de permisos (CAMERA, GALLERY, NOTIFICATIONS)
      const otherPermissions = requiredPermissions
        .filter(p =>
          p.id !== PERMISSION_TYPES.LOCATION &&
          p.id !== PERMISSION_TYPES.LOCATION_BACKGROUND
        )
        .map(p => p.id);

      if (otherPermissions.length > 0) {
        console.log('  → Solicitando resto de permisos:', otherPermissions);
        await requestMultiplePermissions(otherPermissions);
      }

      // ✅ PASO 4: Re-verificar todos los permisos
      await checkAllPermissions();

      console.log('✅ [PermissionsManager] Solicitud de permisos completada');
    } catch (error) {
      console.error('❌ [PermissionsManager] Error solicitando permisos:', error);
    }
  };

  // ✅ Finalizar flujo de permisos
  const handleFinish = () => {
    if (onComplete) {
      onComplete(permissionsStatus);
    }
  };

  // ✅ Renderizar pantalla actual
  const renderScreen = () => {
    switch (currentScreen) {
      case 'intro':
        return (
          <PermissionsIntroScreen
            onContinue={handleContinueFromIntro}
            onSkip={handleContinueFromIntro} // Ya no hay "skip", ambos botones van a request
            userRole={userRole}
          />
        );

      case 'request':
        return (
          <Surface style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
              <Text variant="headlineSmall" style={styles.title}>
                Permisos Requeridos
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                VidKar necesita estos permisos para funcionar correctamente
              </Text>

              {/* ✅ Barra de progreso */}
              <View style={styles.progressContainer}>
                <ProgressBar
                  progress={progress}
                  color={progress === 1 ? '#4CAF50' : '#FF9800'}
                  style={styles.progressBar}
                />
                <Text variant="labelSmall" style={styles.progressText}>
                  {grantedCount} de {requiredPermissions.length} permisos otorgados
                </Text>
              </View>

              {/* ✅ Alerta de permisos bloqueados */}
              {hasBlockedPermissions && (
                <View style={styles.blockedAlert}>
                  <Text variant="labelMedium" style={styles.blockedAlertText}>
                    ⚠️ Algunos permisos están bloqueados. Debes abrirlos desde Configuración.
                  </Text>
                </View>
              )}
            </View>

            <ScrollView style={styles.scrollView}>
              {/* ✅ Botón de solicitar todos (solo si ninguno está bloqueado) */}
              {!hasBlockedPermissions && grantedCount < requiredPermissions.length && (
                <View style={styles.bulkActionContainer}>
                  <Button
                    mode="contained"
                    onPress={handleRequestAllPermissions}
                    disabled={loading}
                    loading={loading}
                    icon="shield-check"
                    style={styles.bulkButton}
                    labelStyle={styles.bulkButtonLabel}
                  >
                    Otorgar Todos los Permisos
                  </Button>
                </View>
              )}

              {/* ✅ Lista de TODOS los permisos (todos obligatorios) */}
              {requiredPermissions.map((permission) => (
                <PermissionCard
                  key={permission.id}
                  permission={permission}
                  status={permissionsStatus[permission.id]}
                  onRequest={handleRequestPermission}
                  onOpenSettings={openSettings}
                  disabled={loading}
                />
              ))}

              {/* ✅ Advertencia final si no todos están granted */}
              {grantedCount < requiredPermissions.length && (
                <View style={styles.warningContainer}>
                  <Text variant="bodyMedium" style={styles.warningText}>
                    ⚠️ La app no funcionará correctamente hasta que todos los permisos estén otorgados.
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* ✅ Footer: Solo "Completar" si TODOS granted */}
            <View style={styles.footer}>
              {allGranted ? (
                <Button
                  mode="contained"
                  onPress={handleFinish}
                  icon="check-circle"
                  style={styles.finishButton}
                  labelStyle={styles.finishButtonLabel}
                >
                  Completar Configuración
                </Button>
              ) : (
                <Button
                  mode="text"
                  onPress={() => setShowExitDialog(true)}
                  style={styles.skipButton}
                  labelStyle={styles.skipButtonLabel}
                  icon="alert-circle"
                >
                  Salir sin Completar (No Recomendado)
                </Button>
              )}
            </View>
          </Surface>
        );

      case 'summary':
        return (
          <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.summaryContainer}>
              <Text variant="headlineMedium" style={styles.summaryTitle}>
                ✅ ¡Configuración Completa!
              </Text>
              <Text variant="bodyLarge" style={styles.summarySubtitle}>
                Todos los permisos han sido otorgados. VidKar está listo para funcionar.
              </Text>
              <Button
                mode="contained"
                onPress={handleFinish}
                icon="arrow-right"
                style={styles.summaryButton}
                labelStyle={styles.summaryButtonLabel}
                contentStyle={{ flexDirection: 'row-reverse' }}
              >
                Comenzar a Usar VidKar
              </Button>
            </View>
          </SafeAreaView>
        );

      default:
        return null;
    }
  };

  const permissionIdsInOrder = useMemo(
    () => ['LOCATION', 'LOCATION_BACKGROUND', 'CAMERA', 'GALLERY', 'NOTIFICATIONS'],
    []
  );

  const normalizeRationale = (rationale) => {
    if (!rationale) return '';
    if (Array.isArray(rationale)) return rationale.filter(Boolean).join('\n');
    if (typeof rationale === 'string') return rationale;
    return '';
  };

  const stepsForSlider = useMemo(() => {
    return permissionIdsInOrder
      .filter((id) => PERMISSIONS_CONFIG?.[id]?.required)
      .map((id) => {
        const cfg = PERMISSIONS_CONFIG?.[id];
        const st = permissionsStatus?.[id]; // puede ser undefined al inicio

        return {
          id,
          title: cfg?.title || 'Permiso requerido',
          description: cfg?.description || '',
          detail: normalizeRationale(cfg?.rationale),
          rationale: cfg?.rationale,
          status: st, // 👈 clave para que el slider muestre “Aprobado”
          icon:
            id === 'LOCATION' || id === 'LOCATION_BACKGROUND'
              ? 'map-marker-radius'
              : id === 'CAMERA'
                ? 'camera'
                : id === 'GALLERY'
                  ? 'image'
                  : id === 'NOTIFICATIONS'
                    ? 'bell-ring'
                    : 'shield-check',
          iconColor:
            id === 'LOCATION' || id === 'LOCATION_BACKGROUND'
              ? '#2196F3'
              : id === 'NOTIFICATIONS'
                ? '#FF9800'
                : '#4CAF50',
          primaryText: 'Conceder permiso',
          onRequest: async () => {
            const result = await requestSinglePermission(id, true);

            if (result === 'granted' || result === 'limited' || result?.status === 'granted') {
              await checkAllPermissions();
              return { ok: true };
            }

            const status = result?.status || result;
            const blocked = status === 'blocked';

            await checkAllPermissions();
            return {
              ok: false,
              message: blocked
                ? 'Este permiso está bloqueado. Debes habilitarlo desde Ajustes.'
                : 'Permiso denegado. Puedes intentarlo nuevamente.',
            };
          },
          canOpenSettings: true,
        };
      });
  }, [permissionIdsInOrder, permissionsStatus, requestSinglePermission, checkAllPermissions]);

  // ✅ Si estamos en request, sustituimos la UI anterior por el slider gate
  if (currentScreen === 'request') {
    // Si todavía no hay pasos (p.ej. permisos aún no chequeados), mostrar UI mínima.
    // Importante: evitar pantalla “en blanco” mientras el hook sincroniza estados.
    if (!stepsForSlider.length) {
      return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
            <Text variant="headlineSmall" style={{ fontWeight: 'bold', marginBottom: 8 }}>
              Permisos Requeridos
            </Text>
            <Text variant="bodyMedium" style={{ color: '#666', marginBottom: 16 }}>
              Estamos verificando el estado de los permisos...
            </Text>

            <ProgressBar indeterminate color="#FF9800" style={{ height: 8, borderRadius: 4 }} />

            <View style={{ marginTop: 16 }}>
              <Button
                mode="outlined"
                icon="refresh"
                disabled={loading}
                loading={loading}
                onPress={async () => {
                  await checkAllPermissions();
                }}
              >
                Reintentar verificación
              </Button>

              <Button
                mode="text"
                icon="alert-circle"
                style={{ marginTop: 8 }}
                onPress={() => setShowExitDialog(true)}
              >
                Salir sin completar (No recomendado)
              </Button>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    // Si ya están todos otorgados, avanzar inmediatamente (evita que el usuario vea el gate innecesariamente).
    if (allGranted) {
      // Nota: el effect ya avanza a summary, pero esto evita un “flash” visual del gate.
      setTimeout(() => {
        setCurrentScreen('summary');
      }, 0);

      return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 16 }}>
            <Text variant="titleMedium" style={{ textAlign: 'center', marginBottom: 12 }}>
              Completando configuración...
            </Text>
            <ProgressBar indeterminate color="#4CAF50" style={{ height: 8, borderRadius: 4 }} />
          </View>
        </SafeAreaView>
      );
    }

    return (
      <PermissionsGate
        steps={stepsForSlider}
        onOpenSettings={openSettings || openNativeSettings}
        onAllGranted={async () => {
          await checkAllPermissions();
          setCurrentScreen('summary');
        }}
      />
    );
  }

  return (
    <Surface style={{ flex: 1 }}>
      {renderScreen()}

      {/* ✅ Dialog de confirmación de salida (advertencia más fuerte) */}
      <Portal>
        <Dialog visible={showExitDialog} onDismiss={() => setShowExitDialog(false)}>
          <Dialog.Title>⚠️ Permisos Incompletos</Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontWeight: 'bold', color: '#D32F2F', marginBottom: 12 }}>
              VidKar no funcionará correctamente sin todos los permisos.
            </Text>
            <Text>
              Faltan {requiredPermissions.length - grantedCount} permisos por otorgar:
            </Text>
            <View style={{ marginTop: 8 }}>
              {requiredPermissions
                .filter(p => !isPermissionGranted(permissionsStatus[p.id]))
                .map(p => (
                  <Text key={p.id} style={{ marginLeft: 12, marginTop: 4 }}>
                    • {p.title}
                  </Text>
                ))}
            </View>
            <Text style={{ marginTop: 12, fontStyle: 'italic', color: '#666' }}>
              Podrás configurarlos después desde Ajustes, pero la app tendrá funcionalidad limitada.
            </Text>
          </Dialog.Content>
          {/* <Dialog.Actions>
            <Button onPress={() => setShowExitDialog(false)}>
              Seguir Configurando
            </Button>
            <Button onPress={handleFinish} mode="text" textColor="#D32F2F">
              Salir de Todos Modos
            </Button>
          </Dialog.Actions> */}
        </Dialog>
      </Portal>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressText: {
    color: '#666',
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  bulkActionContainer: {
    padding: 16,
  },
  bulkButton: {
    borderRadius: 8,
  },
  bulkButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  blockedAlert: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    marginTop: 12,
  },
  blockedAlertText: {
    color: '#E65100',
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 8,
    margin: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  warningText: {
    color: '#B71C1C',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  finishButton: {
    borderRadius: 8,
  },
  finishButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    borderRadius: 8,
  },
  skipButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  summaryTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  summarySubtitle: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
    marginBottom: 32,
  },
  summaryButton: {
    borderRadius: 8,
    paddingHorizontal: 24,
  },
  summaryButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PermissionsManager;
