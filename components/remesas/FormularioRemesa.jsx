import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Card, Text, IconButton, Divider, HelperText, List, Surface } from 'react-native-paper';
import Meteor from '@meteorrn/core';
import { ScrollView } from 'react-native-gesture-handler';

const FormularioRemesa = () => {
  const [form, setForm] = useState({
    nombre: '',
    cobrarUSD: '',
    recibirEnCuba: '',
    tarjetaCUP: '',
    comentario: '',
    direccionCuba: '',
    metodoPago: '',
    monedaRecibirEnCuba: '',
  });
  const [open, setOpen] = useState(false); // abrir por defecto para ver el formulario
  const [properties, setProperties] = useState([]);
  const [precioCUP, setPrecioCUP] = useState(0);
  const [descuento, setDescuento] = useState(0);

  // Eliminamos estados de Menu (Portal) y usamos selects inline
  // const [monedaMenuVisible, setMonedaMenuVisible] = useState(false);
  // const [metodoMenuVisible, setMetodoMenuVisible] = useState(false);
  const [showMonedas, setShowMonedas] = useState(false);
  const [showMetodos, setShowMetodos] = useState(false);

  useEffect(() => {
    // ...existing code...
    Meteor.call('property.get', ['REMESA', 'PRECIO', 'DESCUENTOS'], (error, result) => {
      if (error) {
        console.error('Error al obtener propiedades:', error);
      } else {
        setProperties(result);
      }
    });
    // ...existing code...
  }, []);

  useEffect(() => {
    const precio = Number(
      properties?.find((e) => e.type === 'PRECIO' && e.clave === form.monedaRecibirEnCuba)?.valor || 0
    );
    const desc = Number(
      properties?.find(
        (e) =>
          e.type === 'DESCUENTOS' &&
          e.clave === form.monedaRecibirEnCuba &&
          e.idAdminConfigurado === Meteor.user()?.bloqueadoDesbloqueadoPor
      )?.valor || 0
    );
    setPrecioCUP(precio);
    setDescuento(desc);
  }, [properties, form.monedaRecibirEnCuba]);

  const monedas = useMemo(() => {
    try {
      return JSON.parse(
        properties?.find((e) => e.clave === 'monedaACobrarEnCuba')?.valor || '[]'
      );
    } catch {
      return [];
    }
  }, [properties]);

  const metodosPagoCUP = useMemo(() => {
    try {
      const arr = JSON.parse(
        properties?.find((e) => e.clave === 'metodoPagoEnCuba')?.valor || '[]'
      );
      return (arr || []).map((m) => String(m).toUpperCase());
    } catch {
      return [];
    }
  }, [properties]);

  const formatearTarjeta = (value) => {
    const soloNumeros = String(value || '').replace(/\D/g, '').slice(0, 16);
    return soloNumeros.replace(/(.{4})/g, '$1 ').trim();
  };

  const handleChange = (name, value) => {
    setForm((prev) => {
      if (name === 'tarjetaCUP') {
        return { ...prev, tarjetaCUP: formatearTarjeta(value) };
      }
      if (name === 'monedaRecibirEnCuba') {
        // Si es USD, forzar EFECTIVO como en web
        return {
          ...prev,
          monedaRecibirEnCuba: value,
          metodoPago: value === 'USD' ? 'EFECTIVO' : prev.metodoPago,
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = async () => {
    const userId = Meteor.userId();
    if (!userId) {
      alert('Debe estar logueado para realizar esta acción.');
      return;
    }

    // Validaciones alineadas al formulario web
    const errores = [];
    if (!form.nombre?.trim()) errores.push('El nombre del destinatario es obligatorio.');
    if (!form.monedaRecibirEnCuba) errores.push('Debe seleccionar la moneda a cobrar en Cuba.');
    const monto = Number(form.cobrarUSD);
    if (!monto || isNaN(monto) || monto <= 0) errores.push('El monto a enviar en USD debe ser un número mayor que 0.');
    if (form.monedaRecibirEnCuba === 'CUP' && !form.metodoPago) errores.push('Debe seleccionar el método de pago.');
    if (form.monedaRecibirEnCuba === 'CUP' && form.metodoPago === 'TRANSFERENCIA') {
      const digits = (form.tarjetaCUP || '').replace(/\D/g, '');
      if (digits.length !== 16) errores.push('La tarjeta CUP debe tener 16 dígitos.');
    }
    if (form.metodoPago === 'EFECTIVO' || form.monedaRecibirEnCuba !== 'CUP') {
      if (!form.direccionCuba?.trim()) errores.push('Debe indicar la dirección a entregar en Cuba.');
    }
    if (errores.length) {
      alert('Por favor corrija:\n- ' + errores.join('\n- '));
      return;
    }

    const nuevoCarrito = {
      idUser: userId,
      idAdmin: Meteor.user()?.bloqueadoDesbloqueadoPor,
      cobrarUSD: form.cobrarUSD,
      nombre: form.nombre,
      recibirEnCuba: Number(form.cobrarUSD) * Number(precioCUP - descuento),
      precioDolar: precioCUP,
      descuentoAdmin: descuento,
      // Alinear con web: no condicionamos por moneda aquí
      tarjetaCUP: form.metodoPago === 'TRANSFERENCIA' ? form.tarjetaCUP : '',
      direccionCuba:
        form.metodoPago === 'EFECTIVO' || form.monedaRecibirEnCuba !== 'CUP' ? form.direccionCuba : '',
      comentario: form.comentario,
      type: 'REMESA',
      metodoPago: form.metodoPago,
      monedaRecibirEnCuba: form.monedaRecibirEnCuba,
    };

    try {
        await Meteor.call("insertarCarrito", nuevoCarrito, (error, result) => {
            if (error) {
                console.error('Error al insertar en el carrito:', error);
                Alert.alert("Error", error.reason);
            } else {
                console.log('Producto agregado al carrito:', result);
                alert('✅ Remesa añadida al carrito');
                setOpen(false);
            }
        });
      alert('✅ Remesa añadida al carrito');
      // Reset consistente con el estado inicial
      setForm({
        nombre: '',
        cobrarUSD: '',
        recibirEnCuba: '',
        tarjetaCUP: '',
        comentario: '',
        direccionCuba: '',
        metodoPago: '',
        monedaRecibirEnCuba: '',
      });
      setOpen(false);
    } catch (err) {
      console.error('❌ Error al insertar remesa:', err);
      alert('Error al insertar remesa');
    }
  };

  const valorEntregar = Number(form.cobrarUSD || 0) * Number(precioCUP - descuento);

  return (
    // <ScrollView style={styles.container}>
    <View style={styles.container}>
      <Card style={{ margin: 16, borderRadius: 20, maxWidth:400}} elevation={5} mode="outlined">
        <Card.Title
          title={open ? 'Formulario de Remesa' : 'Agregar nueva remesa'}
          right={(props) => (
            <IconButton
              {...props}
              icon={open ? 'chevron-up' : 'plus'}
              onPress={() => setOpen(!open)}
            />
          )}
        />
        {open && (
          <Card.Content>
            <TextInput
              label="Nombre del destinatario"
              value={form.nombre}
              onChangeText={(value) => handleChange('nombre', value)}
              style={styles.input}
              dense={true}
            />

            {/* Select Moneda a cobrar en Cuba (inline) */}
            <View>
              <TextInput
                label="Moneda a cobrar en Cuba"
                value={form.monedaRecibirEnCuba || ''}
                style={styles.input}
                dense={true}
                editable={false}
                right={
                  <TextInput.Icon
                    icon={showMonedas ? 'chevron-up' : 'chevron-down'}
                    onPress={() => setShowMonedas((v) => !v)}
                  />
                }
              />
              {showMonedas && (
                <Card mode="outlined" style={styles.selectCard}>
                  <List.Section>
                    {(monedas || []).map((m) => (
                      <List.Item
                        key={String(m)}
                        title={String(m)}
                        onPress={() => {
                          handleChange('monedaRecibirEnCuba', m);
                          setShowMonedas(false);
                        }}
                      />
                    ))}
                  </List.Section>
                </Card>
              )}
            </View>

            {/* Método de pago cuando es CUP (inline) */}
            {form.monedaRecibirEnCuba === 'CUP' && (
              <>
                {/* <Divider style={styles.divider} /> */}
                <View>
                  <TextInput
                    label="Método de pago"
                    value={form.metodoPago || ''}
                    style={styles.input}
                    dense={true}
                    editable={false}
                    right={
                      <TextInput.Icon
                        icon={showMetodos ? 'chevron-up' : 'chevron-down'}
                        onPress={() => setShowMetodos((v) => !v)}
                      />
                    }
                  />
                  {showMetodos && (
                    <Card mode="outlined" style={styles.selectCard}>
                      <List.Section>
                        {(metodosPagoCUP || []).map((m) => (
                          <List.Item
                            key={String(m)}
                            title={String(m)}
                            onPress={() => {
                              handleChange('metodoPago', m);
                              setShowMetodos(false);
                            }}
                          />
                        ))}
                      </List.Section>
                    </Card>
                  )}
                </View>

              </>
            )}

            {/* Info cuando no es CUP */}
            {form.monedaRecibirEnCuba !== 'CUP' && !!form.monedaRecibirEnCuba && (
              <Text style={styles.info}>
                Método de pago: <Text style={{ fontWeight: 'bold' }}>EFECTIVO</Text> (único disponible)
              </Text>
            )}

            <TextInput
              label="Monto a enviar en USD"
              value={form.cobrarUSD}
              onChangeText={(value) => handleChange('cobrarUSD', value)}

              dense={true}
              keyboardType="numeric"
            />
            <HelperText type="error" style={styles.input}>
              Valor a entregar en Cuba: {Number.isFinite(Number(valorEntregar)) ? valorEntregar.toFixed(2) : 0} {form.monedaRecibirEnCuba}
            </HelperText>

            {form.metodoPago === 'TRANSFERENCIA' && form.monedaRecibirEnCuba === 'CUP' && (
              <TextInput
                label="Número de tarjeta CUP"
                value={form.tarjetaCUP}
                onChangeText={(value) => handleChange('tarjetaCUP', value)}
                style={styles.input}
                dense={true}
                keyboardType="numeric"
              />
            )}

            {(form.metodoPago === 'EFECTIVO' || form.monedaRecibirEnCuba !== 'CUP') && (
              <TextInput
                label="Dirección en Cuba"
                value={form.direccionCuba}
                onChangeText={(value) => handleChange('direccionCuba', value)}
                style={styles.input}
                dense={true}
              />
            )}

            <TextInput
              label="Comentario (opcional)"
              value={form.comentario}
              onChangeText={(value) => handleChange('comentario', value)}
              style={styles.input}
              dense={true}
              multiline={true}
            />

            <Button mode="contained" onPress={handleSubmit} style={styles.submitButton}>
              Agregar al carrito
            </Button>
          </Card.Content>
        )}
      </Card>
    </View>
      
    // </ScrollView>

  );
};

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    // alignItems: 'center',       // centrar horizontalmente
    justifyContent: 'center',   // centrar verticalmente
    padding: 16,
    // backgroundColor: "#f5f5f5",
  },
  input: {
    zIndex: 0,
    marginBottom: 16,
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 16,
  },
  info: {
    marginVertical: 8,
    fontSize: 14,
    color: 'gray',
  },
  submitButton: {
    marginTop: 16,
  },
  selectCard: {
    flex: 1,
    position: 'absolute',
    top: 50,
    width: "100%",
    zIndex: 1,
    elevation: 5,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
});

export default FormularioRemesa;