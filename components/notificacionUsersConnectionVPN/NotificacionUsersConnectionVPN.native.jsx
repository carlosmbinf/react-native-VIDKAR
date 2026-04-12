import MeteorBase from "@meteorrn/core";
import { router } from "expo-router";
import React from "react";
import {
    Alert,
    FlatList,
    StyleSheet,
    TextInput,
    View,
    useWindowDimensions
} from "react-native";
import {
    ActivityIndicator,
    Appbar,
    Button,
    Chip,
    IconButton,
    Snackbar,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";

import { NotificacionUsersConectadosVPNCollection } from "../collections/collections";
import AppHeader from "../Header/AppHeader";
import NotificacionRuleDialog from "./NotificacionRuleDialog.native";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const formatDate = (value) => {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch (_error) {
    return date.toLocaleString("es-ES");
  }
};

const getUserLabel = (user) => {
  const firstName =
    typeof user?.profile?.firstName === "string"
      ? user.profile.firstName.trim()
      : "";
  const lastName =
    typeof user?.profile?.lastName === "string"
      ? user.profile.lastName.trim()
      : "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (fullName) {
    return fullName;
  }

  return user?.username || "Usuario";
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const removeNotificationRule = (id) =>
  new Promise((resolve, reject) => {
    NotificacionUsersConectadosVPNCollection.remove(id, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });
  });

const resolveRuleTone = (isVpnActive) =>
  isVpnActive
    ? { accent: "#2563eb", text: "#1d4ed8" }
    : { accent: "#64748b", text: "#475569" };

const SearchInput = ({ colors, onChangeText, placeholder, value }) => {
  const inputRef = React.useRef(null);

  return (
    <Surface
      elevation={0}
      style={[styles.searchInputSurface, { backgroundColor: colors.surface }]}
    >
      <IconButton
        icon="magnify"
        iconColor={colors.icon}
        onPress={() => inputRef.current?.focus()}
        size={20}
        style={styles.searchLeadingIcon}
      />
      <TextInput
        ref={inputRef}
        cursorColor={colors.cursor}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        selectionColor={colors.selection}
        style={[styles.searchInput, { color: colors.text }]}
        value={value}
      />
      {value ? (
        <IconButton
          icon="close"
          iconColor={colors.icon}
          onPress={() => onChangeText("")}
          size={18}
          style={styles.searchTrailingIcon}
        />
      ) : null}
    </Surface>
  );
};

const SummaryCard = ({ colors, compact, label, tone, value }) => (
  <Surface
    elevation={0}
    style={[
      styles.summaryCard,
      compact && styles.summaryCardCompact,
      { backgroundColor: colors.surface },
    ]}
  >
    <Text
      style={[styles.summaryLabel, { color: colors.label }]}
      variant="labelMedium"
    >
      {label}
    </Text>
    <Text
      style={[styles.summaryValue, tone ? { color: tone } : null]}
      variant="headlineSmall"
    >
      {value}
    </Text>
  </Surface>
);

const EmptyState = ({ colors, hasRules, onClearFilters }) => (
  <Surface
    elevation={0}
    style={[styles.emptyStateCard, { backgroundColor: colors.surface }]}
  >
    <View style={[styles.emptyIconWrap, { backgroundColor: colors.iconWrap }]}>
      <IconButton icon="bell-off-outline" iconColor={colors.icon} size={34} />
    </View>
    <Text
      style={[styles.emptyTitle, { color: colors.title }]}
      variant="titleMedium"
    >
      {hasRules ? "No hay coincidencias" : "No hay reglas configuradas"}
    </Text>
    <Text
      style={[styles.emptyCopy, { color: colors.copy }]}
      variant="bodyMedium"
    >
      {hasRules
        ? "Ajusta la búsqueda para volver a ver notificaciones registradas."
        : "Crea una regla para avisar automáticamente cuando un usuario VPN se conecte o se desconecte."}
    </Text>
    {hasRules ? (
      <Button mode="outlined" onPress={onClearFilters}>
        Limpiar búsqueda
      </Button>
    ) : null}
  </Surface>
);

