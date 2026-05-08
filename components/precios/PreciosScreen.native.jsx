import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { BlurView } from "expo-blur";
import React from "react";
import {
    Alert,
    FlatList,
    LayoutAnimation,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    UIManager,
    View,
    useWindowDimensions,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    Chip,
    Dialog,
    Divider,
    HelperText,
    IconButton,
    Menu,
    TextInput as PaperTextInput,
    Portal,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import AppHeader, { DEFAULT_HEADER_COLOR, useAppHeaderContentInset } from "../Header/AppHeader";
import { PreciosCollection } from "../collections/collections";

const Meteor = /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
  MeteorBase
);

const ADMIN_PRINCIPAL_USERNAME = "carlosmbinf";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PRICE_FIELDS = {
  _id: 1,
  comentario: 1,
  createdAt: 1,
  detalles: 1,
  heredaDe: 1,
  megas: 1,
  precio: 1,
  type: 1,
  userId: 1,
};

const USER_FIELDS = {
  "profile.firstName": 1,
  "profile.name": 1,
  "profile.role": 1,
  username: 1,
};

const PRICE_TYPES = [
  {
    value: "megas",
    label: "Proxy por capacidad",
    shortLabel: "Proxy",
    icon: "wifi",
    measured: true,
    accent: "#2563eb",
  },
  {
    value: "fecha-proxy",
    label: "Proxy ilimitado por 30 dias",
    shortLabel: "Proxy ilimitado",
    icon: "infinity",
    measured: false,
    accent: "#7c3aed",
  },
  {
    value: "vpnplus",
    label: "VPN por capacidad",
    shortLabel: "VPN",
    icon: "shield-check-outline",
    measured: true,
    accent: "#059669",
  },
  {
    value: "fecha-vpn",
    label: "VPN ilimitado por 30 dias",
    shortLabel: "VPN ilimitado",
    icon: "shield-lock-outline",
    measured: false,
    accent: "#0891b2",
  },
  {
    value: "vpn2mb",
    label: "VPN 2MB",
    shortLabel: "VPN 2MB",
    icon: "shield-plus-outline",
    measured: true,
    accent: "#f59e0b",
  },
];

const ALL_FILTER = "Todos";
const NO_BASE_OPTION = { value: null, label: "Precio independiente" };

const getPricesLayout = (screenWidth) => {
  const width = Number(screenWidth) || 390;
  const listPaddingHorizontal = width < 390 ? 10 : 12;
  const groupPaddingHorizontal = width < 390 ? 10 : 12;
  const gridGap = width >= 1024 ? 14 : width >= 768 ? 12 : 10;
  const availableGridWidth = Math.max(
    220,
    width - listPaddingHorizontal * 2 - groupPaddingHorizontal * 2,
  );

  let columns = 1;
  if (availableGridWidth >= 520) {
    columns = Math.floor((availableGridWidth + gridGap) / (250 + gridGap));
  }

  columns = Math.max(
    1,
    Math.min(columns, width >= 1280 ? 4 : width >= 960 ? 3 : width >= 560 ? 2 : 1),
  );

  const rawCardWidth =
    columns > 1
      ? (availableGridWidth - gridGap * (columns - 1)) / columns
      : availableGridWidth;
  const maxCardWidth = width >= 1200 ? 310 : width >= 768 ? 296 : rawCardWidth;
  const cardWidth = columns > 1 ? Math.min(maxCardWidth, rawCardWidth) : null;
  const compactCard = columns > 1 || width < 390;

  return {
    cardWidth,
    columns,
    compactCard,
    gridGap,
    groupPaddingHorizontal,
    listPaddingHorizontal,
  };
};

const getBaseOffersLayout = (dialogWidth) => {
  const width = Number(dialogWidth) || 360;
  const contentWidth = Math.max(220, width - 36);
  const gap = width < 420 ? 10 : 12;

  let columns = 1;
  if (contentWidth >= 560) {
    columns = 3;
  } else if (contentWidth >= 360) {
    columns = 2;
  }

  const cardWidth =
    columns > 1
      ? (contentWidth - gap * (columns - 1)) / columns
      : contentWidth;

  return {
    cardWidth,
    columns,
    gap,
  };
};

const getTypeInfo = (type) =>
  PRICE_TYPES.find((item) => item.value === type) || {
    value: type || "otro",
    label: type || "Servicio",
    shortLabel: type || "Servicio",
    icon: "tag-outline",
    measured: false,
    accent: "#64748b",
  };

const isMeasuredType = (type) => Boolean(getTypeInfo(type).measured);

const formatDate = (value) => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch (_error) {
    return date.toLocaleDateString("es-ES");
  }
};

const formatCapacity = (price) => {
  if (!isMeasuredType(price?.type)) return "Ilimitado";
  const megas = Number(price?.megas);
  if (!Number.isFinite(megas) || megas <= 0) return "Sin capacidad";
  if (megas >= 1024) {
    const gb = megas / 1024;
    return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  }
  return `${megas} MB`;
};

const formatMoney = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0 CUP";
  return `${amount.toLocaleString("es-ES", { maximumFractionDigits: 2 })} CUP`;
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const animateLayoutChange = () => {
  LayoutAnimation.configureNext({
    duration: 240,
    create: {
      duration: 200,
      property: LayoutAnimation.Properties.opacity,
      type: LayoutAnimation.Types.easeInEaseOut,
    },
    delete: {
      duration: 160,
      property: LayoutAnimation.Properties.opacity,
      type: LayoutAnimation.Types.easeInEaseOut,
    },
    update: {
      springDamping: 0.78,
      type: LayoutAnimation.Types.spring,
    },
  });
};

const getUserDisplayName = (userId) => {
  if (!userId) return "Sin responsable";
  const user = Meteor.users?.findOne?.(userId);
  return (
    user?.profile?.firstName ||
    user?.profile?.name ||
    user?.username ||
    String(userId).slice(0, 10)
  );
};

