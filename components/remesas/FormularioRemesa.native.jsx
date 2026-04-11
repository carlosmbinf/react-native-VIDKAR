import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import {
    Button,
    Card,
    HelperText,
    IconButton,
    Text,
    TextInput,
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
  const [descuento, setDescuento] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [isFocusMetodo, setIsFocusMetodo] = useState(false);
  const [isFocusMoneda, setIsFocusMoneda] = useState(false);
  const [open, setOpen] = useState(false);
  const [precioCUP, setPrecioCUP] = useState(0);
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    Meteor.call(
      "property.get",
      ["REMESA", "PRECIO", "DESCUENTOS"],
      (error, result) => {
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

  const valorEntregar =
    Number(form.cobrarUSD || 0) * Number(precioCUP - descuento);

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

  const handleSubmit = () => {
    const userId = Meteor.userId();
    if (!userId) {
      alert("Debe estar logueado para realizar esta acción.");
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
      errores.push("Debe seleccionar el método de pago.");
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
        errores.push("Debe indicar la dirección a entregar en Cuba.");
      }
    }

    if (errores.length) {
      alert(`Por favor corrija:\n- ${errores.join("\n- ")}`);
      return;
    }

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
      recibirEnCuba: Number(form.cobrarUSD) * Number(precioCUP - descuento),
      tarjetaCUP: form.metodoPago === "TRANSFERENCIA" ? form.tarjetaCUP : "",
      type: "REMESA",
    };

    Meteor.call("insertarCarrito", nuevoCarrito, (error) => {
      if (error) {
        console.error("Error al insertar en el carrito:", error);
        alert(`Error: ${error.reason}`);
        return;
      }

      alert("✅ Remesa añadida al carrito");
      setForm(initialForm);
      setOpen(false);
    });
  };

  const renderIcon = (iconName, focused) => (
    <MaterialCommunityIcons
      name={iconName}
      size={20}
      color={focused ? "#1976D2" : "#666"}
      style={styles.dropdownIcon}
    />
  );

  return (
    <View style={styles.container}>
      <Card style={styles.card} elevation={5} mode="outlined">
        <Card.Title
          title={open ? "Formulario de Remesa" : "Agregar nueva remesa"}
          right={(props) => (
            <IconButton
              {...props}
              icon={open ? "chevron-up" : "plus"}
              onPress={() => setOpen((current) => !current)}
            />
          )}
        />
        {open ? (
          <Card.Content>
            <TextInput
              label="Nombre del destinatario"
              value={form.nombre}
              onChangeText={(value) => handleChange("nombre", value)}
              style={styles.input}
              mode="outlined"
              dense
            />

            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Moneda a cobrar en Cuba</Text>
              <Dropdown
                style={[
                  styles.dropdown,
                  isFocusMoneda && styles.dropdownFocused,
                ]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                keyboardAvoiding
                containerStyle={styles.containerStyle}
                iconStyle={styles.iconStyle}
                data={monedas}
                search
                maxHeight={200}
                labelField="label"
                valueField="value"
                placeholder={!isFocusMoneda ? "Seleccione moneda..." : "..."}
                searchPlaceholder="Buscar..."
                value={form.monedaRecibirEnCuba}
                onFocus={() => setIsFocusMoneda(true)}
                onBlur={() => setIsFocusMoneda(false)}
                onChange={(item) => {
                  handleChange("monedaRecibirEnCuba", item.value);
                  setIsFocusMoneda(false);
                }}
                renderLeftIcon={() =>
                  renderIcon("cash-multiple", isFocusMoneda)
                }
              />
            </View>

            {form.monedaRecibirEnCuba === "CUP" ? (
              <View style={styles.dropdownContainer}>
                <Text style={styles.dropdownLabel}>Método de pago</Text>
                <Dropdown
                  style={[
                    styles.dropdown,
                    isFocusMetodo && styles.dropdownFocused,
                  ]}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  inputSearchStyle={styles.inputSearchStyle}
                  keyboardAvoiding
                  containerStyle={styles.containerStyle}
                  iconStyle={styles.iconStyle}
                  data={metodosPagoCUP}
                  search
                  maxHeight={200}
                  labelField="label"
                  valueField="value"
                  placeholder={!isFocusMetodo ? "Seleccione método..." : "..."}
                  searchPlaceholder="Buscar..."
                  value={form.metodoPago}
                  onFocus={() => setIsFocusMetodo(true)}
                  onBlur={() => setIsFocusMetodo(false)}
                  onChange={(item) => {
                    handleChange("metodoPago", item.value);
                    setIsFocusMetodo(false);
                  }}
                  renderLeftIcon={() =>
                    renderIcon("credit-card-outline", isFocusMetodo)
                  }
                />
              </View>
            ) : null}

            {form.monedaRecibirEnCuba !== "CUP" && form.monedaRecibirEnCuba ? (
              <Text style={styles.info}>
                Método de pago: <Text style={styles.bold}>EFECTIVO</Text> (único
                disponible)
              </Text>
            ) : null}

            <TextInput
              label="Monto a enviar en USD"
              value={form.cobrarUSD}
              onChangeText={(value) => handleChange("cobrarUSD", value)}
              style={styles.input}
              mode="outlined"
              dense
              keyboardType="numeric"
            />

            <HelperText type="info" visible={Boolean(valorEntregar)}>
              Valor a entregar en Cuba:{" "}
              {Number.isFinite(Number(valorEntregar))
                ? valorEntregar.toFixed(2)
                : 0}{" "}
              {form.monedaRecibirEnCuba}
            </HelperText>

            {form.metodoPago === "TRANSFERENCIA" &&
            form.monedaRecibirEnCuba === "CUP" ? (
              <TextInput
                label="Número de tarjeta CUP"
                value={form.tarjetaCUP}
                onChangeText={(value) => handleChange("tarjetaCUP", value)}
                style={styles.input}
                mode="outlined"
                dense
                keyboardType="numeric"
                placeholder="0000 0000 0000 0000"
              />
            ) : null}

            {form.metodoPago === "EFECTIVO" ||
            form.monedaRecibirEnCuba !== "CUP" ? (
              <TextInput
                label="Dirección en Cuba"
                value={form.direccionCuba}
                onChangeText={(value) => handleChange("direccionCuba", value)}
                style={styles.input}
                mode="outlined"
                dense
                multiline
                numberOfLines={2}
              />
            ) : null}

            <TextInput
              label="Comentario (opcional)"
              value={form.comentario}
              onChangeText={(value) => handleChange("comentario", value)}
              style={styles.input}
              mode="outlined"
              dense
              multiline
              numberOfLines={3}
            />

            <Button
              mode="contained"
              onPress={handleSubmit}
              style={styles.submitButton}
            >
              Agregar al carrito
            </Button>
          </Card.Content>
        ) : null}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  bold: {
    fontWeight: "bold",
  },
  card: {
    borderRadius: 20,
    margin: 16,
    maxWidth: 400,
  },
  container: {
    justifyContent: "center",
    padding: 16,
  },
  containerStyle: {
    borderRadius: 20,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    flex: 1,
    top: -50,
  },
  dropdown: {
    backgroundColor: "transparent",
    borderColor: "#999",
    borderRadius: 4,
    borderWidth: 1,
    height: 40,
    paddingHorizontal: 12,
  },
  dropdownContainer: {
    marginBottom: 16,
  },
  dropdownFocused: {
    borderColor: "#1976D2",
    borderWidth: 2,
  },
  dropdownIcon: {
    marginRight: 8,
  },
  dropdownLabel: {
    color: "#666",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
    marginLeft: 4,
  },
  iconStyle: {
    height: 20,
    width: 20,
  },
  info: {
    color: "gray",
    fontSize: 14,
    marginBottom: 16,
    marginVertical: 8,
  },
  input: {
    borderRadius: 20,
    marginBottom: 12,
  },
  inputSearchStyle: {
    borderRadius: 8,
    fontSize: 14,
    height: 40,
  },
  placeholderStyle: {
    color: "#999",
    fontSize: 14,
  },
  selectedTextStyle: {
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
  },
  submitButton: {
    borderRadius: 10,
    marginTop: 16,
  },
});

export default FormularioRemesa;
