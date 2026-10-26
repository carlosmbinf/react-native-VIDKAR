import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, Searchbar, Text, useTheme } from "react-native-paper";

import {
  getCategoryPath,
  searchCategoryTree,
  UNCATEGORIZED_COMMERCE_CATEGORY_ID,
} from "../../services/commerceCategories";

const CategoryOption = ({
  label,
  subtitle,
  selected,
  containsSelection,
  onPress,
  navigates = false,
  grid = false,
  icon = "shape-outline",
}) => {
  const theme = useTheme();
  const { colors } = theme;

  const activeColor = theme.dark ? "#818cf8" : colors.primary;
  const activeBg = theme.dark
    ? "rgba(99, 102, 241, 0.18)"
    : "rgba(63, 81, 181, 0.08)";
  const activeBorder = theme.dark
    ? "rgba(129, 140, 248, 0.55)"
    : "rgba(63, 81, 181, 0.35)";

  const defaultBorder = theme.dark
    ? "rgba(148, 163, 184, 0.16)"
    : "rgba(15, 23, 42, 0.08)";
  const defaultBg = grid
    ? (theme.dark ? "rgba(30, 41, 59, 0.55)" : "rgba(248, 250, 252, 0.8)")
    : (theme.dark ? "rgba(30, 41, 59, 0.35)" : "rgba(248, 250, 252, 0.5)");

  return (
    <Pressable
      accessibilityHint={navigates ? "Muestra sus subcategorías y la opción de seleccionar todo el grupo." : subtitle}
      accessibilityLabel={navigates ? `Explorar ${label}` : `Seleccionar ${label}`}
      accessibilityRole={navigates ? "button" : "radio"}
      accessibilityState={navigates ? { selected: selected || containsSelection } : { checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        grid ? styles.gridOption : styles.cardOption,
        {
          backgroundColor: selected
            ? activeBg
            : containsSelection
              ? (theme.dark ? "rgba(99, 102, 241, 0.1)" : "rgba(63, 81, 181, 0.05)")
              : defaultBg,
          borderColor: selected
            ? activeBorder
            : containsSelection
              ? activeBorder
              : defaultBorder,
          borderWidth: selected ? 1.5 : 1,
        },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: selected
              ? (theme.dark ? "rgba(129, 140, 248, 0.22)" : "rgba(63, 81, 181, 0.12)")
              : (theme.dark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)"),
          },
        ]}
      >
        <MaterialCommunityIcons
          color={selected ? activeColor : colors.onSurfaceVariant}
          name={icon}
          size={20}
        />
      </View>

      <View style={styles.copy}>
        <Text
          numberOfLines={grid ? 2 : 1}
          style={[
            styles.optionTitle,
            {
              color: selected
                ? (theme.dark ? "#ffffff" : colors.primary)
                : colors.onSurface,
              fontWeight: selected ? "700" : "600",
            },
          ]}
          variant="bodyMedium"
        >
          {label}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[styles.optionSubtitle, { color: colors.onSurfaceVariant }]}
            variant="bodySmall"
          >
            {subtitle}
          </Text>
        ) : null}
        {selected && navigates ? (
          <Text style={{ color: activeColor, fontWeight: "600" }} variant="bodySmall">
            Todo el grupo seleccionado
          </Text>
        ) : null}
        {containsSelection ? (
          <Text style={{ color: activeColor, fontWeight: "600" }} variant="bodySmall">
            Contiene tu selección
          </Text>
        ) : null}
      </View>

      <MaterialCommunityIcons
        color={selected || containsSelection ? activeColor : colors.onSurfaceVariant}
        name={
          navigates
            ? "chevron-right"
            : selected
              ? "check-circle"
              : "checkbox-blank-circle-outline"
        }
        size={22}
      />
    </Pressable>
  );
};

