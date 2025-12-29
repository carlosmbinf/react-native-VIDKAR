import React, { useState, useEffect } from 'react';
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
} from './utils/permissionsConfig';

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

  // ✅ Calcular progreso de permisos requeridos
  const requiredPermissions = getRequiredPermissions(userRole);
  const grantedCount = requiredPermissions.filter((permission) =>
    isPermissionGranted(permissionsStatus[permission.id])
  ).length;
  const progress = requiredPermissions.length > 0 ? grantedCount / requiredPermissions.length : 0;

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

  // ✅ Auto-completar si todos los permisos están otorgados
  useEffect(() => {
    if (allGranted && currentScreen === 'request') {
      setCurrentScreen('summary');
    }
  }, [allGranted, currentScreen]);

  // ✅ Manejar "Continuar" desde intro
  const handleContinueFromIntro = () => {
    setCurrentScreen('request');
  };

  // ✅ Manejar "Saltar Opcionales" desde intro
  const handleSkipOptionals = () => {
    setCurrentScreen('request');
  };

  // ✅ Solicitar permiso individual
  const handleRequestPermission = async (permissionType) => {
    await requestSinglePermission(permissionType, true);
    await checkAllPermissions();
  };

  // ✅ Solicitar todos los permisos obligatorios de una vez
  const handleRequestAllRequired = async () => {
    const requiredTypes = requiredPermissions.map((p) => p.id);
    await requestMultiplePermissions(requiredTypes);
    await checkAllPermissions();
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
            onSkip={handleSkipOptionals}
            userRole={userRole}
          />
        );

      case 'request':
        return (
          <Surface style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
              <Text variant="headlineSmall" style={styles.title}>
                Configurar Permisos
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                Por favor, otorga los siguientes permisos para continuar
              </Text>

              {/* ✅ Barra de progreso */}
              <View style={styles.progressContainer}>
                <ProgressBar
                  progress={progress}
                  color="#6200ee"
                  style={styles.progressBar}
                />
                <Text variant="labelSmall" style={styles.progressText}>
                  {grantedCount} de {requiredPermissions.length} permisos otorgados
                </Text>
              </View>
            </View>

            <ScrollView style={styles.scrollView}>
              {/* ✅ Botón de solicitar todos */}
              {grantedCount < requiredPermissions.length && (
                <View style={styles.bulkActionContainer}>
                  <Button
                    mode="contained"
                    onPress={handleRequestAllRequired}
                    disabled={loading}
                    loading={loading}
                    icon="shield-check"
                    style={styles.bulkButton}
                    labelStyle={styles.bulkButtonLabel}
                  >
                    Solicitar Todos los Permisos
                  </Button>
                </View>
              )}

              {/* ✅ Lista de permisos requeridos */}
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

              {/* ✅ Permisos opcionales colapsados */}
              <View style={styles.optionalSection}>
                <Text variant="titleMedium" style={styles.optionalTitle}>
                  Permisos Opcionales
                </Text>
                {Object.values(PERMISSIONS_CONFIG)
                  .filter((p) => !p.required)
                  .map((permission) => (
                    <PermissionCard
                      key={permission.id}
                      permission={permission}
                      status={permissionsStatus[permission.id]}
                      onRequest={handleRequestPermission}
                      onOpenSettings={openSettings}
                      disabled={loading}
                    />
                  ))}
              </View>
            </ScrollView>

            {/* ✅ Footer con botón de finalizar */}
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
                  mode="outlined"
                  onPress={() => setShowExitDialog(true)}
                  style={styles.skipButton}
                  labelStyle={styles.skipButtonLabel}
                >
                  Configurar Después
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
                Todos los permisos necesarios han sido otorgados. Ahora puedes disfrutar de todas
                las funciones de VidKar.
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

  return (
    <Surface style={{ flex: 1 }}>
      {renderScreen()}

      {/* ✅ Dialog de confirmación de salida */}
      <Portal>
        <Dialog visible={showExitDialog} onDismiss={() => setShowExitDialog(false)}>
          <Dialog.Title>Salir de Configuración</Dialog.Title>
          <Dialog.Content>
            <Text>
              Algunos permisos son necesarios para que la app funcione correctamente. ¿Estás seguro
              de que quieres salir?
            </Text>
            <Text style={{ marginTop: 12, fontStyle: 'italic', color: '#666' }}>
              Podrás configurar los permisos más tarde desde Ajustes.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowExitDialog(false)}>Cancelar</Button>
            <Button onPress={handleFinish} mode="contained">
              Salir
            </Button>
          </Dialog.Actions>
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
  optionalSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  optionalTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
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
