import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Host, Switch as NativeSwitch } from "@expo/ui";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { NestableDraggableFlatList } from "react-native-draggable-flatlist";
import { Button, Card, Chip, Divider, Surface, Text, useTheme } from "react-native-paper";

import { normalizeHomeServices, serializeHomeServices } from "../../../services/homeServices";
import { Meteor } from "../../../services/meteor/client.native";

const callMeteor = (name, ...args) => new Promise((resolve, reject) => {
  Meteor.call(name, ...args, (error, result) => (error ? reject(error) : resolve(result)));
});

const WelcomeServicesCard = ({ item, styles: profileStyles, accentColor, onOpenCommerceCategories }) => {
  const theme = useTheme();
  const [services, setServices] = useState(() => normalizeHomeServices(item?.serviciosInicio));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setServices(normalizeHomeServices(item?.serviciosInicio));
  }, [item?._id, item?.serviciosInicio]);

  const saveServices = useCallback(async (nextServices) => {
    if (!item?._id || saving) return;
    const normalized = normalizeHomeServices(nextServices);
    setServices(normalized);
    setSaving(true);
    setFeedback(null);
    try {
      const result = await callMeteor(
        "users.adminSetHomeServices",
        item._id,
        serializeHomeServices(normalized),
      );
      setServices(normalizeHomeServices(result?.serviciosInicio || normalized));
      setFeedback({ kind: "success", text: "Preferencias de bienvenida guardadas." });
    } catch (error) {
      setServices(normalizeHomeServices(item?.serviciosInicio));
      setFeedback({
        kind: "error",
        text: error?.reason || error?.message || "No se pudieron guardar las preferencias.",
      });
    } finally {
      setSaving(false);
    }
  }, [item?._id, item?.serviciosInicio, saving]);

  const toggleVisibility = (serviceId, visible) => {
    saveServices(services.map((service) => (
      service.id === serviceId ? { ...service, visible } : service
    )));
  };

  const renderService = ({ item: service, drag, isActive, getIndex }) => {
    const index = getIndex?.() ?? 0;
    const rowSurface = theme.dark ? "rgba(30, 41, 59, 0.72)" : "#f8fafc";
    const rowBorder = theme.dark ? "rgba(148, 163, 184, 0.18)" : "rgba(15, 23, 42, 0.08)";

    return (
      <Surface
        elevation={isActive ? 3 : 0}
        style={[
          ui.row,
          { backgroundColor: rowSurface, borderColor: isActive ? accentColor || theme.colors.primary : rowBorder },
          isActive ? ui.rowActive : null,
        ]}
      >
        <Pressable
          accessibilityHint="Mantén pulsado y arrastra para cambiar el orden"
          accessibilityLabel={`Reordenar ${service.label}, posición ${index + 1}`}
          accessibilityRole="button"
          delayLongPress={180}
          disabled={saving}
          onLongPress={drag}
          onPress={service.id === "COMERCIOS" ? onOpenCommerceCategories : undefined}
          style={({ pressed }) => [ui.dragHandle, pressed ? ui.dragHandlePressed : null]}
        >
          <MaterialCommunityIcons
            color={theme.dark ? "#cbd5e1" : "#64748b"}
            name="drag-vertical"
            size={23}
          />
        </Pressable>
        <View style={ui.serviceIcon}>
          <MaterialCommunityIcons
            color={accentColor || theme.colors.primary}
            name={service.icon}
            size={20}
          />
        </View>
        <View style={ui.copy}>
          {service.id === "COMERCIOS" && onOpenCommerceCategories ? (
            <View style={ui.categoryLink}>
              <Text style={{ color: theme.colors.onSurface, fontWeight: "800" }} variant="titleSmall">{service.label}</Text>
              <Button
                accessibilityLabel="Organizar categorías de Comercios"
                compact
                icon="arrow-right"
                onPress={onOpenCommerceCategories}
              >
                Organizar categorías
              </Button>
            </View>
          ) : (
            <>
              <Text style={{ color: theme.colors.onSurface, fontWeight: "800" }} variant="titleSmall">{service.label}</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, lineHeight: 17 }} variant="bodySmall">{service.description}</Text>
            </>
          )}
        </View>
        <View style={ui.visibility}>
          <Text
            style={{ color: service.visible ? theme.colors.primary : theme.colors.onSurfaceVariant }}
            variant="labelSmall"
          >
            {service.visible ? "Visible" : "Oculto"}
          </Text>
          <Host matchContents seedColor={accentColor || theme.colors.primary}>
            <NativeSwitch
              disabled={saving}
              label={service.visible ? "Mostrar" : "Ocultar"}
              onValueChange={(visible) => toggleVisibility(service.id, visible)}
              testID={`welcome-service-${service.id.toLowerCase()}`}
              value={service.visible}
            />
          </Host>
        </View>
      </Surface>
    );
  };

  if (!item?._id) return null;

  return (
    <Card elevation={5} style={[profileStyles?.cards, ui.card]} testID="welcome-services-admin-card">
      <View style={[ui.accentBar, { backgroundColor: accentColor || theme.colors.primary }]} />
      <Card.Content style={ui.content}>
        <View style={ui.header}>
          <View style={ui.headerIcon}>
            <MaterialCommunityIcons color={accentColor || theme.colors.primary} name="view-dashboard-edit-outline" size={24} />
          </View>
          <View style={ui.headerCopy}>
            <Text style={{ color: theme.colors.onSurfaceVariant }} variant="labelSmall">PANTALLA DE BIENVENIDA</Text>
            <Text style={{ color: theme.colors.onSurface, fontWeight: "900" }} variant="titleLarge">Servicios del usuario</Text>
          </View>
          <Chip compact icon="shield-account-outline">Admin</Chip>
        </View>
        <Text style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20 }} variant="bodySmall">
          Elige qué servicios aparecen y mantén pulsado el asa para ordenar las secciones. Por defecto, Comercios va primero y Recargas Cubacel debajo.
        </Text>
        <Divider style={ui.divider} />
        <NestableDraggableFlatList
          activationDistance={10}
          data={services}
          keyExtractor={(service) => service.id}
          onDragEnd={({ data }) => saveServices(data)}
          renderItem={renderService}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />
        <View style={ui.footer}>
          <MaterialCommunityIcons
            color={saving ? theme.colors.primary : theme.colors.onSurfaceVariant}
            name={saving ? "cloud-sync-outline" : "gesture-tap-hold"}
            size={17}
          />
          <Text
            accessibilityRole={feedback?.kind === "error" ? "alert" : undefined}
            selectable={feedback?.kind === "error"}
            style={{ color: feedback?.kind === "error" ? theme.colors.error : theme.colors.onSurfaceVariant, flex: 1 }}
            variant="bodySmall"
          >
            {saving ? "Guardando preferencias…" : feedback?.text || `Configurando bienvenida para @${item.username || "usuario"}.`}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};