const buildPalette = (theme) => {
  const isDark = theme.dark;
  return {
    isDark,
    screen: theme.colors.background,
    title: isDark ? "#f8fafc" : "#0f172a",
    copy: isDark ? "#cbd5e1" : "#475569",
    muted: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "rgba(148, 163, 184, 0.18)" : "rgba(15, 23, 42, 0.08)",
    card: isDark ? "rgba(15, 23, 42, 0.92)" : "#ffffff",
    cardSoft: isDark ? "rgba(30, 41, 59, 0.76)" : "rgba(241, 245, 249, 0.92)",
    hero: isDark ? "#0b1220" : "#eef4ff",
    heroAccent: isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(37, 99, 235, 0.12)",
    input: isDark ? "rgba(15, 23, 42, 0.92)" : "#ffffff",
    inputText: isDark ? "#f8fafc" : "#0f172a",
    inputPlaceholder: isDark ? "#94a3b8" : "#64748b",
    selection: isDark ? "rgba(147, 197, 253, 0.34)" : "rgba(37, 99, 235, 0.22)",
    chip: isDark ? "rgba(148, 163, 184, 0.13)" : "rgba(15, 23, 42, 0.06)",
    chipSelected: isDark ? "rgba(37, 99, 235, 0.28)" : "rgba(37, 99, 235, 0.12)",
    chipText: isDark ? "#e2e8f0" : "#334155",
    chipSelectedText: isDark ? "#dbeafe" : "#1d4ed8",
    dialogOverlay: isDark ? "rgba(15, 23, 42, 0.72)" : "rgba(255, 255, 255, 0.72)",
    success: isDark ? "#86efac" : "#047857",
    danger: isDark ? "#fca5a5" : "#dc2626",
    warning: isDark ? "#fde68a" : "#b45309",
  };
};

const normalizeMethodResponse = (firstArg, secondArg) => {
  if (
    firstArg &&
    typeof firstArg === "object" &&
    Object.prototype.hasOwnProperty.call(firstArg, "success") &&
    Object.prototype.hasOwnProperty.call(firstArg, "error")
  ) {
    return { error: firstArg.error, result: firstArg.success };
  }

  return { error: firstArg, result: secondArg };
};

const SearchInput = ({ colors, onChangeText, value }) => {
  const inputRef = React.useRef(null);

  return (
    <Surface style={[styles.searchSurface, { backgroundColor: colors.input }]} elevation={0}>
      <IconButton
        icon="magnify"
        size={20}
        iconColor={colors.muted}
        style={styles.searchIcon}
        onPress={() => inputRef.current?.focus()}
      />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder="Buscar por servicio, mensaje o administrador"
        placeholderTextColor={colors.inputPlaceholder}
        cursorColor={colors.inputText}
        selectionColor={colors.selection}
        style={[styles.searchInput, { color: colors.inputText }]}
      />
      {value ? (
        <IconButton
          icon="close"
          size={18}
          iconColor={colors.muted}
          style={styles.searchIcon}
          onPress={() => onChangeText("")}
        />
      ) : null}
    </Surface>
  );
};

const SectionHeader = ({ colors, icon, title, subtitle }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionIcon, { backgroundColor: colors.heroAccent }]}> 
      <MaterialCommunityIcons name={icon} size={18} color="#2563eb" />
    </View>
    <View style={styles.sectionCopy}>
      <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.title }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="bodySmall" style={[styles.sectionSubtitle, { color: colors.muted }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  </View>
);

const FilterRow = ({ colors, selected, types, onSelect }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.filterRow}
  >
    {[ALL_FILTER, ...types].map((item) => {
      const value = typeof item === "string" ? item : item.value;
      const label = typeof item === "string" ? item : item.shortLabel;
      const active = selected === value;
      return (
        <Chip
          key={value}
          selected={active}
          showSelectedCheck={false}
          icon={typeof item === "string" ? undefined : item.icon}
          onPress={() => onSelect(value)}
          style={[
            styles.filterChip,
            {
              backgroundColor: active ? colors.chipSelected : colors.chip,
              borderColor: active ? "rgba(37, 99, 235, 0.32)" : colors.border,
            },
          ]}
          textStyle={{ color: active ? colors.chipSelectedText : colors.chipText, fontWeight: "700" }}
        >
          {label}
        </Chip>
      );
    })}
  </ScrollView>
);

const AdminFilterRow = ({ admins, colors, selected, onSelect }) => {
  if (!admins.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      {[{ userId: ALL_FILTER, name: "Todos los admins" }, ...admins].map((item) => {
        const active = selected === item.userId;
        return (
          <Chip
            key={item.userId}
            selected={active}
            showSelectedCheck={false}
            icon="account-tie-outline"
            onPress={() => onSelect(item.userId)}
            style={[
              styles.filterChip,
              {
                backgroundColor: active ? colors.chipSelected : colors.chip,
                borderColor: active ? "rgba(37, 99, 235, 0.32)" : colors.border,
              },
            ]}
            textStyle={{
              color: active ? colors.chipSelectedText : colors.chipText,
              fontWeight: "700",
            }}
          >
            {item.name}
          </Chip>
        );
      })}
    </ScrollView>
  );
};

const SummaryMetric = ({ colors, icon, label, value }) => (
  <Surface style={[styles.metricCard, { backgroundColor: colors.cardSoft }]} elevation={0}>
    <MaterialCommunityIcons name={icon} size={22} color="#2563eb" />
    <Text variant="headlineSmall" style={[styles.metricValue, { color: colors.title }]}>
      {value}
    </Text>
    <Text variant="labelMedium" style={[styles.metricLabel, { color: colors.muted }]}>
      {label}
    </Text>
  </Surface>
);

