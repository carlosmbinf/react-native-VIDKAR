import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { Host, Switch as NativeSwitch } from "@expo/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  FAB,
  IconButton,
  Snackbar,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useReducedMotion } from "react-native-reanimated";

import useDeferredScreenData from "../../../hooks/useDeferredScreenData";
import { useCurrentSession } from "../../../services/meteor/session.native";
import {
  buildCategoryTree,
  getCategoryPath,
} from "../../../services/commerceCategories";
import { CategoriasComercioCollection } from "../../collections/collections";
import { resolveSessionRoute, userHasEmpresaRole } from "../../navigator/sessionRoute";
import DrawerBottom from "../../drawer/DrawerBottom.native";
import EmpresaTopBar from "../components/EmpresaTopBar.native";
import { createEmpresaPalette, getEmpresaScreenMetrics } from "../styles/empresaTheme";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const CATEGORY_FIELDS = {
  _id: 1,
  activa: 1,
  createAt: 1,
  creadaPor: 1,
  idCategoriaHeredada: 1,
  nombre: 1,
};

const getFirstParam = (value) => {
  if (Array.isArray(value)) return value[0] || "";
  return typeof value === "string" ? value : "";
};

const callMeteorMethod = (methodName, ...args) =>
  new Promise((resolve, reject) => {
    Meteor.call(methodName, ...args, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });

const countDescendants = (category) =>
  (category?.children || []).reduce(
    (count, child) => count + 1 + countDescendants(child),
    0,
  );

const getErrorMessage = (error) =>
  error?.reason || error?.message || "No se pudo completar la operación.";

const CategoriasScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const session = useCurrentSession();
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const palette = useMemo(() => createEmpresaPalette(theme), [theme]);
  const { horizontalPadding } = useMemo(() => getEmpresaScreenMetrics(width), [width]);
  const compactLayout = width < 620;
  const dataReady = useDeferredScreenData();
  const parentId = getFirstParam(params.parentId);
  const hasEmpresaAccess = Boolean(
    session.user?.modoEmpresa === true &&
      session.user?.empresaBloqueada !== true &&
      session.user?.empresaTerminosCondicionesAcepted === true &&
      userHasEmpresaRole(session.user),
  );

  const [categoryDrawerVisible, setCategoryDrawerVisible] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingCategoryId, setSavingCategoryId] = useState("");
  const [pendingToggle, setPendingToggle] = useState(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!session.userReady || hasEmpresaAccess) return;

    const sessionRoute = resolveSessionRoute(session.userId, session.user);
    const targetRoute =
      sessionRoute === "/(empresa)/EmpresaNavigator"
        ? "/(normal)/Main"
        : sessionRoute;
    router.replace(targetRoute);
  }, [hasEmpresaAccess, router, session.user, session.userId, session.userReady]);

  const categoryState = Meteor.useTracker(() => {
    if (!dataReady || !session.userId || !hasEmpresaAccess) {
      return { categories: [], ready: false };
    }

    const handle = Meteor.subscribe("categoriasComercio");
    const ready = handle.ready();

    return {
      categories: ready
        ? CategoriasComercioCollection.find(
            {},
            { fields: CATEGORY_FIELDS, sort: { createAt: 1, nombre: 1 } },
          ).fetch()
        : [],
      ready,
    };
  }, [dataReady, hasEmpresaAccess, session.userId]);

  const categoryTree = useMemo(
    () => buildCategoryTree(categoryState.categories),
    [categoryState.categories],
  );
  const currentCategory = parentId ? categoryTree.byId.get(parentId) || null : null;
  const currentPath = currentCategory
    ? getCategoryPath(categoryTree, currentCategory._id)
    : [];
  const visibleCategories = currentCategory ? currentCategory.children : categoryTree.roots;
  const activeCount = categoryState.categories.filter((category) => category.activa !== false).length;
  const pendingCategory = pendingToggle?.category || null;
  const isInvalidParent = Boolean(parentId && !currentCategory);

  const openCreateDrawer = () => {
    setEditingCategory(null);
    setCategoryName("");
    setFormError("");
    setCategoryDrawerVisible(true);
  };

  const openRenameDrawer = (category) => {
    setEditingCategory(category);
    setCategoryName(category.nombre || "");
    setFormError("");
    setCategoryDrawerVisible(true);
  };

  const handleSaveCategory = async () => {
    const nombre = categoryName.replace(/\s+/g, " ").trim();
    if (nombre.length < 2 || nombre.length > 80) {
      setFormError("Usa un nombre de entre 2 y 80 caracteres.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      if (editingCategory) {
        await callMeteorMethod("comercio.categorias.actualizar", {
          categoriaId: editingCategory._id,
          nombre,
        });
        setFeedback("Categoría actualizada.");
      } else {
        await callMeteorMethod("comercio.categorias.crear", {
          idCategoriaHeredada: currentCategory?._id || "",
          nombre,
        });
        setFeedback(currentCategory ? "Subcategoría creada." : "Categoría creada.");
      }

      setCategoryDrawerVisible(false);
      setEditingCategory(null);
      setCategoryName("");
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmToggle = async () => {
    if (!pendingToggle?.category?._id) {
      setPendingToggle(null);
      return;
    }

    const { activa, category } = pendingToggle;
    setSavingCategoryId(category._id);

    try {
      await callMeteorMethod("comercio.categorias.actualizar", {
        activa,
        categoriaId: category._id,
      });
      setFeedback(activa ? "Categoría activada." : "Categoría desactivada.");
      setPendingToggle(null);
    } catch (error) {
      setPendingToggle(null);
      setFeedback(getErrorMessage(error));
    } finally {
      setSavingCategoryId("");
    }
  };

  const handleOpenChildren = (category) => {
    router.push({
      pathname: "/(empresa)/Categorias",
      params: { parentId: category._id },
    });
  };

  const renderCategory = ({ item: category }) => {
    const isActive = category.activa !== false;
    const canManageCategory = category.creadaPor === session.userId;
    const childCount = category.children.length;

    return (
      <Surface
        elevation={0}
        style={[
          styles.categoryCard,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
            shadowColor: palette.shadowColor,
          },
        ]}
      >
        <View style={[styles.categoryCardBody, compactLayout ? styles.categoryCardBodyCompact : null]}>
          <Pressable
            accessibilityHint="Abre las subcategorías de esta categoría"
            accessibilityLabel={`${category.nombre}, ${childCount} subcategorías`}
            accessibilityRole="button"
            onPress={() => handleOpenChildren(category)}
            style={({ pressed }) => [styles.categoryMain, pressed ? styles.pressed : null]}
          >
            <View style={[styles.categoryIcon, { backgroundColor: palette.brandSoft }]}>
              <MaterialCommunityIcons color={palette.brandStrong} name="shape-outline" size={22} />
            </View>
            <View style={styles.categoryCopy}>
              <Text style={{ color: palette.title }} variant="titleMedium">
                {category.nombre}
              </Text>
              <Text style={{ color: palette.muted }} variant="bodySmall">
                {childCount
                  ? `${childCount} subcategoría${childCount === 1 ? "" : "s"} · Toca para abrir`
                  : "Sin subcategorías · Toca para añadir una"}
              </Text>
              <Text style={{ color: palette.muted }} variant="labelSmall">
                {canManageCategory ? "Creada por ti" : "Compartida · la administra su creador"}
              </Text>
            </View>
            <MaterialCommunityIcons color={palette.muted} name="chevron-right" size={23} />
          </Pressable>

          {canManageCategory ? (
            <View style={[styles.categoryActions, compactLayout ? styles.categoryActionsCompact : null]}>
              <View style={[styles.statusControl, { backgroundColor: palette.cardSoft }]}>
                <Text style={{ color: isActive ? palette.brandStrong : palette.muted }} variant="labelSmall">
                  {isActive ? "Activa" : "Inactiva"}
                </Text>
                <Host matchContents seedColor={palette.brand}>
                  <NativeSwitch
                    disabled={savingCategoryId === category._id}
                    label={isActive ? "Desactivar" : "Activar"}
                    onValueChange={(activa) => {
                      if (activa !== isActive) setPendingToggle({ activa, category });
                    }}
                    testID={`category-active-${category._id}`}
                    value={isActive}
                  />
                </Host>
              </View>
              <IconButton
                accessibilityLabel={`Cambiar nombre de ${category.nombre}`}
                icon="pencil-outline"
                iconColor={palette.brandStrong}
                onPress={() => openRenameDrawer(category)}
                size={20}
                style={[styles.renameButton, { backgroundColor: palette.brandSoft }]}
              />
            </View>
          ) : null}
        </View>
      </Surface>
    );
  };

  const listHeader = (
    <View style={styles.listHeader}>
      <Surface
        elevation={0}
        style={[
          styles.summaryCard,
          {
            backgroundColor: palette.hero,
            borderColor: palette.border,
            shadowColor: palette.shadowColor,
          },
        ]}
      >
        <View style={styles.summaryHeading}>
          <View style={[styles.summaryIcon, { backgroundColor: palette.brandSoft }]}>
            <MaterialCommunityIcons color={palette.brandStrong} name="file-tree-outline" size={24} />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={{ color: palette.title }} variant="titleMedium">
              {currentCategory ? `Subcategorías de ${currentCategory.nombre}` : "Organiza tu catálogo"}
            </Text>
            <Text style={{ color: palette.copy }} variant="bodySmall">
              {currentCategory
                ? "El árbol se comparte entre empresas. Puedes añadir subcategorías; solo quien creó esta categoría puede renombrarla o desactivarla."
                : "Todas las empresas comparten este árbol. Abre una categoría para explorarla o añadir una subcategoría."}
            </Text>
          </View>
        </View>
        <View style={styles.summaryMetrics}>
          <View style={[styles.metricPill, { backgroundColor: palette.cardSoft }]}>
            <Text style={{ color: palette.title }} variant="titleSmall">{categoryState.categories.length}</Text>
            <Text style={{ color: palette.muted }} variant="labelSmall">EN TOTAL</Text>
          </View>
          <View style={[styles.metricPill, { backgroundColor: palette.cardSoft }]}>
            <Text style={{ color: palette.title }} variant="titleSmall">{activeCount}</Text>
            <Text style={{ color: palette.muted }} variant="labelSmall">ACTIVAS</Text>
          </View>
        </View>
        {currentPath.length ? (
          <View style={[styles.breadcrumb, { borderTopColor: palette.border }]}>
            <MaterialCommunityIcons color={palette.brandStrong} name="source-branch" size={17} />
            <Text numberOfLines={2} style={{ color: palette.copy, flex: 1 }} variant="bodySmall">
              {currentPath.map((category) => category.nombre).join("  ›  ")}
            </Text>
          </View>
        ) : null}
      </Surface>
    </View>
  );

  const listEmpty = () => {
    if (!categoryState.ready) return null;

    return (
      <Surface
        elevation={0}
        style={[
          styles.emptyState,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          },
        ]}
      >
        <View style={[styles.emptyIcon, { backgroundColor: palette.brandSoft }]}>
          <MaterialCommunityIcons
            color={palette.brandStrong}
            name={currentCategory ? "shape-plus-outline" : "file-tree-outline"}
            size={28}
          />
        </View>
        <Text style={{ color: palette.title, textAlign: "center" }} variant="titleMedium">
          {isInvalidParent
            ? "No encontramos esta categoría"
            : currentCategory
              ? "Este nivel aún está vacío"
              : "Tu árbol empieza aquí"}
        </Text>
        <Text style={{ color: palette.copy, textAlign: "center" }} variant="bodySmall">
          {isInvalidParent
            ? "Puede que la categoría ya no exista o no pertenezca a esta empresa."
            : currentCategory
              ? `Añade una subcategoría dentro de ${currentCategory.nombre} para continuar el árbol.`
              : "Crea una categoría principal, por ejemplo Carnes, y luego añade sus subcategorías."}
        </Text>
        {isInvalidParent ? (
          <Button mode="outlined" onPress={() => router.replace("/(empresa)/Categorias")} textColor={palette.brandStrong}>
            Volver a categorías
          </Button>
        ) : (
          <Button mode="contained" onPress={openCreateDrawer} buttonColor={palette.brand}>
            {currentCategory ? "Añadir subcategoría" : "Crear primera categoría"}
          </Button>
        )}
      </Surface>
    );
  };

  if (!session.userReady || !hasEmpresaAccess) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={palette.brand} size="large" />
        <Text style={{ color: palette.copy }} variant="bodyMedium">Verificando el modo empresa…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <EmpresaTopBar
        backHref="/(empresa)/EmpresaNavigator"
        rightActions={(
          <Appbar.Action
            accessibilityLabel={currentCategory ? "Añadir subcategoría" : "Añadir categoría"}
            icon="plus"
            onPress={openCreateDrawer}
          />
        )}
        subtitle={currentCategory ? currentPath.map((category) => category.nombre).join(" › ") : "Árbol del catálogo"}
        title={currentCategory?.nombre || "Categorías"}
      />

      {!categoryState.ready ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={palette.brand} />
          <Text style={{ color: palette.copy }} variant="bodySmall">Cargando categorías…</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
          data={isInvalidParent ? [] : visibleCategories}
          keyExtractor={(category) => category._id}
          ListEmptyComponent={listEmpty}
          ListHeaderComponent={listHeader}
          renderItem={renderCategory}
          showsVerticalScrollIndicator={false}
        />
      )}

      {categoryState.ready && !isInvalidParent ? (
        <FAB
          color="#ffffff"
          icon="plus"
          label={currentCategory ? "Añadir subcategoría" : "Añadir categoría"}
          onPress={openCreateDrawer}
          style={[styles.fab, { backgroundColor: palette.brand }]}
        />
      ) : null}

      <DrawerBottom
        footer={(
          <View style={styles.drawerActions}>
            <Button
              disabled={saving}
              mode="outlined"
              onPress={() => setCategoryDrawerVisible(false)}
            >
              Cancelar
            </Button>
            <Button
              buttonColor={palette.brand}
              disabled={saving}
              loading={saving}
              mode="contained"
              onPress={handleSaveCategory}
            >
              {editingCategory ? "Guardar" : "Crear"}
            </Button>
          </View>
        )}
        keyboardShouldPersistTaps="handled"
        onClose={() => !saving && setCategoryDrawerVisible(false)}
        open={categoryDrawerVisible}
        reducedMotion={reducedMotion}
        scrollable
        surfaceStyle={styles.drawerSurface}
        title={
          editingCategory
            ? "Cambiar nombre"
            : currentCategory
              ? "Nueva subcategoría"
              : "Nueva categoría"
        }
      >
        <View style={styles.drawerFormContent}>
            <TextInput
              autoFocus
              disabled={saving}
              label="Nombre de la categoría"
              maxLength={80}
              mode="outlined"
              onChangeText={setCategoryName}
              outlineColor={palette.borderStrong}
              textColor={palette.title}
              value={categoryName}
            />
            {!editingCategory && currentCategory ? (
              <View style={[styles.parentHint, { backgroundColor: palette.brandSoft }]}>
                <MaterialCommunityIcons color={palette.brandStrong} name="source-branch" size={17} />
                <Text style={{ color: palette.brandStrong, flex: 1 }} variant="bodySmall">
                  Se añadirá dentro de {currentPath.map((category) => category.nombre).join(" › ")}.
                </Text>
              </View>
            ) : null}
            <Text style={{ color: formError ? theme.colors.error : palette.muted }} variant="bodySmall">
              {formError || "Las categorías con productos asociados se desactivan; no se eliminan."}
            </Text>
        </View>
      </DrawerBottom>

      <DrawerBottom
        footer={(
          <View style={styles.drawerActions}>
            <Button
              disabled={Boolean(savingCategoryId)}
              mode="outlined"
              onPress={() => setPendingToggle(null)}
            >
              Cancelar
            </Button>
            <Button
              buttonColor={pendingToggle?.activa ? palette.brand : theme.colors.error}
              disabled={Boolean(savingCategoryId)}
              loading={Boolean(savingCategoryId)}
              mode="contained"
              onPress={handleConfirmToggle}
            >
              {pendingToggle?.activa ? "Activar" : "Desactivar"}
            </Button>
          </View>
        )}
        onClose={() => !savingCategoryId && setPendingToggle(null)}
        open={Boolean(pendingToggle)}
        reducedMotion={reducedMotion}
        surfaceStyle={styles.drawerSurface}
        title={pendingToggle?.activa ? "Activar categoría" : "Desactivar categoría"}
      >
        {pendingCategory ? (
          <View style={styles.toggleContent}>
            <Text style={{ color: palette.copy }} variant="bodyMedium">
              {pendingToggle.activa
                ? `“${pendingCategory.nombre}” volverá a estar disponible si sus categorías heredadas también están activas.`
                : `“${pendingCategory.nombre}” y sus ${countDescendants(pendingCategory)} subcategorías dejarán de aparecer para asignarlas a productos. Los productos existentes no se eliminan.`}
            </Text>
          </View>
        ) : null}
      </DrawerBottom>

      <Snackbar onDismiss={() => setFeedback("")} visible={Boolean(feedback)} duration={3200}>
        {feedback}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  breadcrumb: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    paddingTop: 12,
  },
  categoryActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  categoryActionsCompact: {
    justifyContent: "space-between",
    paddingLeft: 2,
  },
  categoryCard: {
    borderRadius: 22,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  categoryCardBody: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    padding: 14,
  },
  categoryCardBodyCompact: {
    alignItems: "stretch",
    flexDirection: "column",
    gap: 10,
  },
  categoryCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  categoryIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  categoryMain: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
    minWidth: 0,
  },
  drawerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  drawerFormContent: {
    gap: 12,
    paddingBottom: 8,
  },
  drawerSurface: {
    backgroundColor: "transparent",
  },
  toggleContent: {
    gap: 12,
    paddingBottom: 8,
  },
  emptyIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  emptyState: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    marginTop: 4,
    maxWidth: 540,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: "100%",
  },
  fab: {
    bottom: 18,
    position: "absolute",
    right: 18,
  },
  listContent: {
    alignSelf: "center",
    flexGrow: 1,
    gap: 12,
    maxWidth: 1040,
    paddingBottom: 112,
    paddingTop: 10,
    width: "100%",
  },
  listHeader: {
    marginBottom: 2,
  },
  loadingScreen: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
  },
  loadingState: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
  },
  metricPill: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  parentHint: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.76,
  },
  renameButton: {
    margin: 0,
  },
  screen: {
    flex: 1,
  },
  statusControl: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 10,
  },
  summaryCard: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 18,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
  },
  summaryCopy: {
    flex: 1,
    gap: 5,
  },
  summaryHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  summaryIcon: {
    alignItems: "center",
    borderRadius: 15,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  summaryMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});

export default CategoriasScreen;