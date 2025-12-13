import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Card, Text, IconButton, HelperText } from 'react-native-paper';
import { Dropdown } from 'react-native-element-dropdown';
import Meteor from '@meteorrn/core';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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
  const [open, setOpen] = useState(false);
  const [properties, setProperties] = useState([]);
  const [precioCUP, setPrecioCUP] = useState(0);
  const [descuento, setDescuento] = useState(0);

  // Estados para focus de los dropdowns
  const [isFocusMoneda, setIsFocusMoneda] = useState(false);
  const [isFocusMetodo, setIsFocusMetodo] = useState(false);

  useEffect(() => {
    Meteor.call('property.get', ['REMESA', 'PRECIO', 'DESCUENTOS'], (error, result) => {
      if (error) {
        console.error('Error al obtener propiedades:', error);
      } else {
        setProperties(result);
      }
    });
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
      const parsed = JSON.parse(
        properties?.find((e) => e.clave === 'monedaACobrarEnCuba')?.valor || '[]'
      );
      return parsed.map(m => ({ label: String(m), value: String(m) }));
    } catch {
      return [];
    }
  }, [properties]);

  const metodosPagoCUP = useMemo(() => {
    try {
      const arr = JSON.parse(
        properties?.find((e) => e.clave === 'metodoPagoEnCuba')?.valor || '[]'
      );
      return (arr || []).map((m) => ({ 
        label: String(m).toUpperCase(), 
        value: String(m).toUpperCase() 
      }));
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
          alert("Error: " + error.reason);
        } else {
          console.log('Producto agregado al carrito:', result);
          alert('✅ Remesa añadida al carrito');
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
        }
      });
    } catch (err) {
      console.error('❌ Error al insertar remesa:', err);
      alert('Error al insertar remesa');
    }
  };

  const valorEntregar = Number(form.cobrarUSD || 0) * Number(precioCUP - descuento);

  const renderIcon = (iconName, isFocus) => (
    <MaterialCommunityIcons
      name={iconName}
      size={20}
      color={isFocus ? '#1976D2' : '#666'}
      style={styles.dropdownIcon}
    />
  );

  return (
    <View style={styles.container}>
      <Card style={styles.card} elevation={5} mode="outlined">
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
              mode="outlined"
              dense
            />

            {/* Dropdown Moneda a cobrar en Cuba */}
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Moneda a cobrar en Cuba</Text>
              <Dropdown
                style={[
                  styles.dropdown,
                  isFocusMoneda && styles.dropdownFocused
                ]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                keyboardAvoiding={true}
                containerStyle={styles.containerStyle}
                iconStyle={styles.iconStyle}
                data={monedas}
                search
                maxHeight={200}
                labelField="label"
                valueField="value"
                placeholder={!isFocusMoneda ? 'Seleccione moneda...' : '...'}
                searchPlaceholder="Buscar..."
                value={form.monedaRecibirEnCuba}
                onFocus={() => setIsFocusMoneda(true)}
                onBlur={() => setIsFocusMoneda(false)}
                onChange={item => {
                  handleChange('monedaRecibirEnCuba', item.value);
                  setIsFocusMoneda(false);
                }}
                renderLeftIcon={() => renderIcon('cash-multiple', isFocusMoneda)}
              />
            </View>

            {/* Dropdown Método de pago cuando es CUP */}
            {form.monedaRecibirEnCuba === 'CUP' && (
              <View style={styles.dropdownContainer}>
                <Text style={styles.dropdownLabel}>Método de pago</Text>
                <Dropdown
                  style={[
                    styles.dropdown,
                    isFocusMetodo && styles.dropdownFocused
                  ]}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  inputSearchStyle={styles.inputSearchStyle}
                  keyboardAvoiding={true}
                  containerStyle={styles.containerStyle}
                  iconStyle={styles.iconStyle}
                  data={metodosPagoCUP}
                  search
                  maxHeight={200}
                  labelField="label"
                  valueField="value"
                  placeholder={!isFocusMetodo ? 'Seleccione método...' : '...'}
                  searchPlaceholder="Buscar..."
                  value={form.metodoPago}
                  onFocus={() => setIsFocusMetodo(true)}
                  onBlur={() => setIsFocusMetodo(false)}
                  onChange={item => {
                    handleChange('metodoPago', item.value);
                    setIsFocusMetodo(false);
                  }}
                  renderLeftIcon={() => renderIcon('credit-card-outline', isFocusMetodo)}
                />
              </View>
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
              style={styles.input}
              mode="outlined"
              dense
              keyboardType="numeric"
            />
            
            <HelperText type="info" visible={!!valorEntregar}>
              Valor a entregar en Cuba: {Number.isFinite(Number(valorEntregar)) ? valorEntregar.toFixed(2) : 0} {form.monedaRecibirEnCuba}
            </HelperText>

            {form.metodoPago === 'TRANSFERENCIA' && form.monedaRecibirEnCuba === 'CUP' && (
              <TextInput
                label="Número de tarjeta CUP"
                value={form.tarjetaCUP}
                onChangeText={(value) => handleChange('tarjetaCUP', value)}
                style={styles.input}
                mode="outlined"
                dense
                keyboardType="numeric"
                placeholder="0000 0000 0000 0000"
              />
            )}

            {(form.metodoPago === 'EFECTIVO' || form.monedaRecibirEnCuba !== 'CUP') && (
              <TextInput
                label="Dirección en Cuba"
                value={form.direccionCuba}
                onChangeText={(value) => handleChange('direccionCuba', value)}
                style={styles.input}
                mode="outlined"
                dense
                multiline
                numberOfLines={2}
              />
            )}

            <TextInput
              label="Comentario (opcional)"
              value={form.comentario}
              onChangeText={(value) => handleChange('comentario', value)}
              style={styles.input}
              mode="outlined"
              dense
              multiline
              numberOfLines={3}
            />

            <Button mode="contained" onPress={handleSubmit} style={styles.submitButton}>
              Agregar al carrito
            </Button>
          </Card.Content>
        )}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  containerStyle: {
    flex: 1,
    borderRadius: 20,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    top: -50,
  },
  container: {
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    margin: 16,
    borderRadius: 20,
    maxWidth: 400,
  },
  input: {
    borderRadius: 20,
    marginBottom: 12,
  },
  info: {
    marginVertical: 8,
    marginBottom: 16,
    fontSize: 14,
    color: 'gray',
  },
  submitButton: {
    marginTop: 16,
    borderRadius: 10,
  },
  
  // Estilos para Dropdown de react-native-element-dropdown
  dropdownContainer: {
    marginBottom: 16,
  },
  dropdownLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
  dropdown: {
    height: 40,
    borderColor: '#999',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  dropdownFocused: {
    borderColor: '#1976D2',
    borderWidth: 2,
  },
  placeholderStyle: {
    fontSize: 14,
    color: '#999',
  },
  selectedTextStyle: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 14,
    borderRadius: 8,
  },
  dropdownIcon: {
    marginRight: 8,
  },
});

export default FormularioRemesa;