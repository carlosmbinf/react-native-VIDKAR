import MeteorBase from "@meteorrn/core";
import React from "react";
import {
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
    useWindowDimensions,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    Chip,
    Dialog,
    HelperText,
    IconButton,
    Portal,
    Surface,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NotificacionUsersConectadosVPNCollection } from "../collections/collections";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const buildPalette = (isDark, theme) => ({
  dialogSurface: isDark
    ? theme.colors.elevation?.level2 || theme.colors.surface
    : "#fbfcff",
  dialogBorder: isDark ? "rgba(96, 165, 250, 0.2)" : "rgba(59, 130, 246, 0.12)",
  title: isDark ? "#f8fafc" : "#0f172a",
  copy: isDark ? "#cbd5e1" : "#475569",
  subdued: isDark ? "#94a3b8" : "#64748b",
  heroSurface: isDark ? "#0f172a" : "#eef4ff",
  heroBorder: isDark ? "rgba(56, 189, 248, 0.2)" : "rgba(59, 130, 246, 0.12)",
  sectionSurface: isDark
    ? "rgba(30, 41, 59, 0.84)"
    : "rgba(148, 163, 184, 0.08)",
  sectionBorder: isDark
    ? "rgba(125, 211, 252, 0.16)"
    : "rgba(59, 130, 246, 0.08)",
  sectionTitle: isDark ? "#bfdbfe" : "#1d4ed8",
  readOnlySurface: isDark
    ? "rgba(37, 99, 235, 0.18)"
    : "rgba(37, 99, 235, 0.1)",
  readOnlyText: isDark ? "#dbeafe" : "#1d4ed8",
  pickerSurface: isDark ? "rgba(15, 23, 42, 0.9)" : "#ffffff",
  pickerBorder: isDark
    ? "rgba(148, 163, 184, 0.18)"
    : "rgba(148, 163, 184, 0.22)",
  selectedUserSurface: isDark
    ? "rgba(37, 99, 235, 0.18)"
    : "rgba(37, 99, 235, 0.1)",
  selectedUserText: isDark ? "#dbeafe" : "#1d4ed8",
  filterChipBackground: isDark
    ? "rgba(51, 65, 85, 0.88)"
    : "rgba(148, 163, 184, 0.12)",
  filterChipBorder: isDark ? "rgba(148, 163, 184, 0.18)" : "transparent",
  filterChipText: isDark ? "#e2e8f0" : "#475569",
  divider: isDark ? "rgba(148, 163, 184, 0.14)" : "rgba(148, 163, 184, 0.22)",
  destructiveText: isDark ? "#fca5a5" : "#dc2626",
});

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

const insertNotificationRule = (payload) =>
  new Promise((resolve, reject) => {
    NotificacionUsersConectadosVPNCollection.insert(
      payload,
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
    );
  });

const updateNotificationRule = (id, payload) =>
  new Promise((resolve, reject) => {
    NotificacionUsersConectadosVPNCollection.update(
      id,
      { $set: payload },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
    );
  });