const CommerceCategoryFilter = ({ tree, loading, selectedCategory, onSelectCategory, open, resetKey }) => {
  const theme = useTheme();
  const { colors } = theme;
  const [query, setQuery] = useState("");
  const [currentCategoryId, setCurrentCategoryId] = useState(null);
  const currentCategory = tree.byId.get(currentCategoryId);
  const path = useMemo(() => getCategoryPath(tree, currentCategoryId), [tree, currentCategoryId]);
  const selectedPath = useMemo(() => getCategoryPath(tree, selectedCategory), [tree, selectedCategory]);
  const matches = useMemo(() => searchCategoryTree(tree.roots, query), [tree, query]);
  const searching = Boolean(query.trim());

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCurrentCategoryId(null);
  }, [open, resetKey]);

  // Si cambian las categorías visibles mientras el drawer está abierto, vuelve al inicio.
  useEffect(() => {
    if (currentCategoryId && !tree.byId.has(currentCategoryId)) setCurrentCategoryId(null);
  }, [currentCategoryId, tree]);

  const renderCategory = (category, { grid = false, search = false } = {}) => {
    const navigates = !search && category.children.length > 0;
    const parentPath = search ? getCategoryPath(tree, category._id).slice(0, -1) : [];
    return (
      <CategoryOption
        key={category._id}
        containsSelection={!search && selectedPath.slice(0, -1).some((parent) => parent._id === category._id)}
        grid={grid}
        label={category.nombre}
        navigates={navigates}
        onPress={() => navigates ? setCurrentCategoryId(category._id) : onSelectCategory(category._id)}
        selected={selectedCategory === category._id}
        subtitle={search
          ? parentPath.map((parent) => parent.nombre).join(" › ") || "Categoría principal"
          : navigates ? `${category.children.length} subcategoría${category.children.length === 1 ? "" : "s"}` : undefined}
      />
    );
  };

  const selectionLabel = selectedCategory === "all"
    ? "Todas las categorías"
    : selectedCategory === UNCATEGORIZED_COMMERCE_CATEGORY_ID
      ? "Sin categoría"
      : selectedPath.map((category) => category.nombre).join(" › ");

  const searchbarBg = theme.dark ? "rgba(255, 255, 255, 0.06)" : "rgba(15, 23, 42, 0.04)";
  const searchbarBorder = theme.dark ? "rgba(148, 163, 184, 0.2)" : "rgba(15, 23, 42, 0.1)";

  return (
    <View style={styles.content}>
      <Searchbar
        accessibilityLabel="Buscar categoría"
        autoCapitalize="none"
        autoCorrect={false}
        clearIcon="close-circle"
        elevation={0}
        icon="magnify"
        iconColor={theme.dark ? "#818cf8" : colors.primary}
        inputStyle={styles.searchInput}
        onChangeText={setQuery}
        onClearIconPress={() => setQuery("")}
        placeholder="Buscar en todas las categorías"
        placeholderTextColor={theme.dark ? "rgba(148, 163, 184, 0.7)" : "rgba(100, 116, 139, 0.7)"}
        returnKeyType="search"
        style={[
          styles.searchbar,
          {
            backgroundColor: searchbarBg,
            borderColor: searchbarBorder,
          },
        ]}
        value={query}
      />

      <View style={styles.selectionInfoRow}>
        <Text style={styles.selectionPrefix} variant="labelSmall">
          Selección activa:
        </Text>
        <Text numberOfLines={1} style={[styles.selectionValue, { color: theme.dark ? "#818cf8" : colors.primary }]} variant="labelSmall">
          {selectionLabel}
        </Text>
      </View>

      {searching ? (
        <View style={styles.searchResultsContainer}>
          <Text accessibilityLiveRegion="polite" style={{ color: colors.onSurfaceVariant }} variant="labelMedium">
            {matches.length} coincidencia{matches.length === 1 ? "" : "s"}
          </Text>
          {matches.map((category) => renderCategory(category, { search: true }))}
          {!matches.length ? (
            <Text style={[styles.empty, { color: colors.onSurfaceVariant }]} variant="bodyMedium">
              No encontramos categorías con ese nombre. Prueba con otro nombre o limpia la búsqueda.
            </Text>
          ) : null}
        </View>
      ) : currentCategory ? (
        <View style={styles.level}>
          <Pressable
            accessibilityLabel="Volver al nivel anterior"
            accessibilityRole="button"
            onPress={() => setCurrentCategoryId(path.at(-2)?._id || null)}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons color={theme.dark ? "#818cf8" : colors.primary} name="arrow-left" size={20} />
            <Text style={{ color: theme.dark ? "#818cf8" : colors.primary }} variant="labelLarge">Volver</Text>
          </Pressable>
          <Text accessibilityLabel={path.map((category) => category.nombre).join(" › ")} numberOfLines={2} ellipsizeMode="head" style={{ color: colors.onSurfaceVariant }} variant="bodySmall">
            Categorías › {path.map((category) => category.nombre).join(" › ")}
          </Text>
          <Text accessibilityRole="header" variant="titleMedium">{currentCategory.nombre}</Text>
          <CategoryOption
            label={`Todo en ${currentCategory.nombre}`}
            onPress={() => onSelectCategory(currentCategory._id)}
            selected={selectedCategory === currentCategory._id}
            subtitle="Incluye todas sus subcategorías"
          />
          <View style={styles.childrenList}>{currentCategory.children.map((category) => renderCategory(category))}</View>
        </View>
      ) : (
        <View style={styles.level}>
          <CategoryOption icon="view-grid-outline" label="Todas las categorías" onPress={() => onSelectCategory("all")} selected={selectedCategory === "all"} />
          {loading ? <ActivityIndicator accessibilityLabel="Cargando categorías" /> : (
            <>
              <View style={styles.grid}>{tree.roots.map((category) => renderCategory(category, { grid: true }))}</View>
              {!tree.roots.length ? <Text style={{ color: colors.onSurfaceVariant }} variant="bodySmall">No hay categorías visibles para estos comercios.</Text> : null}
            </>
          )}
          <CategoryOption icon="tag-off-outline" label="Sin categoría" onPress={() => onSelectCategory(UNCATEGORIZED_COMMERCE_CATEGORY_ID)} selected={selectedCategory === UNCATEGORIZED_COMMERCE_CATEGORY_ID} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  content: { gap: 12 },
  level: { gap: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  childrenList: { gap: 8 },
  searchResultsContainer: { gap: 8 },
  searchbar: {
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    height: 48,
  },
  searchInput: {
    alignSelf: "center",
    fontSize: 14,
    minHeight: 48,
  },
  selectionInfoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 2,
  },
  selectionPrefix: {
    opacity: 0.65,
  },
  selectionValue: {
    flex: 1,
    fontWeight: "700",
  },
  iconContainer: {
    alignItems: "center",
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  cardOption: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 16,
    flexDirection: "row",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  gridOption: {
    borderCurve: "continuous",
    borderRadius: 16,
    flexBasis: "48%",
    flexGrow: 1,
    gap: 8,
    maxWidth: "50%",
    minHeight: 104,
    padding: 12,
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  optionTitle: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
  optionSubtitle: {
    fontSize: 12,
    opacity: 0.8,
  },
  back: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingRight: 16,
  },
  empty: {
    paddingVertical: 24,
  },
  pressed: {
    opacity: 0.78,
  },
});

export default CommerceCategoryFilter;
