import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import {
  Surface,
  Text,
  Chip,
  IconButton,
  TextInput,
  ActivityIndicator,
  Divider,
  Card,
  Appbar,
} from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PushTokens } from '../collections/collections';
import MenuHeader from '../Header/MenuHeader';

// ─── helpers ─────────────────────────────────────────────────────────────────

const PLATFORM_OPTIONS = [
  { value: null,      label: 'Todos',   icon: 'cellphone' },
  { value: 'android', label: 'Android', icon: 'android' },
  { value: 'ios',     label: 'iOS',     icon: 'apple' },
];

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

const truncate = (str, max = 26) =>
  str && str.length > max ? str.slice(0, max) + '…' : (str || '—');

// ─── main component ──────────────────────────────────────────────────────────

const PushTokensListScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmall = width < 600;

  const [userFilter, setUserFilter]         = useState('');
  const [platformFilter, setPlatformFilter] = useState(null); // null = todos
  const [deletingId, setDeletingId]         = useState(null);

  // Gate: only carlosmbinf can access this screen
  const isCarlos = Meteor.user()?.username === 'carlosmbinf';

  const { ready, tokens, usersMap } = useTracker(() => {
    if (!isCarlos) return { ready: false, tokens: [], usersMap: {} };

    const tokenSub = Meteor.subscribe('push_tokens.all');
    const userSub  = Meteor.subscribe('user', {}, {
      fields: { _id: 1, username: 1, 'profile.firstName': 1, 'profile.lastName': 1 },
    });

    const docs = PushTokens.find({}, { sort: { updatedAt: -1 } }).fetch();

    // Build userId → username map
    const map = {};
    Meteor.users
      .find({}, { fields: { _id: 1, username: 1 } })
      .fetch()
      .forEach((u) => {
        map[u._id] = u.username || u._id;
      });

    return {
      ready: tokenSub.ready() && userSub.ready(),
      tokens: docs,
      usersMap: map,
    };
  }, [isCarlos]);

  // ─── filters ────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = tokens || [];

    if (platformFilter) {
      list = list.filter((t) => t.platform === platformFilter);
    }

    const q = (userFilter || '').toLowerCase().trim();
    if (q) {
      list = list.filter((t) => {
        const uname = (usersMap[t.userId] || '').toLowerCase();
        return uname.includes(q) || (t.userId || '').toLowerCase().includes(q);
      });
    }

    return list;
  }, [tokens, platformFilter, userFilter, usersMap]);

  // ─── delete ─────────────────────────────────────────────────────────────────

  const handleDelete = (tokenDoc) => {
    const uname = usersMap[tokenDoc.userId] || tokenDoc.userId;
    Alert.alert(
      'Eliminar token',
      `¿Eliminar el token de ${tokenDoc.platform || 'dispositivo'} para "${uname}"?\n\nToken: ${truncate(tokenDoc.token, 30)}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setDeletingId(tokenDoc._id);
            Meteor.call(
              'push.deleteToken',
              { tokenId: tokenDoc._id, userId: tokenDoc.userId },
              (err) => {
                setDeletingId(null);
                if (err) {
                  Alert.alert('Error', err.reason || 'No se pudo eliminar el token');
                }
              },
            );
          },
        },
      ],
    );
  };

  // ─── render item ────────────────────────────────────────────────────────────

  const renderItem = ({ item: tok }) => {
    const plat = PLATFORM_COLORS[tok.platform] || {};
    const uname = usersMap[tok.userId] || tok.userId || '—';
    const isBeingDeleted = deletingId === tok._id;

    return (
      <Card
        style={styles.tokenCard}
        elevation={2}
        testID={`token-card-${tok._id}`}>
        <Card.Content style={styles.cardContent}>
          {/* Row 1: platform + username + delete */}
          <View style={styles.row}>
            <Chip
              compact
              icon={plat.icon || 'cellphone'}
              style={[styles.platformChip, { backgroundColor: plat.bg || '#F5F5F5' }]}
              textStyle={{ color: plat.text || '#333', fontSize: 11 }}>
              {tok.platform || '—'}
            </Chip>
            <Text style={styles.username} numberOfLines={1}>
              {uname}
            </Text>
            <IconButton
              icon={isBeingDeleted ? 'loading' : 'delete-outline'}
              iconColor="#d32f2f"
              size={20}
              disabled={isBeingDeleted}
              onPress={() => handleDelete(tok)}
              style={styles.deleteBtn}
              accessibilityLabel="Eliminar token"
            />
          </View>

          <Divider style={styles.innerDivider} />

          {/* Row 2: token */}
          <Text
            style={styles.tokenText}
            numberOfLines={isSmall ? 2 : 1}
            selectable>
            {tok.token || '—'}
          </Text>

          {/* Row 3: deviceId + updatedAt */}
          <View style={styles.row}>
            {tok.deviceId ? (
              <Text style={styles.metaText} numberOfLines={1}>
                Device: {truncate(tok.deviceId, 18)}
              </Text>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <Text style={styles.metaText}>
              ↻ {formatDate(tok.updatedAt || tok.createdAt)}
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // ─── access guard ────────────────────────────────────────────────────────────

  if (!isCarlos) {
    return (
      <Surface style={styles.accessDenied}>
        <Text style={styles.accessDeniedText}>Sin acceso</Text>
      </Surface>
    );
  }

  // ─── layout ─────────────────────────────────────────────────────────────────

  return (
    <Surface style={styles.root}>
      {/* Header */}
      <Appbar
        style={[
          styles.appbar,
          { height: insets.top + 50, paddingTop: insets.top },
        ]}>
        <View style={styles.appbarInner}>
          <Appbar.BackAction
            color="red"
            onPress={() => navigation?.canGoBack() && navigation.goBack()}
          />
          <Text style={styles.appbarTitle}>Push Tokens</Text>
          <MenuHeader navigation={navigation} />
        </View>
      </Appbar>

      {/* Filters */}
      <Surface style={styles.filterArea} elevation={2}>
        <TextInput
          mode="outlined"
          dense
          placeholder="Filtrar por usuario"
          value={userFilter}
          onChangeText={setUserFilter}
          left={<TextInput.Icon icon="account-search" />}
          right={
            userFilter ? (
              <TextInput.Icon
                icon="close-circle"
                onPress={() => setUserFilter('')}
              />
            ) : null
          }
          style={styles.searchInput}
        />

        <View style={styles.platformRow}>
          {PLATFORM_OPTIONS.map((opt) => (
            <Chip
              key={String(opt.value)}
              compact
              icon={opt.icon}
              selected={platformFilter === opt.value}
              mode={platformFilter === opt.value ? 'flat' : 'outlined'}
              onPress={() => setPlatformFilter(opt.value)}
              style={[
                styles.platChip,
                platformFilter === opt.value && styles.platChipSelected,
              ]}
              textStyle={
                platformFilter === opt.value
                  ? styles.platChipTextSelected
                  : null
              }>
              {opt.label}
            </Chip>
          ))}
          <Text style={styles.totalBadge}>
            {filtered.length} token{filtered.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </Surface>

      {/* Content */}
      {!ready ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#3f51b5" />
          <Text style={styles.loadingText}>Cargando tokens…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t._id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No hay tokens con estos filtros</Text>
            </View>
          }
          removeClippedSubviews
          maxToRenderPerBatch={15}
          windowSize={10}
        />
      )}
    </Surface>
  );
};

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:       { flex: 1 },
  appbar: {
    backgroundColor: '#3f51b5',
    justifyContent: 'center',
  },
  appbarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
  },
  appbarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  filterArea: {
    padding: 12,
  },
  searchInput: {
    marginBottom: 8,
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  platChip:            {},
  platChipSelected:    { backgroundColor: '#3f51b5' },
  platChipTextSelected: { color: '#fff', fontWeight: '600' },
  totalBadge: {
    marginLeft: 'auto',
    fontSize: 12,
    opacity: 0.6,
    alignSelf: 'center',
  },
  listContent: {
    padding: 12,
    gap: 10,
  },
  tokenCard:    { borderRadius: 10 },
  cardContent:  { paddingVertical: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  platformChip: { height: 24 },
  username: {
    flex: 1,
    fontWeight: '700',
    fontSize: 14,
  },
  deleteBtn:    { margin: 0, padding: 0 },
  innerDivider: { marginVertical: 6, opacity: 0.15 },
  tokenText: {
    fontSize: 12,
    fontFamily: 'monospace',
    opacity: 0.7,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 11,
    opacity: 0.55,
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText:   { opacity: 0.6 },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText:     { opacity: 0.5, fontSize: 16 },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accessDeniedText: {
    fontSize: 22,
    fontWeight: 'bold',
    opacity: 0.5,
  },
});

export default PushTokensListScreen;
