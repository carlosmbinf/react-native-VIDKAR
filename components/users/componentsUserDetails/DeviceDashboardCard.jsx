import React, { memo, useState, useCallback } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import {
  Card,
  Text,
  Chip,
  Divider,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { PushTokens } from '../../collections/collections';

const PLATFORM_COLORS = {
  android: { bg: '#E8F5E9', text: '#2E7D32', icon: 'android' },
  ios:     { bg: '#E3F2FD', text: '#1565C0', icon: 'apple' },
};

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('es-ES', { hour12: false });
  } catch {
    return '—';
  }
};

const truncate = (str, max = 22) =>
  str && str.length > max ? str.slice(0, max) + '…' : (str || '—');

const DeviceDashboardCard = ({ item, styles: parentStyles, accentColor }) => {
  const isCarlos = Meteor.user()?.username === 'carlosmbinf';

  const { ready, tokens } = useTracker(() => {
    if (!isCarlos || !item?._id) return { ready: false, tokens: [] };
    const sub = Meteor.subscribe('push_tokens', { userId: item._id });
    const docs = PushTokens.find(
      { userId: item._id },
      { sort: { updatedAt: -1 } },
    ).fetch();
    return { ready: sub.ready(), tokens: docs };
  }, [item?._id, isCarlos]);

  const [deleting, setDeleting] = useState(null);

  const handleDelete = useCallback(
    (tokenDoc) => {
      Alert.alert(
        'Eliminar dispositivo',
        `¿Eliminar el token de ${tokenDoc.platform || 'este dispositivo'}?\n\nToken: ${truncate(tokenDoc.token, 30)}`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              setDeleting(tokenDoc._id);
              Meteor.call(
                'push.deleteToken',
                { tokenId: tokenDoc._id, userId: item._id },
                (err) => {
                  setDeleting(null);
                  if (err) {
                    Alert.alert('Error', err.reason || 'No se pudo eliminar el token');
                  }
                },
              );
            },
          },
        ],
      );
    },
    [item?._id],
  );

  if (!isCarlos || !item?._id) return null;

  const headerColor = accentColor || '#37474F';

  return (
    <Card
      elevation={12}
      style={[parentStyles?.cards, ui.cardShell]}
      testID="device-dashboard-card">
      <View style={[ui.accentBar, { backgroundColor: headerColor }]} />
      <Card.Content style={ui.content}>
        <View style={ui.titleRow}>
          <Text style={ui.title}>Dispositivos Registrados</Text>
          {!ready && <ActivityIndicator size={16} style={{ marginLeft: 8 }} />}
          {ready && (
            <Chip compact icon="cellphone-check" style={ui.countChip}>
              {tokens.length}
            </Chip>
          )}
        </View>

        <Divider style={ui.divider} />

        {ready && tokens.length === 0 && (
          <Text style={ui.emptyText}>Sin dispositivos registrados</Text>
        )}

        {tokens.map((tok) => {
          const plat = PLATFORM_COLORS[tok.platform] || {};
          const isBeingDeleted = deleting === tok._id;
          return (
            <View key={tok._id} style={ui.tokenRow}>
              <View style={ui.tokenInfo}>
                <View style={ui.tokenHeader}>
                  <Chip
                    compact
                    icon={plat.icon || 'cellphone'}
                    style={[ui.platformChip, { backgroundColor: plat.bg || '#F5F5F5' }]}
                    textStyle={{ color: plat.text || '#333', fontSize: 11 }}>
                    {tok.platform || 'desconocido'}
                  </Chip>
                  {tok.deviceId && (
                    <Text style={ui.deviceId} numberOfLines={1}>
                      ID: {truncate(tok.deviceId, 16)}
                    </Text>
                  )}
                </View>
                <Text style={ui.tokenText} numberOfLines={2} selectable>
                  {truncate(tok.token, 42)}
                </Text>
                <Text style={ui.dateText}>
                  ↻ {formatDate(tok.updatedAt || tok.createdAt)}
                </Text>
              </View>
              <IconButton
                icon={isBeingDeleted ? 'loading' : 'delete-outline'}
                iconColor="#d32f2f"
                size={20}
                disabled={isBeingDeleted}
                onPress={() => handleDelete(tok)}
                accessibilityLabel="Eliminar token"
              />
            </View>
          );
        })}
      </Card.Content>
    </Card>
  );
};

const ui = StyleSheet.create({
  cardShell:    { overflow: 'hidden' },
  accentBar:    { height: 4, width: '100%' },
  content:      { paddingTop: 10 },
  titleRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  title: {
    fontWeight: '800',
    opacity: 0.85,
    flex: 1,
    textAlign: 'center',
    paddingVertical: 4,
  },
  countChip:    { backgroundColor: '#ECEFF1' },
  divider:      { marginVertical: 8, opacity: 0.2 },
  emptyText:    { textAlign: 'center', opacity: 0.5, paddingVertical: 12 },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tokenInfo: { flex: 1 },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  platformChip: { height: 24 },
  deviceId: {
    fontSize: 11,
    opacity: 0.6,
    flexShrink: 1,
  },
  tokenText: {
    fontSize: 12,
    fontFamily: 'monospace',
    opacity: 0.75,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 11,
    opacity: 0.5,
  },
});

export default memo(DeviceDashboardCard);
