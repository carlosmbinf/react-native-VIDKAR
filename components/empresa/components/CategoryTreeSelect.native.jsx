import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Surface, Text, TextInput, useTheme } from "react-native-paper";
import { useReducedMotion } from "react-native-reanimated";

import {
  buildCategoryTree,
  filterActiveCategoryTree,
  filterCategoryTree,
} from "../../../services/commerceCategories";
import DrawerBottom from "../../drawer/DrawerBottom.native";
import { createEmpresaPalette } from "../styles/empresaTheme";

const logCategorySelectorEvent = (event) => {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[CategoryTreeSelect] ${event}`);
  }
};

const CategoryTreeSelect = ({
  categories = [],
  onClose,
  onManage,
  onSelect,
  open,
  selectedCategoryId,
}) => {
  const theme = useTheme();
  const palette = createEmpresaPalette(theme);
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState({});
  const [draftCategoryId, setDraftCategoryId] = useState(selectedCategoryId || "");
  const previousOpenRef = useRef(Boolean(open));

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const activeRoots = useMemo(
    () => filterActiveCategoryTree(categoryTree.roots),
    [categoryTree.roots],
  );
  const visibleRoots = useMemo(
    () => filterCategoryTree(activeRoots, query),
    [activeRoots, query],
  );

  useEffect(() => {
    if (previousOpenRef.current !== open) {
      logCategorySelectorEvent(`open:${open ? "true" : "false"}`);
      previousOpenRef.current = Boolean(open);
    }

    if (!open) return;

    setQuery("");
    setExpandedIds({});
    setDraftCategoryId(String(selectedCategoryId || ""));
  }, [open, selectedCategoryId]);

  const handleApplySelection = () => {
    logCategorySelectorEvent(draftCategoryId ? "apply-category" : "apply-none");
    onSelect?.(draftCategoryId);
    onClose?.();
  };

  const stageCategorySelection = (categoryId) => {
    logCategorySelectorEvent(categoryId ? "stage-category" : "stage-none");
    setDraftCategoryId(categoryId);
  };

  const renderCategory = (category, depth = 0) => {
    const selected = String(draftCategoryId || "") === category._id;
    const isExpanded = expandedIds[category._id] ?? Boolean(query.trim());
    const childrenCount = category.children.length;

    return (
      <Surface
        elevation={0}
        key={category._id}
        style={[
          styles.categoryCard,
          depth > 0 ? styles.nestedCategoryCard : null,
          {
            backgroundColor: selected ? palette.brandSoft : palette.card,
            borderColor: selected ? palette.brand : palette.border,
          },
        ]}
      >
        <Pressable
          accessibilityLabel={`Marcar ${category.nombre}`}
          accessibilityRole="radio"
          accessibilityState={{ checked: selected }}
          onPressIn={() => logCategorySelectorEvent("category-press-in")}
          onPressOut={() => logCategorySelectorEvent("category-press-out")}
          onPress={() => stageCategorySelection(category._id)}
          style={({ pressed }) => [styles.categoryOption, pressed ? styles.pressed : null]}
        >
          <MaterialCommunityIcons
            color={selected ? palette.brandStrong : palette.muted}
            name={selected ? "radiobox-marked" : "radiobox-blank"}
            size={22}
          />
          <View style={styles.categoryCopy}>
            <Text style={{ color: palette.title }} variant="titleSmall">
              {category.nombre}
            </Text>
            <Text style={{ color: palette.muted }} variant="bodySmall">
              {childrenCount
                ? `${childrenCount} subcategoría${childrenCount === 1 ? "" : "s"}`
                : "Categoría final"}
            </Text>
          </View>
          {selected ? (
            <MaterialCommunityIcons color={palette.brandStrong} name="check-circle" size={20} />
          ) : null}
        </Pressable>

        {childrenCount ? (
          <View style={styles.disclosure}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${isExpanded ? "Ocultar" : "Ver"} subcategorías de ${category.nombre} (${childrenCount})`}
              accessibilityState={{ expanded: isExpanded }}
              onPress={() => setExpandedIds((current) => ({
                ...current,
                [category._id]: !(current[category._id] ?? Boolean(query.trim())),
              }))}
              style={({ pressed }) => [styles.disclosureButton, pressed ? styles.pressed : null]}
            >
              <Text style={{ color: palette.brandStrong }} variant="labelMedium">
                {isExpanded ? "Ocultar" : "Ver"} subcategorías ({childrenCount})
              </Text>
              <MaterialCommunityIcons
                color={palette.brandStrong}
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={20}
              />
            </Pressable>
            {isExpanded ? (
              <View style={styles.children}>
                {category.children.map((child) => renderCategory(child, depth + 1))}
              </View>
            ) : null}
          </View>
        ) : null}
      </Surface>
    );
  };

  const noActiveCategories = activeRoots.length === 0;
  const noSearchMatches = !noActiveCategories && visibleRoots.length === 0;

  return (
    <DrawerBottom
      allowContentSwipeToClose={false}
      closeOnBackdropPress={false}
      footer={(
        <View style={styles.drawerActions}>
          <Button
            mode="outlined"
            onPress={() => {
              logCategorySelectorEvent("cancel");
              onClose?.();
            }}
          >
            Cancelar
          </Button>
          <Button mode="contained" onPress={handleApplySelection}>
            Usar categoría
          </Button>
        </View>
      )}
      keyboardShouldPersistTaps="handled"
      onClose={onClose}
      open={open}
      reducedMotion={reducedMotion}
      scrollable
      surfaceStyle={styles.drawerSurface}
      title="Seleccionar categoría"
    >
      <View style={styles.drawerContent}>
        <Text style={{ color: palette.copy }} variant="bodySmall">
          Puedes asignar una categoría de cualquier nivel. Las categorías dentro de una rama inactiva no aparecen aquí.
        </Text>
        <Button
          compact
          icon="cog-outline"
          mode="text"
          onPress={() => {
            logCategorySelectorEvent("manage");
            onManage?.();
          }}
          style={styles.manageButton}
          textColor={palette.brandStrong}
        >
          Administrar categorías
        </Button>

        <TextInput
          left={<TextInput.Icon color={palette.muted} icon="magnify" />}
          mode="outlined"
          onChangeText={setQuery}
          outlineColor={palette.borderStrong}
          placeholder="Buscar en el árbol"
          style={[styles.searchInput, { backgroundColor: palette.input }]}
          textColor={palette.title}
          value={query}
        />

        <View style={styles.listContent}>
          <Surface
            elevation={0}
            style={[styles.categoryCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}
          >
            <Pressable
              accessibilityLabel="Dejar el producto sin categoría"
              accessibilityRole="radio"
              accessibilityState={{ checked: !draftCategoryId }}
              onPress={() => stageCategorySelection("")}
              style={({ pressed }) => [styles.categoryOption, pressed ? styles.pressed : null]}
            >
              <MaterialCommunityIcons
                color={!draftCategoryId ? palette.brandStrong : palette.muted}
                name={!draftCategoryId ? "radiobox-marked" : "radiobox-blank"}
                size={22}
              />
              <Text style={[styles.categoryCopy, { color: palette.title }]} variant="titleSmall">
                Sin categoría
              </Text>
              {!draftCategoryId ? (
                <MaterialCommunityIcons color={palette.brandStrong} name="check-circle" size={20} />
              ) : null}
            </Pressable>
          </Surface>

          {noActiveCategories ? (
            <Surface style={[styles.emptyState, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}> 
              <MaterialCommunityIcons color={palette.brandStrong} name="shape-outline" size={30} />
              <Text style={{ color: palette.title }} variant="titleSmall">
                No hay categorías activas
              </Text>
              <Text style={{ color: palette.copy, textAlign: "center" }} variant="bodySmall">
                Activa una categoría o crea una nueva para organizar este producto.
              </Text>
            </Surface>
          ) : noSearchMatches ? (
            <Text style={[styles.emptyCopy, { color: palette.muted }]} variant="bodyMedium">
              No encontramos categorías que coincidan con “{query.trim()}”.
            </Text>
          ) : (
            <View style={styles.treeList}>
              {visibleRoots.map((category) => renderCategory(category))}
            </View>
          )}
        </View>
      </View>
    </DrawerBottom>
  );
};

const styles = StyleSheet.create({
  categoryCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  categoryOption: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  categoryCopy: {
    flex: 1,
    gap: 2,
  },
  children: {
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  drawerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  drawerContent: {
    gap: 12,
    paddingBottom: 8,
  },
  manageButton: {
    alignSelf: "flex-start",
    marginLeft: -8,
  },
  drawerSurface: {
    backgroundColor: "transparent",
  },
  disclosure: {
    borderTopColor: "rgba(103, 58, 183, 0.1)",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  disclosureButton: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  emptyCopy: {
    paddingHorizontal: 8,
    paddingVertical: 20,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    gap: 9,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  listContent: {
    gap: 8,
    paddingBottom: 6,
    paddingTop: 2,
  },
  nestedCategoryCard: {
    marginLeft: 4,
  },
  pressed: {
    opacity: 0.74,
  },
  searchInput: {
    minHeight: 48,
  },
  treeList: {
    gap: 8,
  },
});

export default CategoryTreeSelect;