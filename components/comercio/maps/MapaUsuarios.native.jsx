import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import MapView, {
    Marker,
    PROVIDER_DEFAULT,
    PROVIDER_GOOGLE,
} from "react-native-maps";
import { Button, Chip, Surface, Text } from "react-native-paper";

const formatCoordinate = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }

  return value.toFixed(5);
};

const formatTimestamp = (value) => {
  if (!value) {
    return "Sin marca temporal";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin marca temporal";
  }

  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch (_error) {
    return date.toLocaleString("es-ES");
  }
};

const getRoleLabel = (user) => {
  if (user.modoCadete) {
    return "Cadete";
  }

  if (user.isEmpresa) {
    return "Empresa";
  }

  if (user.profile?.role === "admin") {
    return "Administrador";
  }

  return "Usuario";
};

const getMarkerColor = (user, selectedUserId) => {
  if (user._id === selectedUserId) {
    return "#2563eb";
  }

  if (user.modoCadete) {
    return "#f97316";
  }

  if (user.profile?.role === "admin") {
    return "#8b5cf6";
  }

  if (user.isEmpresa) {
    return "#14b8a6";
  }

  if (user.online) {
    return "#22c55e";
  }

  return "#64748b";
};

const getSelectedCardAccent = (user) => {
  if (!user) {
    return "#2563eb";
  }

  return getMarkerColor(user);
};

