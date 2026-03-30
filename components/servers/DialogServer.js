import MeteorBase from "@meteorrn/core";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    TextInput,
    View,
    useWindowDimensions,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    Chip,
    Dialog,
    Divider,
    IconButton,
    Portal,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
    canRestartServer,
    formatServerDateTime,
    formatServerRelativeTime,
    getServerStatusMeta,
    normalizeServerRecord,
} from "./serverUtils";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const AssignmentSearchInput = ({ colors, onChangeText, value }) => {
  const inputRef = React.useRef(null);

  return (
    <Surface
      style={[
        styles.assignmentSearchSurface,
        { backgroundColor: colors.surface },
      ]}
      elevation={0}
    >
      <IconButton
        icon="magnify"
        size={18}
        style={styles.assignmentSearchIcon}
        iconColor={colors.icon}
        onPress={() => inputRef.current?.focus()}
      />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder="Buscar por usuario o nombre"
        placeholderTextColor={colors.placeholder}
        cursorColor={colors.cursor}
        selectionColor={colors.selection}
        style={[styles.assignmentSearchInput, { color: colors.text }]}
      />
      {value ? (
        <IconButton
          icon="close"
          size={18}
          style={styles.assignmentSearchIcon}
          iconColor={colors.icon}
          onPress={() => onChangeText("")}
        />
      ) : null}
    </Surface>
  );
};

const AssignmentRow = ({
  actionLabel,
  actionMode,
  colors,
  icon,
  onPress,
  user,
}) => (
  <Surface
    style={[styles.assignmentRow, { backgroundColor: colors.surface }]}
    elevation={0}
  >
    <View style={styles.assignmentUserCopy}>
      <Text
        variant="titleSmall"
        style={[styles.assignmentUserTitle, { color: colors.title }]}
      >
        {user.displayName}
      </Text>
      <Text
        variant="bodySmall"
        style={[styles.assignmentUserSubtitle, { color: colors.subtitle }]}
      >
        {user.username}
      </Text>
    </View>
    <Button compact mode={actionMode} icon={icon} onPress={onPress}>
      {actionLabel}
    </Button>
  </Surface>
);

const DetailRow = ({ colors, label, value }) => (
  <Surface
    style={[styles.detailRow, { backgroundColor: colors.surface }]}
    elevation={0}
  >
    <Text
      variant="labelMedium"
      style={[styles.detailLabel, { color: colors.label }]}
    >
      {label}
    </Text>
    <Text
      variant="bodyMedium"
      style={[styles.detailValue, { color: colors.value }]}
    >
      {value || "Sin dato"}
    </Text>
  </Surface>
);