const PriceCard = ({ basePrice, canDelete, canEdit, colors, compact, expanded, item, onDelete, onEdit, onToggle }) => {
  const typeInfo = getTypeInfo(item.type);
  const inherited = Boolean(item.heredaDe);
  const owner = getUserDisplayName(item.userId);
  const hasDetails = Boolean(item.comentario || item.detalles || inherited || basePrice);
  const ownPriceLabel = formatMoney(item.precio);
  const basePriceLabel = basePrice ? formatMoney(basePrice.precio) : null;
  const [menuVisible, setMenuVisible] = React.useState(false);

  const openMenu = React.useCallback(() => setMenuVisible(true), []);
  const closeMenu = React.useCallback(() => setMenuVisible(false), []);

  const handleEdit = React.useCallback(() => {
    closeMenu();
    onEdit?.(item);
  }, [closeMenu, item, onEdit]);

  const handleDelete = React.useCallback(() => {
    closeMenu();
    onDelete(item);
  }, [closeMenu, item, onDelete]);

  return (
    <Pressable onPress={onToggle} disabled={!hasDetails}>
      <Surface
        style={[
          styles.priceCard,
          compact && styles.priceCardCompact,
          expanded && styles.priceCardExpanded,
          { backgroundColor: colors.card, borderColor: expanded ? typeInfo.accent : colors.border },
        ]}
        elevation={expanded ? 5 : 1}
      >
      <View style={styles.priceCardHeader}>
        <View style={[styles.priceIcon, { backgroundColor: `${typeInfo.accent}22` }]}> 
          <MaterialCommunityIcons name={typeInfo.icon} size={compact ? 19 : 22} color={typeInfo.accent} />
        </View>
        <View style={styles.priceHeaderCopy}>
          <Text variant={compact ? "titleSmall" : "titleMedium"} style={[styles.priceTitle, { color: colors.title }]} numberOfLines={1}>
            {typeInfo.label}
          </Text>
          <Text variant="bodySmall" style={[styles.priceSubtitle, { color: colors.muted }]} numberOfLines={1}>
            {inherited ? "Basado en una oferta oficial" : "Precio creado directamente"}
          </Text>
        </View>
        <Chip compact style={[styles.priceAmountChip, { backgroundColor: `${typeInfo.accent}1f` }]} textStyle={{ color: typeInfo.accent, fontWeight: "900" }}>
          {ownPriceLabel}
        </Chip>
        {canEdit || canDelete ? (
          <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchor={
              <IconButton
                icon="dots-vertical"
                iconColor={colors.muted}
                size={18}
                style={styles.cardMenuButton}
                onPress={openMenu}
              />
            }
            contentStyle={[styles.cardMenuContent, { backgroundColor: colors.card }]}
            anchorPosition="bottom"
          >
            {canEdit ? (
              <Menu.Item
                leadingIcon="pencil-outline"
                title="Editar"
                onPress={handleEdit}
                titleStyle={{ color: colors.title, fontWeight: "700" }}
              />
            ) : null}
            {canDelete ? (
              <Menu.Item
                leadingIcon="trash-can-outline"
                title="Eliminar"
                onPress={handleDelete}
                titleStyle={{ color: colors.danger, fontWeight: "700" }}
              />
            ) : null}
          </Menu>
        ) : null}
      </View>

      {inherited && expanded ? (
        <View style={[styles.priceCompareRow, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}> 
          <View style={styles.priceCompareItem}>
            <Text variant="labelSmall" style={[styles.compareLabel, { color: colors.muted }]}>Precio oficial</Text>
            <Text variant="titleSmall" style={[styles.compareValue, { color: colors.title }]}>
              {basePriceLabel || "Sin referencia"}
            </Text>
          </View>
          <MaterialCommunityIcons name="arrow-right-thin" size={22} color={colors.muted} />
          <View style={styles.priceCompareItem}>
            <Text variant="labelSmall" style={[styles.compareLabel, { color: colors.muted }]}>Tu precio</Text>
            <Text variant="titleSmall" style={[styles.compareValue, { color: typeInfo.accent }]}>
              {ownPriceLabel}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.priceMetaRow}>
        <View style={[styles.metaPill, { backgroundColor: colors.cardSoft }]}> 
          <MaterialCommunityIcons name="database-outline" size={15} color={colors.muted} />
          <Text variant="labelMedium" style={[styles.metaPillText, { color: colors.copy }]} numberOfLines={1}>
            {formatCapacity(item)}
          </Text>
        </View>
        <View style={[styles.metaPill, { backgroundColor: colors.cardSoft }]}> 
          <MaterialCommunityIcons name="account-tie-outline" size={15} color={colors.muted} />
          <Text variant="labelMedium" style={[styles.metaPillText, { color: colors.copy }]} numberOfLines={1}>
            {owner}
          </Text>
        </View>
      </View>

      {expanded ? (
        <View style={styles.expandedDetails}>
          {item.comentario ? (
            <View style={[styles.detailBlock, { backgroundColor: colors.cardSoft }]}> 
              <Text variant="labelMedium" style={[styles.detailBlockLabel, { color: colors.muted }]}>Mensaje comercial</Text>
              <Text variant="bodyMedium" style={[styles.cardComment, { color: colors.copy }]}>
                {item.comentario}
              </Text>
            </View>
          ) : null}
          {item.detalles ? (
            <View style={[styles.detailBlock, { backgroundColor: colors.cardSoft }]}> 
              <Text variant="labelMedium" style={[styles.detailBlockLabel, { color: colors.muted }]}>Condiciones visibles</Text>
              <Text variant="bodySmall" style={[styles.cardDetails, { color: colors.muted }]}>
                {item.detalles}
              </Text>
            </View>
          ) : null}
        </View>
      ) : hasDetails ? (
        <View style={styles.tapHintRow}>
          <MaterialCommunityIcons name="gesture-tap" size={14} color={colors.muted} />
          <Text variant="labelSmall" style={{ color: colors.muted, fontWeight: "700" }}>
            Toca para ver comentarios y condiciones
          </Text>
        </View>
      ) : null}

      {expanded ? (
        <>
          <Divider style={[styles.cardDivider, { backgroundColor: colors.border }]} />
          <Text variant="labelSmall" style={{ color: colors.muted }}>
            Creado: {formatDate(item.createdAt)}
          </Text>
        </>
      ) : null}
      </Surface>
    </Pressable>
  );
};

const UserPricesGroup = ({ basePriceMap, canDeletePrice, canEditPrice, colors, expandedIds, group, layout, onDelete, onEdit, onToggleCard }) => (
  <View style={styles.userGroup}>
    <View style={styles.userGroupHeader}>
      <View style={[styles.userGroupAvatar, { backgroundColor: colors.heroAccent }]}> 
        <MaterialCommunityIcons name="account-tie-outline" size={20} color="#2563eb" />
      </View>
      <View style={styles.userGroupCopy}>
        <Text variant="titleMedium" style={[styles.userGroupTitle, { color: colors.title }]} numberOfLines={1}>
          {group.name}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.muted }}>
          {group.items.length} {group.items.length === 1 ? "oferta preparada" : "ofertas preparadas"}
        </Text>
      </View>
      <Chip style={[styles.userGroupChip, { backgroundColor: colors.chip }]} textStyle={{ color: colors.chipText, fontWeight: "800" }}>
        {group.items.length}
      </Chip>
    </View>
    <View
      style={[
        styles.responsiveCardsGrid,
        { gap: layout.gridGap, paddingHorizontal: layout.groupPaddingHorizontal },
      ]}
    >
      {group.items.map((item) => (
        <View
          key={item._id}
          style={[
            styles.priceCardCell,
            layout.columns > 1
              ? { maxWidth: layout.cardWidth, width: layout.cardWidth }
              : null,
          ]}
        >
          <PriceCard
            basePrice={basePriceMap.get(item.heredaDe)}
            canDelete={canDeletePrice(item)}
            canEdit={canEditPrice(item)}
            compact={layout.compactCard}
            colors={colors}
            expanded={Boolean(expandedIds[item._id])}
            item={item}
            onDelete={onDelete}
            onEdit={onEdit}
            onToggle={() => onToggleCard(item._id)}
          />
        </View>
      ))}
    </View>
  </View>
);