const MapaUsuarios = ({
  colors,
  currentLocation,
  emptyMessage,
  loading,
  onRequestCurrentLocation,
  onSelectUser,
  selectedUser,
  users,
}) => {
  const mapRef = React.useRef(null);

  const coordinates = React.useMemo(
    () => users.map((user) => user.coordinate).filter(Boolean),
    [users],
  );

  const defaultRegion = React.useMemo(() => {
    if (!coordinates.length) {
      return {
        latitude: 23.1136,
        longitude: -82.3666,
        latitudeDelta: 4.2,
        longitudeDelta: 4.2,
      };
    }

    const latitudes = coordinates.map((coordinate) => coordinate.latitude);
    const longitudes = coordinates.map((coordinate) => coordinate.longitude);
    const minLatitude = Math.min(...latitudes);
    const maxLatitude = Math.max(...latitudes);
    const minLongitude = Math.min(...longitudes);
    const maxLongitude = Math.max(...longitudes);

    return {
      latitude: (minLatitude + maxLatitude) / 2,
      longitude: (minLongitude + maxLongitude) / 2,
      latitudeDelta: Math.max((maxLatitude - minLatitude) * 1.45, 0.08),
      longitudeDelta: Math.max((maxLongitude - minLongitude) * 1.45, 0.08),
    };
  }, [coordinates]);

  const fitToUsers = React.useCallback(() => {
    if (!mapRef.current || !coordinates.length) {
      return;
    }

    mapRef.current.fitToCoordinates(coordinates, {
      animated: true,
      edgePadding: {
        top: 140,
        right: 80,
        bottom: selectedUser ? 260 : 160,
        left: 80,
      },
    });
  }, [coordinates, selectedUser]);

  const focusCurrentLocation = React.useCallback(() => {
    if (!mapRef.current || !currentLocation) {
      return;
    }

    mapRef.current.animateToRegion(
      {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.035,
        longitudeDelta: 0.035,
      },
      500,
    );
  }, [currentLocation]);

  React.useEffect(() => {
    if (!coordinates.length) {
      return;
    }

    const timeoutId = setTimeout(() => {
      fitToUsers();
    }, 180);

    return () => clearTimeout(timeoutId);
  }, [fitToUsers, coordinates.length]);

  if (!coordinates.length && !loading) {
    return (
      <Surface style={[styles.emptyState, { backgroundColor: colors.surface }]}>
        <Text
          variant="titleMedium"
          style={[styles.emptyTitle, { color: colors.title }]}
        >
          Sin usuarios para mostrar
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.emptyCopy, { color: colors.copy }]}
        >
          {emptyMessage}
        </Text>
        <View style={styles.emptyActions}>
          <Button mode="outlined" onPress={onRequestCurrentLocation}>
            Probar mi ubicación
          </Button>
        </View>
      </Surface>
    );
  }

  return (
    <View style={styles.mapWrap}>
      <MapView
        ref={mapRef}
        provider={
          Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
        }
        style={styles.map}
        initialRegion={defaultRegion}
        showsCompass
        showsMyLocationButton={false}
        showsScale
        showsUserLocation={Boolean(currentLocation)}
        toolbarEnabled={false}
      >
        {users.map((user) => (
          <Marker
            key={user._id}
            coordinate={user.coordinate}
            title={user.displayName}
            description={`${getRoleLabel(user)} • ${user.online ? "En línea" : "Sin conexión"}`}
            pinColor={getMarkerColor(user, selectedUser?._id)}
            onPress={() => onSelectUser?.(user)}
          />
        ))}
      </MapView>

      <Surface
        style={[
          styles.floatingControls,
          { backgroundColor: colors.surfaceElevated },
        ]}
      >
        <Button
          mode="contained-tonal"
          icon="crosshairs-gps"
          onPress={fitToUsers}
        >
          Ver todos
        </Button>
        <Button
          mode="text"
          icon="navigation-variant"
          onPress={focusCurrentLocation}
        >
          Mi punto
        </Button>
      </Surface>

      {selectedUser ? (
        <Surface
          style={[
            styles.selectionCard,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.selectionRail,
              { backgroundColor: getSelectedCardAccent(selectedUser) },
            ]}
          />
          <View style={styles.selectionContent}>
            <View style={styles.selectionHeader}>
              <View style={styles.selectionTitleWrap}>
                <Text
                  variant="titleMedium"
                  style={[styles.selectionTitle, { color: colors.title }]}
                >
                  {selectedUser.displayName}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.copy }}>
                  {selectedUser.username
                    ? `@${selectedUser.username}`
                    : "Sin username"}
                </Text>
              </View>
              <Chip
                compact
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: selectedUser.online
                      ? colors.successBackground
                      : colors.mutedBackground,
                  },
                ]}
                textStyle={{
                  color: selectedUser.online
                    ? colors.successText
                    : colors.mutedText,
                }}
              >
                {selectedUser.online ? "En línea" : "Sin conexión"}
              </Chip>
            </View>

            <View style={styles.metaRow}>
              <Chip
                style={[
                  styles.metaChip,
                  { backgroundColor: colors.softAccent },
                ]}
                textStyle={{ color: colors.accentText }}
              >
                {getRoleLabel(selectedUser)}
              </Chip>
              <Chip
                style={[
                  styles.metaChip,
                  { backgroundColor: colors.softNeutral },
                ]}
                textStyle={{ color: colors.copy }}
              >
                {`${formatCoordinate(selectedUser.coordinate.latitude)}, ${formatCoordinate(selectedUser.coordinate.longitude)}`}
              </Chip>
            </View>

            <Text variant="bodySmall" style={{ color: colors.copy }}>
              Última referencia: {formatTimestamp(selectedUser.timestamp)}
            </Text>
          </View>
        </Surface>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  emptyActions: {
    flexDirection: "row",
    justifyContent: "center",
  },
  emptyCopy: {
    lineHeight: 20,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    borderRadius: 24,
    flex: 1,
    gap: 14,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  emptyTitle: {
    fontWeight: "800",
    textAlign: "center",
  },
  floatingControls: {
    borderRadius: 18,
    gap: 4,
    padding: 10,
    position: "absolute",
    right: 16,
    top: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapWrap: {
    borderRadius: 28,
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  metaChip: {
    borderRadius: 999,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    bottom: 18,
    flexDirection: "row",
    left: 16,
    overflow: "hidden",
    position: "absolute",
    right: 16,
  },
  selectionContent: {
    flex: 1,
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  selectionRail: {
    width: 5,
  },
  selectionTitle: {
    fontWeight: "800",
  },
  selectionTitleWrap: {
    flex: 1,
    gap: 2,
  },
  statusChip: {
    borderRadius: 999,
  },
});

export default MapaUsuarios;