const UserPickerDialog = ({
  availableUsers,
  colors,
  onDismiss,
  onSelectUser,
  searchQuery,
  selectedUserId,
  setSearchQuery,
  visible,
}) => {
  const filteredUsers = React.useMemo(() => {
    const query = normalizeText(searchQuery);

    return availableUsers.filter((user) => {
      if (!query) {
        return true;
      }

      return [user?.username, getUserLabel(user)]
        .map((value) => normalizeText(value))
        .some((value) => value.includes(query));
    });
  }, [availableUsers, searchQuery]);

  return (
    <Portal>
      <Dialog
        dismissable
        onDismiss={onDismiss}
        style={[styles.pickerDialog, { backgroundColor: colors.dialogSurface }]}
        visible={visible}
      >
        <Dialog.Title style={[styles.pickerTitle, { color: colors.title }]}>
          Seleccionar usuario
        </Dialog.Title>
        <Dialog.Content>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            label="Buscar usuario"
            left={<TextInput.Icon icon="magnify" />}
            mode="outlined"
            onChangeText={setSearchQuery}
            placeholder="Username o nombre"
            right={
              searchQuery ? (
                <TextInput.Icon
                  icon="close"
                  onPress={() => setSearchQuery("")}
                />
              ) : null
            }
            value={searchQuery}
          />

          <FlatList
            contentContainerStyle={styles.pickerListContent}
            data={filteredUsers}
            keyExtractor={(item) => item._id}
            ListEmptyComponent={
              <Surface
                elevation={0}
                style={[
                  styles.pickerEmptyState,
                  { backgroundColor: colors.sectionSurface },
                ]}
              >
                <Text
                  style={[styles.pickerEmptyTitle, { color: colors.title }]}
                  variant="titleSmall"
                >
                  No hay usuarios disponibles
                </Text>
                <Text
                  style={[styles.pickerEmptyCopy, { color: colors.copy }]}
                  variant="bodySmall"
                >
                  Prueba con otro nombre o revisa qué personas tienes
                  disponibles para asignar.
                </Text>
              </Surface>
            }
            renderItem={({ item }) => {
              const isSelected = item._id === selectedUserId;

              return (
                <Pressable onPress={() => onSelectUser(item)}>
                  <Surface
                    elevation={0}
                    style={[
                      styles.pickerUserCard,
                      {
                        backgroundColor: isSelected
                          ? colors.selectedUserSurface
                          : colors.sectionSurface,
                        borderColor: isSelected
                          ? colors.selectedUserText
                          : colors.sectionBorder,
                      },
                    ]}
                  >
                    <View style={styles.pickerUserCopy}>
                      <Text
                        style={[
                          styles.pickerUserTitle,
                          {
                            color: isSelected
                              ? colors.selectedUserText
                              : colors.title,
                          },
                        ]}
                        variant="titleSmall"
                      >
                        {item.username || "Sin username"}
                      </Text>
                      <Text
                        style={[
                          styles.pickerUserSubtitle,
                          { color: colors.copy },
                        ]}
                        variant="bodySmall"
                      >
                        {getUserLabel(item)}
                      </Text>
                    </View>
                    {item?.vpn === true ? (
                      <Chip
                        compact
                        style={styles.pickerUserChip}
                        textStyle={styles.pickerUserChipText}
                      >
                        VPN activa
                      </Chip>
                    ) : null}
                  </Surface>
                </Pressable>
              );
            }}
            style={styles.pickerList}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cerrar</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const NotificacionRuleDialog = ({
  adminOptions,
  availableUsers,
  canManage,
  currentUserId,
  currentUsername,
  editingRule,
  onCreated,
  onDismiss,
  visible,
}) => {
  const theme = useTheme();
  const isDark = theme.dark;
  const colors = React.useMemo(
    () => buildPalette(isDark, theme),
    [isDark, theme],
  );
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const dialogWidth = Math.min(windowWidth - 24, 760);
  const dialogMaxHeight = Math.max(
    500,
    windowHeight - Math.max(insets.top, 12) - Math.max(insets.bottom, 12) - 24,
  );
  const scrollAreaMaxHeight = Math.max(260, dialogMaxHeight - 210);

  const [selectedUserId, setSelectedUserId] = React.useState("");
  const [selectedAdminId, setSelectedAdminId] = React.useState("");
  const [connectedMessage, setConnectedMessage] = React.useState("");
  const [disconnectedMessage, setDisconnectedMessage] = React.useState("");
  const [pickerVisible, setPickerVisible] = React.useState(false);
  const [adminPickerVisible, setAdminPickerVisible] = React.useState(false);
  const [userSearchQuery, setUserSearchQuery] = React.useState("");
  const [adminSearchQuery, setAdminSearchQuery] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState({
    userId: "",
    adminId: "",
    connected: "",
    disconnected: "",
  });
  const isEditing = Boolean(editingRule?._id);
  const canEditResponsible = currentUsername === "carlosmbinf";

  React.useEffect(() => {
    if (!visible) {
      return;
    }

    setSelectedUserId(editingRule?.userIdConnected || "");
    setSelectedAdminId(editingRule?.adminIdSolicitud || currentUserId || "");
    setConnectedMessage(editingRule?.mensajeaenviarConnected || "");
    setDisconnectedMessage(editingRule?.mensajeaenviarDisconnected || "");
    setPickerVisible(false);
    setAdminPickerVisible(false);
    setUserSearchQuery("");
    setAdminSearchQuery("");
    setSaving(false);
    setErrors({ userId: "", adminId: "", connected: "", disconnected: "" });
  }, [currentUserId, editingRule, visible]);

  const sortedUsers = React.useMemo(
    () =>
      [...availableUsers].sort((left, right) =>
        String(left?.username || "").localeCompare(
          String(right?.username || ""),
          "es",
        ),
      ),
    [availableUsers],
  );

  const selectedUser = React.useMemo(() => {
    const fromOptions = sortedUsers.find((user) => user._id === selectedUserId);
    if (fromOptions) {
      return fromOptions;
    }

    if (editingRule?.userIdConnected === selectedUserId) {
      return {
        _id: editingRule.userIdConnected,
        profile: {
          firstName: editingRule.userFullName,
        },
        username: editingRule.userDisplay,
        vpn: editingRule.userVpnActive,
      };
    }

    return null;
  }, [editingRule, selectedUserId, sortedUsers]);

  const sortedAdmins = React.useMemo(
    () =>
      [...adminOptions].sort((left, right) =>
        String(left?.username || "").localeCompare(
          String(right?.username || ""),
          "es",
        ),
      ),
    [adminOptions],
  );

  const selectedAdmin = React.useMemo(() => {
    const fromOptions = sortedAdmins.find(
      (user) => user._id === selectedAdminId,
    );
    if (fromOptions) {
      return fromOptions;
    }

    if (editingRule?.adminIdSolicitud === selectedAdminId) {
      return {
        _id: editingRule.adminIdSolicitud,
        profile: {
          firstName: editingRule.adminDisplay,
        },
        username: editingRule.adminDisplay,
      };
    }

    return null;
  }, [editingRule, selectedAdminId, sortedAdmins]);

  const validate = React.useCallback(() => {
    const nextErrors = {
      userId: "",
      adminId: "",
      connected: "",
      disconnected: "",
    };
    let valid = true;

    if (!selectedUserId) {
      nextErrors.userId = "Selecciona un usuario para asociar la notificación.";
      valid = false;
    }
    if (!selectedAdminId) {
      nextErrors.adminId = "Selecciona un responsable para esta notificación.";
      valid = false;
    }
    if (!connectedMessage.trim()) {
      nextErrors.connected = "El mensaje de conexión es obligatorio.";
      valid = false;
    }
    if (!disconnectedMessage.trim()) {
      nextErrors.disconnected = "El mensaje de desconexión es obligatorio.";
      valid = false;
    }

    setErrors(nextErrors);
    return valid;
  }, [connectedMessage, disconnectedMessage, selectedAdminId, selectedUserId]);

  const handleSave = React.useCallback(async () => {
    if (!canManage) {
      onDismiss();
      return;
    }

    if (!validate()) {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        userIdConnected: selectedUserId,
        adminIdSolicitud: canEditResponsible
          ? selectedAdminId
          : editingRule?.adminIdSolicitud || currentUserId,
        mensajeaenviarConnected: connectedMessage.trim(),
        mensajeaenviarDisconnected: disconnectedMessage.trim(),
      };

      const insertedId = isEditing
        ? editingRule._id
        : await insertNotificationRule(payload);

      if (isEditing) {
        await updateNotificationRule(editingRule._id, payload);
      }

      Meteor.call(
        "registrarLog",
        "NOTIFICACION CONEXION VPN",
        selectedUserId,
        currentUserId,
        isEditing
          ? `Notificacion ${insertedId} Actualizada`
          : `Notificacion ${insertedId} Creada`,
      );
      onCreated?.({
        insertedId,
        isEditing,
        responsible: selectedAdmin?.username || currentUsername,
        username: selectedUser?.username || "usuario seleccionado",
      });
      onDismiss();
    } catch (error) {
      const fallbackTarget =
        selectedUser?.username || "el usuario seleccionado";
      onCreated?.({
        error: true,
        message:
          error?.reason ||
          `No se pudo crear la notificación para ${fallbackTarget}.`,
      });
      Meteor.call(
        "registrarLog",
        "ERROR NOTIFICACION CONEXION VPN",
        selectedUserId || currentUserId,
        currentUserId,
        error?.message || error?.reason || "Error al crear notificación VPN.",
      );
    } finally {
      setSaving(false);
    }
  }, [
    canManage,
    connectedMessage,
    currentUserId,
    currentUsername,
    disconnectedMessage,
    editingRule,
    isEditing,
    onCreated,
    onDismiss,
    selectedAdmin?.username,
    selectedAdminId,
    selectedUser?.username,
    selectedUserId,
    validate,
    canEditResponsible,
  ]);

  return (
    <>
      <Portal>
        <Dialog
          dismissable={!saving}
          onDismiss={saving ? undefined : onDismiss}
          style={[
            styles.dialog,
            {
              backgroundColor: colors.dialogSurface,
              borderColor: colors.dialogBorder,
              maxHeight: dialogMaxHeight,
              width: dialogWidth,
            },
          ]}
          visible={visible}
        >
          <Dialog.Title style={[styles.dialogTitle, { color: colors.title }]}>
            {isEditing
              ? "Editar notificación de conexión VPN"
              : "Nueva notificación de conexión VPN"}
          </Dialog.Title>

          <Dialog.ScrollArea style={styles.scrollArea}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: scrollAreaMaxHeight }}
            >
              <Surface
                elevation={0}
                style={[
                  styles.heroCard,
                  {
                    backgroundColor: colors.heroSurface,
                    borderColor: colors.heroBorder,
                  },
                ]}
              >
                <Text variant="labelLarge" style={styles.heroEyebrow}>
                  Automatización VPN
                </Text>
                <Text
                  style={[styles.heroTitle, { color: colors.title }]}
                  variant="titleLarge"
                >
                  {isEditing
                    ? "Ajusta mensajes y responsable de esta notificación."
                    : "Define mensajes cuando el usuario se conecte o se desconecte."}
                </Text>
                <Text
                  style={[styles.heroCopy, { color: colors.copy }]}
                  variant="bodyMedium"
                >
                  Configura quién debe recibir el aviso y qué mensaje saldrá en
                  cada momento para mantener el seguimiento del servicio.
                </Text>
              </Surface>

              <Surface
                elevation={0}
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: colors.sectionSurface,
                    borderColor: colors.sectionBorder,
                  },
                ]}
              >
                <View style={styles.sectionHeader}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: colors.sectionTitle },
                    ]}
                    variant="titleSmall"
                  >
                    Usuario a monitorear
                  </Text>
                  {selectedUser ? (
                    <Chip
                      compact
                      style={[
                        styles.selectionChip,
                        { backgroundColor: colors.readOnlySurface },
                      ]}
                      textStyle={{ color: colors.readOnlyText }}
                    >
                      {selectedUser.username}
                    </Chip>
                  ) : null}
                </View>

                {selectedUser ? (
                  <Surface
                    elevation={0}
                    style={[
                      styles.selectedUserCard,
                      { backgroundColor: colors.selectedUserSurface },
                    ]}
                  >
                    <View style={styles.selectedUserCopy}>
                      <Text
                        style={[
                          styles.selectedUserTitle,
                          { color: colors.selectedUserText },
                        ]}
                        variant="titleSmall"
                      >
                        {selectedUser.username}
                      </Text>
                      <Text
                        style={[
                          styles.selectedUserSubtitle,
                          { color: colors.copy },
                        ]}
                        variant="bodySmall"
                      >
                        {getUserLabel(selectedUser)}
                      </Text>
                    </View>
                    {selectedUser?.vpn === true ? (
                      <Chip
                        compact
                        style={styles.statusChip}
                        textStyle={styles.statusChipText}
                      >
                        VPN activa
                      </Chip>
                    ) : null}
                  </Surface>
                ) : null}

                <Button
                  icon="account-search-outline"
                  mode="outlined"
                  onPress={() => setPickerVisible(true)}
                  style={styles.userPickerButton}
                >
                  {selectedUser ? "Cambiar usuario" : "Seleccionar usuario"}
                </Button>
                <HelperText type="error" visible={Boolean(errors.userId)}>
                  {errors.userId}
                </HelperText>
              </Surface>

              <Surface
                elevation={0}
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: colors.sectionSurface,
                    borderColor: colors.sectionBorder,
                  },
                ]}
              >
                <View style={styles.sectionHeader}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: colors.sectionTitle },
                    ]}
                    variant="titleSmall"
                  >
                    Responsable de la regla
                  </Text>
                  {selectedAdmin ? (
                    <Chip
                      compact
                      style={[
                        styles.selectionChip,
                        { backgroundColor: colors.readOnlySurface },
                      ]}
                      textStyle={{ color: colors.readOnlyText }}
                    >
                      {selectedAdmin.username}
                    </Chip>
                  ) : null}
                </View>

                {selectedAdmin ? (
                  <Surface
                    elevation={0}
                    style={[
                      styles.selectedUserCard,
                      { backgroundColor: colors.selectedUserSurface },
                    ]}
                  >
                    <View style={styles.selectedUserCopy}>
                      <Text
                        style={[
                          styles.selectedUserTitle,
                          { color: colors.selectedUserText },
                        ]}
                        variant="titleSmall"
                      >
                        {selectedAdmin.username}
                      </Text>
                      <Text
                        style={[
                          styles.selectedUserSubtitle,
                          { color: colors.copy },
                        ]}
                        variant="bodySmall"
                      >
                        {getUserLabel(selectedAdmin)}
                      </Text>
                    </View>
                    <Chip
                      compact
                      style={styles.statusChip}
                      textStyle={styles.statusChipText}
                    >
                      Responsable
                    </Chip>
                  </Surface>
                ) : null}

                {canEditResponsible ? (
                  <Button
                    icon="account-switch-outline"
                    mode="outlined"
                    onPress={() => setAdminPickerVisible(true)}
                    style={styles.userPickerButton}
                  >
                    {selectedAdmin
                      ? "Cambiar responsable"
                      : "Seleccionar responsable"}
                  </Button>
                ) : (
                  <Surface
                    elevation={0}
                    style={[
                      styles.readOnlyNote,
                      { backgroundColor: colors.readOnlySurface },
                    ]}
                  >
                    <Text
                      style={{ color: colors.readOnlyText }}
                      variant="bodySmall"
                    >
                      Solo carlosmbinf puede cambiar quién recibe este aviso.
                    </Text>
                  </Surface>
                )}
                <HelperText type="error" visible={Boolean(errors.adminId)}>
                  {errors.adminId}
                </HelperText>
              </Surface>

              <Surface
                elevation={0}
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: colors.sectionSurface,
                    borderColor: colors.sectionBorder,
                  },
                ]}
              >
                <Text
                  style={[styles.sectionTitle, { color: colors.sectionTitle }]}
                  variant="titleSmall"
                >
                  Mensajes automáticos
                </Text>
                <TextInput
                  label="Mensaje cuando se conecte"
                  mode="outlined"
                  multiline
                  numberOfLines={4}
                  onChangeText={setConnectedMessage}
                  placeholder="Ej.: Tu VPN ya está activa."
                  value={connectedMessage}
                />
                <HelperText type="error" visible={Boolean(errors.connected)}>
                  {errors.connected}
                </HelperText>

                <TextInput
                  label="Mensaje cuando se desconecte"
                  mode="outlined"
                  multiline
                  numberOfLines={4}
                  onChangeText={setDisconnectedMessage}
                  placeholder="Ej.: Tu VPN se desconectó."
                  style={styles.multilineField}
                  value={disconnectedMessage}
                />
                <HelperText type="error" visible={Boolean(errors.disconnected)}>
                  {errors.disconnected}
                </HelperText>
              </Surface>

              <Surface
                elevation={0}
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: colors.sectionSurface,
                    borderColor: colors.sectionBorder,
                  },
                ]}
              >
                <Text
                  style={[styles.sectionTitle, { color: colors.sectionTitle }]}
                  variant="titleSmall"
                >
                  Alcance administrativo
                </Text>
                <View style={styles.metaRow}>
                  <IconButton
                    icon="shield-account-outline"
                    size={20}
                    iconColor={colors.subdued}
                  />
                  <View style={styles.metaCopy}>
                    <Text
                      style={[styles.metaLabel, { color: colors.subdued }]}
                      variant="labelMedium"
                    >
                      Responsable de la regla
                    </Text>
                    <Text
                      style={[styles.metaValue, { color: colors.title }]}
                      variant="bodyMedium"
                    >
                      {selectedAdmin?.username ||
                        currentUsername ||
                        "Administrador actual"}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.metaHint, { color: colors.copy }]}
                  variant="bodySmall"
                >
                  El responsable será quien reciba la alerta y pueda dar
                  seguimiento a la situación del usuario.
                </Text>
              </Surface>
            </ScrollView>
          </Dialog.ScrollArea>

          <Dialog.Actions style={styles.actionsRow}>
            <Button disabled={saving} onPress={onDismiss}>
              Cancelar
            </Button>
            <Button
              disabled={saving}
              icon={saving ? undefined : "content-save-outline"}
              mode="contained"
              onPress={handleSave}
            >
              {saving
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Guardar regla"}
            </Button>
          </Dialog.Actions>

          {saving ? (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator animating size="large" />
            </View>
          ) : null}
        </Dialog>
      </Portal>

      <UserPickerDialog
        availableUsers={sortedUsers}
        colors={colors}
        onDismiss={() => setPickerVisible(false)}
        onSelectUser={(user) => {
          setSelectedUserId(user._id);
          setErrors((current) => ({ ...current, userId: "" }));
          setPickerVisible(false);
        }}
        searchQuery={userSearchQuery}
        selectedUserId={selectedUserId}
        setSearchQuery={setUserSearchQuery}
        visible={pickerVisible}
      />

      <UserPickerDialog
        availableUsers={sortedAdmins}
        colors={colors}
        onDismiss={() => setAdminPickerVisible(false)}
        onSelectUser={(user) => {
          setSelectedAdminId(user._id);
          setErrors((current) => ({ ...current, adminId: "" }));
          setAdminPickerVisible(false);
        }}
        searchQuery={adminSearchQuery}
        selectedUserId={selectedAdminId}
        setSearchQuery={setAdminSearchQuery}
        visible={adminPickerVisible}
      />
    </>
  );
};

