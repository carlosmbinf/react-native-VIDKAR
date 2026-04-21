import MeteorBase from "@meteorrn/core";
import React from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    View,
    useWindowDimensions,
} from "react-native";
import {
    Button,
    Chip,
    Dialog,
    Divider,
    HelperText,
    IconButton,
    Portal,
    Surface,
    Switch,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Meteor = MeteorBase;

const formatPropertyDate = (value) => {
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

const buildPalette = (isDark, theme) => ({
  dialogSurface: isDark
    ? theme.colors.elevation?.level2 || theme.colors.surface
    : "#fbfcff",
  dialogBorder: isDark ? "rgba(96, 165, 250, 0.2)" : "rgba(59, 130, 246, 0.12)",
  title: isDark ? "#f8fafc" : "#0f172a",
  copy: isDark ? "#cbd5e1" : "#475569",
  subdued: isDark ? "#94a3b8" : "#64748b",
  icon: isDark ? "#cbd5e1" : "#64748b",
  heroSurface: isDark ? "#0f172a" : "#eef4ff",
  heroBorder: isDark ? "rgba(56, 189, 248, 0.2)" : "rgba(59, 130, 246, 0.12)",
  heroMetaSurface: isDark
    ? "rgba(15, 23, 42, 0.92)"
    : "rgba(255, 255, 255, 0.88)",
  heroMetaText: isDark ? "#bfdbfe" : "#1d4ed8",
  sectionSurface: isDark
    ? "rgba(30, 41, 59, 0.84)"
    : "rgba(148, 163, 184, 0.08)",
  sectionBorder: isDark
    ? "rgba(125, 211, 252, 0.16)"
    : "rgba(59, 130, 246, 0.08)",
  sectionTitle: isDark ? "#bfdbfe" : "#1d4ed8",
  inputSurface: isDark ? "rgba(15, 23, 42, 0.9)" : "#ffffff",
  statusActiveSurface: isDark
    ? "rgba(16, 185, 129, 0.18)"
    : "rgba(16, 185, 129, 0.12)",
  statusActiveText: isDark ? "#bbf7d0" : "#047857",
  statusInactiveSurface: isDark
    ? "rgba(148, 163, 184, 0.18)"
    : "rgba(148, 163, 184, 0.14)",
  statusInactiveText: isDark ? "#cbd5e1" : "#475569",
  readOnlySurface: isDark
    ? "rgba(37, 99, 235, 0.18)"
    : "rgba(37, 99, 235, 0.1)",
  readOnlyText: isDark ? "#dbeafe" : "#1d4ed8",
  actionButtonSurface: isDark
    ? "rgba(37, 99, 235, 0.26)"
    : "rgba(37, 99, 235, 0.14)",
  actionButtonText: isDark ? "#dbeafe" : "#1d4ed8",
  destructiveText: isDark ? "#fca5a5" : "#dc2626",
  divider: isDark ? "rgba(148, 163, 184, 0.14)" : "rgba(148, 163, 184, 0.22)",
});

const PropertyDialog = ({
  adminDisplay,
  canManage,
  currentUserId,
  onDismiss,
  property,
  visible,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const isDark = theme.dark;
  const colors = React.useMemo(
    () => buildPalette(isDark, theme),
    [isDark, theme],
  );
  const isEdit = Boolean(property?._id);
  const shortId = property?._id ? String(property._id).slice(-8) : null;
  const dialogWidth = Math.min(windowWidth - 24, 780);
  const dialogMaxHeight = Math.max(
    460,
    windowHeight - Math.max(insets.top, 12) - Math.max(insets.bottom, 12) - 24,
  );
  const scrollAreaMaxHeight = Math.max(240, dialogMaxHeight - 220);

  const [type, setType] = React.useState("");
  const [clave, setClave] = React.useState("");
  const [valor, setValor] = React.useState("");
  const [comentario, setComentario] = React.useState("");
  const [active, setActive] = React.useState(true);
  const [idAdminConfigurado, setIdAdminConfigurado] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState({
    type: "",
    clave: "",
    idAdmin: "",
  });

  React.useEffect(() => {
    if (property) {
      setType(property.type || "");
      setClave(property.clave || "");
      setValor(String(property.valor ?? ""));
      setComentario(property.comentario || "");
      setActive(property.active !== false);
      setIdAdminConfigurado(property.idAdminConfigurado || currentUserId || "");
    } else {
      setType("");
      setClave("");
      setValor("");
      setComentario("");
      setActive(true);
      setIdAdminConfigurado(currentUserId || "");
    }

    setErrors({ type: "", clave: "", idAdmin: "" });
    setLoading(false);
  }, [property, currentUserId, visible]);

  const validateFields = React.useCallback(() => {
    const nextErrors = { type: "", clave: "", idAdmin: "" };
    let valid = true;

    if (!type.trim()) {
      nextErrors.type = "El tipo es obligatorio.";
      valid = false;
    }

    if (!clave.trim()) {
      nextErrors.clave = "La clave es obligatoria.";
      valid = false;
    }

    if (!isEdit && !idAdminConfigurado.trim()) {
      nextErrors.idAdmin = "El administrador configurador es obligatorio.";
      valid = false;
    }

    setErrors(nextErrors);
    return valid;
  }, [clave, idAdminConfigurado, isEdit, type]);

  const handleSave = React.useCallback(() => {
    if (!canManage) {
      onDismiss();
      return;
    }

    if (!validateFields()) {
      return;
    }

    setLoading(true);

    const payload = {
      type: type.trim(),
      clave: clave.trim(),
      valor: valor.trim(),
      comentario: comentario.trim(),
      active: Boolean(active),
      idAdminConfigurado: isEdit
        ? property?.idAdminConfigurado || currentUserId || ""
        : idAdminConfigurado.trim() || currentUserId || "",
    };

    const callback = (error) => {
      setLoading(false);

      if (error) {
        Alert.alert(
          "No se pudo guardar",
          error.reason || "La property no pudo persistirse correctamente.",
        );
        return;
      }

      onDismiss();
    };

    if (isEdit && property?._id) {
      Meteor.call("property.update", property._id, payload, callback);
      return;
    }

    Meteor.call("property.insert", payload, callback);
  }, [
    active,
    canManage,
    clave,
    comentario,
    currentUserId,
    idAdminConfigurado,
    isEdit,
    onDismiss,
    property?._id,
    property?.idAdminConfigurado,
    type,
    validateFields,
    valor,
  ]);

  const handleDelete = React.useCallback(() => {
    if (!canManage || !property?._id) {
      return;
    }

    Alert.alert(
      "Eliminar property",
      "Esta configuración se eliminará de forma permanente. Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            setLoading(true);
            Meteor.call("property.delete", property._id, (error) => {
              setLoading(false);

              if (error) {
                Alert.alert(
                  "No se pudo eliminar",
                  error.reason ||
                    "La property no pudo eliminarse correctamente.",
                );
                return;
              }

              onDismiss();
            });
          },
        },
      ],
    );
  }, [canManage, onDismiss, property?._id]);

  const closeLabel = canManage ? "Cancelar" : "Cerrar";

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onDismiss}
        dismissable
        dismissableBackButton
        style={[
          styles.dialog,
          {
            backgroundColor: colors.dialogSurface,
            borderColor: colors.dialogBorder,
            marginTop: Math.max(insets.top, 12),
            marginBottom: Math.max(insets.bottom, 12),
            maxHeight: dialogMaxHeight,
            width: dialogWidth,
          },
        ]}
      >
        <View style={styles.dialogHeaderWrap}>
          <View style={styles.dialogHeader}>
            <View style={styles.dialogHeaderCopy}>
              <Text
                variant="labelMedium"
                style={[styles.dialogKicker, { color: colors.heroMetaText }]}
              >
                {isEdit ? "Configuración existente" : "Nueva configuración"}
              </Text>
              <Text
                variant="titleLarge"
                style={[styles.dialogTitle, { color: colors.title }]}
              >
                {canManage
                  ? isEdit
                    ? "Editar property"
                    : "Crear property"
                  : "Detalle de property"}
              </Text>
              <Text
                variant="bodyMedium"
                style={[styles.dialogSubtitle, { color: colors.copy }]}
              >
                Administra tipo, clave, valor y estado sin perder trazabilidad
                del documento.
              </Text>
            </View>
            <IconButton
              icon="close"
              onPress={onDismiss}
              iconColor={colors.icon}
              style={[
                styles.dialogCloseButton,
                { backgroundColor: colors.heroMetaSurface },
              ]}
            />
          </View>
        </View>

        <Divider style={{ backgroundColor: colors.divider }} />

        <Dialog.ScrollArea style={styles.dialogScrollArea}>
          <ScrollView
            style={[styles.dialogScroll, { maxHeight: scrollAreaMaxHeight }]}
            contentContainerStyle={styles.dialogContent}
            showsVerticalScrollIndicator={false}
          >
            <Surface
              style={[
                styles.heroCard,
                {
                  backgroundColor: colors.heroSurface,
                  borderColor: colors.heroBorder,
                },
              ]}
              elevation={0}
            >
              <View style={styles.heroTopRow}>
                <Chip
                  compact
                  style={[
                    styles.metaChip,
                    { backgroundColor: colors.heroMetaSurface },
                  ]}
                  textStyle={[
                    styles.metaChipText,
                    { color: colors.heroMetaText },
                  ]}
                >
                  {isEdit
                    ? formatPropertyDate(property?.createdAt)
                    : "Lista para guardar"}
                </Chip>
                <Chip
                  compact
                  style={[
                    styles.metaChip,
                    {
                      backgroundColor: active
                        ? colors.statusActiveSurface
                        : colors.statusInactiveSurface,
                    },
                  ]}
                  textStyle={{
                    color: active
                      ? colors.statusActiveText
                      : colors.statusInactiveText,
                  }}
                >
                  {active ? "Activa" : "Inactiva"}
                </Chip>
              </View>

              <View style={styles.heroMainRow}>
                <View style={styles.heroPrimary}>
                  <Text
                    variant="headlineSmall"
                    style={[styles.heroTitle, { color: colors.title }]}
                  >
                    {clave || "Sin clave"}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[styles.heroSupport, { color: colors.copy }]}
                  >
                    {type || "Sin tipo definido"}
                  </Text>
                </View>
                <View style={styles.heroMetaStack}>
                  <Text
                    variant="labelSmall"
                    style={[styles.heroMetaLabel, { color: colors.subdued }]}
                  >
                    ID
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={[styles.heroMetaValue, { color: colors.title }]}
                  >
                    {shortId || "Nuevo"}
                  </Text>
                </View>
              </View>
            </Surface>

            {isEdit ? (
              <Surface
                style={[
                  styles.infoCard,
                  {
                    backgroundColor: colors.sectionSurface,
                    borderColor: colors.sectionBorder,
                  },
                ]}
                elevation={0}
              >
                <View style={styles.sectionHeader}>
                  <Text
                    variant="labelLarge"
                    style={[
                      styles.sectionTitle,
                      { color: colors.sectionTitle },
                    ]}
                  >
                    Auditoría
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={[styles.sectionCaption, { color: colors.copy }]}
                  >
                    Contexto del documento y responsable original.
                  </Text>
                </View>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text
                      variant="labelMedium"
                      style={[styles.infoLabel, { color: colors.subdued }]}
                    >
                      Creado
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={[styles.infoValue, { color: colors.title }]}
                    >
                      {formatPropertyDate(property?.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text
                      variant="labelMedium"
                      style={[styles.infoLabel, { color: colors.subdued }]}
                    >
                      Admin
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={[styles.infoValue, { color: colors.title }]}
                    >
                      {adminDisplay || idAdminConfigurado || "Sin dato"}
                    </Text>
                  </View>
                </View>
                <Chip
                  compact
                  style={[
                    styles.readOnlyChip,
                    { backgroundColor: colors.readOnlySurface },
                  ]}
                  textStyle={{ color: colors.readOnlyText }}
                >
                  Tipo, clave y administrador configurador quedan bloqueados en
                  edición.
                </Chip>
              </Surface>
            ) : null}

            <Surface
              style={[
                styles.formCard,
                {
                  backgroundColor: colors.sectionSurface,
                  borderColor: colors.sectionBorder,
                },
              ]}
              elevation={0}
            >
              <View style={styles.sectionHeader}>
                <Text
                  variant="labelLarge"
                  style={[styles.sectionTitle, { color: colors.sectionTitle }]}
                >
                  Identificadores
                </Text>
                <Text
                  variant="bodySmall"
                  style={[styles.sectionCaption, { color: colors.copy }]}
                >
                  Claves estructurales del documento de configuración.
                </Text>
              </View>

              <TextInput
                label="Tipo"
                mode="outlined"
                value={type}
                onChangeText={(nextValue) => {
                  setType(nextValue);
                  if (errors.type) {
                    setErrors((current) => ({ ...current, type: "" }));
                  }
                }}
                disabled={!canManage || isEdit || loading}
                error={Boolean(errors.type)}
                style={styles.input}
                placeholder="CONFIG, REMESA, METODO_PAGO..."
              />
              <HelperText type="error" visible={Boolean(errors.type)}>
                {errors.type}
              </HelperText>

              <TextInput
                label="Clave"
                mode="outlined"
                value={clave}
                onChangeText={(nextValue) => {
                  setClave(nextValue);
                  if (errors.clave) {
                    setErrors((current) => ({ ...current, clave: "" }));
                  }
                }}
                disabled={!canManage || isEdit || loading}
                error={Boolean(errors.clave)}
                style={styles.input}
                placeholder="LOGIN_WITH_GOOGLE, TARJETA_CUP_123..."
              />
              <HelperText type="error" visible={Boolean(errors.clave)}>
                {errors.clave}
              </HelperText>

              {!isEdit ? (
                <>
                  <TextInput
                    label="ID administrador configurador"
                    mode="outlined"
                    value={idAdminConfigurado}
                    onChangeText={(nextValue) => {
                      setIdAdminConfigurado(nextValue);
                      if (errors.idAdmin) {
                        setErrors((current) => ({ ...current, idAdmin: "" }));
                      }
                    }}
                    disabled={!canManage || loading}
                    error={Boolean(errors.idAdmin)}
                    style={styles.input}
                    placeholder="Se autocompleta con el usuario actual"
                    left={<TextInput.Icon icon="account-key" />}
                  />
                  <HelperText type="error" visible={Boolean(errors.idAdmin)}>
                    {errors.idAdmin}
                  </HelperText>
                </>
              ) : null}
            </Surface>

            <Surface
              style={[
                styles.formCard,
                {
                  backgroundColor: colors.sectionSurface,
                  borderColor: colors.sectionBorder,
                },
              ]}
              elevation={0}
            >
              <View style={styles.sectionHeader}>
                <Text
                  variant="labelLarge"
                  style={[styles.sectionTitle, { color: colors.sectionTitle }]}
                >
                  Contenido
                </Text>
                <Text
                  variant="bodySmall"
                  style={[styles.sectionCaption, { color: colors.copy }]}
                >
                  Valor operativo y contexto descriptivo de la property.
                </Text>
              </View>

              <TextInput
                label="Valor"
                mode="outlined"
                value={valor}
                onChangeText={setValor}
                disabled={!canManage || loading}
                style={styles.input}
                multiline
                numberOfLines={3}
                placeholder="Contenido principal asociado a la clave"
              />

              <TextInput
                label="Comentario"
                mode="outlined"
                value={comentario}
                onChangeText={setComentario}
                disabled={!canManage || loading}
                style={styles.input}
                multiline
                numberOfLines={4}
                placeholder="Notas internas, observaciones o contexto adicional"
              />
            </Surface>

            <Surface
              style={[
                styles.formCard,
                {
                  backgroundColor: colors.sectionSurface,
                  borderColor: colors.sectionBorder,
                },
              ]}
              elevation={0}
            >
              <View style={styles.sectionHeader}>
                <Text
                  variant="labelLarge"
                  style={[styles.sectionTitle, { color: colors.sectionTitle }]}
                >
                  Estado
                </Text>
                <Text
                  variant="bodySmall"
                  style={[styles.sectionCaption, { color: colors.copy }]}
                >
                  Controla si la property queda disponible para el sistema.
                </Text>
              </View>

              <View
                style={[
                  styles.switchRow,
                  { backgroundColor: colors.inputSurface },
                ]}
              >
                <View style={styles.switchCopy}>
                  <Text variant="titleSmall" style={{ color: colors.title }}>
                    Property activa
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.copy }}>
                    {active
                      ? "La configuración se considera habilitada para consumo operativo."
                      : "La configuración queda archivada o deshabilitada temporalmente."}
                  </Text>
                </View>
                <Switch
                  value={active}
                  onValueChange={setActive}
                  disabled={!canManage || loading}
                />
              </View>
            </Surface>
          </ScrollView>
        </Dialog.ScrollArea>

        <Divider style={{ backgroundColor: colors.divider }} />

        <Dialog.Actions style={styles.dialogActions}>
          {isEdit && canManage ? (
            <Button
              onPress={handleDelete}
              textColor={colors.destructiveText}
              disabled={loading}
              icon="delete-outline"
            >
              Eliminar
            </Button>
          ) : null}
          <View style={styles.actionsSpacer} />
          <Button
            mode="outlined"
            buttonColor={colors.actionButtonSurface}
            textColor={colors.actionButtonText}
            onPress={onDismiss}
            disabled={loading}
            contentStyle={styles.dialogActionContent}
            style={styles.dialogActionButton}
          >
            {closeLabel}
          </Button>
          {canManage ? (
            <Button
              mode="contained"
              onPress={handleSave}
              loading={loading}
              disabled={loading}
              icon={isEdit ? "content-save-outline" : "plus"}
              contentStyle={styles.dialogActionContent}
              style={styles.dialogActionButton}
            >
              {isEdit ? "Guardar" : "Crear"}
            </Button>
          ) : null}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    alignSelf: "center",
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
  },
  dialogHeaderWrap: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  dialogHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  dialogHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  dialogKicker: {
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  dialogTitle: {
    fontWeight: "800",
  },
  dialogSubtitle: {
    lineHeight: 20,
  },
  dialogCloseButton: {
    margin: 0,
  },
  dialogScrollArea: {
    paddingHorizontal: 0,
  },
  dialogScroll: {
    flexGrow: 0,
  },
  dialogContent: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 16,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  heroTopRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  metaChip: {
    borderRadius: 999,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  heroMainRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-end",
  },
  heroPrimary: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    fontWeight: "800",
  },
  heroSupport: {
    lineHeight: 20,
  },
  heroMetaStack: {
    minWidth: 78,
    alignItems: "flex-end",
    gap: 2,
  },
  heroMetaLabel: {
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroMetaValue: {
    fontWeight: "700",
  },
  infoCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  formCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionTitle: {
    fontWeight: "800",
  },
  sectionCaption: {
    lineHeight: 18,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  infoItem: {
    flexGrow: 1,
    minWidth: 180,
    gap: 4,
  },
  infoLabel: {
    fontWeight: "700",
  },
  infoValue: {
    fontWeight: "600",
  },
  readOnlyChip: {
    alignSelf: "flex-start",
  },
  input: {
    marginBottom: 2,
  },
  switchRow: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  switchCopy: {
    flex: 1,
    gap: 4,
  },
  dialogActions: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionsSpacer: {
    flex: 1,
  },
  dialogActionButton: {
    marginLeft: 8,
  },
  dialogActionContent: {
    minHeight: 42,
  },
});

export default PropertyDialog;