const ui = StyleSheet.create({
  card: { marginBottom: 0, overflow: "hidden" },
  accentBar: { height: 4, width: "100%" },
  content: { gap: 12, paddingTop: 14 },
  header: { alignItems: "center", flexDirection: "row", gap: 10 },
  headerIcon: { alignItems: "center", borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  headerCopy: { flex: 1, gap: 2 },
  divider: { marginVertical: 2 },
  row: { alignItems: "center", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 8, marginBottom: 9, minHeight: 78, paddingHorizontal: 7, paddingVertical: 9 },
  rowActive: { opacity: 0.92, transform: [{ scale: 1.01 }] },
  dragHandle: { alignItems: "center", borderRadius: 12, justifyContent: "center", minHeight: 46, minWidth: 38 },
  dragHandlePressed: { opacity: 0.68 },
  serviceIcon: { alignItems: "center", borderRadius: 12, height: 38, justifyContent: "center", width: 38 },
  copy: { flex: 1, gap: 3, minWidth: 0 },
  categoryLink: { justifyContent: "center", minHeight: 48 },
  visibility: { alignItems: "center", gap: 2, justifyContent: "center", minWidth: 60 },
  footer: { alignItems: "center", flexDirection: "row", gap: 8, minHeight: 28 },
});

export default WelcomeServicesCard;