const BaseOfferCard = ({ colors, item, selected, onPress }) => {
  const typeInfo = getTypeInfo(item.type);
  return (
    <Pressable onPress={onPress}>
      <Surface
        style={[
          styles.baseOfferCard,
          {
            backgroundColor: selected ? colors.chipSelected : colors.cardSoft,
            borderColor: selected ? typeInfo.accent : colors.border,
          },
        ]}
        elevation={0}
      >
        <View style={styles.baseOfferHeader}>
          <MaterialCommunityIcons name={typeInfo.icon} size={20} color={typeInfo.accent} />
          <Text variant="labelLarge" style={[styles.baseOfferTitle, { color: colors.title }]} numberOfLines={1}>
            {typeInfo.shortLabel}
          </Text>
        </View>
        <Text variant="titleMedium" style={[styles.baseOfferPrice, { color: colors.title }]}>
          {formatMoney(item.precio)}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.muted }} numberOfLines={1}>
          {formatCapacity(item)}
        </Text>
        {item.comentario ? (
          <Text variant="bodySmall" style={[styles.baseOfferComment, { color: colors.copy }]} numberOfLines={2}>
            {item.comentario}
          </Text>
        ) : null}
      </Surface>
    </Pressable>
  );
};

const PriceDialog = ({
  baseOptions,
  canCreateIndependent,
  colors,
  currentUserId,
  editingPrice,
  onDismiss,
  onSaved,
  visible,
}) => {
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [selectedBaseId, setSelectedBaseId] = React.useState(null);
  const [precio, setPrecio] = React.useState("");
  const [type, setType] = React.useState("megas");
  const [megas, setMegas] = React.useState("");
  const [comentario, setComentario] = React.useState("");
  const [detalles, setDetalles] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [typeMenuVisible, setTypeMenuVisible] = React.useState(false);

  const selectedBase = React.useMemo(
    () => baseOptions.find((item) => item._id === selectedBaseId) || null,
    [baseOptions, selectedBaseId],
  );
  const currentTypeInfo = getTypeInfo(type);
  const measured = isMeasuredType(type);
  const isEditing = Boolean(editingPrice?._id);
  const canEditBusinessFields = !selectedBaseId;
  const dialogWidth = Math.min(windowWidth - 24, 760);
  const maxHeight = Math.max(460, windowHeight - Math.max(insets.top, 12) - Math.max(insets.bottom, 12) - 24);
  const baseOffersLayout = React.useMemo(() => getBaseOffersLayout(dialogWidth), [dialogWidth]);

  React.useEffect(() => {
    if (!visible) return;
    setSelectedBaseId(editingPrice?.heredaDe || null);
    setPrecio(editingPrice?.precio != null ? String(editingPrice.precio) : "");
    setType(editingPrice?.type || "megas");
    setMegas(editingPrice?.megas ? String(editingPrice.megas) : "");
    setComentario(editingPrice?.comentario || "");
    setDetalles(editingPrice?.detalles || "");
    setLoading(false);
  }, [editingPrice, visible]);

  React.useEffect(() => {
    if (!selectedBase) return;
    setType(selectedBase.type || "megas");
    setMegas(selectedBase.megas ? String(selectedBase.megas) : "");
    setComentario(selectedBase.comentario || "");
    setDetalles(selectedBase.detalles || "");
  }, [selectedBase]);

  const resetBaseSelection = React.useCallback(() => {
    setSelectedBaseId(null);
    setType("megas");
    setMegas("");
    setComentario("");
    setDetalles("");
  }, []);

  const validate = React.useCallback(() => {
    const priceValue = Number(precio);
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      Alert.alert("Revisa el precio", "Indica el importe que se cobrara por esta oferta.");
      return false;
    }

    if (!canCreateIndependent && !selectedBaseId) {
      Alert.alert("Selecciona una oferta base", "Elige una oferta oficial y define tu precio de venta.");
      return false;
    }

    if (!type) {
      Alert.alert("Selecciona el servicio", "Indica para que servicio se usara esta oferta.");
      return false;
    }

    if (measured) {
      const megasValue = Number(megas);
      if (!Number.isFinite(megasValue) || megasValue <= 0) {
        Alert.alert("Revisa la capacidad", "Indica la cantidad de MB incluida en la oferta.");
        return false;
      }
    }

    if (!selectedBase && !comentario.trim()) {
      Alert.alert("Agrega una descripcion", "Escribe un mensaje corto para que el equipo identifique esta oferta.");
      return false;
    }

    return true;
  }, [canCreateIndependent, comentario, measured, megas, precio, selectedBase, selectedBaseId, type]);

  const handleSave = React.useCallback(() => {
    if (!validate()) return;

    setLoading(true);
    const payload = {
      userId: isEditing ? editingPrice?.userId || currentUserId : currentUserId,
      precio: Number(precio),
      type,
      megas: measured ? Number(megas) : null,
      comentario: selectedBase ? selectedBase.comentario || "" : comentario.trim(),
      detalles: selectedBase ? selectedBase.detalles || "" : detalles.trim(),
      heredaDe: selectedBaseId || null,
    };

    const callback = (firstArg, secondArg) => {
      const { error, result } = normalizeMethodResponse(firstArg, secondArg);
      setLoading(false);
      if (error || (!result && !isEditing)) {
        Alert.alert("No se pudo guardar", error?.reason || error?.message || "Intenta nuevamente en unos segundos.");
        return;
      }
      onSaved?.();
      onDismiss();
    };

    if (isEditing) {
      PreciosCollection.update(editingPrice._id, { $set: payload }, callback);
      return;
    }

    PreciosCollection.insert(payload, callback);
  }, [comentario, currentUserId, detalles, editingPrice, isEditing, measured, megas, onDismiss, onSaved, precio, selectedBase, selectedBaseId, type, validate]);

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={loading ? undefined : onDismiss}
        style={[styles.dialog, { width: dialogWidth, maxHeight }]}
      >
        {colors.isDark ? (
          <BlurView
            experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
            intensity={34}
            renderToHardwareTextureAndroid={true}
            style={styles.dialogBlurLayer}
            tint="dark"
          />
        ) : (
          <BlurView
            experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
            intensity={34}
            renderToHardwareTextureAndroid={true}
            style={styles.dialogBlurLayer}
            tint="light"
          />
        )}
        <View pointerEvents="none" style={[styles.dialogGlassOverlay, { backgroundColor: colors.dialogOverlay }]} />
        <View style={styles.dialogHeader}>
          <View>
            <Text variant="titleLarge" style={[styles.dialogTitle, { color: colors.title }]}>{isEditing ? "Editar oferta" : "Nueva oferta"}</Text>
            <Text variant="bodySmall" style={{ color: colors.muted }}>
              {isEditing ? "Ajusta el importe o la informacion visible de la oferta." : "Define como se cobrara el servicio a tus clientes."}
            </Text>
          </View>
          <IconButton icon="close" iconColor={colors.muted} onPress={onDismiss} disabled={loading} />
        </View>

        <Dialog.ScrollArea style={[styles.dialogScrollArea, { maxHeight: maxHeight - 150 }]}> 
          <ScrollView contentContainerStyle={styles.dialogContent} showsVerticalScrollIndicator={false}>
            <SectionHeader
              colors={colors}
              icon="source-branch"
              title="Oferta base"
              subtitle={isEditing ? "La referencia de la oferta se conserva para mantener el historial claro." : canCreateIndependent ? "Puedes crear una oferta nueva o partir de una existente." : "Elige una oferta oficial para fijar tu precio propio."}
            />

            {canCreateIndependent ? (
              <Pressable onPress={resetBaseSelection} disabled={isEditing}>
                <Surface
                  style={[
                    styles.noBaseCard,
                    {
                      backgroundColor: selectedBase ? colors.cardSoft : colors.chipSelected,
                      borderColor: selectedBase ? colors.border : "rgba(37, 99, 235, 0.34)",
                    },
                  ]}
                  elevation={0}
                >
                  <MaterialCommunityIcons name="plus-circle-outline" size={22} color="#2563eb" />
                  <View style={styles.noBaseCopy}>
                    <Text variant="labelLarge" style={{ color: colors.title, fontWeight: "800" }}>
                      {NO_BASE_OPTION.label}
                    </Text>
                    <Text variant="bodySmall" style={{ color: colors.muted }}>
                      Crea una oferta completa desde cero.
                    </Text>
                  </View>
                </Surface>
              </Pressable>
            ) : null}

            {baseOptions.length ? (
              <View style={[styles.baseOffersGrid, { gap: baseOffersLayout.gap }]}>
                {baseOptions.map((item) => (
                  <View
                    key={item._id}
                    style={[
                      styles.baseOfferCell,
                      { width: baseOffersLayout.cardWidth },
                    ]}
                  >
                    <BaseOfferCard
                      colors={colors}
                      item={item}
                      selected={selectedBaseId === item._id}
                      onPress={() => !isEditing && setSelectedBaseId(item._id)}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <Surface style={[styles.emptyBaseCard, { backgroundColor: colors.cardSoft, borderColor: colors.border }]} elevation={0}>
                <MaterialCommunityIcons name="playlist-remove" size={24} color={colors.muted} />
                <Text variant="bodyMedium" style={{ color: colors.copy }}>
                  No hay ofertas oficiales disponibles para crear un precio nuevo.
                </Text>
              </Surface>
            )}

            <Divider style={[styles.dialogDivider, { backgroundColor: colors.border }]} />

            <SectionHeader
              colors={colors}
              icon="cash-edit"
              title="Precio de venta"
              subtitle={selectedBase ? "Solo cambia el importe que cobrara tu administracion." : "Completa los datos de la oferta que se mostrara al vender."}
            />

            <PaperTextInput
              mode="outlined"
              label="Importe en CUP"
              keyboardType="numeric"
              value={precio}
              onChangeText={setPrecio}
              left={<PaperTextInput.Icon icon="cash" />}
              style={[styles.formInput, { backgroundColor: colors.input }]}
            />

            <View style={styles.typeSelectorWrap}>
              <Button
                mode="outlined"
                icon={currentTypeInfo.icon}
                disabled={!canEditBusinessFields}
                onPress={() => setTypeMenuVisible(true)}
                style={styles.typeSelectorButton}
                contentStyle={styles.typeSelectorContent}
              >
                {currentTypeInfo.label}
              </Button>
              <Portal>
                <Dialog visible={typeMenuVisible} onDismiss={() => setTypeMenuVisible(false)} style={[styles.typeDialog, { backgroundColor: colors.card }]}> 
                  <Dialog.Title>Selecciona el servicio</Dialog.Title>
                  <Dialog.Content style={styles.typeDialogContent}>
                    {PRICE_TYPES.map((item) => (
                      <Pressable
                        key={item.value}
                        onPress={() => {
                          setType(item.value);
                          if (!item.measured) setMegas("");
                          setTypeMenuVisible(false);
                        }}
                      >
                        <View style={styles.typeOptionRow}>
                          <MaterialCommunityIcons name={item.icon} size={22} color={item.accent} />
                          <Text variant="bodyLarge" style={{ color: colors.title, fontWeight: "700" }}>
                            {item.label}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </Dialog.Content>
                </Dialog>
              </Portal>
            </View>

            {measured ? (
              <PaperTextInput
                mode="outlined"
                label="Capacidad en MB"
                keyboardType="numeric"
                value={megas}
                onChangeText={setMegas}
                disabled={!canEditBusinessFields}
                left={<PaperTextInput.Icon icon="database-outline" />}
                style={[styles.formInput, { backgroundColor: colors.input }]}
              />
            ) : (
              <Surface style={[styles.unlimitedNotice, { backgroundColor: colors.cardSoft, borderColor: colors.border }]} elevation={0}>
                <MaterialCommunityIcons name="infinity" size={20} color={currentTypeInfo.accent} />
                <Text variant="bodyMedium" style={{ color: colors.copy }}>
                  Esta oferta se vende como servicio ilimitado por 30 dias.
                </Text>
              </Surface>
            )}

            <PaperTextInput
              mode="outlined"
              label="Mensaje comercial"
              value={comentario}
              onChangeText={setComentario}
              disabled={!canEditBusinessFields}
              multiline
              style={[styles.formInput, { backgroundColor: colors.input }]}
            />
            <HelperText type="info" visible style={{ color: colors.muted }}>
              Usa una descripcion breve que ayude a reconocer la oferta al vender.
            </HelperText>

            <PaperTextInput
              mode="outlined"
              label="Condiciones visibles"
              value={detalles}
              onChangeText={setDetalles}
              disabled={!canEditBusinessFields}
              multiline
              style={[styles.formInput, { backgroundColor: colors.input }]}
            />
          </ScrollView>
        </Dialog.ScrollArea>

        <Dialog.Actions style={styles.dialogActions}>
          <Button mode="text" onPress={onDismiss} disabled={loading}>Cancelar</Button>
          <Button mode="contained" icon="content-save-outline" onPress={handleSave} loading={loading} disabled={loading}>
            {isEditing ? "Guardar cambios" : "Guardar oferta"}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const PreciosScreen = () => {
  const theme = useTheme();
  const colors = React.useMemo(() => buildPalette(theme), [theme]);
  const { width } = useWindowDimensions();
  const layout = React.useMemo(() => getPricesLayout(width), [width]);
  const headerInset = useAppHeaderContentInset();
  const dataReady = useDeferredScreenData();
  const [search, setSearch] = React.useState("");
  const [selectedType, setSelectedType] = React.useState(ALL_FILTER);
  const [selectedAdmin, setSelectedAdmin] = React.useState(ALL_FILTER);
  const [expandedIds, setExpandedIds] = React.useState({});
  const [dialogVisible, setDialogVisible] = React.useState(false);
  const [editingPrice, setEditingPrice] = React.useState(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const currentUserId = Meteor.useTracker(() => Meteor.userId());
  const currentUser = Meteor.useTracker(() => Meteor.user());
  const currentUsername = currentUser?.username;
  const isAdmin = currentUser?.profile?.role === "admin" || currentUsername === ADMIN_PRINCIPAL_USERNAME;
  const isPrincipal = currentUsername === ADMIN_PRINCIPAL_USERNAME;
  const isCompact = width < 760;

  const data = Meteor.useTracker(() => {
    if (!dataReady || !currentUserId) {
      return {
        adminPrincipal: null,
        availableBaseOffers: [],
        officialOffers: [],
        prices: [],
        ready: false,
      };
    }

    const principalUserHandle = Meteor.subscribe(
      "user",
      { username: ADMIN_PRINCIPAL_USERNAME },
      { fields: USER_FIELDS },
    );
    const adminPrincipal = Meteor.users.findOne(
      { username: ADMIN_PRINCIPAL_USERNAME },
      { fields: USER_FIELDS },
    );
    const principalId = adminPrincipal?._id;
    const pricesSelector = isPrincipal ? {} : { userId: currentUserId };
    const pricesHandle = Meteor.subscribe("precios", pricesSelector, {
      fields: PRICE_FIELDS,
      sort: { userId: 1, type: 1, precio: 1 },
    });
    const officialHandle = principalId
      ? Meteor.subscribe("precios", { userId: principalId }, { fields: PRICE_FIELDS, sort: { type: 1, megas: 1 } })
      : null;

    const prices = PreciosCollection.find(pricesSelector, {
      fields: PRICE_FIELDS,
      sort: { userId: 1, type: 1, precio: 1 },
    }).fetch();
    const officialOffers = principalId
      ? PreciosCollection.find(
          { userId: principalId },
          { fields: PRICE_FIELDS, sort: { type: 1, megas: 1, precio: 1 } },
        ).fetch()
      : [];
    const ownPrices = PreciosCollection.find(
      { userId: currentUserId },
      { fields: PRICE_FIELDS },
    ).fetch();
    const priceOwnerIds = prices.map((item) => item.userId).filter(Boolean);
    const userIdsToLoad = Array.from(
      new Set([currentUserId, principalId, ...priceOwnerIds].filter(Boolean)),
    );
    const usersHandle = userIdsToLoad.length
      ? Meteor.subscribe("user", { _id: { $in: userIdsToLoad } }, { fields: USER_FIELDS })
      : null;
    const inheritedIds = new Set(
      ownPrices.map((item) => item.heredaDe).filter(Boolean),
    );
    const availableBaseOffers = officialOffers.filter(
      (item) => !inheritedIds.has(item._id),
    );

    return {
      adminPrincipal,
      availableBaseOffers,
      officialOffers,
      prices,
      ready:
        principalUserHandle.ready() &&
        pricesHandle.ready() &&
        (!usersHandle || usersHandle.ready()) &&
        (!officialHandle || officialHandle.ready()),
    };
  }, [currentUserId, dataReady, isPrincipal, refreshKey]);

  const typeOptions = React.useMemo(() => {
    const values = new Set(data.prices.map((item) => item.type).filter(Boolean));
    if (!values.size) return PRICE_TYPES;
    return PRICE_TYPES.filter((item) => values.has(item.value));
  }, [data.prices]);

  const filteredPrices = React.useMemo(() => {
    const query = normalizeText(search);
    return data.prices.filter((item) => {
      if (selectedType !== ALL_FILTER && item.type !== selectedType) return false;
      if (selectedAdmin !== ALL_FILTER && item.userId !== selectedAdmin) return false;
      if (!query) return true;
      const owner = getUserDisplayName(item.userId);
      return [
        getTypeInfo(item.type).label,
        formatCapacity(item),
        formatMoney(item.precio),
        item.comentario,
        item.detalles,
        owner,
      ].some((value) => normalizeText(value).includes(query));
    });
  }, [data.prices, search, selectedAdmin, selectedType]);

  const adminOptions = React.useMemo(() => {
    const adminIds = Array.from(new Set(data.prices.map((item) => item.userId).filter(Boolean)));
    return adminIds
      .map((userId) => ({ userId, name: getUserDisplayName(userId) }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [data.prices]);

  const basePriceMap = React.useMemo(() => {
    const map = new Map();
    [...data.officialOffers, ...data.prices].forEach((item) => {
      if (item?._id) map.set(item._id, item);
    });
    return map;
  }, [data.officialOffers, data.prices]);

  const groupedPrices = React.useMemo(() => {
    const groups = new Map();
    filteredPrices.forEach((item) => {
      const userId = item.userId || "sin-responsable";
      if (!groups.has(userId)) {
        groups.set(userId, {
          items: [],
          name: getUserDisplayName(item.userId),
          userId,
        });
      }
      groups.get(userId).items.push(item);
    });

    return Array.from(groups.values()).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }, [filteredPrices]);

  const metrics = React.useMemo(() => {
    const ownCount = data.prices.filter((item) => item.userId === currentUserId).length;
    const inheritedCount = data.prices.filter((item) => Boolean(item.heredaDe)).length;
    const unlimitedCount = data.prices.filter((item) => !isMeasuredType(item.type)).length;
    return { inheritedCount, ownCount, total: data.prices.length, unlimitedCount };
  }, [currentUserId, data.prices]);

  const handleDelete = React.useCallback((item) => {
    const isOwner = item.userId === currentUserId;
    if (!isPrincipal && !isOwner) {
      Alert.alert("Sin permiso", "Solo puedes eliminar ofertas creadas por tu administracion.");
      return;
    }

    Alert.alert(
      "Eliminar oferta",
      `Se eliminara ${getTypeInfo(item.type).shortLabel} por ${formatMoney(item.precio)}.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            PreciosCollection.remove(item._id, (firstArg, secondArg) => {
              const { error } = normalizeMethodResponse(firstArg, secondArg);
              if (error) {
                Alert.alert("No se pudo eliminar", error.reason || error.message || "Intenta nuevamente.");
              }
            });
          },
        },
      ],
    );
  }, [currentUserId, isPrincipal]);

  const handleToggleCard = React.useCallback((priceId) => {
    animateLayoutChange();
    setExpandedIds((current) => ({
      ...current,
      [priceId]: !current[priceId],
    }));
  }, []);

  const handleOpenCreateDialog = React.useCallback(() => {
    setEditingPrice(null);
    setDialogVisible(true);
  }, []);

  const handleOpenEditDialog = React.useCallback((item) => {
    setEditingPrice(item);
    setDialogVisible(true);
  }, []);

  const handleCloseDialog = React.useCallback(() => {
    setDialogVisible(false);
    setEditingPrice(null);
  }, []);

  const canDeletePrice = React.useCallback(
    (item) => isPrincipal || item.userId === currentUserId,
    [currentUserId, isPrincipal],
  );

  const canEditPrice = React.useCallback(
    (item) => isPrincipal || item.userId === currentUserId,
    [currentUserId, isPrincipal],
  );

  if (!dataReady || !data.ready) {
    return (
      <Surface style={[styles.screen, { backgroundColor: colors.screen }]}> 
        <AppHeader title="Precios" subtitle="Ofertas de servicios" backHref="/(normal)/Main" showBackButton />
        <View style={styles.loadingState}>
          <ActivityIndicator />
          <Text variant="bodyMedium" style={{ color: colors.muted }}>Cargando ofertas...</Text>
        </View>
      </Surface>
    );
  }

  if (!isAdmin) {
    return (
      <Surface style={[styles.screen, { backgroundColor: colors.screen }]}> 
        <AppHeader title="Precios" subtitle="Ofertas de servicios" backHref="/(normal)/Main" showBackButton />
        <View style={styles.restrictedState}>
          <MaterialCommunityIcons name="shield-lock-outline" size={42} color={colors.muted} />
          <Text variant="titleLarge" style={{ color: colors.title, fontWeight: "800" }}>Acceso para administradores</Text>
          <Text variant="bodyMedium" style={[styles.restrictedCopy, { color: colors.muted }]}>Esta seccion permite preparar las ofertas que usara tu equipo al vender servicios.</Text>
        </View>
      </Surface>
    );
  }

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Surface style={[styles.heroCard, { backgroundColor: colors.hero, borderColor: colors.border }]} elevation={0}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroCopy}>
            <Text variant="labelLarge" style={[styles.eyebrow, { color: "#2563eb" }]}>Gestion de ofertas</Text>
            <Text variant="headlineSmall" style={[styles.heroTitle, { color: colors.title }]}>Precios listos para vender</Text>
            <Text variant="bodyMedium" style={[styles.heroDescription, { color: colors.copy }]}>Define el importe de cada paquete para que el equipo pueda activar Proxy y VPN con importes claros.</Text>
          </View>
          <Button mode="contained" icon="plus" onPress={handleOpenCreateDialog} style={styles.heroButton}>
            Nueva oferta
          </Button>
        </View>

        <View style={[styles.businessNote, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <MaterialCommunityIcons name={isPrincipal ? "shield-crown-outline" : "source-branch"} size={22} color="#2563eb" />
          <Text variant="bodyMedium" style={[styles.businessNoteText, { color: colors.copy }]}> 
            {isPrincipal
              ? "Puedes crear ofertas oficiales y revisar los precios preparados por cada administrador."
              : "Elige una oferta oficial, escribe tu precio de venta y guardala para tu administracion."}
          </Text>
        </View>

        <View style={[styles.metricsGrid, isCompact && styles.metricsGridCompact]}>
          <SummaryMetric colors={colors} icon="tag-multiple-outline" label="Ofertas visibles" value={metrics.total} />
          <SummaryMetric colors={colors} icon="account-check-outline" label="Propias" value={metrics.ownCount} />
          <SummaryMetric colors={colors} icon="source-branch" label="Basadas en oficiales" value={metrics.inheritedCount} />
          <SummaryMetric colors={colors} icon="infinity" label="Ilimitadas" value={metrics.unlimitedCount} />
        </View>
      </Surface>

      <Surface style={[styles.filtersCard, { backgroundColor: colors.card, borderColor: colors.border }]} elevation={0}>
        <SearchInput colors={colors} value={search} onChangeText={setSearch} />
        <FilterRow colors={colors} selected={selectedType} types={typeOptions} onSelect={setSelectedType} />
        <AdminFilterRow
          admins={adminOptions}
          colors={colors}
          selected={selectedAdmin}
          onSelect={setSelectedAdmin}
        />
      </Surface>
    </View>
  );

  return (
    <Surface style={[styles.screen, { backgroundColor: colors.screen }]}> 
      <AppHeader
        title="Precios"
        subtitle={isPrincipal ? "Ofertas generales y de administradores" : "Ofertas de tu administracion"}
        backHref="/(normal)/Main"
        showBackButton
        backgroundColor={DEFAULT_HEADER_COLOR}
        overlapContent
        actions={
          <IconButton icon="plus" iconColor="#fff" onPress={handleOpenCreateDialog} />
        }
      />
      <FlatList
        data={groupedPrices}
        keyExtractor={(item) => item.userId}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingHorizontal: layout.listPaddingHorizontal,
            paddingTop: headerInset + 16,
          },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <UserPricesGroup
            basePriceMap={basePriceMap}
            canDeletePrice={canDeletePrice}
            canEditPrice={canEditPrice}
            colors={colors}
            expandedIds={expandedIds}
            group={item}
            layout={layout}
            onDelete={handleDelete}
            onEdit={handleOpenEditDialog}
            onToggleCard={handleToggleCard}
          />
        )}
        ListEmptyComponent={
          <Surface style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]} elevation={0}>
            <MaterialCommunityIcons name="playlist-plus" size={34} color={colors.muted} />
            <Text variant="titleMedium" style={{ color: colors.title, fontWeight: "800" }}>Sin ofertas para mostrar</Text>
            <Text variant="bodyMedium" style={[styles.emptyCopy, { color: colors.muted }]}>Crea una nueva oferta o ajusta los filtros para ver mas resultados.</Text>
          </Surface>
        }
      />

      <PriceDialog
        visible={dialogVisible}
        colors={colors}
        currentUserId={currentUserId}
        canCreateIndependent={isPrincipal}
        editingPrice={editingPrice}
        baseOptions={editingPrice ? data.officialOffers : isPrincipal ? data.officialOffers : data.availableBaseOffers}
        onDismiss={handleCloseDialog}
        onSaved={() => setRefreshKey((value) => value + 1)}
      />
    </Surface>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loadingState: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
  },
  restrictedState: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 28,
  },
  restrictedCopy: {
    lineHeight: 22,
    textAlign: "center",
  },
  listContent: {
    paddingBottom: 32,
  },
  listHeader: {
    gap: 14,
    marginBottom: 12,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    padding: 18,
  },
  heroTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
  },
  heroCopy: {
    flex: 1,
    gap: 5,
  },
  eyebrow: {
    fontWeight: "900",
    textTransform: "uppercase",
  },
  heroTitle: {
    fontWeight: "900",
  },
  heroDescription: {
    lineHeight: 21,
  },
  heroButton: {
    borderRadius: 999,
  },
  businessNote: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    padding: 12,
  },
  businessNoteText: {
    flex: 1,
    lineHeight: 20,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  metricsGridCompact: {
    flexWrap: "wrap",
  },
  metricCard: {
    borderRadius: 18,
    flex: 1,
    gap: 3,
    minWidth: 120,
    padding: 12,
  },
  metricValue: {
    fontWeight: "900",
  },
  metricLabel: {
    fontWeight: "700",
  },
  filtersCard: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 12,
  },
  searchSurface: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    minHeight: 46,
    overflow: "hidden",
  },
  searchIcon: {
    margin: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 0,
  },
  filterRow: {
    gap: 8,
    paddingRight: 12,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
  },
  priceCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 7,
    marginBottom: 0,
    padding: 10,
  },
  priceCardCompact: {
    borderRadius: 16,
    gap: 6,
    padding: 9,
  },
  priceCardExpanded: {
    transform: [{ translateY: -2 }],
  },
  priceCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  priceIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  priceHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  priceTitle: {
    fontWeight: "900",
  },
  priceSubtitle: {
    marginTop: 1,
  },
  priceAmountChip: {
    borderRadius: 999,
  },
  cardMenuButton: {
    height: 30,
    margin: 0,
    width: 30,
  },
  cardMenuContent: {
    borderRadius: 18,
    overflow: "hidden",
  },
  priceCompareRow: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    padding: 8,
  },
  priceCompareItem: {
    flex: 1,
    gap: 2,
  },
  compareLabel: {
    fontWeight: "800",
    textTransform: "uppercase",
  },
  compareValue: {
    fontWeight: "900",
  },
  priceMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaPill: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    maxWidth: "100%",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaPillText: {
    fontWeight: "700",
  },
  cardComment: {
    lineHeight: 21,
  },
  cardDetails: {
    lineHeight: 19,
  },
  expandedDetails: {
    gap: 8,
  },
  detailBlock: {
    borderRadius: 14,
    gap: 4,
    padding: 8,
  },
  detailBlockLabel: {
    fontWeight: "900",
    textTransform: "uppercase",
  },
  tapHintRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
  },
  priceFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  emptyState: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    marginTop: 10,
    padding: 24,
  },
  emptyCopy: {
    lineHeight: 21,
    textAlign: "center",
  },
  userGroup: {
    marginBottom: 18,
  },
  userGroupHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  userGroupAvatar: {
    alignItems: "center",
    borderRadius: 14,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  userGroupCopy: {
    flex: 1,
  },
  userGroupTitle: {
    fontWeight: "900",
  },
  userGroupChip: {
    borderRadius: 999,
  },
  responsiveCardsGrid: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  priceCardCell: {
    width: "100%",
  },
  dialog: {
    alignSelf: "center",
    backgroundColor: "transparent",
    borderRadius: 26,
    overflow: "hidden",
  },
  dialogBlurLayer: {
    bottom: -24,
    left: -24,
    position: "absolute",
    right: -24,
    top: -24,
  },
  dialogGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  dialogTitle: {
    fontWeight: "900",
  },
  dialogScrollArea: {
    borderTopWidth: 0,
    paddingHorizontal: 0,
  },
  dialogContent: {
    gap: 12,
    padding: 18,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  sectionIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  sectionCopy: {
    flex: 1,
  },
  sectionTitle: {
    fontWeight: "900",
  },
  sectionSubtitle: {
    lineHeight: 18,
  },
  noBaseCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  noBaseCopy: {
    flex: 1,
  },
  baseOffersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  baseOfferCell: {
    minWidth: 0,
  },
  baseOfferCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 5,
    padding: 12,
    width: "100%",
  },
  baseOfferHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  baseOfferTitle: {
    flex: 1,
    fontWeight: "900",
  },
  baseOfferPrice: {
    fontWeight: "900",
  },
  baseOfferComment: {
    lineHeight: 18,
    marginTop: 2,
  },
  emptyBaseCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  dialogDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  formInput: {
    marginTop: 2,
  },
  typeSelectorWrap: {
    marginTop: 2,
  },
  typeSelectorButton: {
    borderRadius: 14,
  },
  typeSelectorContent: {
    justifyContent: "flex-start",
    minHeight: 48,
  },
  typeDialog: {
    alignSelf: "center",
    borderRadius: 22,
    maxWidth: 460,
    width: "92%",
  },
  typeDialogContent: {
    gap: 4,
  },
  typeOptionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
  },
  unlimitedNotice: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  dialogActions: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
});

export default PreciosScreen;
