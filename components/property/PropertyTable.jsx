import React from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { DataTable, Text, Surface, IconButton, TextInput, Chip, Portal, ActivityIndicator } from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { ConfigCollection } from '../collections/collections';
import PropertyDialog from './PropertyDialog';

const chipColorActivo = (active) => active ? '#28a745' : '#dc3545';

const PropertyTable = () => {
  const [query, setQuery] = React.useState('');
  const [visible, setVisible] = React.useState(false);
  const [selected, setSelected] = React.useState(null);

  const { ready, configs } = useTracker(() => {
    const sub = Meteor.subscribe('propertys'); // requiere publicación existente del lado servidor
    const cursor = ConfigCollection.find({}, { sort: { createdAt: -1 } });
    return { ready: sub.ready(), configs: cursor.fetch() };
  }, []);

  const { width, height } = useWindowDimensions();
  const isSmall = width < 768; // breakpoint para ocultar 'Fecha' en pantallas pequeñas

  const filtered = React.useMemo(() => {
    const q = (query || '').toLowerCase().trim();
    if (!q) return configs || [];
    return (configs || []).filter(c =>
      (c?.type || '').toLowerCase().includes(q) ||
      (c?.clave || '').toLowerCase().includes(q) ||
      (c?.valor || '').toLowerCase().includes(q) ||
      (c?.comentario || '').toLowerCase().includes(q)
    );
  }, [configs, query]);

  const openCreate = () => { setSelected(null); setVisible(true); };
  const openEdit = (conf) => { setSelected(conf); setVisible(true); };
  const closeDialog = () => { setVisible(false); setSelected(null); };

  const formatFecha = (d) => (d ? new Date(d).toLocaleDateString() : '-');
  const formatFechaHora = (d) => (d ? new Date(d).toLocaleString() : '-');

  return (
    <Surface style={{ height: "100%" }}>
      <ScrollView style={{ flex: 1 }}>
        <Surface style={{ padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' }}>
            <Text variant="headlineSmall">Propiedades del Sistema</Text>
            <IconButton icon="plus" mode="contained" onPress={openCreate} accessibilityLabel="Agregar propiedad" />
          </View>

          <TextInput
            mode="outlined"
            placeholder="Buscar por tipo, clave, valor o comentario"
            value={query}
            onChangeText={setQuery}
            left={<TextInput.Icon icon="magnify" />}
            style={{ marginBottom: 12 }}
          />

          {!ready ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <ActivityIndicator />
              <Text>Cargando propiedades...</Text>
            </View>
          ) : (
            <DataTable>
              <DataTable.Header>
                {!isSmall && <DataTable.Title>Fecha</DataTable.Title>}
                <DataTable.Title>Tipo</DataTable.Title>
                <DataTable.Title>Clave</DataTable.Title>
                <DataTable.Title>Valor</DataTable.Title>
                {!isSmall && <DataTable.Title>Comentario</DataTable.Title>}
                {!isSmall && <DataTable.Title>Admin</DataTable.Title>}
                <DataTable.Title>Activo</DataTable.Title>
                <DataTable.Title numeric>Acc.</DataTable.Title>
              </DataTable.Header>

              {filtered.map((row, idx) => (
                <DataTable.Row key={row?._id || idx}>
                  {!isSmall && (
                    <DataTable.Cell>{formatFecha(row?.createdAt)}</DataTable.Cell>
                  )}
                  <DataTable.Cell>{row?.type || '-'}</DataTable.Cell>
                  <DataTable.Cell>{row?.clave || '-'}</DataTable.Cell>
                  <DataTable.Cell>{row?.valor || '-'}</DataTable.Cell>
                  {!isSmall && (
                    <DataTable.Cell>{row?.comentario || '-'}</DataTable.Cell>
                  )}
                  {!isSmall && (
                    <DataTable.Cell>
                      {row?.idAdminConfigurado ? (
                        <Text style={{ fontSize: 11 }}>
                          {row.idAdminConfigurado.substring(0, 8)}...
                        </Text>
                      ) : '-'}
                    </DataTable.Cell>
                  )}
                  <DataTable.Cell>
                    <Chip compact style={{ backgroundColor: chipColorActivo(!!row?.active) }} textStyle={{ color: 'white' }}>
                      {row?.active ? 'Activo' : 'Inactivo'}
                    </Chip>
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    <IconButton icon="pencil" size={18} onPress={() => openEdit(row)} />
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          )}
        </Surface>

        <Portal>
          <PropertyDialog visible={visible} onDismiss={closeDialog} data={selected} />
        </Portal>
      </ScrollView>
    </Surface>

  );
};

export default PropertyTable;
