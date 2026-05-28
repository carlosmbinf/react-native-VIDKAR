import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from "react-native-maps";
import {
  ActivityIndicator,
  Appbar,
  Avatar,
  Button,
  Chip,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";

import useDeferredScreenData from "../../../hooks/useDeferredScreenData";
import {
  ColaCadetesPorTiendasComercioCollection,
  TiendasComercioCollection,
} from "../../collections/collections";
import EmpresaTopBar from "../components/EmpresaTopBar.native";
import { createEmpresaPalette, getEmpresaScreenMetrics } from "../styles/empresaTheme";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const QUEUE_FIELDS = {
  _id: 1,
  cadeteId: 1,
  createdAt: 1,
  fecha: 1,
  idTienda: 1,
  updatedAt: 1,
};

const CADETE_FIELDS = {
  cordenadas: 1,
  coordenadas: 1,
  createdAt: 1,
  modoCadete: 1,
  picture: 1,
  "profile.firstName": 1,
  "profile.lastName": 1,
  "profile.name": 1,
  "profile.phone": 1,
  "profile.telefono": 1,
  "profile.whatsapp": 1,
  username: 1,
};

const STORE_FIELDS = {
  _id: 1,
  cordenadas: 1,
  coordenadas: 1,
  descripcion: 1,
  title: 1,
};

const getFirstParam = (value) => {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return typeof value === "string" ? value : "";
};

const parseJsonParam = (value) => {
  const raw = getFirstParam(value);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const normalizeCoordinates = (value) => {
  const latitude = Number(value?.latitude ?? value?.latitud);
  const longitude = Number(value?.longitude ?? value?.longitud);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    timestamp: value?.timestamp || value?.updatedAt || null,
  };
};

const getUserCoordinates = (user) => normalizeCoordinates(user?.cordenadas || user?.coordenadas);

const getDisplayName = (user, fallback = "Cadete") => {
  const fullName =
    user?.profile?.name ||
    `${user?.profile?.firstName || ""} ${user?.profile?.lastName || ""}`.trim();

  return fullName || user?.username || fallback;
};

const getContactLabel = (user) =>
  user?.profile?.phone ||
  user?.profile?.telefono ||
  user?.profile?.whatsapp ||
  "Contacto no disponible";

const getQueueDate = (entry) => entry?.createdAt || entry?.fecha || entry?.updatedAt;

const formatDateTime = (value) => {
  if (!value) {
    return "Sin hora registrada";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin hora registrada";
  }

  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
};

const getMapRegion = (points) => {
  if (!points.length) {
    return null;
  }

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    latitudeDelta: Math.max((maxLatitude - minLatitude) * 1.9, 0.012),
    longitude: (minLongitude + maxLongitude) / 2,
    longitudeDelta: Math.max((maxLongitude - minLongitude) * 1.9, 0.012),
  };
};

