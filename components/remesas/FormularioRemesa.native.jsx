import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import {
    Button,
    Chip,
    Divider,
    HelperText,
    IconButton,
    Surface,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";

const Meteor = MeteorBase;

const initialForm = {
  cobrarUSD: "",
  comentario: "",
  direccionCuba: "",
  metodoPago: "",
  monedaRecibirEnCuba: "",
  nombre: "",
  recibirEnCuba: "",
  tarjetaCUP: "",
};

const FormularioRemesa = () => {
  const theme = useTheme();
  const isDark = Boolean(theme?.dark);

  const [descuento, setDescuento] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [isFocusMetodo, setIsFocusMetodo] = useState(false);
  const [isFocusMoneda, setIsFocusMoneda] = useState(false);
  const [open, setOpen] = useState(false);
  const [precioCUP, setPrecioCUP] = useState(0);
  const [properties, setProperties] = useState([]);
  const [loadingProps, setLoadingProps] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = useMemo(
    () => ({
      accent: isDark ? "#38bdf8" : "#0284c7",
      background: isDark ? "rgba(15, 23, 42, 0.96)" : "#ffffff",
      bannerBg: isDark ? "rgba(2, 132, 199, 0.12)" : "rgba(2, 132, 199, 0.08)",
      bannerBorder: isDark ? "rgba(56, 189, 248, 0.28)" : "rgba(2, 132, 199, 0.22)",
      border: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
      chipBg: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
      dropdownBg: isDark ? "#1e293b" : "#ffffff",
      inputBg: isDark ? "rgba(30, 41, 59, 0.6)" : "rgba(248, 250, 252, 0.9)",
      muted: isDark ? "#94a3b8" : "#64748b",
      primary: isDark ? "#60a5fa" : "#2563eb",
      success: isDark ? "#4ade80" : "#16a34a",
      successBg: isDark ? "rgba(34, 197, 94, 0.12)" : "rgba(34, 197, 94, 0.08)",
      surface: isDark ? "#0f172a" : "#ffffff",
      text: isDark ? "#f8fafc" : "#0f172a",
    }),
    [isDark],
  );

  useEffect(() => {
    setLoadingProps(true);
    Meteor.call(
      "property.get",
      ["REMESA", "PRECIO", "DESCUENTOS"],
      (error, result) => {
        setLoadingProps(false);
        if (error) {
          console.error("Error al obtener propiedades:", error);
          return;
        }

        setProperties(Array.isArray(result) ? result : []);
      },
    );
  }, []);

  useEffect(() => {
    const precio = Number(
      properties?.find(
        (entry) =>
          entry.type === "PRECIO" && entry.clave === form.monedaRecibirEnCuba,
      )?.valor || 0,
    );
    const descuentoActual = Number(
      properties?.find(
        (entry) =>
          entry.type === "DESCUENTOS" &&
          entry.clave === form.monedaRecibirEnCuba &&
          entry.idAdminConfigurado === Meteor.user()?.bloqueadoDesbloqueadoPor,
      )?.valor || 0,
    );

    setPrecioCUP(precio);
    setDescuento(descuentoActual);
  }, [form.monedaRecibirEnCuba, properties]);

  const monedas = useMemo(() => {
    try {
      const parsed = JSON.parse(
        properties?.find((entry) => entry.clave === "monedaACobrarEnCuba")
          ?.valor || "[]",
      );
      return parsed.map((item) => ({
        label: String(item),
        value: String(item),
      }));
    } catch {
      return [];
    }
  }, [properties]);

  const metodosPagoCUP = useMemo(() => {
    try {
      const parsed = JSON.parse(
        properties?.find((entry) => entry.clave === "metodoPagoEnCuba")
          ?.valor || "[]",
      );
      return parsed.map((item) => ({
        label: String(item).toUpperCase(),
        value: String(item).toUpperCase(),
      }));
    } catch {
      return [];
    }
  }, [properties]);

  const tasaEfectiva = Math.max(0, Number(precioCUP - descuento));
  const montoNumerico = Number(form.cobrarUSD || 0);
  const valorEntregar = montoNumerico * tasaEfectiva;

  const formatearNumero = (value) =>
    Number(value || 0).toLocaleString("es-ES", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });

  const formatearTarjeta = (value) => {
    const soloNumeros = String(value || "")
      .replace(/\D/g, "")
      .slice(0, 16);
    return soloNumeros.replace(/(.{4})/g, "$1 ").trim();
  };

  const handleChange = (name, value) => {
    setForm((current) => {
      if (name === "tarjetaCUP") {
        return { ...current, tarjetaCUP: formatearTarjeta(value) };
      }

      if (name === "monedaRecibirEnCuba") {
        return {
          ...current,
          metodoPago: value === "USD" ? "EFECTIVO" : current.metodoPago,
          monedaRecibirEnCuba: value,
        };
      }

      return { ...current, [name]: value };
    });
  };

  const handleQuickAmount = (amount) => {
    handleChange("cobrarUSD", String(amount));
  };

  const handleSubmit = () => {
    const userId = Meteor.userId();
    if (!userId) {
      alert("Debe iniciar sesión para realizar esta acción.");
      return;
    }

    const errores = [];
    if (!form.nombre?.trim())
      errores.push("El nombre del destinatario es obligatorio.");
    if (!form.monedaRecibirEnCuba) {
      errores.push("Debe seleccionar la moneda a cobrar en Cuba.");
    }

    const monto = Number(form.cobrarUSD);
    if (!monto || Number.isNaN(monto) || monto <= 0) {
      errores.push("El monto a enviar en USD debe ser un número mayor que 0.");
    }

    if (form.monedaRecibirEnCuba === "CUP" && !form.metodoPago) {
      errores.push("Debe seleccionar el método de entrega.");
    }

    if (
      form.monedaRecibirEnCuba === "CUP" &&
      form.metodoPago === "TRANSFERENCIA"
    ) {
      const digits = (form.tarjetaCUP || "").replace(/\D/g, "");
      if (digits.length !== 16) {
        errores.push("La tarjeta CUP debe tener 16 dígitos.");
      }
    }

    if (form.metodoPago === "EFECTIVO" || form.monedaRecibirEnCuba !== "CUP") {
      if (!form.direccionCuba?.trim()) {
        errores.push("Debe indicar la dirección de entrega en Cuba.");
      }
    }

    if (errores.length) {
      alert(`Por favor verifique los siguientes campos:\n- ${errores.join("\n- ")}`);
      return;
    }

    setIsSubmitting(true);
    const nuevoCarrito = {
      cobrarUSD: form.cobrarUSD,
      comentario: form.comentario,
      descuentoAdmin: descuento,
      direccionCuba:
        form.metodoPago === "EFECTIVO" || form.monedaRecibirEnCuba !== "CUP"
          ? form.direccionCuba
          : "",
      idAdmin: Meteor.user()?.bloqueadoDesbloqueadoPor,
      idUser: userId,
      metodoPago: form.metodoPago,
      monedaRecibirEnCuba: form.monedaRecibirEnCuba,
      nombre: form.nombre,
      precioDolar: precioCUP,
      recibirEnCuba: valorEntregar,
      tarjetaCUP: form.metodoPago === "TRANSFERENCIA" ? form.tarjetaCUP : "",
      type: "REMESA",
    };

    Meteor.call("insertarCarrito", nuevoCarrito, (error) => {
      setIsSubmitting(false);
      if (error) {
        console.error("Error al insertar en el carrito:", error);
        alert(`Error: ${error.reason || "No se pudo añadir al carrito"}`);
        return;
      }

      alert("✅ Remesa añadida al carrito con éxito.");
      setForm(initialForm);
      setOpen(false);
    });
  };

  const renderIcon = (iconName, focused) => (
    <MaterialCommunityIcons
      name={iconName}
      size={18}
      color={focused ? colors.primary : colors.muted}
      style={styles.dropdownIcon}
    />
  );

  return (
    <Surface
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
      elevation={1}
    >
      <Pressable
        onPress={() => setOpen((current) => !current)}
        style={styles.headerPressable}
        android_ripple={{ color: colors.chipBg }}
      >
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: open ? colors.bannerBg : colors.chipBg },
            ]}
          >
            <IconButton
              icon={open ? "currency-usd" : "send-outline"}
              size={20}
              iconColor={colors.primary}
              style={styles.zeroMargin}
            />
          </View>
          <View style={styles.headerTextCol}>
            <Text
              variant="titleMedium"
              style={[styles.headerTitle, { color: colors.text }]}
            >
              {open ? "Nueva Remesa a Cuba" : "Enviar nueva remesa"}
            </Text>
            <Text
              variant="bodySmall"
              style={[styles.headerSubtitle, { color: colors.muted }]}
            >
              Calcula la tasa en vivo y añade directamente a tu carrito
            </Text>
          </View>
        </View>
        <IconButton
          icon={open ? "chevron-up" : "plus"}
          size={22}
          iconColor={colors.primary}
          style={styles.zeroMargin}
        />
      </Pressable>

      {open ? (
        <View style={styles.formContainer}>
          <Divider style={[styles.formDivider, { backgroundColor: colors.border }]} />

          {/* Destinatario */}
          <Text variant="labelLarge" style={[styles.fieldSectionLabel, { color: colors.text }]}>
            1. Destinatario en Cuba
          </Text>

          <TextInput
            label="Nombre y Apellidos completos"
            value={form.nombre}
            onChangeText={(value) => handleChange("nombre", value)}
            style={[styles.input, { backgroundColor: colors.inputBg }]}
            mode="outlined"
            placeholder="Ej. Juan Pérez González"
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            left={<TextInput.Icon icon="account-outline" color={colors.muted} />}
          />

          {/* Moneda y Método */}
          <Text
            variant="labelLarge"
            style={[styles.fieldSectionLabel, { color: colors.text, marginTop: 8 }]}
          >
            2. Moneda y Entrega
          </Text>

          <View style={styles.dropdownContainer}>
            <Text style={[styles.dropdownLabel, { color: colors.muted }]}>
              Moneda a recibir en Cuba
            </Text>
            <Dropdown
              style={[
                styles.dropdown,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: isFocusMoneda ? colors.primary : colors.border,
                },
              ]}
              placeholderStyle={[styles.placeholderStyle, { color: colors.muted }]}
              selectedTextStyle={[styles.selectedTextStyle, { color: colors.text }]}
              inputSearchStyle={styles.inputSearchStyle}
              keyboardAvoiding
              containerStyle={[
                styles.containerStyle,
                { backgroundColor: colors.dropdownBg, borderColor: colors.border },
              ]}
              iconStyle={styles.iconStyle}
              data={monedas}
              search
              maxHeight={200}
              labelField="label"
              valueField="value"
              placeholder={!isFocusMoneda ? "Selecciona moneda..." : "..."}
              searchPlaceholder="Buscar moneda..."
              value={form.monedaRecibirEnCuba}
              onFocus={() => setIsFocusMoneda(true)}
              onBlur={() => setIsFocusMoneda(false)}
              onChange={(item) => {
                handleChange("monedaRecibirEnCuba", item.value);
                setIsFocusMoneda(false);
              }}
              renderLeftIcon={() => renderIcon("cash-multiple", isFocusMoneda)}
            />
          </View>

          {form.monedaRecibirEnCuba === "CUP" ? (
            <View style={styles.dropdownContainer}>
              <Text style={[styles.dropdownLabel, { color: colors.muted }]}>
                Método de pago / entrega
              </Text>
              <Dropdown
                style={[
                  styles.dropdown,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: isFocusMetodo ? colors.primary : colors.border,
                  },
                ]}
                placeholderStyle={[styles.placeholderStyle, { color: colors.muted }]}
                selectedTextStyle={[styles.selectedTextStyle, { color: colors.text }]}
                inputSearchStyle={styles.inputSearchStyle}
                keyboardAvoiding
                containerStyle={[
                  styles.containerStyle,
                  { backgroundColor: colors.dropdownBg, borderColor: colors.border },
                ]}
                iconStyle={styles.iconStyle}
                data={metodosPagoCUP}
                search
                maxHeight={200}
                labelField="label"
                valueField="value"
                placeholder={!isFocusMetodo ? "Selecciona método..." : "..."}
                searchPlaceholder="Buscar..."
                value={form.metodoPago}
                onFocus={() => setIsFocusMetodo(true)}
                onBlur={() => setIsFocusMetodo(false)}
                onChange={(item) => {
                  handleChange("metodoPago", item.value);
                  setIsFocusMetodo(false);
                }}
                renderLeftIcon={() => renderIcon("credit-card-outline", isFocusMetodo)}
              />
            </View>
          ) : null}

          {form.monedaRecibirEnCuba && form.monedaRecibirEnCuba !== "CUP" ? (
            <Surface
              style={[
                styles.infoBadge,
                { backgroundColor: colors.bannerBg, borderColor: colors.bannerBorder },
              ]}
              elevation={0}
            >
              <IconButton
                icon="information-outline"
                size={18}
                iconColor={colors.accent}
                style={styles.zeroMargin}
              />
              <Text style={[styles.infoBadgeText, { color: colors.text }]}>
                Método de entrega: <Text style={styles.bold}>EFECTIVO</Text> en domicilio.
              </Text>
            </Surface>
          ) : null}

          {/* Monto e importe */}
          <Text
            variant="labelLarge"
            style={[styles.fieldSectionLabel, { color: colors.text, marginTop: 8 }]}
          >
            3. Monto y Cálculo
          </Text>

          <TextInput
            label="Monto a enviar (USD)"
            value={form.cobrarUSD}
            onChangeText={(value) => handleChange("cobrarUSD", value)}
            style={[styles.input, { backgroundColor: colors.inputBg }]}
            mode="outlined"
            keyboardType="numeric"
            placeholder="0.00"
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            left={<TextInput.Icon icon="currency-usd" color={colors.muted} />}
          />

          {/* Chips de montos rápidos */}
          <View style={styles.quickAmountsRow}>
            {[50, 100, 150, 200, 300].map((amt) => (
              <Chip
                key={amt}
                compact
                onPress={() => handleQuickAmount(amt)}
                style={[
                  styles.quickChip,
                  {
                    backgroundColor:
                      form.cobrarUSD === String(amt)
                        ? colors.bannerBg
                        : colors.chipBg,
                    borderColor:
                      form.cobrarUSD === String(amt)
                        ? colors.primary
                        : colors.border,
                  },
                ]}
                textStyle={{
                  color:
                    form.cobrarUSD === String(amt)
                      ? colors.primary
                      : colors.muted,
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                ${amt}
              </Chip>
            ))}
          </View>

          {/* Banner con desglose en vivo */}
          {form.monedaRecibirEnCuba ? (
            <Surface
              style={[
                styles.calculationCard,
                {
                  backgroundColor: colors.bannerBg,
                  borderColor: colors.bannerBorder,
                },
              ]}
              elevation={0}
            >
              <View style={styles.calcRow}>
                <Text style={[styles.calcLabel, { color: colors.muted }]}>
                  Tasa de cambio:
                </Text>
                <Text style={[styles.calcValue, { color: colors.text }]}>
                  1 USD = {formatearNumero(tasaEfectiva)} {form.monedaRecibirEnCuba}
                </Text>
              </View>

              {descuento > 0 ? (
                <View style={styles.calcRow}>
                  <Text style={[styles.calcLabel, { color: colors.muted }]}>
                    Descuento aplicado:
                  </Text>
                  <Text style={[styles.calcValue, { color: colors.success }]}>
                    -{formatearNumero(descuento)} {form.monedaRecibirEnCuba}
                  </Text>
                </View>
              ) : null}

              <Divider style={[styles.calcDivider, { backgroundColor: colors.bannerBorder }]} />

              <View style={styles.calcTotalRow}>
                <Text style={[styles.calcTotalLabel, { color: colors.text }]}>
                  El destinatario recibe:
                </Text>
                <Text style={[styles.calcTotalValue, { color: colors.primary }]}>
                  {valorEntregar > 0
                    ? `${valorEntregar.toLocaleString("es-ES", {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                      })} ${form.monedaRecibirEnCuba}`
                    : `0.00 ${form.monedaRecibirEnCuba}`}
                </Text>
              </View>
            </Surface>
          ) : (
            <HelperText type="info" visible style={{ color: colors.muted }}>
              💡 Selecciona una moneda para ver la tasa de cambio en vivo.
            </HelperText>
          )}

          {/* Datos según método */}
          {form.metodoPago === "TRANSFERENCIA" &&
          form.monedaRecibirEnCuba === "CUP" ? (
            <View style={{ marginTop: 8 }}>
              <TextInput
                label="Número de tarjeta CUP (16 dígitos)"
                value={form.tarjetaCUP}
                onChangeText={(value) => handleChange("tarjetaCUP", value)}
                style={[styles.input, { backgroundColor: colors.inputBg }]}
                mode="outlined"
                keyboardType="numeric"
                maxLength={19}
                placeholder="9225 XXXX XXXX XXXX"
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                left={<TextInput.Icon icon="credit-card-outline" color={colors.muted} />}
              />
            </View>
          ) : null}

          {form.metodoPago === "EFECTIVO" ||
          (form.monedaRecibirEnCuba && form.monedaRecibirEnCuba !== "CUP") ? (
            <View style={{ marginTop: 8 }}>
              <TextInput
                label="Dirección de entrega en Cuba"
                value={form.direccionCuba}
                onChangeText={(value) => handleChange("direccionCuba", value)}
                style={[styles.input, { backgroundColor: colors.inputBg }]}
                mode="outlined"
                multiline
                numberOfLines={2}
                placeholder="Calle, número, entrecalles, municipio y provincia..."
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                left={<TextInput.Icon icon="map-marker-outline" color={colors.muted} />}
              />
            </View>
          ) : null}

          <TextInput
            label="Comentario o nota adicional (opcional)"
            value={form.comentario}
            onChangeText={(value) => handleChange("comentario", value)}
            style={[styles.input, { backgroundColor: colors.inputBg, marginTop: 8 }]}
            mode="outlined"
            multiline
            numberOfLines={2}
            placeholder="Instrucciones especiales para el repartidor o receptor..."
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            left={<TextInput.Icon icon="note-text-outline" color={colors.muted} />}
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || loadingProps}
            icon="cart-plus"
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            contentStyle={styles.submitButtonContent}
            labelStyle={styles.submitButtonLabel}
          >
            Añadir Remesa al Carrito
          </Button>
        </View>
      ) : null}
    </Surface>
  );
};