const NotificacionRuleCard = ({
  colors,
  item,
  canDelete,
  canEdit,
  onDelete,
  onEdit,
  showAdmin,
}) => (
  <Surface
    elevation={0}
    style={[styles.ruleCard, { backgroundColor: colors.surface }]}
  >
    <View style={styles.ruleContentMinimal}>
      <View style={styles.ruleTopRow}>
        <View style={styles.ruleIdentityCol}>
          <Text
            style={[styles.ruleTitle, { color: colors.title }]}
            variant="titleMedium"
          >
            {item.userDisplay}
          </Text>
          <Text
            style={[styles.ruleSubtitle, { color: colors.copy }]}
            variant="bodySmall"
          >
            {item.userFullName}
          </Text>
        </View>

        <Chip
          compact
          style={[
            styles.headerChip,
            { backgroundColor: colors.secondarySurface },
          ]}
          textStyle={{ color: item.tone.text }}
        >
          {item.userVpnActive ? "VPN activa" : "VPN"}
        </Chip>
      </View>

      <View style={styles.ruleInfoGrid}>
        <View style={styles.ruleInfoBlock}>
          <Text
            style={[styles.ruleInfoLabel, { color: colors.label }]}
            variant="labelSmall"
          >
            Responsable
          </Text>
          <Text
            style={[styles.ruleInfoValue, { color: colors.title }]}
            variant="bodyMedium"
          >
            {item.adminDisplay}
          </Text>
        </View>

        <View style={styles.ruleInfoBlock}>
          <Text
            style={[styles.ruleInfoLabel, { color: colors.label }]}
            variant="labelSmall"
          >
            Fecha
          </Text>
          <Text
            style={[styles.ruleInfoValue, { color: colors.title }]}
            variant="bodyMedium"
          >
            {item.createdAtDisplay}
          </Text>
        </View>
      </View>

      <View style={styles.messageCompactList}>
        <View style={styles.messageCompactRow}>
          <Text
            style={[styles.messageCompactLabel, { color: colors.label }]}
            variant="labelSmall"
          >
            Conecta
          </Text>
          <Text
            numberOfLines={2}
            style={[styles.messageCompactValue, { color: colors.copy }]}
            variant="bodySmall"
          >
            {item.mensajeaenviarConnected}
          </Text>
        </View>

        <View style={styles.messageCompactRow}>
          <Text
            style={[styles.messageCompactLabel, { color: colors.label }]}
            variant="labelSmall"
          >
            Desconecta
          </Text>
          <Text
            numberOfLines={2}
            style={[styles.messageCompactValue, { color: colors.copy }]}
            variant="bodySmall"
          >
            {item.mensajeaenviarDisconnected}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooterMinimal}>
        <Text
          style={[styles.footerHint, { color: colors.label }]}
          variant="bodySmall"
        >
          {showAdmin
            ? "Puedes editar mensajes y reasignar responsable."
            : "Puedes editar mensajes de tus propias reglas."}
        </Text>
        <View style={styles.cardActionsRow}>
          {canEdit ? (
            <Button
              compact
              icon="pencil-outline"
              mode="text"
              onPress={() => onEdit(item)}
            >
              Editar
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              compact
              icon="delete-outline"
              mode="text"
              onPress={() => onDelete(item)}
            >
              Eliminar
            </Button>
          ) : null}
        </View>
      </View>
    </View>
  </Surface>
);

