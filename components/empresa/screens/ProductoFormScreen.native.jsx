import { useEffect, useMemo, useRef, useState } from "react";

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { Host, Picker, Switch as NativeSwitch } from "@expo/ui";
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
    Tooltip,
    useTheme,
} from "react-native-paper";

import useDeferredScreenData from "../../../hooks/useDeferredScreenData";
import {
    CategoriasComercioCollection,
    ConfigCollection,
    ProductosComercioCollection,
    TiendasComercioCollection,
} from "../../collections/collections";
import CategoryTreeSelect from "../components/CategoryTreeSelect.native";
import EmpresaTopBar from "../components/EmpresaTopBar.native";
import ProductImageCarousel from "../../productos/ProductImageCarousel";
import { createEmpresaPalette, EMPRESA_BRAND, getEmpresaScreenMetrics } from "../styles/empresaTheme";
import {
  buildCategoryTree,
  filterActiveCategoryTree,
  getCategoryPath,
  getSelectableCategoryIds,
  isProductCategorySaveConfirmed,
} from "../../../services/commerceCategories";

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
  mercadoLibre: 1,
  comentario: 1,
  count: 1,
  descripcion: 1,
  idCategoria: 1,
  idTienda: 1,
  monedaPrecio: 1,
  name: 1,
  precio: 1,
  productoDeElaboracion: 1,
};

const PRODUCT_FORM_PROPERTY_FIELDS = {
  valor: 1,
};

const PRODUCT_FORM_CATEGORY_FIELDS = {
  _id: 1,
  activa: 1,
  createAt: 1,
  creadaPor: 1,
  idCategoriaHeredada: 1,
  nombre: 1,
};

const PRODUCT_FORM_PROPERTY_SELECTOR = {
  active: true,
  clave: "monedasPreciosProductosComercios",
  type: "CONFIG",
};

const SUPPORTED_PRODUCT_CURRENCIES = ["USD", "CUP", "UYU"];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const getBase64ByteLength = (value) => {
  const payload = String(value || "").split(",").pop() || "";
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
};

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

const errorMessage = (error, fallback) =>
  error?.reason || error?.message || fallback;

const callMethodAsync = (methodName, ...args) =>
  new Promise((resolve, reject) => {
    Meteor.call(methodName, ...args, (error, result) => {
      const message = getMethodResultMessage(error, result);
      if (message) {
        reject(new Error(message));
      } else {
        resolve(result);
      }
    });
  });

const normalizeCurrencyOptions = (propertyValue) => {
  let values = [];

  if (Array.isArray(propertyValue)) {
    values = propertyValue;
  } else if (typeof propertyValue === "string") {
    try {
      const parsed = JSON.parse(propertyValue);
      values = Array.isArray(parsed) ? parsed : typeof parsed === "string" ? [parsed] : [];
    } catch {
      values = [propertyValue];
    }
  }

  return [...new Set(
    values
      .filter((item) => typeof item === "string")
      .map((item) => item.trim().toUpperCase())
      // .filter((currency) => SUPPORTED_PRODUCT_CURRENCIES.includes(currency)),
  )];
};

const buildFileData = async (asset) => {
  const mimeType = asset?.mimeType || "image/jpeg";
  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const size = Number(asset?.fileSize) || getBase64ByteLength(base64);
  if (size > MAX_IMAGE_SIZE) {
    throw new Error("La imagen debe pesar menos de 10 MB.");
  }
  const extension = mimeType.includes("png") ? "png" : "jpg";

  return {
    base64: `data:${mimeType};base64,${base64}`,
    name:
      asset?.fileName ||
      `producto-${Date.now()}.${extension}`,
    size,
    type: mimeType,
  };
};

