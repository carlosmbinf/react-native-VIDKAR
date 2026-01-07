import React from 'react';
import { View, StyleSheet, Image, ScrollView } from 'react-native';
import { Surface, Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const PermissionsIntroScreen = ({ onContinue, userRole }) => {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.content}>
        {/* Icono principal */}
        <View style={styles.iconContainer}>
          <Text style={styles.iconEmoji}>🔒</Text>
        </View>

        {/* Título */}
        <Text variant="headlineMedium" style={styles.title}>
          Permisos Requeridos
        </Text>

        {/* Descripción */}
        <Text variant="bodyLarge" style={styles.description}>
          Para funcionar correctamente, VidKar necesita acceso a:
        </Text>

        {/* ✅ Lista de permisos TODOS obligatorios */}
        <View style={styles.permissionsList}>
          <View style={styles.permissionItem}>
            <Text style={styles.permissionIcon}>📸</Text>
            <View style={styles.permissionTextContainer}>
              <Text variant="titleMedium" style={styles.permissionTitle}>
                Cámara
              </Text>
              <Text variant="bodySmall" style={styles.permissionDescription}>
                Para capturar evidencias de pago
              </Text>
            </View>
          </View>

          <View style={styles.permissionItem}>
            <Text style={styles.permissionIcon}>🖼️</Text>
            <View style={styles.permissionTextContainer}>
              <Text variant="titleMedium" style={styles.permissionTitle}>
                Galería de Fotos
              </Text>
              <Text variant="bodySmall" style={styles.permissionDescription}>
                Para seleccionar imágenes existentes
              </Text>
            </View>
          </View>

          <View style={styles.permissionItem}>
            <Text style={styles.permissionIcon}>📍</Text>
            <View style={styles.permissionTextContainer}>
              <Text variant="titleMedium" style={styles.permissionTitle}>
                Ubicación
              </Text>
              <Text variant="bodySmall" style={styles.permissionDescription}>
                Para modo cadete y tracking de entregas
              </Text>
            </View>
          </View>

          <View style={styles.permissionItem}>
            <Text style={styles.permissionIcon}>🔔</Text>
            <View style={styles.permissionTextContainer}>
              <Text variant="titleMedium" style={styles.permissionTitle}>
                Notificaciones
              </Text>
              <Text variant="bodySmall" style={styles.permissionDescription}>
                Para alertas de pedidos y actualizaciones
              </Text>
            </View>
          </View>
        </View>

        {/* ✅ Advertencia clara */}
        <View style={styles.warningBox}>
          <Text variant="bodyMedium" style={styles.warningText}>
            ⚠️ Todos estos permisos son necesarios para el correcto funcionamiento de la app.
          </Text>
        </View>
      </View>
      </ScrollView>

      {/* Footer con botón */}
      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={onContinue}
          icon="shield-check"
          style={styles.continueButton}
          labelStyle={styles.continueButtonLabel}
        >
          Configurar Permisos
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#fff',
  },
  scrollView: {
    paddingHorizontal:'5%',
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconEmoji: {
    fontSize: 80,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionsList: {
    gap: 20,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  permissionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  permissionTextContainer: {
    flex: 1,
  },
  permissionTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  permissionDescription: {
    color: '#666',
    lineHeight: 18,
  },
  warningBox: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    marginTop: 24,
  },
  warningText: {
    color: '#E65100',
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    paddingVertical:5,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  continueButton: {
    borderRadius: 8,
  },
  continueButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 8,
  },
});

export default PermissionsIntroScreen;
