import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { Host, Switch as NativeSwitch } from "@expo/ui";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { NestableDraggableFlatList, NestableScrollContainer } from "react-native-draggable-flatlist";
import { ActivityIndicator, Button, Surface, Text, useTheme } from "react-native-paper";

import { getGlobalCommerceHomeCategories, normalizeCommerceHomeCategories } from "../../services/commerceCategories";
import { CategoriasComercioCollection } from "../collections/collections";
import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";

const Meteor = /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (MeteorBase);
const USER_FIELDS = { _id: 1, username: 1, categoriasComercioInicio: 1 };

export default function CommerceCategoriesManagementScreen({ profileRoute, servicesRoute, headerBackgroundColor, global = false }) {
  const theme = useTheme();
  const inset = useAppHeaderContentInset();
  const params = useLocalSearchParams();
  const itemId = Array.isArray(params.item) ? params.item[0] : params.item;
  const viewer = Meteor.useTracker(() => Meteor.user(), []);
  const isAdmin = viewer?.profile?.role === "admin" || String(viewer?.username || "").toLowerCase() === "carlosmbinf";
  const canAccess = global ? String(viewer?.username || "").toLowerCase() === "carlosmbinf" : isAdmin;
  const { categories, item, ready } = Meteor.useTracker(() => {
    if (!canAccess || (!global && !itemId)) return { categories: [], item: null, ready: true };
    const usersHandle = global ? null : Meteor.subscribe("user", { _id: itemId }, { fields: USER_FIELDS });
    const categoriesHandle = Meteor.subscribe("categoriasComercioCatalogo");
    return {
      categories: CategoriasComercioCollection.find({ activa: { $ne: false } }, { fields: { _id: 1, activa: 1, nombre: 1, idCategoriaHeredada: 1, visibleEnInicio: 1, ordenInicio: 1 } }).fetch(),
      item: global ? null : Meteor.users.findOne(itemId, { fields: USER_FIELDS }) || null,
      ready: (usersHandle?.ready() ?? true) && categoriesHandle.ready(),
    };
  }, [canAccess, global, itemId]);
  const [entries, setEntries] = useState([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (ready) setEntries(global
      ? getGlobalCommerceHomeCategories(categories).map((entry) => ({
          ...entry,
          visible: categories.find((category) => category._id === entry.id)?.visibleEnInicio !== false,
        }))
      : normalizeCommerceHomeCategories(categories, item?.categoriasComercioInicio));
  }, [categories, global, item?.categoriasComercioInicio, item?._id, ready]);

  const persist = async (next) => {
    if (saving || (!global && !item?._id)) return;
    setEntries(next);
    setSaving(true);
    setFeedback(null);
    try {
      await new Promise((resolve, reject) => {
        const callback = (error, result) => error ? reject(error) : resolve(result);
        if (global) Meteor.call("comercio.categorias.configurarInicio", next.map(({ id, visible }) => ({ id, visible })), callback);
        else Meteor.call("users.adminSetCommerceHomeCategories", item._id, next.map(({ id }) => ({ id })), callback);
      });
      setFeedback({ error: false, text: global ? "Catálogo global actualizado." : "Orden guardado para este usuario." });
    } catch (error) {
      setEntries(global
        ? getGlobalCommerceHomeCategories(categories).map((entry) => ({ ...entry, visible: categories.find((category) => category._id === entry.id)?.visibleEnInicio !== false }))
        : normalizeCommerceHomeCategories(categories, item?.categoriasComercioInicio));
      setFeedback({ error: true, text: error?.reason || error?.message || "No se pudieron guardar las categorías." });
    } finally {
      setSaving(false);
    }
  };

  const backHref = !global && itemId ? `${servicesRoute}?item=${encodeURIComponent(itemId)}` : profileRoute;
  return (
    <Surface style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        backgroundColor={headerBackgroundColor}
        backHref={backHref}
        overlapContent
        showBackButton
        subtitle={global ? "Configuración para todos los usuarios" : item ? `Para @${item.username || "usuario"}` : "Personalización de comercios"}
        title={global ? "Categorías globales" : "Categorías del inicio"}
      />
      <NestableScrollContainer contentContainerStyle={[styles.content, { paddingTop: inset + 16 }]}>
        {!canAccess ? (
          <Text style={{ color: theme.colors.error }}>No tienes permiso para configurar estas categorías.</Text>
        ) : !ready ? (
          <ActivityIndicator size="large" />
        ) : !global && !item ? (
          <Text>Usuario no encontrado.</Text>
        ) : (
          <>
            <Text variant="titleLarge">{global ? "Orden y visibilidad global" : "Orden de las categorías"}</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }} variant="bodyMedium">
              {global
                ? "Mantén pulsado el asa para ordenar. Al ocultar una categoría, sus productos y toda su rama dejan de mostrarse, también por tiendas."
                : "Mantén pulsado el asa para ordenar las categorías para este usuario. Las ocultas globalmente conservan su posición para cuando vuelvan a mostrarse."}
            </Text>
            <Surface elevation={0} style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
              <MaterialCommunityIcons color={theme.colors.primary} name="storefront-outline" size={24} />
              <Text style={styles.label} variant="titleSmall">Tiendas · siempre primero</Text>
              <Text style={{ color: theme.colors.primary }} variant="labelSmall">Siempre visibles</Text>
            </Surface>
            {entries.length ? (
              <NestableDraggableFlatList
                activationDistance={10}
                data={entries}
                keyExtractor={(entry) => entry.id}
                onDragEnd={({ data }) => persist(data)}
                renderItem={({ item: entry, drag, isActive }) => (
                  <Surface elevation={isActive ? 3 : 0} style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                    <Pressable
                      accessibilityLabel={`Reordenar ${entry.label}`}
                      accessibilityHint="Mantén pulsado para mover la categoría"
                      accessibilityRole="button"
                      disabled={saving}
                      onLongPress={drag}
                      style={styles.handle}
                    >
                      <MaterialCommunityIcons color={theme.colors.onSurfaceVariant} name="drag-vertical" size={24} />
                    </Pressable>
                    <Text numberOfLines={2} style={styles.label} variant="bodyMedium">{entry.label}</Text>
                    {!global && !entry.visible ? <MaterialCommunityIcons accessibilityLabel="Oculta globalmente" color={theme.colors.onSurfaceVariant} name="eye-off-outline" size={20} /> : null}
                    {global ? (
                      <Host accessibilityLabel={`Mostrar ${entry.label}`} matchContents seedColor={theme.colors.primary}>
                        <NativeSwitch
                          disabled={saving}
                          onValueChange={(visible) => persist(entries.map((value) => value.id === entry.id ? { ...value, visible } : value))}
                          value={entry.visible}
                        />
                      </Host>
                    ) : null}
                  </Surface>
                )}
                scrollEnabled={false}
              />
            ) : <Text variant="bodyMedium">Todavía no hay categorías activas. Aparecerán aquí al crearlas.</Text>}
            {saving ? <ActivityIndicator /> : null}
            {feedback ? <Text accessibilityRole={feedback.error ? "alert" : undefined} style={{ color: feedback.error ? theme.colors.error : theme.colors.primary }}>{feedback.text}</Text> : null}
            <Button mode="outlined" onPress={() => persist(global
              ? getGlobalCommerceHomeCategories(categories).map((entry) => ({ ...entry, visible: categories.find((category) => category._id === entry.id)?.visibleEnInicio !== false }))
              : normalizeCommerceHomeCategories(categories, null))} disabled={saving || !entries.length}>
              Restablecer orden
            </Button>
          </>
        )}
      </NestableScrollContainer>
    </Surface>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: 16, paddingBottom: 32, paddingHorizontal: 16 },
  row: { alignItems: "center", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, marginBottom: 8, minHeight: 64, paddingHorizontal: 8 },
  handle: { alignItems: "center", justifyContent: "center", minHeight: 48, minWidth: 40 },
  label: { flex: 1, minWidth: 0 },
});
