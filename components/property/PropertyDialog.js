import React from 'react';
import { Alert, View, ScrollView } from 'react-native';
import { Dialog, Button, TextInput, Switch, Text } from 'react-native-paper';
import Meteor from '@meteorrn/core';
import { ConfigCollection } from '../collections/collections';

const PropertyDialog = ({ visible, onDismiss, data }) => {
  const isEdit = !!data?._id;
  const isAdmin = (Meteor.user()?.profile?.role === 'admin') || false;

  const [type, setType] = React.useState('');
  const [clave, setClave] = React.useState('');
  const [valor, setValor] = React.useState('');
  const [comentario, setComentario] = React.useState('');
  const [active, setActive] = React.useState(true);

  React.useEffect(() => {
    setType(data?.type || '');
    setClave(data?.clave || '');
    setValor(data?.valor || '');
    setComentario(data?.comentario || '');
    setActive(data?.active ?? true);
  }, [data?._id, visible]);

  const validate = () => {
    if (!type?.trim()) { Alert.alert('Validación', 'El campo "type" es obligatorio'); return false; }
    if (!clave?.trim()) { Alert.alert('Validación', 'El campo "clave" es obligatorio'); return false; }
    return true;
  };

  const onSave = async () => {
    if (!validate()) return;
    const payload = {
      valor: String(valor ?? ''),
      comentario: comentario ?? '',
      active: !!active,
      idAdminConfigurado: Meteor.userId() || null,
    };
    try {
      if (isEdit) {
        ConfigCollection.update(data._id, { $set: payload });
      } else {
        ConfigCollection.insert({
          type: type.trim(),
          clave: clave.trim(),
          ...payload,
        });
      }
      onDismiss();
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo guardar la propiedad');
    }
  };

  const onDelete = () => {
    if (!isEdit) return;
    Alert.alert('Eliminar', '¿Desea eliminar esta propiedad?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: () => {
          try {
            ConfigCollection.remove(data._id);
            onDismiss();
          } catch (e) {
            Alert.alert('Error', e?.message || 'No se pudo eliminar la propiedad');
          }
        }
      }
    ]);
  };

  return (
    <Dialog visible={visible} onDismiss={onDismiss}>
      <Dialog.Title>{isEdit ? 'Editar Propiedad' : 'Nueva Propiedad'}</Dialog.Title>
      <Dialog.Content>
        <ScrollView>
          <TextInput
            label="Type"
            value={type}
            onChangeText={setType}
            disabled={isEdit}
            style={{ marginBottom: 8 }}
          />
          <TextInput
            label="Clave"
            value={clave}
            onChangeText={setClave}
            disabled={isEdit}
            style={{ marginBottom: 8 }}
          />
          <TextInput
            label="Valor"
            value={valor}
            onChangeText={setValor}
            style={{ marginBottom: 8 }}
          />
          <TextInput
            label="Comentario"
            value={comentario}
            onChangeText={setComentario}
            multiline
            style={{ marginBottom: 8 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Switch value={active} onValueChange={setActive} />
            <Text style={{ marginLeft: 8 }}>{active ? 'Activo' : 'Inactivo'}</Text>
          </View>
        </ScrollView>
      </Dialog.Content>
      <Dialog.Actions style={{ justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row' }}>
          {isEdit && isAdmin && (
            <Button mode="outlined" icon="delete" onPress={onDelete} style={{ marginRight: 8 }}>
              Eliminar
            </Button>
          )}
        </View>
        <View style={{ flexDirection: 'row' }}>
          <Button onPress={onDismiss}>Cancelar</Button>
          <Button mode="contained" icon="content-save-outline" onPress={onSave}>Guardar</Button>
        </View>
      </Dialog.Actions>
    </Dialog>
  );
};

export default PropertyDialog;
