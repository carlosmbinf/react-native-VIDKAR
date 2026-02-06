import React from 'react';
import {
  View,
  StyleSheet,
  ImageBackground,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { Text, Button, Surface, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const UpdateRequired = ({ currentVersion, requiredVersion }) => {
  const insets = useSafeAreaInsets();

  const handleUpdate = () => {
    const storeUrl = Platform.select({
      ios: 'https://apps.apple.com/app/idTU_APP_ID', // ✅ Reemplazar con tu App ID
      android: 'https://play.google.com/store/apps/details?id=com.nauta.vidkar',
    });

    Linking.openURL(storeUrl).catch((err) =>
      console.error('[UpdateRequired] Error abriendo tienda:', err)
    );
  };

  return (
    <ImageBackground
    //   source={require('../files/space-bg-shadowcodex.jpg')} // ✅ Mismo fondo del Login
      style={styles.background}
      resizeMode="cover"
    >
      {/* Overlay oscuro para legibilidad */}
      <View style={styles.overlay} />

      <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
        {/* Ícono principal */}
        <Surface style={styles.iconContainer} elevation={4}>
          <Icon source="update" size={80} color="#FF6B6B" />
        </Surface>

        {/* Contenido principal */}
        <Surface style={styles.card} elevation={5}>
          <Text variant="headlineMedium" style={styles.title}>
            Actualización Requerida
          </Text>

          <Text variant="bodyLarge" style={styles.message}>
            Tu versión de VIDKAR está desactualizada y necesita ser actualizada
            para continuar utilizando la aplicación.
          </Text>

          {/* Información de versiones */}
          <View style={styles.versionInfo}>
            <View style={styles.versionRow}>
              <Icon source="cellphone" size={24} color="#666" />
              <View style={styles.versionText}>
                <Text variant="labelSmall" style={styles.versionLabel}>
                  Versión Actual
                </Text>
                <Text variant="bodyMedium" style={styles.versionValue}>
                  Build {currentVersion}
                </Text>
              </View>
            </View>

            <Icon source="arrow-down" size={24} color="#FF6B6B" />

            <View style={styles.versionRow}>
              <Icon source="check-circle" size={24} color="#4CAF50" />
              <View style={styles.versionText}>
                <Text variant="labelSmall" style={styles.versionLabel}>
                  Versión Requerida
                </Text>
                <Text variant="bodyMedium" style={styles.versionValue}>
                  Build {requiredVersion}+
                </Text>
              </View>
            </View>
          </View>

          {/* Botón de actualización */}
          <Button
            mode="contained"
            onPress={handleUpdate}
            style={styles.updateButton}
            contentStyle={styles.updateButtonContent}
            labelStyle={styles.updateButtonLabel}
            icon="google-play" // o "apple" para iOS
          >
            {Platform.OS === 'android'
              ? 'Actualizar desde Play Store'
              : 'Actualizar desde App Store'}
          </Button>

          {/* Mensaje adicional */}
          <Text variant="bodySmall" style={styles.footer}>
            La actualización incluye mejoras de seguridad y nuevas funcionalidades.
          </Text>
        </Surface>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Oscurecer fondo para legibilidad
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  versionInfo: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    gap: 12,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  versionText: {
    flex: 1,
  },
  versionLabel: {
    color: '#999',
    marginBottom: 4,
  },
  versionValue: {
    fontWeight: '600',
    color: '#333',
  },
  updateButton: {
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  updateButtonContent: {
    paddingVertical: 8,
  },
  updateButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});

export default UpdateRequired;