const NotificacionUsersConnectionVPN = () => {
  const theme = useTheme();
  const isDark = theme.dark;
  const { width: windowWidth } = useWindowDimensions();
  const isCompactScreen = windowWidth < 580;
  const palette = React.useMemo(
    () => ({
      screen: isDark ? "#020617" : "#eef3fb",
      loadingCopy: isDark ? "#94a3b8" : "#64748b",
      heroPanel: isDark ? "#0b1220" : "#0f172a",
      summarySurface: isDark
        ? "rgba(15, 23, 42, 0.88)"
        : "rgba(255, 255, 255, 0.9)",
      summaryLabel: isDark ? "#94a3b8" : "#64748b",
      filtersPanel: isDark
        ? "rgba(15, 23, 42, 0.9)"
        : "rgba(255, 255, 255, 0.88)",
      searchSurface: isDark ? "rgba(30, 41, 59, 0.92)" : "#ffffff",
      searchText: isDark ? "#e2e8f0" : "#0f172a",
      searchPlaceholder: isDark ? "#94a3b8" : "#94a3b8",
      searchSelection: isDark
        ? "rgba(148, 163, 184, 0.24)"
        : "rgba(15, 23, 42, 0.2)",
      searchIcon: isDark ? "#cbd5e1" : "#64748b",
      cardSurface: isDark
        ? "rgba(15, 23, 42, 0.94)"
        : "rgba(255, 255, 255, 0.94)",
      secondarySurface: isDark
        ? "rgba(30, 41, 59, 0.86)"
        : "rgba(148, 163, 184, 0.08)",
      emptySurface: isDark
        ? "rgba(15, 23, 42, 0.94)"
        : "rgba(255, 255, 255, 0.9)",
      emptyIconWrap: isDark
        ? "rgba(51, 65, 85, 0.88)"
        : "rgba(148, 163, 184, 0.14)",
      title: isDark ? "#f8fafc" : "#0f172a",
      copy: isDark ? "#cbd5e1" : "#475569",
      label: isDark ? "#94a3b8" : "#64748b",
      icon: isDark ? "#cbd5e1" : "#64748b",
    }),
    [isDark],
  );

  const [searchQuery, setSearchQuery] = React.useState("");
  const [filtersVisible, setFiltersVisible] = React.useState(true);
  const [dialogVisible, setDialogVisible] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState(null);
  const [deletingIds, setDeletingIds] = React.useState([]);
  const [feedback, setFeedback] = React.useState({
    visible: false,
    message: "",
  });

  const { adminOptions, availableUsers, canManage, currentUser, ready, rules } =
    Meteor.useTracker(() => {
      const user = Meteor.user();
      const currentUserId = user?._id;
      const currentUsername = user?.username || "";
      const isGeneralAdmin = currentUsername === "carlosmbinf";
      const hasAdminAccess = user?.profile?.role === "admin" || isGeneralAdmin;

      if (!currentUserId) {
        return {
          adminOptions: [],
          availableUsers: [],
          canManage: false,
          currentUser: user,
          ready: false,
          rules: [],
        };
      }

      const ruleSelector = isGeneralAdmin
        ? {}
        : {
            adminIdSolicitud: currentUserId,
          };
      const ruleFields = {
        userIdConnected: 1,
        adminIdSolicitud: 1,
        mensajeaenviarConnected: 1,
        mensajeaenviarDisconnected: 1,
        fecha: 1,
      };
      const targetUserFields = {
        username: 1,
        profile: 1,
        vpn: 1,
        bloqueadoDesbloqueadoPor: 1,
      };
      const targetUserSelector = isGeneralAdmin
        ? {}
        : { bloqueadoDesbloqueadoPor: currentUserId };

      const rulesHandle = Meteor.subscribe(
        "notificacionUsersConnectionVPN",
        ruleSelector,
        {
          sort: { fecha: -1 },
          fields: ruleFields,
        },
      );
      const targetUsersHandle = Meteor.subscribe("user", targetUserSelector, {
        fields: targetUserFields,
      });
      const adminSelector = isGeneralAdmin ? {} : targetUserSelector;
      const adminHandle = Meteor.subscribe("user", adminSelector, {
        fields: targetUserFields,
      });

      const rawRules = NotificacionUsersConectadosVPNCollection.find(
        ruleSelector,
        {
          sort: { fecha: -1 },
          fields: ruleFields,
        },
      ).fetch();
      const identityIds = [
        ...new Set(
          rawRules
            .flatMap((rule) => [rule?.userIdConnected, rule?.adminIdSolicitud])
            .filter(Boolean),
        ),
      ];
      const identityHandle = identityIds.length
        ? Meteor.subscribe(
            "user",
            { _id: { $in: identityIds } },
            { fields: targetUserFields },
          )
        : null;

      const availableUsersDocs = Meteor.users
        .find(targetUserSelector, { fields: targetUserFields })
        .fetch()
        .filter((candidate) => candidate?._id !== currentUserId)
        .filter((candidate) => candidate?.profile?.role !== "admin");
      const adminDocs = Meteor.users
        .find(adminSelector, { fields: targetUserFields })
        .fetch();

      const ruleViewModels = rawRules.map((rule) => {
        const userDoc = Meteor.users.findOne(rule.userIdConnected);
        const adminDoc = Meteor.users.findOne(rule.adminIdSolicitud);

        return {
          ...rule,
          _id: rule._id,
          adminDisplay: adminDoc?.username || rule.adminIdSolicitud,
          createdAtDisplay: formatDate(rule?.fecha),
          searchBlob: [
            userDoc?.username,
            getUserLabel(userDoc),
            adminDoc?.username,
            rule?.mensajeaenviarConnected,
            rule?.mensajeaenviarDisconnected,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
          tone: resolveRuleTone(userDoc?.vpn === true),
          userDisplay: userDoc?.username || rule.userIdConnected,
          userFullName: getUserLabel(userDoc),
          userVpnActive: userDoc?.vpn === true,
        };
      });

      return {
        adminOptions: adminDocs,
        availableUsers: availableUsersDocs,
        canManage: hasAdminAccess,
        currentUser: user,
        ready:
          rulesHandle.ready() &&
          adminHandle.ready() &&
          targetUsersHandle.ready() &&
          (identityHandle ? identityHandle.ready() : true),
        rules: ruleViewModels,
      };
    });

  const isGeneralAdmin = currentUser?.username === "carlosmbinf";
  const filteredRules = React.useMemo(() => {
    const query = normalizeText(searchQuery);

    return rules.filter((item) =>
      !query ? true : item.searchBlob.includes(query),
    );
  }, [rules, searchQuery]);

  const summary = React.useMemo(() => {
    const uniqueUsers = new Set(
      rules.map((item) => item.userIdConnected).filter(Boolean),
    ).size;
    const uniqueAdmins = new Set(
      rules.map((item) => item.adminIdSolicitud).filter(Boolean),
    ).size;

    return {
      admins: uniqueAdmins,
      rules: rules.length,
      users: uniqueUsers,
    };
  }, [rules]);

  const clearFilters = React.useCallback(() => {
    setSearchQuery("");
  }, []);

  const showFeedback = React.useCallback((message) => {
    setFeedback({ visible: true, message });
  }, []);

  const openCreateDialog = React.useCallback(() => {
    setEditingRule(null);
    setDialogVisible(true);
  }, []);

  const openEditDialog = React.useCallback((item) => {
    setEditingRule(item);
    setDialogVisible(true);
  }, []);

  const handleDelete = React.useCallback(
    (item) => {
      Alert.alert(
        "Eliminar regla",
        `Se eliminará la notificación automática asociada a ${item.userDisplay}.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: async () => {
              setDeletingIds((current) => [...current, item._id]);
              try {
                await removeNotificationRule(item._id);
                Meteor.call(
                  "registrarLog",
                  "NOTIFICACION CONEXION VPN",
                  item.userIdConnected,
                  currentUser?._id,
                  `Notificacion ${item._id} Eliminada`,
                );
                showFeedback(`Regla eliminada para ${item.userDisplay}.`);
              } catch (error) {
                Meteor.call(
                  "registrarLog",
                  "ERROR NOTIFICACION CONEXION VPN",
                  item.userIdConnected,
                  currentUser?._id,
                  error?.message ||
                    error?.reason ||
                    "Error al eliminar notificación VPN.",
                );
                showFeedback(
                  error?.reason ||
                    `No se pudo eliminar la regla de ${item.userDisplay}.`,
                );
              } finally {
                setDeletingIds((current) =>
                  current.filter((id) => id !== item._id),
                );
              }
            },
          },
        ],
      );
    },
    [currentUser?._id, showFeedback],
  );

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Surface
        elevation={0}
        style={[styles.heroCard, { backgroundColor: palette.heroPanel }]}
      >
        <Text style={styles.heroEyebrow} variant="labelLarge">
          Supervisión VPN
        </Text>
        <Text style={styles.heroTitle} variant="headlineMedium">
          Notificaciones de conexiones VPN
        </Text>
        <Text style={styles.heroCopy} variant="bodyMedium">
          Organiza avisos para que la persona responsable reciba el mensaje
          correcto cuando un usuario active o pierda su conexión VPN.
        </Text>
      </Surface>

      <View style={styles.summaryGrid}>
        <SummaryCard
          colors={{
            label: palette.summaryLabel,
            surface: palette.summarySurface,
          }}
          compact={isCompactScreen}
          label="Reglas"
          tone="#2563eb"
          value={summary.rules}
        />
        <SummaryCard
          colors={{
            label: palette.summaryLabel,
            surface: palette.summarySurface,
          }}
          compact={isCompactScreen}
          label="Usuarios"
          tone="#10b981"
          value={summary.users}
        />
        <SummaryCard
          colors={{
            label: palette.summaryLabel,
            surface: palette.summarySurface,
          }}
          compact={isCompactScreen}
          label="Alcance"
          tone="#f59e0b"
          value={isGeneralAdmin ? "Global" : "Propio"}
        />
        <SummaryCard
          colors={{
            label: palette.summaryLabel,
            surface: palette.summarySurface,
          }}
          compact={isCompactScreen}
          label="Admins"
          tone="#8b5cf6"
          value={summary.admins}
        />
      </View>

      {filtersVisible ? (
        <Surface
          elevation={0}
          style={[
            styles.filtersPanel,
            { backgroundColor: palette.filtersPanel },
          ]}
        >
          <SearchInput
            colors={{
              cursor: palette.searchText,
              icon: palette.searchIcon,
              placeholder: palette.searchPlaceholder,
              selection: palette.searchSelection,
              surface: palette.searchSurface,
              text: palette.searchText,
            }}
            onChangeText={setSearchQuery}
            placeholder="Buscar por usuario, admin o contenido del mensaje"
            value={searchQuery}
          />
          <View style={styles.filtersFooter}>
            <Text style={{ color: palette.copy }} variant="bodySmall">
              {searchQuery.trim()
                ? `${filteredRules.length} regla(s) visibles tras aplicar búsqueda`
                : `${rules.length} regla(s) registradas`}
            </Text>
            {searchQuery.trim() ? (
              <Button compact onPress={clearFilters}>
                Limpiar
              </Button>
            ) : null}
          </View>
        </Surface>
      ) : (
        <Surface
          elevation={0}
          style={[
            styles.filtersCollapsedBar,
            { backgroundColor: palette.filtersPanel },
          ]}
        >
          <Text style={{ color: palette.copy }} variant="bodySmall">
            {searchQuery.trim() ? "Búsqueda activa" : "Búsqueda oculta"}
          </Text>
          <Text style={{ color: palette.copy }} variant="bodySmall">
            {filteredRules.length} visibles
          </Text>
        </Surface>
      )}
    </View>
  );

  if (!canManage && ready) {
    return (
      <View style={[styles.screen, { backgroundColor: palette.screen }]}>
        <AppHeader
          left={
            <Appbar.BackAction
              iconColor="#fff"
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : router.replace("/(normal)/Main")
              }
            />
          }
          title="Notificaciones VPN"
        />
        <View style={styles.accessDeniedWrap}>
          <Surface
            elevation={0}
            style={[
              styles.accessDeniedCard,
              { backgroundColor: palette.cardSurface },
            ]}
          >
            <IconButton
              icon="shield-lock-outline"
              iconColor={palette.icon}
              size={42}
            />
            <Text
              style={[styles.accessDeniedTitle, { color: palette.title }]}
              variant="headlineSmall"
            >
              Sin acceso
            </Text>
            <Text
              style={[styles.accessDeniedCopy, { color: palette.copy }]}
              variant="bodyMedium"
            >
              Esta pantalla es solo para administradores. Carlos puede ver todas
              las reglas y cada admin normal solo trabaja con las suyas.
            </Text>
          </Surface>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.screen }]}>
      <AppHeader
        left={
          <Appbar.BackAction
            iconColor="#fff"
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/(normal)/Main")
            }
          />
        }
        title="Notificaciones VPN"
        actions={
          <>
            <IconButton
              icon={filtersVisible ? "filter-off-outline" : "filter-outline"}
              iconColor="#ffffff"
              onPress={() => setFiltersVisible((current) => !current)}
            />
            {canManage ? (
              <IconButton
                icon="plus"
                iconColor="#ffffff"
                onPress={openCreateDialog}
              />
            ) : null}
          </>
        }
      />

      {ready || rules.length > 0 ? (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={filteredRules}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={
            <EmptyState
              colors={{
                copy: palette.copy,
                icon: palette.icon,
                iconWrap: palette.emptyIconWrap,
                surface: palette.emptySurface,
                title: palette.title,
              }}
              hasRules={rules.length > 0}
              onClearFilters={clearFilters}
            />
          }
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <View style={styles.ruleCardWrap}>
              <NotificacionRuleCard
                canDelete={!deletingIds.includes(item._id)}
                canEdit={!deletingIds.includes(item._id)}
                colors={{
                  copy: palette.copy,
                  label: palette.label,
                  secondarySurface: palette.secondarySurface,
                  surface: palette.cardSurface,
                  title: palette.title,
                }}
                item={item}
                onDelete={handleDelete}
                onEdit={openEditDialog}
                showAdmin={isGeneralAdmin}
              />
              {deletingIds.includes(item._id) ? (
                <View style={styles.deletingOverlay} pointerEvents="none">
                  <ActivityIndicator animating size="small" />
                </View>
              ) : null}
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.loadingWrap}>
          <ActivityIndicator animating size="large" />
          <Text style={{ color: palette.loadingCopy }} variant="bodyMedium">
            Cargando configuración de notificaciones VPN...
          </Text>
        </View>
      )}

      <NotificacionRuleDialog
        adminOptions={adminOptions}
        availableUsers={availableUsers}
        canManage={canManage}
        currentUserId={currentUser?._id}
        currentUsername={currentUser?.username}
        editingRule={editingRule}
        onCreated={(result) => {
          if (result?.error) {
            showFeedback(result.message || "No se pudo guardar la regla.");
            return;
          }

          if (result?.isEditing) {
            showFeedback(
              `Regla actualizada para ${result?.username || "el usuario seleccionado"}. Responsable: ${result?.responsible || "sin cambio"}.`,
            );
            return;
          }

          showFeedback(
            `Regla creada para ${result?.username || "el usuario seleccionado"}.`,
          );
        }}
        onDismiss={() => {
          setDialogVisible(false);
          setEditingRule(null);
        }}
        visible={dialogVisible}
      />

      <Snackbar
        duration={3200}
        onDismiss={() => setFeedback({ visible: false, message: "" })}
        visible={feedback.visible}
      >
        {feedback.message}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loadingWrap: {
    alignItems: "center",
    flex: 1,
    gap: 14,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  listContent: {
    paddingBottom: 28,
  },
  listHeader: {
    gap: 16,
    paddingBottom: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroCard: {
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  heroEyebrow: {
    color: "#93c5fd",
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#f8fafc",
    marginBottom: 10,
  },
  heroCopy: {
    color: "rgba(226, 232, 240, 0.9)",
    lineHeight: 21,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryCard: {
    borderRadius: 22,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 104,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  summaryCardCompact: {
    minHeight: 98,
  },
  summaryLabel: {
    marginBottom: 8,
    textTransform: "uppercase",
  },
  summaryValue: {
    fontWeight: "700",
  },
  filtersPanel: {
    borderRadius: 24,
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  filtersCollapsedBar: {
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  filtersFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  searchInputSurface: {
    alignItems: "center",
    borderRadius: 20,
    flexDirection: "row",
    minHeight: 56,
    paddingHorizontal: 4,
  },
  searchLeadingIcon: {
    margin: 0,
  },
  searchTrailingIcon: {
    margin: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  ruleCardWrap: {
    marginBottom: 14,
    paddingHorizontal: 16,
    position: "relative",
  },
  ruleCard: {
    borderRadius: 20,
  },
  ruleContentMinimal: {
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  ruleTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  ruleIdentityCol: {
    flex: 1,
    gap: 2,
  },
  ruleTitle: {
    fontWeight: "700",
  },
  ruleSubtitle: {
    lineHeight: 18,
  },
  headerChip: {
    borderRadius: 999,
  },
  ruleInfoGrid: {
    flexDirection: "row",
    gap: 12,
  },
  ruleInfoBlock: {
    flex: 1,
    gap: 4,
  },
  ruleInfoLabel: {
    textTransform: "uppercase",
  },
  ruleInfoValue: {
    fontWeight: "600",
  },
  messageCompactList: {
    gap: 10,
  },
  messageCompactRow: {
    gap: 4,
  },
  messageCompactLabel: {
    textTransform: "uppercase",
  },
  messageCompactValue: {
    lineHeight: 18,
  },
  cardFooterMinimal: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerHint: {
    flex: 1,
    lineHeight: 18,
    paddingRight: 12,
  },
  cardActionsRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  deletingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.12)",
    borderRadius: 24,
    justifyContent: "center",
  },
  emptyStateCard: {
    alignItems: "center",
    borderRadius: 24,
    gap: 12,
    marginHorizontal: 16,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  emptyIconWrap: {
    alignItems: "center",
    borderRadius: 999,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  emptyTitle: {
    textAlign: "center",
  },
  emptyCopy: {
    lineHeight: 20,
    textAlign: "center",
  },
  accessDeniedWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  accessDeniedCard: {
    alignItems: "center",
    borderRadius: 24,
    gap: 10,
    maxWidth: 560,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: "100%",
  },
  accessDeniedTitle: {
    textAlign: "center",
  },
  accessDeniedCopy: {
    lineHeight: 20,
    textAlign: "center",
  },
});

export default NotificacionUsersConnectionVPN;