const styles = StyleSheet.create({
  dialog: {
    alignSelf: "center",
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
  },
  dialogTitle: {
    paddingBottom: 0,
  },
  scrollArea: {
    paddingHorizontal: 0,
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 8,
    paddingHorizontal: 24,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  heroEyebrow: {
    color: "#93c5fd",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  heroTitle: {
    lineHeight: 26,
  },
  heroCopy: {
    lineHeight: 20,
  },
  sectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontWeight: "700",
  },
  selectionChip: {
    borderRadius: 999,
  },
  selectedUserCard: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectedUserCopy: {
    flex: 1,
    gap: 4,
    paddingRight: 12,
  },
  selectedUserTitle: {
    fontWeight: "700",
  },
  selectedUserSubtitle: {
    lineHeight: 18,
  },
  statusChip: {
    borderRadius: 999,
  },
  statusChipText: {
    fontSize: 12,
  },
  userPickerButton: {
    alignSelf: "flex-start",
  },
  multilineField: {
    marginTop: 4,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    marginLeft: -8,
  },
  metaCopy: {
    flex: 1,
    gap: 2,
  },
  metaLabel: {
    textTransform: "uppercase",
  },
  metaValue: {
    fontWeight: "600",
  },
  metaHint: {
    lineHeight: 19,
  },
  readOnlyNote: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  actionsRow: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.12)",
    justifyContent: "center",
  },
  pickerDialog: {
    alignSelf: "center",
    borderRadius: 24,
    width: "92%",
  },
  pickerTitle: {
    paddingBottom: 0,
  },
  pickerList: {
    marginTop: 14,
    maxHeight: 360,
  },
  pickerListContent: {
    gap: 10,
    paddingBottom: 6,
  },
  pickerUserCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pickerUserCopy: {
    flex: 1,
    gap: 4,
    paddingRight: 10,
  },
  pickerUserTitle: {
    fontWeight: "700",
  },
  pickerUserSubtitle: {
    lineHeight: 18,
  },
  pickerUserChip: {
    borderRadius: 999,
  },
  pickerUserChipText: {
    fontSize: 12,
  },
  pickerEmptyState: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  pickerEmptyTitle: {
    marginBottom: 4,
  },
  pickerEmptyCopy: {
    lineHeight: 18,
  },
});

export default NotificacionRuleDialog;