const useProductoFormData = ({ dataReady, parsedProduct, routeProductId }) =>
  Meteor.useTracker(() => {
    const userId = Meteor.userId();

    if (!dataReady) {
      return {
        categories: [],
        categoriesReady: false,
        currencyOptions: [],
        product: parsedProduct || null,
        productReady: !routeProductId,
        stores: [],
      };
    }

    const storesHandle = userId ? Meteor.subscribe("comercio.tiendasEmpresa") : null;
    const stores = storesHandle?.ready() && userId
      ? TiendasComercioCollection.find(
          { idUser: userId },
          { fields: PRODUCT_FORM_STORE_FIELDS, sort: { title: 1 } },
        ).fetch()
      : [];
    const storeIds = stores.map((store) => String(store._id));
    const productHandle = routeProductId && storeIds.length
      ? Meteor.subscribe("comercio.productosEmpresa", storeIds)
      : null;
    const propertyHandle = Meteor.subscribe("propertys", PRODUCT_FORM_PROPERTY_SELECTOR, {
      fields: PRODUCT_FORM_PROPERTY_FIELDS,
    });
    const categoriesHandle = userId ? Meteor.subscribe("categoriasComercio") : null;

    // ready() registra una dependencia reactiva; Tracker vuelve a ejecutar al llegar el "ready" de DDP.
    const propertyReady = propertyHandle.ready();
    const properties = propertyReady
      ? ConfigCollection.find(PRODUCT_FORM_PROPERTY_SELECTOR, {
          fields: PRODUCT_FORM_PROPERTY_FIELDS,
        }).fetch()
      : [];
    const configuredCurrencies = new Set(
      properties.flatMap((property) => normalizeCurrencyOptions(property?.valor)),
    );
    const categoriesReady = Boolean(categoriesHandle?.ready());

    return {
      categories:
        categoriesReady && userId
          ? CategoriasComercioCollection.find(
              {},
              { fields: PRODUCT_FORM_CATEGORY_FIELDS, sort: { createAt: 1, nombre: 1 } },
            ).fetch()
          : [],
      categoriesReady,
      currencyOptions: SUPPORTED_PRODUCT_CURRENCIES.filter((currency) => configuredCurrencies.has(currency)),
      product:
        routeProductId && productHandle?.ready()
          ? ProductosComercioCollection.findOne(
              { _id: routeProductId },
              { fields: PRODUCT_FORM_PRODUCT_FIELDS },
            ) || parsedProduct || null
          : parsedProduct || null,
      productReady: !routeProductId || Boolean(storeIds.length && productHandle?.ready()),
      stores,
    };
  }, [dataReady, parsedProduct, routeProductId]);

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
  const publishMercadoLibreOnOpen = getFirstParam(params.publicarMercadoLibre) === "true";
  const productParam = getFirstParam(params.producto);
  const storeParam = getFirstParam(params.tienda);
  const parsedProduct = useMemo(() => parseJsonParam(productParam), [productParam]);
  const parsedStore = useMemo(() => parseJsonParam(storeParam), [storeParam]);

  const [currencyMenuVisible, setCurrencyMenuVisible] = useState(false);
  const [categorySelectorOpen, setCategorySelectorOpen] = useState(false);
  const [existingImages, setExistingImages] = useState([]);
  const [loadingImage, setLoadingImage] = useState(Boolean(routeProductId));
  const [pendingImages, setPendingImages] = useState([]);
  const [removedImageIds, setRemovedImageIds] = useState([]);
  const [removeAllImages, setRemoveAllImages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [storeMenuVisible, setStoreMenuVisible] = useState(false);
  const [mercadoLibreEnabled, setMercadoLibreEnabled] = useState(false);
  const [mercadoLibreForm, setMercadoLibreForm] = useState({
    publish: false,
    categoryId: "",
    condition: "new",
    familyName: "",
    title: "",
    listingTypeId: "gold_special",
    userProductId: "",
    manufacturingDays: "",
  });
  const [mercadoLibreQuery, setMercadoLibreQuery] = useState("");
  const [mercadoLibreSuggestions, setMercadoLibreSuggestions] = useState([]);
  const [mercadoLibreAttributes, setMercadoLibreAttributes] = useState([]);
  const [mercadoLibreAttributeValues, setMercadoLibreAttributeValues] = useState({});
  const [mercadoLibreMaxTitleLength, setMercadoLibreMaxTitleLength] = useState(60);
  const [mercadoLibreListingTypes, setMercadoLibreListingTypes] = useState([]);
  const [mercadoLibreLoading, setMercadoLibreLoading] = useState(false);
  const [formState, setFormState] = useState({
    comentario: "",
    count: "0",
    descripcion: "",
    monedaPrecio: "USD",
    name: "",
    precio: "",
    productoDeElaboracion: false,
  });
  const [selectedStoreId, setSelectedStoreId] = useState(routeStoreId || parsedProduct?.idTienda || "");
  const [selectedCategoryId, setSelectedCategoryId] = useState(parsedProduct?.idCategoria || "");
  const hydratedProductId = useRef("");
  const dataReady = useDeferredScreenData();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[ProductoForm] category-selector-open:${categorySelectorOpen}`);
    }
  }, [categorySelectorOpen]);

  const { categories, categoriesReady, currencyOptions, product, productReady, stores } = useProductoFormData({
    dataReady,
    parsedProduct,
    routeProductId,
  });

  useEffect(() => {
    let active = true;
    Meteor.call("comercio.mercadoLibre.getEstado", (error, result) => {
      if (!active) return;
      const enabled = !error && result?.enabled === true;
      setMercadoLibreEnabled(enabled);
      if (enabled && publishMercadoLibreOnOpen) {
        setMercadoLibreForm((current) => ({ ...current, publish: true }));
      }
    });
    return () => { active = false; };
  }, [publishMercadoLibreOnOpen]);

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
    setMercadoLibreForm((current) => ({
      ...current,
      familyName: product?.mercadoLibre?.familyName || product?.name || current.familyName,
      categoryId: product?.mercadoLibre?.categoryId || current.categoryId,
    }));
    setSelectedStoreId(product?.idTienda || routeStoreId || "");
    setSelectedCategoryId(product?.idCategoria || "");
  }, [product, routeStoreId]);

  useEffect(() => {
    let mounted = true;

    if (!routeProductId) {
      setExistingImages([]);
      setPendingImages([]);
      setRemovedImageIds([]);
      setRemoveAllImages(false);
      setLoadingImage(false);
      return () => {
        mounted = false;
      };
    }

    setExistingImages([]);
    setPendingImages([]);
    setRemovedImageIds([]);
    setRemoveAllImages(false);
    setLoadingImage(true);
    Meteor.call("comercio.getProductImages", routeProductId, (error, result) => {
      if (!mounted) return;
      if (!error && Array.isArray(result)) {
        setExistingImages(result);
        setLoadingImage(false);
        return;
      }

      Meteor.call("findImgbyProduct", routeProductId, (legacyError, legacyUrl) => {
        if (!mounted) return;
        setExistingImages(!legacyError && typeof legacyUrl === "string" && legacyUrl
          ? [{ id: `legacy-${routeProductId}`, url: legacyUrl, legacy: true }]
          : []);
        setLoadingImage(false);
      });
    });

    return () => {
      mounted = false;
    };
  }, [routeProductId]);

  const availableCurrencies = currencyOptions.length ? currencyOptions : SUPPORTED_PRODUCT_CURRENCIES;
  const isEditMode = Boolean(routeProductId);
  const selectedCurrency = !isEditMode && !availableCurrencies.includes(formState.monedaPrecio)
    ? availableCurrencies[0] || SUPPORTED_PRODUCT_CURRENCIES[0]
    : formState.monedaPrecio;
  const selectedStore = useMemo(
    () => stores.find((store) => store._id === selectedStoreId) || parsedStore || null,
    [parsedStore, selectedStoreId, stores],
  );
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const selectedCategory = selectedCategoryId
    ? categoryTree.byId.get(String(selectedCategoryId)) || null
    : null;
  const selectedCategoryPath = selectedCategory
    ? getCategoryPath(categoryTree, selectedCategory._id).map((category) => category.nombre).join(" › ")
    : "";
  const selectableCategoryIds = useMemo(
    () => getSelectableCategoryIds(filterActiveCategoryTree(categoryTree.roots)),
    [categoryTree.roots],
  );
  const selectedCategoryIsAvailable = selectableCategoryIds.has(String(selectedCategoryId || ""));
  const formShellStyle = useMemo(
    () => [styles.formShell, contentMaxWidth ? { maxWidth: Math.min(contentMaxWidth, 880) } : null],
    [contentMaxWidth],
  );
  const previewImages = useMemo(() => [
    ...existingImages
      .filter((image) => !removedImageIds.includes(image.id))
      .map((image) => ({ ...image, isPending: false })),
    ...pendingImages.map((image) => ({ id: image.localId, url: image.uri, isPending: true })),
  ], [existingImages, pendingImages, removedImageIds]);
  const storeLocked = Boolean(routeStoreId || product?.idTienda);

  const searchMercadoLibreCategories = async () => {
    const query = mercadoLibreQuery.replace(/\s+/g, " ").trim();
    if (query.length < 3) {
      Alert.alert("Búsqueda incompleta", "Escribe al menos 3 caracteres para buscar categorías de Mercado Libre.");
      return;
    }
    setMercadoLibreLoading(true);
    try {
      const suggestions = await callMethodAsync("comercio.mercadoLibre.sugerirCategorias", query);
      setMercadoLibreSuggestions(Array.isArray(suggestions) ? suggestions : []);
      if (!suggestions?.length) Alert.alert("Sin resultados", "Mercado Libre no encontró categorías para ese nombre.");
    } catch (categoryError) {
      Alert.alert("No se pudieron buscar categorías", errorMessage(categoryError, "Inténtalo nuevamente."));
    } finally {
      setMercadoLibreLoading(false);
    }
  };

  const selectMercadoLibreCategory = async (categoryId) => {
    setMercadoLibreForm((current) => ({ ...current, categoryId }));
    setMercadoLibreAttributeValues({});
    setMercadoLibreAttributes([]);
    setMercadoLibreMaxTitleLength(60);
    if (!categoryId) return;
    setMercadoLibreLoading(true);
    try {
      const category = await callMethodAsync("comercio.mercadoLibre.atributosCategoria", categoryId);
      setMercadoLibreAttributes(Array.isArray(category?.attributes) ? category.attributes : []);
      setMercadoLibreMaxTitleLength(category?.maxTitleLength || 60);
      const listingTypes = await callMethodAsync("comercio.mercadoLibre.tiposPublicacion", Number(formState.precio) || 1).catch(() => []);
      setMercadoLibreListingTypes(Array.isArray(listingTypes) ? listingTypes : []);
    } catch (categoryError) {
      Alert.alert("No se pudieron cargar atributos", errorMessage(categoryError, "Revisa la categoría e inténtalo de nuevo."));
    } finally {
      setMercadoLibreLoading(false);
    }
  };

  const setMercadoLibreAttribute = (attributeId, value) => {
    const attribute = mercadoLibreAttributes.find((entry) => entry.id === attributeId);
    const selected = attribute?.values?.find((entry) => String(entry.id || entry.name) === String(value));
    setMercadoLibreAttributeValues((current) => ({
      ...current,
      [attributeId]: selected
        ? { valueId: selected.id || "", valueName: selected.name || "" }
        : { valueId: "", valueName: String(value || "").trim() },
    }));
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Debes permitir acceso a la galería para seleccionar una imagen del producto.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      selectionLimit: 0,
    });

    if (result.canceled) {
      return;
    }

    const assets = Array.isArray(result.assets) ? result.assets : [];
    if (!assets.length) {
      return;
    }

    const acceptedAssets = [];
    const rejectedAssets = [];
    assets.forEach((asset, index) => {
      if (asset.mimeType && !["image/jpeg", "image/jpg", "image/png"].includes(asset.mimeType.toLowerCase())) {
        rejectedAssets.push(`${asset.fileName || `Imagen ${index + 1}`}: formato no permitido`);
        return;
      }
      if (Number(asset.fileSize || 0) > MAX_IMAGE_SIZE) {
        rejectedAssets.push(`${asset.fileName || `Imagen ${index + 1}`}: supera 10 MB`);
        return;
      }
      acceptedAssets.push({
        ...asset,
        localId: `${asset.assetId || asset.uri}-${Date.now()}-${index}`,
      });
    });

    if (acceptedAssets.length) {
      setPendingImages((current) => [...current, ...acceptedAssets]);
    }
    if (rejectedAssets.length) {
      Alert.alert(
        "Algunas imágenes no se agregaron",
        `${rejectedAssets.length} archivo(s): ${rejectedAssets.join("; ")}`,
      );
    }
  };

  const handleRemoveImage = (image) => {
    if (image?.isPending) {
      setPendingImages((current) => current.filter((pending) => pending.localId !== image.id));
      return;
    }

    if (image?.legacy) {
      setRemoveAllImages(true);
      setExistingImages([]);
      return;
    }

    if (image?.id) setRemovedImageIds((current) => current.includes(image.id) ? current : [...current, image.id]);
  };

  const validateMercadoLibrePublication = () => {
    if (!mercadoLibreForm.publish) {
      return "";
    }

    if (!mercadoLibreEnabled) {
      return "La publicación en Mercado Libre no está habilitada para esta cuenta.";
    }

    if (!mercadoLibreForm.categoryId) {
      return "Selecciona una categoría de Mercado Libre.";
    }

    if (!(mercadoLibreForm.familyName.trim() || formState.name.trim())) {
      return "Indica el nombre de familia del producto para Mercado Libre.";
    }
    if (mercadoLibreForm.title.trim().length > mercadoLibreMaxTitleLength) {
      return `El título de Mercado Libre no puede superar ${mercadoLibreMaxTitleLength} caracteres.`;
    }

    if (!mercadoLibreForm.listingTypeId) {
      return "Selecciona el tipo de publicación de Mercado Libre.";
    }
    if (selectedCurrency !== "UYU") {
      return "Mercado Libre Uruguay requiere precio en UYU. El producto local se puede guardar sin publicar.";
    }
    if (previewImages.length === 0) {
      return "Agrega al menos una imagen antes de publicar en Mercado Libre.";
    }

    const missingAttribute = mercadoLibreAttributes.find(
      (attribute) =>
        (attribute.required || (mercadoLibreForm.condition === "new" && attribute.newRequired)) &&
        !mercadoLibreAttributeValues[attribute.id]?.valueId &&
        !mercadoLibreAttributeValues[attribute.id]?.valueName,
    );

    if (missingAttribute) {
      return `Completa el atributo requerido: ${missingAttribute.name || missingAttribute.id}.`;
    }

    const manufacturingDays = mercadoLibreForm.manufacturingDays.trim();
    if (formState.productoDeElaboracion &&
        (!Number.isInteger(Number(manufacturingDays)) || Number(manufacturingDays) < 1 || Number(manufacturingDays) > 60)) {
      return "Indica entre 1 y 60 días de elaboración para Mercado Libre.";
    }

    return "";
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

    if (!categoriesReady) {
      Alert.alert("Cargando categorías", "Espera a que se carguen las categorías antes de guardar el producto.");
      return;
    }

    if (isEditMode && !productReady) {
      Alert.alert("Cargando producto", "Espera a que se cargue el producto antes de guardar los cambios.");
      return;
    }

    if (selectableCategoryIds.size && !selectedCategoryIsAvailable && (!isEditMode || !selectedCategoryId)) {
      Alert.alert("Selecciona una categoría", "Elige una categoría activa para que el producto aparezca en el catálogo por categorías.");
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

    const mercadoLibreValidationError = validateMercadoLibrePublication();
    if (mercadoLibreValidationError) {
      Alert.alert("Publicación en Mercado Libre", mercadoLibreValidationError);
      return;
    }

    setSaving(true);

    const payload = {
      comentario,
      count: formState.productoDeElaboracion ? 0 : count,
      descripcion,
      idTienda: selectedStoreId,
      monedaPrecio: selectedCurrency,
      name,
      precio,
      productoDeElaboracion: Boolean(formState.productoDeElaboracion),
      ...(isEditMode || selectedCategoryId ? { idCategoria: selectedCategoryId } : {}),
    };

    const finishWithError = (message) => {
      setSaving(false);
      Alert.alert("No se pudo guardar el producto", message);
    };

    const afterSave = async (savedProductId) => {
      const imageErrors = [];
      const mercadoLibreErrors = [];
      let mercadoLibreSuccessMessage = "";

      if (removeAllImages) {
        try {
          await callMethodAsync("comercio.deleteProductImage", savedProductId);
        } catch (imageError) {
          imageErrors.push(imageError?.message || "No se pudieron quitar las imágenes anteriores.");
        }
      } else {
        for (const imageId of removedImageIds) {
          try {
            await callMethodAsync("comercio.deleteProductImageById", savedProductId, imageId);
          } catch (imageError) {
            imageErrors.push(imageError?.message || "No se pudo quitar una imagen anterior.");
          }
        }
      }

      for (const asset of pendingImages) {
        try {
          await callMethodAsync("comercio.uploadProductImage", savedProductId, await buildFileData(asset));
        } catch (imageError) {
          imageErrors.push(imageError?.message || `No se pudo subir ${asset?.fileName || "una imagen"}.`);
        }
      }

      if (mercadoLibreForm.publish) {
        try {
          const publication = await callMethodAsync("comercio.mercadoLibre.publicarProducto", savedProductId, {
            categoryId: mercadoLibreForm.categoryId,
            condition: mercadoLibreForm.condition,
            familyName: mercadoLibreForm.familyName.trim() || name,
            title: mercadoLibreForm.title.trim(),
            listingTypeId: mercadoLibreForm.listingTypeId,
            userProductId: mercadoLibreForm.userProductId.trim(),
            manufacturingDays: mercadoLibreForm.manufacturingDays.trim()
              ? Number(mercadoLibreForm.manufacturingDays)
              : 0,
            attributes: Object.entries(mercadoLibreAttributeValues)
              .map(([id, value]) => ({
                id,
                ...(value.valueId ? { valueId: value.valueId } : {}),
                ...(value.valueName ? { valueName: value.valueName } : {}),
              }))
              .filter((attribute) => attribute.valueId || attribute.valueName),
          });
          if (publication?.success !== true) throw new Error("Mercado Libre no confirmó la publicación.");
          mercadoLibreSuccessMessage = ` Publicado en Mercado Libre (${publication?.itemId || "producto vinculado"}).`;
          if (publication?.stockSynced === false) {
            mercadoLibreErrors.push("La publicación se creó, pero el stock no pudo sincronizarse. Vuelve a sincronizar el producto desde la tienda.");
          }
          if (publication?.descriptionSynced === false) {
            mercadoLibreErrors.push("La publicación se creó, pero la descripción requiere una sincronización adicional.");
          }
        } catch (mercadoLibreError) {
          mercadoLibreErrors.push(
            errorMessage(mercadoLibreError, "No se pudo publicar el producto en Mercado Libre."),
          );
        }
      } else if (isEditMode && product?.mercadoLibre?.itemId && mercadoLibreEnabled) {
        mercadoLibreSuccessMessage = " Los cambios de Mercado Libre quedaron en cola.";
      }

      setSaving(false);
      const baseMessage = isEditMode
        ? "El producto quedó actualizado dentro del catálogo de la tienda."
        : "El producto ya forma parte del catálogo de la tienda.";
      const warnings = [
        imageErrors.length
          ? `${imageErrors.length} imagen(es) necesitan atención: ${imageErrors[0]}`
          : "",
        mercadoLibreErrors.length
          ? `Mercado Libre necesita atención: ${mercadoLibreErrors[0]}`
          : "",
      ].filter(Boolean);
      const message = warnings.length
        ? `${baseMessage}${mercadoLibreSuccessMessage}\n\n${warnings.join("\n\n")}`
        : `${baseMessage}${mercadoLibreSuccessMessage}`;
      Alert.alert(
        isEditMode ? "Producto actualizado" : "Producto creado",
        message,
        [{
          text: "Aceptar",
          onPress: () => {
            router.replace({
              pathname: "/(empresa)/TiendaDetail",
              params: { tiendaId: selectedStoreId },
            });
          },
        }],
      );
    };

    if (isEditMode) {
      Meteor.call("comercio.editProducto", routeProductId, payload, (error, result) => {
        const message = getMethodResultMessage(error, result);

        if (message) {
          finishWithError(message);
          return;
        }

        if (!isProductCategorySaveConfirmed(result, selectedCategoryId)) {
          finishWithError("El servidor no confirmó la categoría. No se puede dar por guardada; actualiza el servidor e inténtalo de nuevo.");
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

            {mercadoLibreEnabled ? (
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
                <View style={styles.mercadoLibreHeading}>
                  <MaterialCommunityIcons color={palette.brandStrong} name="store-sync-outline" size={22} />
                  <View style={styles.heroCopy}>
                    <Text style={{ color: palette.title }} variant="titleMedium">
                      Mercado Libre Uruguay
                    </Text>
                    <Text style={{ color: palette.copy }} variant="bodySmall">
                      {product?.mercadoLibre?.itemId
                        ? `Vinculado a ${product.mercadoLibre.itemId}. Los cambios locales se sincronizan al guardar.`
                        : "La publicación es opcional. Si no la activas, el producto queda solo en VIDKAR."}
                    </Text>
                  </View>
                </View>

                {!product?.mercadoLibre?.itemId ? (
                  <>
                    <View style={{ alignItems: "flex-end", marginBottom: -8 }}>
                      <Tooltip title="Al guardar, intenta publicar con los datos seleccionados.">
                        <MaterialCommunityIcons accessibilityLabel="Ayuda sobre publicación Mercado Libre" color={palette.muted} name="information-outline" size={19} />
                      </Tooltip>
                    </View>
                    <Host matchContents={{ vertical: true }} seedColor={EMPRESA_BRAND} style={styles.mercadoLibreNativeHost}>
                      <NativeSwitch
                        label="Publicar también en Mercado Libre"
                        onValueChange={(publish) => setMercadoLibreForm((current) => ({ ...current, publish }))}
                        value={mercadoLibreForm.publish}
                      />
                    </Host>

                    {mercadoLibreForm.publish ? (
                      <View style={styles.mercadoLibreFields}>
                        {selectedCurrency !== "UYU" ? (
                          <Surface style={[styles.mercadoLibreWarning, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
                            <Text style={{ color: palette.copy }} variant="bodySmall">
                              Para publicar en Mercado Libre Uruguay, selecciona UYU en el producto. El guardado local sigue disponible.
                            </Text>
                          </Surface>
                        ) : null}

                        <TextInput
                          activeOutlineColor={palette.brand}
                          label="Buscar categoría en Mercado Libre"
                          mode="outlined"
                          onChangeText={setMercadoLibreQuery}
                          outlineColor={palette.borderStrong}
                          style={[styles.textInput, { backgroundColor: palette.input }]}
                          textColor={palette.title}
                          theme={{ colors: { onSurfaceVariant: palette.muted } }}
                          value={mercadoLibreQuery}
                        />
                        <Tooltip title="La categoría define los atributos requeridos.">
                          <Button
                            disabled={mercadoLibreLoading}
                            icon={mercadoLibreLoading ? "loading" : "magnify"}
                            mode="outlined"
                            onPress={searchMercadoLibreCategories}
                            textColor={palette.brandStrong}
                          >
                            Buscar categorías
                          </Button>
                        </Tooltip>

                        {mercadoLibreSuggestions.length ? (
                          <View style={styles.fieldGroup}>
                            <Text style={{ color: palette.muted }} variant="labelLarge">Categoría MLU</Text>
                            <Host matchContents={{ vertical: true }} seedColor={EMPRESA_BRAND} style={styles.mercadoLibreNativeHost}>
                              <Picker selectedValue={mercadoLibreForm.categoryId} onValueChange={selectMercadoLibreCategory}>
                                <Picker.Item label="Selecciona una categoría" value="" />
                                {mercadoLibreSuggestions.map((suggestion) => (
                                  <Picker.Item
                                    key={suggestion.categoryId}
                                    label={`${suggestion.categoryName} · ${suggestion.categoryId}`}
                                    value={suggestion.categoryId}
                                  />
                                ))}
                              </Picker>
                            </Host>
                          </View>
                        ) : null}

                        {mercadoLibreForm.categoryId ? (
                          <>
                            {!mercadoLibreAttributes.length ? (
                              <Tooltip title="Carga los requisitos de esta categoría.">
                                <Button disabled={mercadoLibreLoading} mode="outlined" onPress={() => selectMercadoLibreCategory(mercadoLibreForm.categoryId)} textColor={palette.brandStrong}>
                                  Cargar atributos de la categoría
                                </Button>
                              </Tooltip>
                            ) : null}
                            <TextInput
                              activeOutlineColor={palette.brand}
                              label="Nombre de familia"
                              mode="outlined"
                              onChangeText={(familyName) => setMercadoLibreForm((current) => ({ ...current, familyName }))}
                              outlineColor={palette.borderStrong}
                              style={[styles.textInput, { backgroundColor: palette.input }]}
                              textColor={palette.title}
                              theme={{ colors: { onSurfaceVariant: palette.muted } }}
                              value={mercadoLibreForm.familyName || formState.name}
                            />
                            <TextInput
                              activeOutlineColor={palette.brand}
                              label="Título en Mercado Libre (opcional)"
                              mode="outlined"
                              onChangeText={(title) => setMercadoLibreForm((current) => ({ ...current, title }))}
                              outlineColor={palette.borderStrong}
                              style={[styles.textInput, { backgroundColor: palette.input }]}
                              textColor={palette.title}
                              theme={{ colors: { onSurfaceVariant: palette.muted } }}
                              value={mercadoLibreForm.title}
                            />
                            <Text style={{ color: palette.muted }} variant="bodySmall">
                              Si lo dejas vacío se usa el nombre local. Máximo {mercadoLibreMaxTitleLength} caracteres. En cuentas User Product se usa el nombre de familia.
                            </Text>

                            <View style={styles.fieldGroup}>
                              <Text style={{ color: palette.muted }} variant="labelLarge">Condición</Text>
                              <Host matchContents={{ vertical: true }} seedColor={EMPRESA_BRAND} style={styles.mercadoLibreNativeHost}>
                                <Picker selectedValue={mercadoLibreForm.condition} onValueChange={(condition) => setMercadoLibreForm((current) => ({ ...current, condition }))}>
                                  <Picker.Item label="Nuevo" value="new" />
                                  <Picker.Item label="Usado" value="used" />
                                </Picker>
                              </Host>
                            </View>

                            <View style={styles.fieldGroup}>
                              <Text style={{ color: palette.muted }} variant="labelLarge">Tipo de publicación</Text>
                              <Host matchContents={{ vertical: true }} seedColor={EMPRESA_BRAND} style={styles.mercadoLibreNativeHost}>
                                <Picker selectedValue={mercadoLibreForm.listingTypeId} onValueChange={(listingTypeId) => setMercadoLibreForm((current) => ({ ...current, listingTypeId }))}>
                                  {(mercadoLibreListingTypes.length ? mercadoLibreListingTypes : [{ id: "gold_special", name: "Clásica" }]).map((listingType) => (
                                    <Picker.Item key={listingType.id} label={listingType.name} value={listingType.id} />
                                  ))}
                                </Picker>
                              </Host>
                            </View>

                            <TextInput
                              activeOutlineColor={palette.brand}
                              autoCapitalize="characters"
                              label="User Product existente (opcional)"
                              mode="outlined"
                              onChangeText={(userProductId) => setMercadoLibreForm((current) => ({ ...current, userProductId }))}
                              outlineColor={palette.borderStrong}
                              placeholder="MLUU…"
                              style={[styles.textInput, { backgroundColor: palette.input }]}
                              textColor={palette.title}
                              theme={{ colors: { onSurfaceVariant: palette.muted } }}
                              value={mercadoLibreForm.userProductId}
                            />

                            {formState.productoDeElaboracion ? (
                              <TextInput
                                activeOutlineColor={palette.brand}
                                keyboardType="number-pad"
                                label="Días de elaboración (1–60)"
                                mode="outlined"
                                onChangeText={(manufacturingDays) => setMercadoLibreForm((current) => ({ ...current, manufacturingDays }))}
                                outlineColor={palette.borderStrong}
                                style={[styles.textInput, { backgroundColor: palette.input }]}
                                textColor={palette.title}
                                theme={{ colors: { onSurfaceVariant: palette.muted } }}
                                value={mercadoLibreForm.manufacturingDays}
                              />
                            ) : null}

                            {mercadoLibreAttributes
                              .filter((attribute) => attribute.required || attribute.newRequired || attribute.conditionalRequired || ["BRAND", "MODEL", "GTIN", "SELLER_SKU"].includes(attribute.id))
                              .map((attribute) => {
                                const selected = mercadoLibreAttributeValues[attribute.id] || { valueId: "", valueName: "" };
                                const required = attribute.required || (mercadoLibreForm.condition === "new" && attribute.newRequired);
                                const label = `${attribute.name || attribute.id}${required ? " *" : ""}`;
                                const gtinHint = attribute.id === "GTIN" ? "Usa solo el código real del envase: 8, 12, 13 o 14 dígitos con verificador. No uses el SKU ni inventes un código. Si no tiene, elige «sin código» solo si la categoría lo ofrece." : "";
                                if (attribute.values?.length) {
                                  return (
                                    <View key={attribute.id} style={styles.fieldGroup}>
                                      <Text style={{ color: palette.muted }} variant="labelLarge">{label}</Text>
                                      {gtinHint ? <Text style={{ color: palette.muted }} variant="bodySmall">{gtinHint}</Text> : null}
                                      {attribute.conditionalRequired && !required ? <Text style={{ color: palette.muted }} variant="bodySmall">Condicional · {attribute.id}</Text> : null}
                                      <Host matchContents={{ vertical: true }} seedColor={EMPRESA_BRAND} style={styles.mercadoLibreNativeHost}>
                                        <Picker
                                          selectedValue={selected.valueId || selected.valueName}
                                          onValueChange={(value) => setMercadoLibreAttribute(attribute.id, value)}
                                        >
                                          <Picker.Item label={`Selecciona ${attribute.name || attribute.id}`} value="" />
                                          {attribute.values.map((value) => (
                                            <Picker.Item key={value.id || value.name} label={value.name} value={value.id || value.name} />
                                          ))}
                                        </Picker>
                                      </Host>
                                    </View>
                                  );
                                }
                                return (
                                  <View key={attribute.id} style={styles.fieldGroup}>
                                    <TextInput
                                      activeOutlineColor={palette.brand}
                                      keyboardType={attribute.id === "GTIN" ? "number-pad" : "default"}
                                      label={label}
                                      mode="outlined"
                                      onChangeText={(value) => setMercadoLibreAttribute(attribute.id, value)}
                                      outlineColor={palette.borderStrong}
                                      style={[styles.textInput, { backgroundColor: palette.input }]}
                                      textColor={palette.title}
                                      theme={{ colors: { onSurfaceVariant: palette.muted } }}
                                      value={selected.valueName}
                                    />
                                    {gtinHint ? <Text style={{ color: palette.muted }} variant="bodySmall">{gtinHint}</Text> : null}
                                    {attribute.conditionalRequired && !required ? <Text style={{ color: palette.muted }} variant="bodySmall">Condicional · {attribute.id}</Text> : null}
                                  </View>
                                );
                              })}
                            {mercadoLibreAttributes.length ? <Text style={{ color: palette.muted }} variant="bodySmall">Los atributos con * son obligatorios. Los condicionales se exigen solo en ciertos casos; completa los que correspondan al producto.</Text> : null}
                          </>
                        ) : null}
                      </View>
                    ) : null}
                  </>
                ) : null}
              </Surface>
            ) : null}

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
                        {selectedCurrency}
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
                Categoría del producto
              </Text>
              <Text style={{ color: palette.copy }} variant="bodySmall">
                {selectableCategoryIds.size
                  ? "Elige una categoría activa para que el producto aparezca en el catálogo por categorías."
                  : "Crea una categoría activa para organizar el catálogo; mientras tanto podrás guardar el producto sin categoría."}
              </Text>
              <Button
                disabled={!categoriesReady || !productReady}
                icon={selectedCategory ? "shape" : "shape-outline"}
                mode="outlined"
                onPress={() => setCategorySelectorOpen(true)}
                style={[styles.categorySelector, { borderColor: palette.borderStrong }]}
                textColor={selectedCategory ? palette.title : palette.muted}
              >
                {!categoriesReady
                  ? "Cargando categorías…"
                  : selectedCategoryPath || (selectedCategoryId ? "Categoría no disponible" : "Sin categoría")}
              </Button>
              {selectedCategoryId && categoriesReady && !selectedCategoryIsAvailable ? (
                <View style={[styles.categoryWarning, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
                  <MaterialCommunityIcons color={theme.colors.error} name="alert-circle-outline" size={19} />
                  <Text style={{ color: palette.copy, flex: 1 }} variant="bodySmall">
                    Esta categoría o uno de sus niveles superiores está inactivo. No se puede asignar a otros productos hasta reactivar la rama.
                  </Text>
                </View>
              ) : null}
              {categoriesReady && categories.length === 0 ? (
                <Button
                  buttonColor={palette.brandSoft}
                  mode="contained-tonal"
                  onPress={() => {
                    setCategorySelectorOpen(false);
                    router.push("/(empresa)/Categorias");
                  }}
                  textColor={palette.brandStrong}
                >
                  Crear la primera categoría
                </Button>
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
                Imagen del producto
              </Text>

              <View style={[styles.imagePanel, { borderColor: palette.border }]}> 
                {loadingImage ? (
                  <View style={[styles.imagePlaceholder, { backgroundColor: palette.cardSoft }]}> 
                    <Text style={{ color: palette.copy }} variant="bodySmall">Cargando galería…</Text>
                  </View>
                ) : (
                  <ProductImageCarousel
                    images={previewImages}
                    resizeMode="contain"
                    size={240}
                    style={styles.imagePreview}
                  />
                )}
              </View>

              {previewImages.length ? (
                <ScrollView
                  contentContainerStyle={styles.imageThumbnailList}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  {previewImages.map((image, index) => (
                    <View key={image.id} style={[styles.imageThumbnailItem, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}> 
                      <Image resizeMode="cover" source={{ uri: image.url }} style={styles.imageThumbnail} />
                      <Text style={{ color: palette.muted }} variant="labelSmall">{index + 1}</Text>
                      <Tooltip title={product?.mercadoLibre?.itemId
                        ? "Quita la foto y actualiza el anuncio vinculado."
                        : "Quita esta foto del producto antes de guardar."}>
                        <Button compact icon="delete-outline" onPress={() => handleRemoveImage(image)} textColor={theme.colors.error}>
                          Quitar
                        </Button>
                      </Tooltip>
                    </View>
                  ))}
                </ScrollView>
              ) : null}

              <View style={[styles.imageActions, isCompactLayout ? styles.imageActionsStacked : null]}>
                <Tooltip title={product?.mercadoLibre?.itemId
                  ? "Sube fotos y encola su sincronización."
                  : mercadoLibreForm.publish
                    ? "Las fotos se envían al publicar el producto."
                    : "Las fotos quedan en VIDKAR; puedes publicarlas después."}>
                  <Button buttonColor={palette.brandSoft} mode="contained-tonal" onPress={handlePickImage} textColor={palette.brandStrong}>
                    Agregar imágenes
                  </Button>
                </Tooltip>
                {previewImages.length ? (
                  <Tooltip title="Quita las fotos locales y sincroniza la galería.">
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setPendingImages([]);
                        setRemovedImageIds(existingImages.filter((image) => !image.legacy).map((image) => image.id));
                        setRemoveAllImages(true);
                        setExistingImages([]);
                      }}
                      textColor={palette.title}
                    >
                      Quitar todas
                    </Button>
                  </Tooltip>
                ) : null}
              </View>
              <Text style={{ color: palette.muted }} variant="bodySmall">
                {previewImages.length} imagen{previewImages.length === 1 ? "" : "es"} · máximo 10 MB por archivo, sin límite de cantidad.
              </Text>
            </Surface>

            <Tooltip title={mercadoLibreForm.publish
              ? "Guarda en VIDKAR e intenta publicar en Mercado Libre."
              : product?.mercadoLibre?.itemId
                ? "Guarda localmente y sincroniza cambios compatibles."
                : "Guarda el producto solo en el catálogo de VIDKAR."}>
              <Button
                contentStyle={styles.submitButtonContent}
                disabled={!categoriesReady || !productReady || saving}
                loading={saving}
                mode="contained"
                onPress={handleSubmit}
                style={styles.submitButton}
                textColor="#FFFFFF"
              >
                {isEditMode ? "Guardar cambios" : "Crear producto"}
              </Button>
            </Tooltip>
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

      <CategoryTreeSelect
        categories={categories}
        onClose={() => setCategorySelectorOpen(false)}
        onManage={() => {
          setCategorySelectorOpen(false);
          router.push("/(empresa)/Categorias");
        }}
        onSelect={setSelectedCategoryId}
        open={categorySelectorOpen}
        selectedCategoryId={selectedCategoryId}
      />
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
  mercadoLibreHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  mercadoLibreFields: {
    gap: 12,
  },
  mercadoLibreNativeHost: {
    width: "100%",
  },
  mercadoLibreWarning: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
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
    overflow: "hidden",
  },
  imageThumbnailList: {
    gap: 10,
    paddingVertical: 2,
  },
  imageThumbnailItem: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    padding: 6,
    width: 104,
  },
  imageThumbnail: {
    borderRadius: 9,
    height: 76,
    width: 90,
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
  categorySelector: {
    minHeight: 50,
  },
  categoryWarning: {
    alignItems: "flex-start",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  submitButtonContent: {
    alignItems: "center",
    justifyContent: "center",
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