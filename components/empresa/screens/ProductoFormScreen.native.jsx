import { useEffect, useMemo, useRef, useState } from "react";

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";
import {
    Button,
    Dialog,
    Menu,
    Portal,
    Surface,
    Switch,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";

import { ConfigCollection, ProductosComercioCollection, TiendasComercioCollection } from "../../collections/collections";
import EmpresaTopBar from "../components/EmpresaTopBar.native";
import { createEmpresaPalette, getEmpresaScreenMetrics } from "../styles/empresaTheme";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const PRODUCT_FORM_STORE_FIELDS = {
  _id: 1,
  title: 1,
};

const PRODUCT_FORM_PRODUCT_FIELDS = {
  _id: 1,
  comentario: 1,
  count: 1,
  descripcion: 1,
  idTienda: 1,
  monedaPrecio: 1,
  name: 1,
  precio: 1,
  productoDeElaboracion: 1,
};

const PRODUCT_FORM_PROPERTY_FIELDS = {
  valor: 1,
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const getFirstParam = (value) => {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return typeof value === "string" ? value : "";
};

const parseJsonParam = (value) => {
  const raw = getFirstParam(value);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getMethodResultMessage = (error, result) => {
  if (error) {
    return error.reason || error.message || "No se pudo completar la operación.";
  }

  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return "";
  }

  if (result.success === true) {
    return "";
  }

  return result.reason || result.message || (typeof result.error === "string" ? result.error : "");
};

const normalizeCurrencyOptions = (propertyValue) => {
  if (Array.isArray(propertyValue)) {
    return propertyValue.filter((item) => typeof item === "string" && item.trim());
  }

  if (typeof propertyValue === "string") {
    try {
      const parsed = JSON.parse(propertyValue);

      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === "string" && item.trim());
      }
    } catch {
      if (propertyValue.trim()) {
        return [propertyValue.trim()];
      }
    }
  }

  return [];
};

const buildFileData = async (asset) => {
  const mimeType = asset?.mimeType || "image/jpeg";
  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const extension = mimeType.includes("png") ? "png" : "jpg";

  return {
    base64: `data:${mimeType};base64,${base64}`,
    name:
      asset?.fileName ||
      `producto-${Date.now()}.${extension}`,
    size: Number(asset?.fileSize || 0),
    type: mimeType,
  };
};