const CadeteCard = ({ cadete, index, palette }) => {
  const coordinates = cadete.coordinates;
  const initials = cadete.displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleOpenMap = () => {
    if (!coordinates) {
      return;
    }

    const query = `${coordinates.latitude},${coordinates.longitude}`;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
  };

  return (
    <Surface style={[styles.cadeteCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
      <View style={styles.cadeteHeader}>
        {cadete.picture ? (
          <Avatar.Image size={52} source={{ uri: cadete.picture }} />
        ) : (
          <Avatar.Text label={initials || "CD"} size={52} />
        )}
        <View style={styles.cadeteTitle}>
          <Text style={{ color: palette.title }} variant="titleMedium">
            {cadete.displayName}
          </Text>
          <Text style={{ color: palette.muted }} variant="bodySmall">
            @{cadete.username || cadete.cadeteId}
          </Text>
        </View>
        <Chip compact icon="format-list-numbered" style={{ backgroundColor: palette.hero }}>
          #{index + 1}
        </Chip>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <MaterialCommunityIcons color={palette.brandStrong} name="clock-outline" size={18} />
          <Text style={{ color: palette.copy }} variant="bodySmall">
            En cola desde {formatDateTime(cadete.queueDate)}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <MaterialCommunityIcons color={palette.brandStrong} name="card-account-phone-outline" size={18} />
          <Text style={{ color: palette.copy }} variant="bodySmall">
            {cadete.contactLabel}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <MaterialCommunityIcons color={coordinates ? palette.brandStrong : palette.muted} name={coordinates ? "map-marker-radius-outline" : "map-marker-off-outline"} size={18} />
          <Text style={{ color: palette.copy }} variant="bodySmall">
            {coordinates
              ? `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`
              : "Sin ubicación disponible"}
          </Text>
        </View>
      </View>

      {coordinates ? (
        <Button icon="map-marker-path" mode="contained-tonal" onPress={handleOpenMap} textColor={palette.brandStrong}>
          Abrir ubicación
        </Button>
      ) : null}
    </Surface>
  );
};

const CadetesEnColaScreen = () => {
  const theme = useTheme();
  const palette = useMemo(() => createEmpresaPalette(theme), [theme]);
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams();
  const parsedTienda = parseJsonParam(params.tienda);
  const tiendaId = getFirstParam(params.tiendaId) || parsedTienda?._id || "";
  const [refreshing, setRefreshing] = useState(false);
  const dataReady = useDeferredScreenData();
  const { contentMaxWidth, horizontalPadding } = useMemo(
    () => getEmpresaScreenMetrics(width),
    [width],
  );

  const { cadetes, ready, tienda } = Meteor.useTracker(() => {
    if (!dataReady) {
      return { cadetes: [], ready: false, tienda: parsedTienda || null };
    }

    if (!tiendaId) {
      return { cadetes: [], ready: true, tienda: parsedTienda || null };
    }

    const tiendaHandle = Meteor.subscribe("tiendas", { _id: tiendaId }, {
      fields: STORE_FIELDS,
    });
    const queueHandle = Meteor.subscribe("colacadetesxtiendas", { idTienda: tiendaId }, {
      fields: QUEUE_FIELDS,
    });
    const queueEntries = ColaCadetesPorTiendasComercioCollection.find(
      { idTienda: tiendaId },
      { fields: QUEUE_FIELDS, sort: { createdAt: 1, fecha: 1, updatedAt: 1 } },
    ).fetch();
    const cadeteIds = [...new Set(queueEntries.map((entry) => entry?.cadeteId).filter(Boolean))];
    const usersHandle = cadeteIds.length
      ? Meteor.subscribe("user", { _id: { $in: cadeteIds } }, { fields: CADETE_FIELDS })
      : null;
    const usersById = cadeteIds.length
      ? Meteor.users.find(
          { _id: { $in: cadeteIds } },
          { fields: CADETE_FIELDS },
        ).fetch().reduce((accumulator, user) => {
          accumulator[user._id] = user;
          return accumulator;
        }, {})
      : {};
    const queueByCadete = queueEntries.reduce((accumulator, entry) => {
      if (entry?.cadeteId && !accumulator[entry.cadeteId]) {
        accumulator[entry.cadeteId] = entry;
      }

      return accumulator;
    }, {});

    return {
      cadetes: cadeteIds.map((cadeteId) => {
        const cadeteIdLabel = String(cadeteId);
        const user = usersById[cadeteId] || {};
        return {
          cadeteId: cadeteIdLabel,
          contactLabel: getContactLabel(user),
          coordinates: getUserCoordinates(user),
          displayName: getDisplayName(user, `Cadete ${cadeteIdLabel.slice(-4)}`),
          picture: user.picture,
          queueDate: getQueueDate(queueByCadete[cadeteId]),
          username: user.username,
        };
      }),
      ready: tiendaHandle.ready() && queueHandle.ready() && (!usersHandle || usersHandle.ready()),
      tienda:
        TiendasComercioCollection.findOne(
          { _id: tiendaId },
          { fields: STORE_FIELDS },
        ) ||
        parsedTienda ||
        null,
    };
  }, [dataReady, parsedTienda, tiendaId]);

  const storeCoordinates = normalizeCoordinates(tienda?.coordenadas || tienda?.cordenadas);
  const cadetesWithLocation = cadetes.filter((cadete) => cadete.coordinates);
  const mapPoints = [
    ...(storeCoordinates ? [storeCoordinates] : []),
    ...cadetesWithLocation.map((cadete) => cadete.coordinates),
  ];
  const mapRegion = getMapRegion(mapPoints);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 650);
  };

  const listHeader = (
    <View style={styles.headerContent}>
      <Surface style={[styles.heroCard, { backgroundColor: palette.hero, borderColor: palette.border }]}>
        <View style={styles.heroTitleRow}>
          <View style={[styles.heroIcon, { backgroundColor: palette.brandSoft }]}>
            <MaterialCommunityIcons color={palette.brandStrong} name="bike-fast" size={26} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={{ color: palette.title }} variant="headlineSmall">
              Cadetes en cola
            </Text>
            <Text style={{ color: palette.copy }} variant="bodyMedium">
              {tienda?.title || "Tienda"} tiene {cadetes.length} cadete{cadetes.length === 1 ? "" : "s"} esperando asignación.
            </Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <Surface style={[styles.metricCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
            <Text style={{ color: palette.title }} variant="titleLarge">
              {cadetes.length}
            </Text>
            <Text style={{ color: palette.muted }} variant="bodySmall">
              En cola
            </Text>
          </Surface>
          <Surface style={[styles.metricCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
            <Text style={{ color: palette.title }} variant="titleLarge">
              {cadetesWithLocation.length}
            </Text>
            <Text style={{ color: palette.muted }} variant="bodySmall">
              Con ubicación
            </Text>
          </Surface>
        </View>
      </Surface>

      {mapRegion ? (
        <Surface style={[styles.mapCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
          <MapView
            initialRegion={mapRegion}
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
            style={styles.map}
          >
            {storeCoordinates ? (
              <Marker coordinate={storeCoordinates} title={tienda?.title || "Tienda"}>
                <View style={[styles.marker, { backgroundColor: palette.brand }]}>
                  <MaterialCommunityIcons color="#ffffff" name="storefront" size={20} />
                </View>
              </Marker>
            ) : null}
            {cadetesWithLocation.map((cadete, index) => (
              <Marker
                coordinate={cadete.coordinates}
                description={`Posición ${index + 1} en la cola`}
                key={cadete.cadeteId}
                title={cadete.displayName}
              >
                <View style={[styles.marker, { backgroundColor: "#2563eb" }]}>
                  <MaterialCommunityIcons color="#ffffff" name="bike-fast" size={20} />
                </View>
              </Marker>
            ))}
          </MapView>
        </Surface>
      ) : null}
    </View>
  );

  const renderEmpty = () => {
    if (!ready) {
      return (
        <Surface style={[styles.centerCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
          <ActivityIndicator color={palette.brandStrong} />
          <Text style={{ color: palette.title }} variant="titleMedium">
            Cargando cadetes
          </Text>
        </Surface>
      );
    }

    return (
      <Surface style={[styles.centerCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
        <MaterialCommunityIcons color={palette.muted} name="account-search-outline" size={42} />
        <Text style={{ color: palette.title }} variant="titleMedium">
          No hay cadetes en cola
        </Text>
        <Text style={[styles.centerCopy, { color: palette.copy }]} variant="bodyMedium">
          Cuando un cadete quede disponible cerca de esta tienda aparecerá aquí con sus datos y ubicación.
        </Text>
      </Surface>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <EmpresaTopBar
        backHref="/(empresa)/TiendaDetail"
        rightActions={<Appbar.Action icon="refresh" onPress={handleRefresh} />}
        subtitle={tienda?.title || "Tienda"}
        title="Cadetes en cola"
      />
      <FlatList
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
        data={ready ? cadetes : []}
        keyExtractor={(item) => item.cadeteId}
        refreshControl={<RefreshControl onRefresh={handleRefresh} refreshing={refreshing} />}
        renderItem={({ item, index }) => (
          <CadeteCard cadete={item} index={index} palette={palette} />
        )}
        style={[styles.listShell, contentMaxWidth ? { maxWidth: contentMaxWidth } : null]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  cadeteCard: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  cadeteHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  cadeteTitle: {
    flex: 1,
    gap: 2,
  },
  centerCard: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  centerCopy: {
    textAlign: "center",
  },
  headerContent: {
    gap: 16,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 16,
    padding: 18,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  heroIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  heroTitleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
  },
  infoGrid: {
    gap: 8,
  },
  infoItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  listContent: {
    flexGrow: 1,
    gap: 14,
    paddingBottom: 32,
    paddingTop: 8,
  },
  listShell: {
    alignSelf: "center",
    width: "100%",
  },
  map: {
    borderRadius: 24,
    height: 260,
    overflow: "hidden",
    width: "100%",
  },
  mapCard: {
    borderRadius: 26,
    borderWidth: 1,
    overflow: "hidden",
    padding: 4,
  },
  marker: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  metricCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
  },
  screen: {
    flex: 1,
  },
});

export default CadetesEnColaScreen;