const DialogServer = ({ data, hideDialog, onRestart, restarting, visible }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [assignmentQuery, setAssignmentQuery] = React.useState("");
  const [savingUsers, setSavingUsers] = React.useState(false);
  const isDark = theme.dark;

  const server = data ? normalizeServerRecord(data) : null;
  const { availableVpnUsers, loadingUsers } = Meteor.useTracker(() => {
    const currentUser = Meteor.user();
    const isAdminPrincipal =
      currentUser?.username === "carlosmbinf" ||
      currentUser?.profile?.role === "admin";

    if (!visible || !server?._id || !currentUser?._id) {
      return {
        availableVpnUsers: [],
        loadingUsers: false,
      };
    }

    const selector = isAdminPrincipal
      ? { vpn: true }
      : {
          $or: [
            { bloqueadoDesbloqueadoPor: currentUser._id },
            { _id: currentUser._id },
          ],
          vpn: true,
        };

    const fields = {
      _id: 1,
      username: 1,
      profile: 1,
      bloqueadoDesbloqueadoPor: 1,
      vpn: 1,
    };

    const handle = Meteor.subscribe("user", selector, { fields });
    const docs = handle.ready()
      ? Meteor.users.find(selector, { fields, sort: { username: 1 } }).fetch()
      : [];

    return {
      availableVpnUsers: docs.map((user) => ({
        _id: user._id,
        displayName:
          `${user?.profile?.firstName || ""} ${user?.profile?.lastName || ""}`.trim() ||
          user.username ||
          "Usuario sin nombre",
        username: user.username || user._id,
      })),
      loadingUsers: !handle.ready(),
    };
  }, [visible, server?._id]);
  const statusMeta = getServerStatusMeta(server?.estado, server?.active);
  const canRestart = canRestartServer(server) && !restarting;
  const dialogWidth = Math.min(windowWidth - 24, 760);
  const dialogMaxHeight = Math.max(
    420,
    windowHeight - Math.max(insets.top, 12) - Math.max(insets.bottom, 12) - 24,
  );
  const bodyMaxHeight = Math.max(220, dialogMaxHeight - 218);
  const heroBackground = theme.dark ? "#0f172a" : "#eef4ff";
  const surfaceBackground = theme.dark
    ? theme.colors.elevation?.level2 || theme.colors.surface
    : "#fbfcff";
  const palette = React.useMemo(
    () => ({
      subtitle: isDark ? "#94a3b8" : "#64748b",
      heroEyebrow: isDark ? "#94a3b8" : "#64748b",
      heroBody: isDark ? "#cbd5e1" : "#475569",
      detailSurface: isDark
        ? "rgba(30, 41, 59, 0.86)"
        : "rgba(148, 163, 184, 0.08)",
      detailLabel: isDark ? "#94a3b8" : "#64748b",
      detailValue: isDark ? "#f8fafc" : "#0f172a",
      sectionSurface: isDark
        ? "rgba(30, 41, 59, 0.82)"
        : "rgba(59, 130, 246, 0.08)",
      sectionTitle: isDark ? "#bfdbfe" : "#1d4ed8",
      sectionCaption: isDark ? "#cbd5e1" : "#475569",
      sectionCopy: isDark ? "#e2e8f0" : "#334155",
      searchSurface: isDark
        ? "rgba(15, 23, 42, 0.78)"
        : "rgba(255, 255, 255, 0.78)",
      searchText: isDark ? "#e2e8f0" : "#0f172a",
      searchPlaceholder: isDark ? "#94a3b8" : "#94a3b8",
      searchSelection: isDark
        ? "rgba(148, 163, 184, 0.24)"
        : "rgba(15, 23, 42, 0.16)",
      searchIcon: isDark ? "#cbd5e1" : undefined,
      assignmentSummaryChipBackground: isDark
        ? "rgba(59, 130, 246, 0.26)"
        : "rgba(29, 78, 216, 0.1)",
      assignmentSummaryChipText: isDark ? "#dbeafe" : "#1d4ed8",
      assignmentGroupTitle: isDark ? "#cbd5e1" : "#334155",
      assignmentRowSurface: isDark
        ? "rgba(15, 23, 42, 0.78)"
        : "rgba(255, 255, 255, 0.76)",
      assignmentRowTitle: isDark ? "#f8fafc" : "#0f172a",
      assignmentRowSubtitle: isDark ? "#94a3b8" : "#64748b",
      assignmentEmptyCopy: isDark ? "#94a3b8" : "#64748b",
      warningSurface: isDark
        ? "rgba(120, 53, 15, 0.34)"
        : "rgba(245, 158, 11, 0.12)",
      warningText: isDark ? "#fde68a" : "#9a3412",
    }),
    [isDark],
  );
  const approvedSet = React.useMemo(
    () => new Set(server?.usuariosAprobados || []),
    [server?.usuariosAprobados],
  );
  const normalizedQuery = assignmentQuery.trim().toLowerCase();
  const matchesQuery = React.useCallback(
    (user) => {
      if (!normalizedQuery) {
        return true;
      }

      return [user.displayName, user.username]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    },
    [normalizedQuery],
  );
  const approvedUsers = availableVpnUsers.filter(
    (user) => approvedSet.has(user.username) && matchesQuery(user),
  );
  const availableUsers = availableVpnUsers.filter(
    (user) => !approvedSet.has(user.username) && matchesQuery(user),
  );

  React.useEffect(() => {
    if (!visible) {
      setAssignmentQuery("");
      setSavingUsers(false);
    }
  }, [visible]);

  const persistApprovedUsers = React.useCallback(
    (nextApprovedUsers) => {
      if (!server?._id) {
        return;
      }

      setSavingUsers(true);
      Meteor.call(
        "actualizarEstadoServer",
        server._id,
        { usuariosAprobados: nextApprovedUsers },
        (error) => {
          setSavingUsers(false);

          if (error) {
            console.warn(
              "[Servidores] No se pudieron actualizar usuarios aprobados",
              error,
            );
          }
        },
      );
    },
    [server?._id],
  );

  const handleApproveUser = React.useCallback(
    (username) => {
      const current = Array.isArray(server?.usuariosAprobados)
        ? server.usuariosAprobados
        : [];

      if (current.includes(username)) {
        return;
      }

      persistApprovedUsers([...current, username]);
    },
    [persistApprovedUsers, server?.usuariosAprobados],
  );

  const handleRemoveUser = React.useCallback(
    (username) => {
      const current = Array.isArray(server?.usuariosAprobados)
        ? server.usuariosAprobados
        : [];

      persistApprovedUsers(current.filter((item) => item !== username));
    },
    [persistApprovedUsers, server?.usuariosAprobados],
  );

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={hideDialog}
        dismissable
        dismissableBackButton
        style={[
          styles.dialog,
          {
            backgroundColor: surfaceBackground,
            marginBottom: Math.max(insets.bottom, 12),
            marginTop: Math.max(insets.top, 12),
            maxHeight: dialogMaxHeight,
            width: dialogWidth,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text variant="titleLarge" style={styles.title}>
              {server?.displayName || "Detalle del servidor"}
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.subtitle, { color: palette.subtitle }]}
            >
              {server
                ? "Revision operativa del servidor y acceso a la accion de reinicio controlado."
                : "No se pudo cargar la informacion del servidor seleccionado."}
            </Text>
          </View>
          <IconButton icon="close" onPress={hideDialog} />
        </View>

        <Divider />

        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView
            style={[styles.scroll, { maxHeight: bodyMaxHeight }]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {server ? (
              <>
                <Surface
                  style={[styles.heroCard, { backgroundColor: heroBackground }]}
                  elevation={0}
                >
                  <View style={styles.heroContent}>
                    <Text
                      variant="labelLarge"
                      style={[
                        styles.heroEyebrow,
                        { color: palette.heroEyebrow },
                      ]}
                    >
                      Estado operativo
                    </Text>
                    <Text variant="headlineSmall" style={styles.heroTitle}>
                      {statusMeta.label}
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={[styles.heroBody, { color: palette.heroBody }]}
                    >
                      {statusMeta.description}
                    </Text>
                  </View>
                  <View style={styles.heroChips}>
                    <Chip
                      compact
                      icon={statusMeta.icon}
                      style={[
                        styles.heroChip,
                        { backgroundColor: statusMeta.background },
                      ]}
                      textStyle={[
                        styles.heroChipText,
                        { color: statusMeta.textColor },
                      ]}
                    >
                      {statusMeta.label}
                    </Chip>
                    <Chip
                      compact
                      icon={server.active ? "power-plug" : "power-plug-off"}
                      style={[
                        styles.heroChip,
                        {
                          backgroundColor: isDark
                            ? "rgba(51, 65, 85, 0.88)"
                            : "rgba(255, 255, 255, 0.86)",
                        },
                      ]}
                      textStyle={[
                        styles.heroChipText,
                        { color: isDark ? "#e2e8f0" : "#334155" },
                      ]}
                    >
                      {server.active ? "Activado" : "Desactivado"}
                    </Chip>
                  </View>
                </Surface>

                <View style={styles.detailGrid}>
                  <DetailRow
                    colors={{
                      label: palette.detailLabel,
                      surface: palette.detailSurface,
                      value: palette.detailValue,
                    }}
                    label="Dominio"
                    value={server.domain}
                  />
                  <DetailRow
                    colors={{
                      label: palette.detailLabel,
                      surface: palette.detailSurface,
                      value: palette.detailValue,
                    }}
                    label="IP"
                    value={server.ip}
                  />
                  <DetailRow
                    colors={{
                      label: palette.detailLabel,
                      surface: palette.detailSurface,
                      value: palette.detailValue,
                    }}
                    label="Ultima senal"
                    value={formatServerDateTime(server.lastSignal)}
                  />
                  <DetailRow
                    colors={{
                      label: palette.detailLabel,
                      surface: palette.detailSurface,
                      value: palette.detailValue,
                    }}
                    label="Actividad relativa"
                    value={formatServerRelativeTime(server.lastSignal)}
                  />
                  <DetailRow
                    colors={{
                      label: palette.detailLabel,
                      surface: palette.detailSurface,
                      value: palette.detailValue,
                    }}
                    label="Usuarios aprobados"
                    value={String(server.usuariosAprobadosCount)}
                  />
                  <DetailRow
                    colors={{
                      label: palette.detailLabel,
                      surface: palette.detailSurface,
                      value: palette.detailValue,
                    }}
                    label="Identificador"
                    value={server._id}
                  />
                </View>

                {server.description ? (
                  <Surface
                    style={[
                      styles.sectionCard,
                      { backgroundColor: palette.sectionSurface },
                    ]}
                    elevation={0}
                  >
                    <Text
                      variant="labelLarge"
                      style={[
                        styles.sectionTitle,
                        { color: palette.sectionTitle },
                      ]}
                    >
                      Descripcion
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.sectionCopy,
                        { color: palette.sectionCopy },
                      ]}
                    >
                      {server.description}
                    </Text>
                  </Surface>
                ) : null}

                <Surface
                  style={[
                    styles.sectionCard,
                    { backgroundColor: palette.sectionSurface },
                  ]}
                  elevation={0}
                >
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionHeaderCopy}>
                      <Text
                        variant="labelLarge"
                        style={[
                          styles.sectionTitle,
                          { color: palette.sectionTitle },
                        ]}
                      >
                        Acceso VPN por servidor
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={[
                          styles.sectionCaption,
                          { color: palette.sectionCaption },
                        ]}
                      >
                        Solo los usuarios agregados aqui quedaran autorizados a
                        conectarse a esta VPN.
                      </Text>
                    </View>
                    {savingUsers ? <ActivityIndicator size="small" /> : null}
                  </View>

                  <AssignmentSearchInput
                    colors={{
                      cursor: palette.searchText,
                      icon: palette.searchIcon,
                      placeholder: palette.searchPlaceholder,
                      selection: palette.searchSelection,
                      surface: palette.searchSurface,
                      text: palette.searchText,
                    }}
                    onChangeText={setAssignmentQuery}
                    value={assignmentQuery}
                  />

                  <View style={styles.assignmentSummaryRow}>
                    <Chip
                      compact
                      style={[
                        styles.assignmentSummaryChip,
                        {
                          backgroundColor:
                            palette.assignmentSummaryChipBackground,
                        },
                      ]}
                      textStyle={[
                        styles.assignmentSummaryChipText,
                        { color: palette.assignmentSummaryChipText },
                      ]}
                    >
                      Aprobados: {server.usuariosAprobadosCount}
                    </Chip>
                    <Chip
                      compact
                      style={[
                        styles.assignmentSummaryChip,
                        {
                          backgroundColor:
                            palette.assignmentSummaryChipBackground,
                        },
                      ]}
                      textStyle={[
                        styles.assignmentSummaryChipText,
                        { color: palette.assignmentSummaryChipText },
                      ]}
                    >
                      Disponibles VPN: {availableVpnUsers.length}
                    </Chip>
                  </View>

                  {loadingUsers ? (
                    <View style={styles.assignmentLoadingState}>
                      <ActivityIndicator size="small" />
                      <Text
                        variant="bodySmall"
                        style={[
                          styles.assignmentEmptyCopy,
                          { color: palette.assignmentEmptyCopy },
                        ]}
                      >
                        Cargando usuarios con VPN activa...
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.assignmentSection}>
                        <Text
                          variant="labelMedium"
                          style={[
                            styles.assignmentGroupTitle,
                            { color: palette.assignmentGroupTitle },
                          ]}
                        >
                          Usuarios aprobados
                        </Text>
                        {approvedUsers.length ? (
                          approvedUsers.map((user) => (
                            <AssignmentRow
                              key={`approved-${user.username}`}
                              actionLabel="Quitar"
                              actionMode="outlined"
                              colors={{
                                surface: palette.assignmentRowSurface,
                                subtitle: palette.assignmentRowSubtitle,
                                title: palette.assignmentRowTitle,
                              }}
                              icon="minus-circle-outline"
                              onPress={() => handleRemoveUser(user.username)}
                              user={user}
                            />
                          ))
                        ) : (
                          <Text
                            variant="bodySmall"
                            style={[
                              styles.assignmentEmptyCopy,
                              { color: palette.assignmentEmptyCopy },
                            ]}
                          >
                            No hay usuarios aprobados con este filtro.
                          </Text>
                        )}
                      </View>

                      <View style={styles.assignmentSection}>
                        <Text
                          variant="labelMedium"
                          style={[
                            styles.assignmentGroupTitle,
                            { color: palette.assignmentGroupTitle },
                          ]}
                        >
                          Usuarios VPN disponibles
                        </Text>
                        {availableUsers.length ? (
                          availableUsers.map((user) => (
                            <AssignmentRow
                              key={`available-${user.username}`}
                              actionLabel="Agregar"
                              actionMode="contained-tonal"
                              colors={{
                                surface: palette.assignmentRowSurface,
                                subtitle: palette.assignmentRowSubtitle,
                                title: palette.assignmentRowTitle,
                              }}
                              icon="plus-circle-outline"
                              onPress={() => handleApproveUser(user.username)}
                              user={user}
                            />
                          ))
                        ) : (
                          <Text
                            variant="bodySmall"
                            style={[
                              styles.assignmentEmptyCopy,
                              { color: palette.assignmentEmptyCopy },
                            ]}
                          >
                            No quedan usuarios VPN disponibles con este filtro.
                          </Text>
                        )}
                      </View>
                    </>
                  )}
                </Surface>

                {server.idUserSolicitandoReinicio ? (
                  <Surface
                    style={[
                      styles.sectionCard,
                      { backgroundColor: palette.sectionSurface },
                    ]}
                    elevation={0}
                  >
                    <Text
                      variant="labelLarge"
                      style={[
                        styles.sectionTitle,
                        { color: palette.sectionTitle },
                      ]}
                    >
                      Solicitud en curso
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.sectionCopy,
                        { color: palette.sectionCopy },
                      ]}
                    >
                      Ultimo usuario que solicito reinicio:{" "}
                      {server.idUserSolicitandoReinicio}
                    </Text>
                  </Surface>
                ) : null}

                {!canRestart ? (
                  <Surface
                    style={[
                      styles.warningCard,
                      { backgroundColor: palette.warningSurface },
                    ]}
                    elevation={0}
                  >
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.warningCopy,
                        { color: palette.warningText },
                      ]}
                    >
                      El reinicio solo esta disponible cuando el servidor esta
                      ACTIVO y marcado como activado.
                    </Text>
                  </Surface>
                ) : null}
              </>
            ) : (
              <Surface style={styles.warningCard} elevation={0}>
                <Text variant="bodyMedium" style={styles.warningCopy}>
                  No hay informacion disponible para este servidor.
                </Text>
              </Surface>
            )}
          </ScrollView>
        </Dialog.ScrollArea>

        <Divider />

        <Dialog.Actions style={styles.actionsRow}>
          <Button onPress={hideDialog}>Cerrar</Button>
          <Button
            mode="contained"
            icon="restart"
            disabled={!canRestart}
            loading={restarting}
            onPress={() => onRestart?.(server)}
          >
            {restarting ? "Reiniciando" : "Reiniciar conexion VPN"}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    alignSelf: "center",
    borderRadius: 28,
    overflow: "hidden",
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
    paddingRight: 12,
  },
  sectionHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontWeight: "800",
  },
  subtitle: {
    color: "#64748b",
    lineHeight: 20,
  },
  scrollArea: {
    marginHorizontal: 0,
    paddingHorizontal: 0,
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    flexGrow: 1,
    gap: 16,
    paddingBottom: 8,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  heroCard: {
    borderRadius: 22,
    gap: 16,
    padding: 18,
  },
  heroContent: {
    gap: 6,
  },
  heroEyebrow: {
    color: "#64748b",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontWeight: "800",
  },
  heroBody: {
    color: "#475569",
    lineHeight: 21,
  },
  heroChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  heroChip: {
    borderRadius: 999,
  },
  heroChipText: {
    fontWeight: "700",
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  detailRow: {
    backgroundColor: "rgba(148, 163, 184, 0.08)",
    borderRadius: 18,
    gap: 6,
    minWidth: 180,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  detailLabel: {
    color: "#64748b",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  detailValue: {
    fontWeight: "600",
  },
  sectionCard: {
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    borderRadius: 20,
    gap: 8,
    padding: 16,
  },
  sectionTitle: {
    color: "#1d4ed8",
    fontWeight: "800",
  },
  sectionCaption: {
    color: "#475569",
    lineHeight: 19,
  },
  sectionCopy: {
    color: "#334155",
    lineHeight: 21,
  },
  assignmentSearchSurface: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderRadius: 18,
    flexDirection: "row",
    minHeight: 50,
    paddingHorizontal: 4,
  },
  assignmentSearchIcon: {
    margin: 0,
  },
  assignmentSearchInput: {
    color: "#0f172a",
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  assignmentSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  assignmentSummaryChip: {
    backgroundColor: "rgba(29, 78, 216, 0.1)",
    borderRadius: 999,
  },
  assignmentSummaryChipText: {
    fontWeight: "700",
  },
  assignmentSection: {
    gap: 10,
  },
  assignmentGroupTitle: {
    color: "#334155",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  assignmentRow: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.76)",
    borderRadius: 18,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  assignmentUserCopy: {
    flex: 1,
    gap: 4,
  },
  assignmentUserTitle: {
    fontWeight: "700",
  },
  assignmentUserSubtitle: {
    color: "#64748b",
  },
  assignmentLoadingState: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  assignmentEmptyCopy: {
    color: "#64748b",
    lineHeight: 18,
  },
  warningCard: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderRadius: 20,
    padding: 16,
  },
  warningCopy: {
    color: "#9a3412",
    lineHeight: 21,
  },
  actionsRow: {
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
});

export default DialogServer;
