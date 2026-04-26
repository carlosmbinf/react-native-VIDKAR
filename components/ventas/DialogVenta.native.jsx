import MeteorBase from "@meteorrn/core";
import { BlurView } from "expo-blur";
import React from "react";
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    Chip,
    Dialog,
    Divider,
    HelperText,
    IconButton,
    Portal,
    Surface,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VentasCollection } from "../collections/collections";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const toInputString = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
};

const toRawDateString = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toString();
};

const formatReadableDate = (value) => {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapVentaToViewModel = (venta) => {
  if (!venta) {
    return null;
  }

  const adminusername =
    venta.adminId === "SERVER"
      ? "SERVER"
      : Meteor.users.findOne(venta.adminId)?.username || "Desconocido";
  const userusername =
    Meteor.users.findOne(venta.userId)?.username || "Desconocido";

  return {
    ...venta,
    createdAt: venta.createdAt ? new Date(venta.createdAt) : null,
    cobrado: venta.cobrado === true,
    adminusername,
    userusername,
  };
};

const DialogVenta = ({ visible, hideDialog, ventaId }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const currentUsername = Meteor.useTracker(
    () => Meteor.user()?.username || "",
  );
  const isAdminPrincipal = currentUsername === "carlosmbinf";

  const { ready, venta } = Meteor.useTracker(() => {
    if (!ventaId) {
      return { ready: false, venta: null };
    }

    const ventaReady = Meteor.subscribe(
      "ventas",
      { _id: ventaId },
      { sort: { createdAt: -1 }, limit: 1 },
    ).ready();
    const ventaDoc = VentasCollection.findOne(ventaId);
    const userIds = [ventaDoc?.userId, ventaDoc?.adminId].filter(
      (value) => value && value !== "SERVER",
    );
    const usersReady =
      userIds.length > 0
        ? Meteor.subscribe(
            "user",
            { _id: { $in: userIds } },
            { fields: { _id: 1, username: 1 } },
          ).ready()
        : true;

    return {
      ready: ventaReady && usersReady,
      venta: mapVentaToViewModel(ventaDoc),
    };
  }, [ventaId]);

  const [precio, setPrecio] = React.useState("");
  const [comentario, setComentario] = React.useState("");
  const [ganancias, setGanancias] = React.useState("");
  const [admin, setAdmin] = React.useState("");
  const [user, setUser] = React.useState("");
  const [createdAt, setCreatedAt] = React.useState("");
  const [cobrado, setCobrado] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    setAdmin(toInputString(venta?.adminusername));
    setUser(toInputString(venta?.userusername));
    setPrecio(toInputString(venta?.precio));
    setComentario(toInputString(venta?.comentario));
    setGanancias(toInputString(venta?.gananciasAdmin));
    setCreatedAt(toRawDateString(venta?.createdAt));
    setCobrado(venta?.cobrado === true);
  }, [venta]);

  const canSave =
    isAdminPrincipal &&
    Boolean(precio?.trim()) &&
    Boolean(comentario?.trim()) &&
    Boolean(admin?.trim()) &&
    Boolean(user?.trim());

  const handleSavePress = () => {
    if (!isAdminPrincipal) {
      Alert.alert(
        "Acción restringida",
        "Solo carlosmbinf puede editar ventas desde esta pantalla.",
      );
      return;
    }

    if (!venta?._id) {
      Alert.alert(
        "Venta no disponible",
        "No se pudo identificar la venta para guardar los cambios.",
      );
      return;
    }

    const formData = {
      precio: safeNumber(precio),
      comentario,
      gananciasAdmin: safeNumber(ganancias),
    };

    const executeSave = () => {
      try {
        VentasCollection.update(venta._id, { $set: formData });
        hideDialog?.();
      } catch (error) {
        Alert.alert(
          "No se pudo guardar",
          error?.message || "Ocurrió un problema actualizando la venta.",
        );
      }
    };

    Alert.alert(
      "Confirmar edición",
      "Se actualizarán el precio, las ganancias y el comentario de esta venta. ¿Desea continuar?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Guardar",
          onPress: executeSave,
        },
      ],
    );
  };

  const executeDelete = () => {
    if (!isAdminPrincipal) {
      Alert.alert(
        "Acción restringida",
        "Solo carlosmbinf puede eliminar ventas desde esta pantalla.",
      );
      return;
    }

    if (!venta?._id) {
      Alert.alert(
        "Venta no disponible",
        "Reinténtelo nuevamente, no se obtuvo el ID de la venta.",
      );
      return;
    }

    setDeleting(true);
    Meteor.call("eliminarVenta", venta._id, (error) => {
      setDeleting(false);

      if (error) {
        Alert.alert(
          "No se pudo eliminar",
          error?.message || "Ocurrió un problema eliminando la venta.",
        );
        return;
      }

      hideDialog?.();
    });
  };

  const confirmDelete = () => {
    Alert.alert(
      "Eliminar venta",
      "Esta acción eliminará la venta seleccionada. ¿Desea continuar?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: executeDelete,
        },
      ],
    );
  };

  const isDarkMode = theme.dark;
  const sheetOverlay = isDarkMode
    ? "rgba(6, 12, 24, 0.62)"
    : "rgba(255, 255, 255, 0.58)";
  const sheetBorder = isDarkMode
    ? "rgba(226, 232, 240, 0.14)"
    : "rgba(15, 23, 42, 0.12)";
  const heroBackground = isDarkMode
    ? "rgba(15, 32, 61, 0.54)"
    : "rgba(238, 243, 255, 0.58)";
  const heroMetaBackground = isDarkMode
    ? "rgba(7, 18, 34, 0.42)"
    : "rgba(255, 255, 255, 0.48)";
  const stateCardBackground = isDarkMode
    ? "rgba(15, 23, 42, 0.46)"
    : "rgba(255, 255, 255, 0.5)";
  const statusColors = cobrado
    ? { background: "#d1fae5", text: "#065f46" }
    : { background: "#fff3cd", text: "#8a5a00" };
  const dialogWidth = Math.min(windowWidth - 24, 860);
  const dialogMaxHeight = Math.max(
    420,
    windowHeight - Math.max(insets.top, 12) - Math.max(insets.bottom, 12) - 24,
  );
  const scrollAreaMaxHeight = Math.max(220, dialogMaxHeight - 250);
  const isCompactDialog = dialogWidth < 560;

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={hideDialog}
        dismissable={true}
        dismissableBackButton
        style={[
          styles.dialog,
          {
            backgroundColor: "transparent",
            borderColor: sheetBorder,
            borderWidth: 1,
            marginTop: Math.max(insets.top, 12),
            marginBottom: Math.max(insets.bottom, 12),
            maxHeight: dialogMaxHeight,
            width: dialogWidth,
          },
        ]}
      >
        {isDarkMode ? (
          <BlurView
            intensity={48}
            tint="dark"
            style={StyleSheet.absoluteFill}
            experimentalBlurMethod={
              Platform.OS === "android" ? "dimezisBlurView" : undefined
            }
            renderToHardwareTextureAndroid={true}
          />
        ) : (
          <BlurView
            intensity={48}
            tint="light"
            style={StyleSheet.absoluteFill}
            experimentalBlurMethod={
              Platform.OS === "android" ? "dimezisBlurView" : undefined
            }
            renderToHardwareTextureAndroid={true}
          />
        )}
        <View
          pointerEvents="none"
          style={[styles.dialogTint, { backgroundColor: sheetOverlay }]}
        />
        <View style={styles.sheetHeader}>
          <View style={styles.sheetTitleBlock}>
            <Text variant="titleLarge" style={styles.sheetTitle}>
              Detalle de venta
            </Text>
            <Text variant="bodyMedium" style={styles.sheetSubtitle}>
              Edita precio, ganancias y comentario manteniendo intacto el
              contexto original de la venta.
            </Text>
            {!isAdminPrincipal ? (
              <Text variant="bodySmall" style={styles.restrictionCopy}>
                Esta vista se muestra en modo lectura.
              </Text>
            ) : null}
          </View>
          <IconButton icon="close" onPress={hideDialog} />
        </View>

        <Divider />

        <Dialog.ScrollArea style={styles.dialogScrollArea}>
          <ScrollView
            style={[styles.scroll, { maxHeight: scrollAreaMaxHeight }]}
            contentContainerStyle={[
              styles.scrollContent,
              isCompactDialog ? styles.scrollContentCompact : null,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!ventaId ? (
              <Surface
                style={[
                  styles.stateCard,
                  isCompactDialog ? styles.stateCardCompact : null,
                  { backgroundColor: stateCardBackground },
                ]}
              >
                <Text style={styles.stateTitle}>Sin venta seleccionada</Text>
                <Text style={styles.stateCopy}>
                  Selecciona una venta desde el listado para abrir su detalle.
                </Text>
              </Surface>
            ) : !ready && !venta ? (
              <Surface
                style={[
                  styles.stateCard,
                  isCompactDialog ? styles.stateCardCompact : null,
                  { backgroundColor: stateCardBackground },
                ]}
              >
                <ActivityIndicator size="large" color="#3f51b5" />
                <Text style={styles.stateTitle}>Cargando detalle</Text>
                <Text style={styles.stateCopy}>
                  Esperando los datos reactivos de la venta seleccionada.
                </Text>
              </Surface>
            ) : venta ? (
              <>
                <Surface
                  style={[
                    styles.heroCard,
                    isCompactDialog ? styles.heroCardCompact : null,
                    { backgroundColor: heroBackground },
                  ]}
                >
                  <View
                    style={[
                      styles.heroTopRow,
                      isCompactDialog ? styles.heroTopRowCompact : null,
                    ]}
                  >
                    <View style={styles.heroTextBlock}>
                      <Text style={styles.heroEyebrow}>
                        Venta {venta.type || "SIN TIPO"}
                      </Text>
                      <Text style={styles.heroId}>
                        {venta._id || "Sin identificador"}
                      </Text>
                    </View>
                    <Chip
                      compact
                      style={[
                        styles.statusChip,
                        { backgroundColor: statusColors.background },
                      ]}
                      textStyle={[
                        styles.statusChipText,
                        { color: statusColors.text },
                      ]}
                    >
                      {cobrado ? "Pagado" : "Pendiente"}
                    </Chip>
                  </View>

                  <View
                    style={[
                      styles.heroMetaGrid,
                      isCompactDialog ? styles.heroMetaGridCompact : null,
                    ]}
                  >
                    <Surface
                      elevation={0}
                      style={[
                        styles.heroMetaCard,
                        isCompactDialog ? styles.heroMetaCardCompact : null,
                        { backgroundColor: heroMetaBackground },
                      ]}
                    >
                      <Text style={styles.heroMetaLabel}>Fecha</Text>
                      <Text style={styles.heroMetaValue}>
                        {formatReadableDate(venta.createdAt)}
                      </Text>
                    </Surface>
                    <Surface
                      elevation={0}
                      style={[
                        styles.heroMetaCard,
                        isCompactDialog ? styles.heroMetaCardCompact : null,
                        { backgroundColor: heroMetaBackground },
                      ]}
                    >
                      <Text style={styles.heroMetaLabel}>Admin ID</Text>
                      <Text numberOfLines={1} style={styles.heroMetaValue}>
                        {venta.adminId || "-"}
                      </Text>
                    </Surface>
                    <Surface
                      elevation={0}
                      style={[
                        styles.heroMetaCard,
                        isCompactDialog ? styles.heroMetaCardCompact : null,
                        { backgroundColor: heroMetaBackground },
                      ]}
                    >
                      <Text style={styles.heroMetaLabel}>User ID</Text>
                      <Text numberOfLines={1} style={styles.heroMetaValue}>
                        {venta.userId || "-"}
                      </Text>
                    </Surface>
                  </View>
                </Surface>

                <View style={styles.sectionBlock}>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Contexto original
                  </Text>
                  <TextInput
                    label="Admin"
                    value={admin}
                    mode="outlined"
                    editable={false}
                    left={<TextInput.Icon icon="shield-account" />}
                  />
                  <TextInput
                    label="Usuario"
                    value={user}
                    mode="outlined"
                    editable={false}
                    left={<TextInput.Icon icon="account" />}
                  />
                  <TextInput
                    label="Fecha de creación"
                    value={createdAt}
                    mode="outlined"
                    editable={false}
                    multiline
                    left={<TextInput.Icon icon="calendar-clock" />}
                  />
                </View>

                <View style={styles.sectionBlock}>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Datos editables
                  </Text>
                  <TextInput
                    label="Precio"
                    value={precio}
                    onChangeText={setPrecio}
                    keyboardType="numeric"
                    mode="outlined"
                    editable={isAdminPrincipal}
                    left={<TextInput.Icon icon="cash-multiple" />}
                  />
                  <TextInput
                    label="Ganancias"
                    value={ganancias}
                    onChangeText={setGanancias}
                    keyboardType="numeric"
                    mode="outlined"
                    editable={isAdminPrincipal}
                    left={<TextInput.Icon icon="chart-line" />}
                  />
                  <TextInput
                    label="Comentario"
                    value={comentario}
                    onChangeText={setComentario}
                    mode="outlined"
                    multiline
                    editable={isAdminPrincipal}
                    left={<TextInput.Icon icon="comment-text-outline" />}
                  />
                  <HelperText type="info" visible>
                    {isAdminPrincipal
                      ? "El guardado actualiza la venta en la colección local con precio, comentario y ganancias."
                      : "La edición y eliminación están restringidas al administrador principal para evitar cambios accidentales."}
                  </HelperText>
                </View>
              </>
            ) : (
              <Surface
                style={[
                  styles.stateCard,
                  isCompactDialog ? styles.stateCardCompact : null,
                  { backgroundColor: stateCardBackground },
                ]}
              >
                <Text style={styles.stateTitle}>Venta no disponible</Text>
                <Text style={styles.stateCopy}>
                  No se encontraron datos para la venta seleccionada.
                </Text>
              </Surface>
            )}
          </ScrollView>
        </Dialog.ScrollArea>

        <Divider />

        <Dialog.Actions style={[styles.actionsRow]}>
          <Button
            textColor="red"
            mode="contained"
            icon="delete-outline"
            onPress={confirmDelete}
            contentStyle={styles.actionButtonContent}
            loading={deleting}
            disabled={deleting || !venta || !isAdminPrincipal}
            style={[
              styles.actionButton,
              styles.deleteButton,
              isCompactDialog ? styles.actionButtonCompact : null,
              { backgroundColor: theme.dark ? "#7f1d1d" : "#fcdcdc" },
            ]}
          >
            Eliminar
          </Button>
          <Button
            mode="contained"
            icon="content-save-outline"
            onPress={handleSavePress}
            contentStyle={styles.actionButtonContent}
            disabled={!canSave || deleting || !venta || !isAdminPrincipal}
            style={[
              styles.actionButton,
              styles.saveButton,
              isCompactDialog ? styles.actionButtonCompact : null,
            ]}
          >
            Guardar
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
    margin: 0,
    minWidth: 0,
  },
  actionButtonCompact: {
    width: "100%",
  },
  actionButtonContent: {
    minHeight: 44,
  },
  actionsRow: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    width: "100%",
  },
  actionsRowCompact: {
    // alignItems: "stretch",
    // flexDirection: "column",
  },
  deleteButton: {
    borderRadius: 16,
  },
  dialog: {
    alignSelf: "center",
    marginHorizontal: 12,
    overflow: "hidden",
  },
  dialogTint: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogScrollArea: {
    borderBottomWidth: 0,
    borderTopWidth: 0,
    paddingHorizontal: 0,
  },
  heroCard: {
    borderRadius: 24,
    gap: 16,
    padding: 18,
  },
  heroCardCompact: {
    gap: 12,
    padding: 14,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    opacity: 0.75,
    textTransform: "uppercase",
  },
  heroId: {
    fontSize: 18,
    fontWeight: "800",
  },
  heroMetaCard: {
    borderRadius: 18,
    elevation: 0,
    flex: 1,
    minWidth: 140,
    padding: 14,
  },
  heroMetaCardCompact: {
    minWidth: 0,
    padding: 12,
    width: "100%",
  },
  heroMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  heroMetaGridCompact: {
    flexDirection: "column",
    gap: 10,
  },
  heroMetaLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    opacity: 0.7,
    textTransform: "uppercase",
  },
  heroMetaValue: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  heroTextBlock: {
    flex: 1,
    gap: 6,
  },
  heroTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  heroTopRowCompact: {
    flexDirection: "column",
    gap: 10,
  },
  restrictionCopy: {
    color: "#b45309",
    lineHeight: 18,
  },
  saveButton: {
    borderRadius: 16,
  },
  scroll: {
    width: "100%",
  },
  scrollContent: {
    gap: 20,
    padding: 18,
  },
  scrollContentCompact: {
    gap: 16,
    padding: 14,
  },
  stateCard: {
    alignItems: "center",
    borderRadius: 24,
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  stateCardCompact: {
    paddingHorizontal: 16,
    paddingVertical: 22,
  },
  stateCopy: {
    lineHeight: 21,
    maxWidth: 420,
    opacity: 0.74,
    textAlign: "center",
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  sectionBlock: {
    gap: 12,
  },
  sectionTitle: {
    fontWeight: "800",
  },
  sheetHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  sheetSubtitle: {
    lineHeight: 20,
    opacity: 0.78,
  },
  sheetTitle: {
    fontWeight: "900",
  },
  sheetTitleBlock: {
    flex: 1,
    gap: 4,
  },
  statusChip: {
    alignSelf: "flex-start",
  },
  statusChipText: {
    fontWeight: "800",
  },
});

export default DialogVenta;