const ProductoFormScreen = () => {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const palette = useMemo(() => createEmpresaPalette(theme), [theme]);
  const { contentMaxWidth, horizontalPadding } = useMemo(() => getEmpresaScreenMetrics(width), [width]);
  const isCompactLayout = width < 720;
  const params = useLocalSearchParams();
  const routeProductId = getFirstParam(params.productoId);
  const routeStoreId = getFirstParam(params.tiendaId);
  const parsedProduct = parseJsonParam(params.producto);
  const parsedStore = parseJsonParam(params.tienda);

  const [currencyMenuVisible, setCurrencyMenuVisible] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [loadingImage, setLoadingImage] = useState(Boolean(routeProductId));
  const [pendingImage, setPendingImage] = useState(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [storeMenuVisible, setStoreMenuVisible] = useState(false);
  const [formState, setFormState] = useState({
    comentario: "",
    count: "0",
    descripcion: "",
    monedaPrecio: "CUP",
    name: "",
    precio: "",
    productoDeElaboracion: false,
  });
  const [selectedStoreId, setSelectedStoreId] = useState(routeStoreId || parsedProduct?.idTienda || "");
  const hydratedProductId = useRef("");

  const { currencyOptions, product, stores } = Meteor.useTracker(() => {
    const userId = Meteor.userId();

    const storesHandle = userId
      ? Meteor.subscribe("tiendas", { idUser: userId }, {
          fields: PRODUCT_FORM_STORE_FIELDS,
        })
      : null;
    const productHandle = routeProductId
      ? Meteor.subscribe("productosComercio", { _id: routeProductId }, {
          fields: PRODUCT_FORM_PRODUCT_FIELDS,
        })
      : null;
    const propertyHandle = Meteor.subscribe("propertys", {
      active: true,
      clave: "monedasPreciosProductosComercios",
      type: "CONFIG",
    }, {
      fields: PRODUCT_FORM_PROPERTY_FIELDS,
    });

    const property = propertyHandle.ready()
      ? ConfigCollection.findOne({
          active: true,
          clave: "monedasPreciosProductosComercios",
          type: "CONFIG",
        }, {
          fields: PRODUCT_FORM_PROPERTY_FIELDS,
        })
      : null;

    return {
      currencyOptions: normalizeCurrencyOptions(property?.valor),
      product:
        routeProductId && productHandle?.ready()
          ? ProductosComercioCollection.findOne(
              { _id: routeProductId },
              { fields: PRODUCT_FORM_PRODUCT_FIELDS },
            ) || parsedProduct || null
          : parsedProduct || null,
      stores:
        storesHandle?.ready() && userId
          ? TiendasComercioCollection.find(
              { idUser: userId },
              { fields: PRODUCT_FORM_STORE_FIELDS, sort: { title: 1 } },
            ).fetch()
          : [],
    };
  }, [parsedProduct, routeProductId]);

  useEffect(() => {
    if (!selectedStoreId && routeStoreId) {
      setSelectedStoreId(routeStoreId);
    }
  }, [routeStoreId, selectedStoreId]);

  useEffect(() => {
    if (!selectedStoreId && stores.length === 1) {
      setSelectedStoreId(stores[0]._id);
    }
  }, [selectedStoreId, stores]);

  useEffect(() => {
    if (!product?._id || hydratedProductId.current === product._id) {
      return;
    }

    hydratedProductId.current = product._id;
    setFormState({
      comentario: product?.comentario || "",
      count: `${Number(product?.count || 0)}`,
      descripcion: product?.descripcion || "",
      monedaPrecio: product?.monedaPrecio || "CUP",
      name: product?.name || "",
      precio: product?.precio != null ? `${product.precio}` : "",
      productoDeElaboracion: Boolean(product?.productoDeElaboracion),
    });
    setSelectedStoreId(product?.idTienda || routeStoreId || "");
  }, [product, routeStoreId]);

  useEffect(() => {
    let mounted = true;

    if (!routeProductId) {
      setLoadingImage(false);
      return () => {
        mounted = false;
      };
    }

    setLoadingImage(true);
    Meteor.call("findImgbyProduct", routeProductId, (error, result) => {
      if (!mounted) {
        return;
      }

      if (!error && typeof result === "string") {
        setExistingImageUrl(result);
      } else {
        setExistingImageUrl("");
      }

      setLoadingImage(false);
    });

    return () => {
      mounted = false;
    };
  }, [routeProductId]);

  const availableCurrencies = currencyOptions.length ? currencyOptions : ["CUP"];
  const selectedStore = useMemo(
    () => stores.find((store) => store._id === selectedStoreId) || parsedStore || null,
    [parsedStore, selectedStoreId, stores],
  );
  const formShellStyle = useMemo(
    () => [styles.formShell, contentMaxWidth ? { maxWidth: Math.min(contentMaxWidth, 880) } : null],
    [contentMaxWidth],
  );
  const imagePreview = pendingImage?.uri || (removeExistingImage ? "" : existingImageUrl);
  const isEditMode = Boolean(routeProductId);
  const storeLocked = Boolean(routeStoreId || product?.idTienda);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Debes permitir acceso a la galería para seleccionar una imagen del producto.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets?.[0];

    if (!asset) {
      return;
    }

    if (asset.mimeType && !asset.mimeType.startsWith("image/")) {
      Alert.alert("Archivo no permitido", "Solo puedes subir imágenes para este producto.");
      return;
    }

    if (Number(asset.fileSize || 0) > MAX_IMAGE_SIZE) {
      Alert.alert("Imagen demasiado grande", "La imagen debe pesar menos de 10 MB.");
      return;
    }

    setPendingImage(asset);
    setRemoveExistingImage(false);
  };

  const handleRemoveImage = () => {
    if (pendingImage) {
      setPendingImage(null);
      return;
    }

    if (existingImageUrl) {
      setRemoveExistingImage(true);
      setExistingImageUrl("");
    }
  };

  const handleSubmit = async () => {
    const name = formState.name.trim();
    const descripcion = formState.descripcion.trim();
    const comentario = formState.comentario.trim();
    const precio = Number(formState.precio);
    const count = Number(formState.count || 0);

    if (!selectedStoreId) {
      Alert.alert("Selecciona la tienda", "Debes indicar a qué tienda pertenece este producto.");
      return;
    }

    if (name.length < 2) {
      Alert.alert("Nombre incompleto", "Escribe un nombre más claro para el producto.");
      return;
    }

    if (descripcion.length < 6) {
      Alert.alert("Descripción incompleta", "Agrega una descripción breve para identificar mejor el producto.");
      return;
    }

    if (!Number.isFinite(precio) || precio <= 0) {
      Alert.alert("Precio inválido", "Indica un precio mayor que cero.");
      return;
    }

    if (!formState.productoDeElaboracion && (!Number.isFinite(count) || count < 0)) {
      Alert.alert("Cantidad inválida", "La cantidad disponible debe ser cero o un número positivo.");
      return;
    }

    setSaving(true);

    const payload = {
      comentario,
      count: formState.productoDeElaboracion ? 0 : count,
      descripcion,
      idTienda: selectedStoreId,
      monedaPrecio: formState.monedaPrecio,
      name,
      precio,
      productoDeElaboracion: Boolean(formState.productoDeElaboracion),
    };

    const finishWithError = (message) => {
      setSaving(false);
      Alert.alert("No se pudo guardar el producto", message);
    };

    const afterSave = async (savedProductId) => {
      try {
        if (removeExistingImage && savedProductId && !pendingImage) {
          await new Promise((resolve, reject) => {
            Meteor.call("comercio.deleteProductImage", savedProductId, (error, result) => {
              const message = getMethodResultMessage(error, result);

              if (message) {
                reject(new Error(message));
                return;
              }

              resolve(true);
            });
          });
        }

        if (pendingImage && savedProductId) {
          const fileData = await buildFileData(pendingImage);

          await new Promise((resolve, reject) => {
            Meteor.call("comercio.uploadProductImage", savedProductId, fileData, (error, result) => {
              const message = getMethodResultMessage(error, result);

              if (message) {
                reject(new Error(message));
                return;
              }

              resolve(true);
            });
          });
        }

        setSaving(false);
        Alert.alert(
          isEditMode ? "Producto actualizado" : "Producto creado",
          isEditMode
            ? "El producto quedó actualizado dentro del catálogo de la tienda."
            : "El producto ya forma parte del catálogo de la tienda.",
          [
            {
              text: "Aceptar",
              onPress: () => {
                router.replace({
                  pathname: "/(empresa)/TiendaDetail",
                  params: { tiendaId: selectedStoreId },
                });
              },
            },
          ],
        );
      } catch (imageError) {
        finishWithError(imageError?.message || "La imagen no pudo guardarse correctamente.");
      }
    };

    if (isEditMode) {
      Meteor.call("comercio.editProducto", routeProductId, payload, (error, result) => {
        const message = getMethodResultMessage(error, result);

        if (message) {
          finishWithError(message);
          return;
        }

        afterSave(routeProductId);
      });
      return;
    }

    Meteor.call("addProducto", payload, (error, result) => {
      const message = getMethodResultMessage(error, result);

      if (message) {
        finishWithError(message);
        return;
      }

      if (typeof result !== "string" || !result) {
        finishWithError("El servidor no devolvió un identificador válido para el producto creado.");
        return;
      }

      afterSave(result);
    });
  };

  if (!stores.length && !selectedStoreId) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <EmpresaTopBar backHref="/(empresa)/MisTiendas" subtitle="Catálogo" title="Producto" />
        <View style={[styles.missingStoreState, { paddingHorizontal: horizontalPadding }]}> 
          <Surface
            style={[
              styles.missingStoreCard,
              {
                backgroundColor: palette.cardSoft,
                borderColor: palette.border,
              },
            ]}
          >
            <MaterialCommunityIcons color={palette.brandStrong} name="storefront-remove-outline" size={48} />
            <Text style={{ color: palette.title }} variant="headlineSmall">
              Primero necesitas una tienda
            </Text>
            <Text style={[styles.missingStoreCopy, { color: palette.copy }]} variant="bodyMedium">
            Antes de crear productos, registra al menos una tienda para asociar correctamente el catálogo.
            </Text>
            <Button buttonColor={palette.brandSoft} mode="contained-tonal" onPress={() => router.replace("/(empresa)/MisTiendas")} textColor={palette.brandStrong}>
              Ir a mis tiendas
            </Button>
          </Surface>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <EmpresaTopBar
        backHref="/(empresa)/MisTiendas"
        subtitle={selectedStore?.title || "Catálogo de tienda"}
        title={isEditMode ? "Editar producto" : "Nuevo producto"}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]} keyboardShouldPersistTaps="handled">
          <View style={formShellStyle}>
            <Surface
              style={[
                styles.heroCard,
                {
                  backgroundColor: palette.hero,
                  borderColor: palette.border,
                  shadowColor: palette.shadowColor,
                },
              ]}
            >
              <View style={styles.heroCopy}>
                <Text style={{ color: palette.title }} variant="headlineSmall">
                  {isEditMode ? "Actualiza el producto" : "Crea un producto nuevo"}
                </Text>
                <Text style={{ color: palette.copy }} variant="bodyMedium">
                  Completa la información comercial y operativa que verá el cliente al navegar por la tienda.
                </Text>
              </View>

              {selectedStore ? (
                <View style={[styles.storeBadge, { backgroundColor: palette.brandSoft }]}> 
                  <MaterialCommunityIcons color={palette.brandStrong} name="storefront-outline" size={18} />
                  <Text style={{ color: palette.brandStrong }} variant="bodyMedium">
                    {selectedStore.title}
                  </Text>
                </View>
              ) : null}
            </Surface>

            <Surface
              style={[
                styles.sectionCard,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                  shadowColor: palette.shadowColor,
                },
              ]}
            >
              <Text style={{ color: palette.title }} variant="titleMedium">
                Información principal
              </Text>

              {!storeLocked ? (
                <View style={styles.fieldGroup}>
                  <Text style={{ color: palette.muted }} variant="labelLarge">
                    Tienda
                  </Text>
                  <Menu
                    anchor={
                      <Button
                        mode="outlined"
                        onPress={() => setStoreMenuVisible(true)}
                        style={[styles.selectorButton, { borderColor: palette.borderStrong }]}
                        textColor={selectedStore ? palette.title : palette.muted}
                      >
                        {selectedStore?.title || "Selecciona la tienda"}
                      </Button>
                    }
                    contentStyle={[styles.menuContent, { backgroundColor: palette.menu, borderColor: palette.border }]}
                    onDismiss={() => setStoreMenuVisible(false)}
                    visible={storeMenuVisible}
                  >
                    {stores.map((store) => (
                      <Menu.Item
                        key={store._id}
                        onPress={() => {
                          setSelectedStoreId(store._id);
                          setStoreMenuVisible(false);
                        }}
                        title={store.title}
                      />
                    ))}
                  </Menu>
                </View>
              ) : null}

              <TextInput
                activeOutlineColor={palette.brand}
                label="Nombre"
                mode="outlined"
                onChangeText={(value) => setFormState((current) => ({ ...current, name: value }))}
                outlineColor={palette.borderStrong}
                style={[styles.textInput, { backgroundColor: palette.input }]}
                textColor={palette.title}
                theme={{ colors: { onSurfaceVariant: palette.muted } }}
                value={formState.name}
              />
              <TextInput
                activeOutlineColor={palette.brand}
                label="Descripción"
                mode="outlined"
                multiline
                numberOfLines={4}
                onChangeText={(value) => setFormState((current) => ({ ...current, descripcion: value }))}
                outlineColor={palette.borderStrong}
                style={[styles.textInput, { backgroundColor: palette.input }]}
                textColor={palette.title}
                theme={{ colors: { onSurfaceVariant: palette.muted } }}
                value={formState.descripcion}
              />
              <View style={[styles.inlineFields, isCompactLayout ? styles.inlineFieldsStacked : null]}>
                <TextInput
                  activeOutlineColor={palette.brand}
                  keyboardType="decimal-pad"
                  label="Precio"
                  mode="outlined"
                  onChangeText={(value) => setFormState((current) => ({ ...current, precio: value }))}
                  outlineColor={palette.borderStrong}
                  style={[styles.inlineField, styles.textInput, { backgroundColor: palette.input }]}
                  textColor={palette.title}
                  theme={{ colors: { onSurfaceVariant: palette.muted } }}
                  value={formState.precio}
                />
                <View style={[styles.inlineField, styles.fieldGroup]}>
                  <Text style={{ color: palette.muted }} variant="labelLarge">
                    Moneda
                  </Text>
                  <Menu
                    anchor={
                      <Button
                        mode="outlined"
                        onPress={() => setCurrencyMenuVisible(true)}
                        style={[styles.selectorButton, { borderColor: palette.borderStrong }]}
                        textColor={palette.title}
                      >
                        {formState.monedaPrecio}
                      </Button>
                    }
                    contentStyle={[styles.menuContent, { backgroundColor: palette.menu, borderColor: palette.border }]}
                    onDismiss={() => setCurrencyMenuVisible(false)}
                    visible={currencyMenuVisible}
                  >
                    {availableCurrencies.map((currency) => (
                      <Menu.Item
                        key={currency}
                        onPress={() => {
                          setFormState((current) => ({ ...current, monedaPrecio: currency }));
                          setCurrencyMenuVisible(false);
                        }}
                        title={currency}
                      />
                    ))}
                  </Menu>
                </View>
              </View>
              <View style={[styles.switchRow, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}> 
                <View style={styles.switchCopy}>
                  <Text style={{ color: palette.title }} variant="labelLarge">
                    Producto de elaboración
                  </Text>
                  <Text style={{ color: palette.copy }} variant="bodySmall">
                    Actívalo cuando el producto se prepare a pedido y no dependa de un stock fijo.
                  </Text>
                </View>
                <Switch
                  onValueChange={(value) =>
                    setFormState((current) => ({
                      ...current,
                      count: value ? "0" : current.count,
                      productoDeElaboracion: value,
                    }))
                  }
                  value={formState.productoDeElaboracion}
                />
              </View>
              <TextInput
                activeOutlineColor={palette.brand}
                disabled={formState.productoDeElaboracion}
                keyboardType="number-pad"
                label="Cantidad disponible"
                mode="outlined"
                onChangeText={(value) => setFormState((current) => ({ ...current, count: value }))}
                outlineColor={palette.borderStrong}
                style={[styles.textInput, { backgroundColor: palette.input }]}
                textColor={palette.title}
                theme={{ colors: { onSurfaceVariant: palette.muted } }}
                value={formState.count}
              />
              <TextInput
                activeOutlineColor={palette.brand}
                label="Comentario adicional"
                mode="outlined"
                multiline
                numberOfLines={3}
                onChangeText={(value) => setFormState((current) => ({ ...current, comentario: value }))}
                outlineColor={palette.borderStrong}
                placeholder="Opcional: notas internas o detalles de preparación"
                style={[styles.textInput, { backgroundColor: palette.input }]}
                textColor={palette.title}
                theme={{ colors: { onSurfaceVariant: palette.muted } }}
                value={formState.comentario}
              />
            </Surface>

            <Surface
              style={[
                styles.sectionCard,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                  shadowColor: palette.shadowColor,
                },
              ]}
            >
              <Text style={{ color: palette.title }} variant="titleMedium">
                Imagen del producto
              </Text>

              <View style={[styles.imagePanel, { borderColor: palette.border }]}> 
                {loadingImage ? (
                  <View style={[styles.imagePlaceholder, { backgroundColor: palette.cardSoft }]}> 
                    <Text style={{ color: palette.copy }} variant="bodySmall">
                      Cargando imagen...
                    </Text>
                  </View>
                ) : imagePreview ? (
                  <Image source={{ uri: imagePreview }} style={styles.imagePreview} />
                ) : (
                  <View style={[styles.imagePlaceholder, { backgroundColor: palette.cardSoft }]}> 
                    <MaterialCommunityIcons color={palette.brandStrong} name="image-outline" size={42} />
                    <Text style={{ color: palette.copy }} variant="bodySmall">
                      Aún no hay imagen seleccionada
                    </Text>
                  </View>
                )}
              </View>

              <View style={[styles.imageActions, isCompactLayout ? styles.imageActionsStacked : null]}>
                <Button buttonColor={palette.brandSoft} mode="contained-tonal" onPress={handlePickImage} textColor={palette.brandStrong}>
                  {imagePreview ? "Cambiar imagen" : "Seleccionar imagen"}
                </Button>
                {imagePreview ? (
                  <Button mode="outlined" onPress={handleRemoveImage} textColor={palette.title}>
                    Quitar
                  </Button>
                ) : null}
              </View>
            </Surface>

            <Button loading={saving} mode="contained" onPress={handleSubmit} style={styles.submitButton}>
              {isEditMode ? "Guardar cambios" : "Crear producto"}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Portal>
        <Dialog dismissable={!saving} onDismiss={() => null} style={[styles.savingDialog, { backgroundColor: palette.card, borderColor: palette.border }]} visible={saving}>
          <Dialog.Title>Guardando cambios</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Estamos actualizando la información del producto y su imagen.</Text>
          </Dialog.Content>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 8,
  },
  formShell: {
    alignSelf: "center",
    gap: 16,
    width: "100%",
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.08,
    shadowRadius: 22,
  },
  heroCopy: {
    gap: 8,
  },
  imageActions: {
    flexDirection: "row",
    gap: 12,
  },
  imageActionsStacked: {
    flexDirection: "column",
  },
  imagePanel: {
    borderRadius: 20,
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  imagePlaceholder: {
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
    minHeight: 220,
  },
  imagePreview: {
    height: 240,
    width: "100%",
  },
  inlineField: {
    flex: 1,
  },
  inlineFields: {
    flexDirection: "row",
    gap: 12,
  },
  inlineFieldsStacked: {
    flexDirection: "column",
  },
  keyboardContainer: {
    flex: 1,
  },
  missingStoreCopy: {
    opacity: 0.8,
    textAlign: "center",
  },
  missingStoreCard: {
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    maxWidth: 560,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: "100%",
  },
  missingStoreState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  menuContent: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 28,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 24,
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.08,
    shadowRadius: 22,
  },
  savingDialog: {
    borderRadius: 24,
    borderWidth: 1,
  },
  selectorButton: {
    justifyContent: "flex-start",
  },
  storeBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  submitButton: {
    minHeight: 52,
  },
  switchCopy: {
    flex: 1,
    gap: 4,
  },
  switchRow: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textInput: {
    backgroundColor: "transparent",
  },
});

export default ProductoFormScreen;