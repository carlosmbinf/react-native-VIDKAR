import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Card, Text, IconButton, Menu, Divider } from 'react-native-paper';
import Meteor from '@meteorrn/core';

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

  useEffect(() => {
    const fetchProperties = async () => {
      Meteor.call('property.get', ['REMESA', 'PRECIO', 'DESCUENTOS'], (error, result) => {
        if (error) {
          console.error('Error al obtener propiedades:', error);
        } else {
          setProperties(result);
        }
      });
    };
    fetchProperties();
  }, []);

  useEffect(() => {
    const precio = Number(properties?.find((element) => element.type === 'PRECIO' && element.clave === form.monedaRecibirEnCuba)?.valor || 0);
    const descuento = Number(properties?.find((element) => element.type === 'DESCUENTOS' && element.clave === form.monedaRecibirEnCuba)?.valor || 0);
    setPrecioCUP(precio);
    setDescuento(descuento);
  }, [properties, form.monedaRecibirEnCuba]);

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    const userId = Meteor.userId();
    if (!userId) {
      alert('Debe estar logueado para realizar esta acción.');
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
      direccionCuba: form.metodoPago === 'EFECTIVO' ? form.direccionCuba : '',
      comentario: form.comentario,
      type: 'REMESA',
      metodoPago: form.metodoPago,
      monedaRecibirEnCuba: form.monedaRecibirEnCuba,
    };

    try {
      await Meteor.callAsync('insertarCarrito', nuevoCarrito);
      alert('✅ Remesa añadida al carrito');
      setForm({
        nombre: '',
        cobrarUSD: '',
        monedaRecibirEnCuba: '',
        recibirEnCuba: '',
        tarjetaCUP: '',
        comentario: '',
        direccionCuba: '',
        metodoPago: '',
      });
      setOpen(false);
    } catch (err) {
      console.error('❌ Error al insertar remesa:', err);
      alert('Error al insertar remesa');
    }
  };

  return (
    <View style={styles.container}>
      <Card>
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
            />
            <TextInput
              label="Monto a enviar en USD"
              value={form.cobrarUSD}
              keyboardType="numeric"
              onChangeText={(value) => handleChange('cobrarUSD', value)}
              style={styles.input}
            />
            <TextInput
              label="Comentario de Entrega"
              value={form.comentario}
              onChangeText={(value) => handleChange('comentario', value)}
              style={styles.input}
              multiline
            />
            <Button mode="contained" onPress={handleSubmit} style={styles.button}>
              Agregar al carrito
            </Button>
          </Card.Content>
        )}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
  },
});

export default FormularioRemesa;
