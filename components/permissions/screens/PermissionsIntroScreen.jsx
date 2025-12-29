import React from 'react';
import { View, ScrollView, StyleSheet, Image } from 'react-native';
import { Surface, Text, Button, IconButton, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PERMISSIONS_CONFIG,
  getRequiredPermissions,
  getOptionalPermissions,
} from '../utils/permissionsConfig';

/**
 * Pantalla de introducción antes de solicitar permisos
 * Cumple con mejores prácticas de Google Play y App Store
 */
const PermissionsIntroScreen = ({ onContinue, onSkip, userRole = 'user' }) => {
  const requiredPermissions = getRequiredPermissions(userRole);
  const optionalPermissions = getOptionalPermissions(userRole);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ✅ Header con ilustración */}
        <View style={styles.header}>
          {/* <Image
            source={require('../../../assets/permissions-intro.png')} // ⚠️ Agregar ilustración
            style={styles.illustration}
            resizeMode="contain"
          /> */}
          <Text variant="headlineMedium" style={styles.title}>
            Permisos Necesarios
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Para brindarte la mejor experiencia, VidKar necesita acceso a algunas funciones de tu
            dispositivo
          </Text>
        </View>

        <Divider style={styles.divider} />

        {/* ✅ Permisos obligatorios */}
        {requiredPermissions.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              📋 Permisos Obligatorios
            </Text>
            <Text variant="bodyMedium" style={styles.sectionSubtitle}>
              Estos permisos son esenciales para que la app funcione correctamente
            </Text>

            {requiredPermissions.map((permission, index) => (
              <Surface key={index} style={styles.permissionItem} elevation={1}>
                <IconButton
                  icon={permission.icon}
                  size={28}
                  iconColor="#6200ee"
                  style={styles.permissionIcon}
                />
                <View style={styles.permissionContent}>
                  <Text variant="titleMedium" style={styles.permissionTitle}>
                    {permission.title}
                  </Text>
                  <Text variant="bodySmall" style={styles.permissionDescription}>
                    {permission.description}
                  </Text>
                </View>
              </Surface>
            ))}
          </View>
        )}

        {/* ✅ Permisos opcionales */}
        {optionalPermissions.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              ⭐ Permisos Opcionales
            </Text>
            <Text variant="bodyMedium" style={styles.sectionSubtitle}>
              Estos permisos mejoran tu experiencia pero no son obligatorios
            </Text>

            {optionalPermissions.map((permission, index) => (
              <Surface key={index} style={styles.permissionItem} elevation={1}>
                <IconButton
                  icon={permission.icon}
                  size={28}
                  iconColor="#FF9800"
                  style={styles.permissionIcon}
                />
                <View style={styles.permissionContent}>
                  <Text variant="titleMedium" style={styles.permissionTitle}>
                    {permission.title}
                  </Text>
                  <Text variant="bodySmall" style={styles.permissionDescription}>
                    {permission.description}
                  </Text>
                </View>
              </Surface>
            ))}
          </View>
        )}

        {/* ✅ Nota de privacidad */}
        <Surface style={styles.privacyNote} elevation={0}>
          <IconButton icon="shield-check" size={24} iconColor="#4CAF50" style={{ margin: 0 }} />
          <Text variant="bodySmall" style={styles.privacyText}>
            Tu privacidad es importante para nosotros. Solo usamos estos permisos para las
            funciones descritas y nunca compartimos tu información con terceros.
          </Text>
        </Surface>
      </ScrollView>

      {/* ✅ Botones de acción */}
      <View style={styles.footer}>
        {optionalPermissions.length > 0 && (
          <Button
            mode="outlined"
            onPress={onSkip}
            style={styles.skipButton}
            labelStyle={styles.skipButtonLabel}
          >
            Saltar Opcionales
          </Button>
        )}
        <Button
          mode="contained"
          onPress={onContinue}
          style={styles.continueButton}
          labelStyle={styles.continueButtonLabel}
          icon="arrow-right"
          contentStyle={{ flexDirection: 'row-reverse' }}
        >
          Continuar
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  illustration: {
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
  },
  divider: {
    marginVertical: 24,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(98, 0, 238, 0.03)',
  },
  permissionIcon: {
    margin: 0,
    marginRight: 12,
  },
  permissionContent: {
    flex: 1,
  },
  permissionTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  permissionDescription: {
    color: '#666',
    // lineHeight: 18,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  privacyText: {
    flex: 1,
    marginLeft: 12,
    color: '#1B5E20',
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  skipButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 8,
  },
  skipButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 8,
  },
  continueButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PermissionsIntroScreen;
