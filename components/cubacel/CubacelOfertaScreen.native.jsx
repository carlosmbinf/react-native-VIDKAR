import MeteorBase from "@meteorrn/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    Alert,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    Card,
    Surface,
    Text,
    TextInput,
} from "react-native-paper";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import { DTShopProductosCollection } from "../collections/collections";
import AppHeader from "../Header/AppHeader";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const formatPromoDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const day = new Intl.DateTimeFormat("es-ES", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("es-ES", { month: "short" }).format(
    date,
  );
  return `${day} ${month}`;
};

const normalizeToArray = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (value && typeof value === "object") {
    return Object.values(value).filter(Boolean);
  }

  return [];
};

const extractPromoImageUrl = (promos) => {
  for (const promotion of normalizeToArray(promos)) {
    const text = [promotion?.terms, promotion?.description, promotion?.title]
      .filter(Boolean)
      .join(" ");
    const markdownImage = text.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/i);
    if (markdownImage?.[1]) {
      return markdownImage[1];
    }
    const plainUrl = text.match(/https?:\/\/[^\s)]+/i);
    if (plainUrl?.[0]) {
      return plainUrl[0];
    }
  }
  return null;
};

const getBenefitsText = (product) => {
  const { benefits, description } = product || {};

  return (
    description ||
    benefits?.reduce((accumulator, benefit) => {
      if (benefit.amount?.totalIncludingTax === -1) {
        return accumulator;
      }

      const unit = benefit.type !== "SMS" ? benefit.unit : benefit.type;
      return `${accumulator}${benefit.amount?.totalIncludingTax} ${unit}\n`;
    }, "") ||
    ""
  );
};

const toMoneyLabel = (value, currency) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return `${value} ${currency}`;
};

const CubacelOfertaScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [extraFields, setExtraFields] = useState({});
  const [nombre, setNombre] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dataReady = useDeferredScreenData();

  const productId =
    typeof params.productId === "string" ? params.productId : "";

  const { product, ready } = Meteor.useTracker(() => {
    if (!dataReady) {
      return { product: null, ready: false };
    }

    const handler = Meteor.subscribe("productosDtShop");

    return {
      product: productId
        ? DTShopProductosCollection.findOne({ _id: productId })
        : null,
      ready: handler.ready(),
    };
  }, [dataReady, productId]);

  const normalizedPromotions = useMemo(
    () => normalizeToArray(product?.promotions),
    [product?.promotions],
  );
  const primaryPromotion = normalizedPromotions[0] || null;
  const additionalPromotions = normalizedPromotions.slice(1);
  const benefitsText = useMemo(() => getBenefitsText(product), [product]);
  const promoImageUrl = useMemo(
    () => extractPromoImageUrl(normalizedPromotions),
    [normalizedPromotions],
  );

  const localFallback = require("./Gemini_Generated_Image_rtg44brtg44brtg4.png");
  const backgroundSource = promoImageUrl
    ? { uri: promoImageUrl }
    : localFallback;

  const precioUSD = product?.prices?.retail?.amount || "---";
  const operadorNombre = product?.operator?.name || "ETECSA";
  const promoTitle = primaryPromotion?.title || product?.name || operadorNombre;
  const promoTerms =
    primaryPromotion?.terms || product?.description || benefitsText;
  const promoStartDate = formatPromoDate(primaryPromotion?.startDate);
  const promoEndDate = formatPromoDate(primaryPromotion?.endDate);

  const formGroups = useMemo(
    () =>
      [
        normalizeToArray(product?.requiredCreditPartyIdentifierFields),
        normalizeToArray(product?.requiredBeneficiaryFields),
        normalizeToArray(product?.requiredAdditionalIdentifierFields),
        normalizeToArray(product?.requiredDebitPartyIdentifierFields),
        normalizeToArray(product?.requiredSenderFields),
        normalizeToArray(product?.requiredStatementIdentifierFields),
      ]
        .flat()
        .flat(),
    [product],
  );

  const handleExtraFieldChange = (field, value) => {
    const upperField = field.replace(/_/g, " ").toUpperCase();
    const numericValue = upperField.includes("MOBILE NUMBER")
      ? value.replace(/[^0-9]/g, "")
      : value;

    setExtraFields((current) => ({
      ...current,
      [field]: numericValue,
    }));
  };

  const handleSubmit = () => {
    if (!product) {
      return;
    }

    const userId = Meteor.userId();
    if (!userId) {
      Alert.alert("Error", "Debes iniciar sesión para continuar");
      return;
    }

    setSubmitting(true);
    Meteor.call(
      "insertarCarrito",
      {
        idUser: userId,
        cobrarUSD: precioUSD,
        nombre,
        movilARecargar: `+53${extraFields.mobile_number || ""}`,
        comentario: benefitsText,
        type: "RECARGA",
        monedaCuba: "CUP",
        producto: product,
        extraFields,
      },
      (error) => {
        setSubmitting(false);

        if (error) {
          Alert.alert(
            "Error",
            error.reason || "No se pudo insertar la recarga en el carrito.",
          );
          return;
        }

        Alert.alert("Éxito", "✅ Remesa añadida al carrito", [
          {
            onPress: () => router.back(),
            text: "Continuar",
          },
        ]);
      },
    );
  };

  if (!productId) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <Surface style={styles.screen}>
          <AppHeader
            title="Oferta Cubacel"
            backHref="/(normal)/ProductosCubacelCards"
            showBackButton
          />
          <View style={styles.centerState}>
            <Text style={styles.stateTitle}>
              No se recibió una oferta válida
            </Text>
          </View>
        </Surface>
      </SafeAreaView>
    );
  }

  if (!ready && !product) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <Surface style={styles.screen}>
          <AppHeader
            title="Oferta Cubacel"
            backHref="/(normal)/ProductosCubacelCards"
            showBackButton
          />
          <View style={styles.centerState}>
            <ActivityIndicator size="large" />
            <Text style={styles.stateTitle}>Cargando oferta Cubacel...</Text>
          </View>
        </Surface>
      </SafeAreaView>
    );
  }

  if (ready && !product) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <Surface style={styles.screen}>
          <AppHeader
            title="Oferta Cubacel"
            backHref="/(normal)/ProductosCubacelCards"
            showBackButton
          />
          <View style={styles.centerState}>
            <Text style={styles.stateTitle}>
              La oferta ya no está disponible
            </Text>
            <Button
              mode="contained"
              onPress={() => router.replace("/(normal)/ProductosCubacelCards")}
            >
              Volver a Cubacel
            </Button>
          </View>
        </Surface>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <Surface style={styles.screen}>
        <AppHeader
          title="Oferta Cubacel"
          subtitle="Completa tu recarga con datos correctos"
          backHref="/(normal)/ProductosCubacelCards"
          showBackButton
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            showsVerticalScrollIndicator={false}
          >
            <ImageBackground
              source={backgroundSource}
              defaultSource={Platform.OS === "ios" ? localFallback : undefined}
              resizeMode="cover"
              imageStyle={styles.heroImageBorder}
              style={styles.heroImage}
            >
              <View style={styles.heroScrim} />
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>Oferta Cubacel</Text>
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>
                  {product?.name || "Oferta Cubacel"}
                </Text>
                {/* <Text style={styles.heroSubtitle}>{operadorNombre}</Text> */}
                <View style={styles.heroPriceRow}>
                  <View style={styles.heroPricePill}>
                    <Text style={styles.heroPriceLabel}>Costo</Text>
                    <Text style={styles.heroPriceValue}>
                      {toMoneyLabel(precioUSD, "USD")}
                    </Text>
                  </View>
                </View>
              </View>
            </ImageBackground>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryEyebrow}>Resumen de la oferta</Text>
              <Text style={styles.summaryTitle}>{promoTitle}</Text>
              {promoTerms ? (
                <Text style={styles.summaryBody}>{promoTerms}</Text>
              ) : null}
              {promoStartDate && promoEndDate ? (
                <View style={styles.summaryPill}>
                  <Text
                    style={styles.summaryPillText}
                  >{`Vigencia ${promoStartDate} - ${promoEndDate}`}</Text>
                </View>
              ) : null}
            </View>

            {benefitsText ? (
              <Card style={styles.sectionCard}>
                <Card.Content>
                  <Text style={styles.sectionEyebrow}>
                    Beneficios incluidos
                  </Text>
                  <Text style={styles.sectionBody}>{benefitsText.trim()}</Text>
                </Card.Content>
              </Card>
            ) : null}

            {additionalPromotions.length > 0 ? (
              <View style={styles.additionalSection}>
                <Text style={styles.sectionEyebrowDark}>
                  Promociones adicionales
                </Text>
                {additionalPromotions.map((promo, index) => (
                  <View
                    key={`${promo?.title || "extra"}-${index}`}
                    style={styles.additionalPromoCard}
                  >
                    <Text style={styles.additionalPromoTitle}>
                      {promo.title || `Promoción ${index + 2}`}
                    </Text>
                    {promo.startDate || promo.endDate ? (
                      <Text style={styles.additionalPromoDate}>
                        {`${formatPromoDate(promo?.startDate) || "-"} - ${formatPromoDate(promo?.endDate) || "-"}`}
                      </Text>
                    ) : null}
                    {promo.terms ? (
                      <Text style={styles.additionalPromoTerms}>
                        {promo.terms}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            <Card style={styles.sectionCard}>
              <Card.Content>
                <Text style={styles.sectionEyebrow}>
                  Datos para procesar la recarga
                </Text>
                <Text style={styles.formHelper}>
                  Introduce los datos exactamente como deben enviarse al
                  destinatario.
                </Text>

                <TextInput
                  label="Nombre de la persona"
                  value={nombre}
                  onChangeText={setNombre}
                  mode="outlined"
                  autoComplete="name"
                  style={styles.input}
                  dense
                  //   outlineColor="#d7dfeb"
                  //   activeOutlineColor="#0f4c81"
                  //   textColor="#0f172a"
                  returnKeyType="next"
                  blurOnSubmit={false}
                />

                {formGroups.map((field, index) => {
                  const upperField = field.replace(/_/g, " ").toUpperCase();
                  const isPhoneField = upperField.includes("MOBILE NUMBER");

                  return (
                    <TextInput
                      key={`${field}-${index}`}
                      label={upperField}
                      value={extraFields[field] || ""}
                      onChangeText={(value) =>
                        handleExtraFieldChange(field, value)
                      }
                      mode="outlined"
                      keyboardType={isPhoneField ? "number-pad" : "default"}
                      style={styles.input}
                      dense
                      //   outlineColor="#d7dfeb"
                      //   activeOutlineColor="#0f4c81"
                      //   textColor="#0f172a"
                      maxLength={isPhoneField ? 8 : undefined}
                      left={
                        isPhoneField ? <TextInput.Affix text="+53" /> : null
                      }
                      inputMode={isPhoneField ? "tel" : "text"}
                      returnKeyType="next"
                      blurOnSubmit={false}
                    />
                  );
                })}
              </Card.Content>
            </Card>
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                paddingBottom: Math.max(insets.bottom, 18),
              },
            ]}
          >
            <View style={styles.footerSummary}>
              <Text style={styles.footerSummaryLabel}>Total</Text>
              <Text style={styles.footerSummaryValue}>
                {toMoneyLabel(precioUSD, "USD")}
              </Text>
            </View>
            <View style={styles.footerActions}>
              <Button
                mode="outlined"
                onPress={() => router.back()}
                style={styles.footerButton}
                labelStyle={styles.footerSecondaryLabel}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={submitting}
                disabled={submitting}
                style={[styles.footerButton, styles.footerPrimaryButton]}
                labelStyle={styles.footerPrimaryLabel}
              >
                Confirmar compra
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Surface>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#eef2f7",
    flex: 1,
  },
  screen: {
    // backgroundColor: "#eef2f7",
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  centerState: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stateTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  heroImage: {
    justifyContent: "space-between",
    // marginBottom: 16,
    minHeight: 200,
    padding: 18,
    paddingBottom: 40,
  },
  heroImageBorder: {
    // borderRadius: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 15, 32, 0.42)",
    // borderRadius: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  heroCopy: {
    marginTop: 48,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  heroPriceRow: {
    marginTop: 15,
  },
  heroPricePill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  heroPriceLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroPriceValue: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "800",
  },
  summaryCard: {
    backgroundColor: "#0f172a",
    borderRadius: 24,
    marginHorizontal: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginTop: -30,
  },
  summaryEyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.9,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  summaryTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  summaryBody: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  summaryPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  summaryPillText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  sectionCard: {
    // backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 14,
  },
  sectionEyebrow: {
    // color: "#0f4c81",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.9,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  sectionEyebrowDark: {
    color: "#334155",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.9,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  sectionBody: {
    // color: "#475569",
    fontSize: 13,
    lineHeight: 20,
  },
  additionalSection: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  additionalPromoCard: {
    backgroundColor: "#ffffff",
    borderColor: "#d9e4f2",
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  additionalPromoTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "800",
  },
  additionalPromoDate: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },
  additionalPromoTerms: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  formHelper: {
    // color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  input: {
    // backgroundColor: "#ffffff",
    marginBottom: 12,
  },
  footer: {
    // backgroundColor: "#ffffff",
    borderTopColor: "#dbe4ef",
    borderTopWidth: 1,
    paddingBottom: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  footerSummary: {
    marginBottom: 12,
  },
  footerSummaryLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  footerSummaryValue: {
    // color: "#0f172a",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
  },
  footerActions: {
    flexDirection: "row",
  },
  footerButton: {
    borderRadius: 16,
    flex: 1,
  },
  footerPrimaryButton: {
    marginLeft: 8,
  },
  footerPrimaryLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  footerSecondaryLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});

export default CubacelOfertaScreen;