const styles = StyleSheet.create({
  bold: {
    fontWeight: "700",
  },
  calcDivider: {
    marginVertical: 6,
  },
  calcLabel: {
    fontSize: 12,
  },
  calcRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  calcTotalLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  calcTotalRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  calcTotalValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  calcValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  calculationCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 10,
    padding: 12,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: "hidden",
  },
  containerStyle: {
    borderRadius: 12,
    borderWidth: 1,
    elevation: 4,
    marginTop: 4,
  },
  dropdown: {
    borderRadius: 10,
    borderWidth: 1,
    height: 46,
    paddingHorizontal: 12,
  },
  dropdownContainer: {
    marginBottom: 12,
  },
  dropdownIcon: {
    marginRight: 8,
  },
  dropdownLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginLeft: 2,
  },
  fieldSectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  formContainer: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  formDivider: {
    marginBottom: 16,
  },
  headerLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  headerPressable: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  iconStyle: {
    height: 18,
    width: 18,
  },
  iconWrapper: {
    alignItems: "center",
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  infoBadge: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  infoBadgeText: {
    flex: 1,
    fontSize: 12,
  },
  input: {
    borderRadius: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  inputSearchStyle: {
    borderRadius: 8,
    fontSize: 13,
    height: 38,
  },
  placeholderStyle: {
    fontSize: 13,
  },
  quickAmountsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
    marginTop: -4,
  },
  quickChip: {
    borderRadius: 8,
    borderWidth: 1,
  },
  selectedTextStyle: {
    fontSize: 13,
    fontWeight: "600",
  },
  submitButton: {
    borderRadius: 12,
    marginTop: 12,
  },
  submitButtonContent: {
    height: 46,
  },
  submitButtonLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  zeroMargin: {
    margin: 0,
  },
});

export default FormularioRemesa;
