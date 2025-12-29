import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, IconButton, Chip, Button } from 'react-native-paper';
import { RESULTS } from 'react-native-permissions';
import { isPermissionGranted, isPermissionBlocked } from '../utils/permissionsConfig';

/**
 * Card individual para mostrar estado de un permiso
 * UX profesional con indicadores visuales claros
 */
const PermissionCard = ({
  permission,
  status,
  onRequest,
  onOpenSettings,
  disabled = false,
}) => {
  const getStatusColor = () => {
    if (isPermissionGranted(status)) return '#4CAF50';
    if (isPermissionBlocked(status)) return '#F44336';
    return '#FF9800';
  };

  const getStatusLabel = () => {
    if (isPermissionGranted(status)) return 'Otorgado';
    if (isPermissionBlocked(status)) return 'Bloqueado';
    if (status === RESULTS.DENIED) return 'Denegado';
    return 'No solicitado';
  };

  const getStatusIcon = () => {
    if (isPermissionGranted(status)) return 'check-circle';
    if (isPermissionBlocked(status)) return 'block-helper';
    return 'alert-circle';
  };

  const handleAction = () => {
    if (isPermissionBlocked(status)) {
      onOpenSettings();
    } else {
      onRequest(permission.id);
    }
  };

  return (
    <Card style={styles.card} elevation={2}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <IconButton
              icon={permission.icon}
              size={32}
              iconColor={getStatusColor()}
              style={styles.iconButton}
            />
            <View style={styles.titleTextContainer}>
              <Text variant="titleMedium" style={styles.title}>
                {permission.title}
              </Text>
              {permission.required && (
                <Chip
                  compact
                  mode="outlined"
                  style={styles.requiredChip}
                  textStyle={styles.requiredText}
                >
                  Obligatorio
                </Chip>
              )}
            </View>
          </View>

          <Chip
            compact
            icon={getStatusIcon()}
            style={[styles.statusChip, { backgroundColor: getStatusColor() }]}
            textStyle={styles.statusText}
          >
            {getStatusLabel()}
          </Chip>
        </View>

        <Text variant="bodyMedium" style={styles.description}>
          {permission.description}
        </Text>

        {!isPermissionGranted(status) && (
          <View style={styles.actionContainer}>
            <Button
              mode="contained"
              onPress={handleAction}
              disabled={disabled}
              icon={isPermissionBlocked(status) ? 'cog' : 'shield-check'}
              style={[
                styles.actionButton,
                isPermissionBlocked(status) && styles.settingsButton,
              ]}
              labelStyle={styles.actionButtonLabel}
            >
              {isPermissionBlocked(status) ? 'Abrir Configuración' : 'Solicitar Permiso'}
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconButton: {
    margin: 0,
    marginRight: 8,
  },
  titleTextContainer: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  requiredChip: {
    alignSelf: 'flex-start',
    borderColor: '#F44336',
    marginTop: 4,
    height: 40
  },
  requiredText: {
    fontSize: 10,
    color: '#F44336',
    fontWeight: 'bold',
  },
  statusChip: {
    marginLeft: 8,
    height: 40,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    borderRadius: 8,
  },
  settingsButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default PermissionCard;
