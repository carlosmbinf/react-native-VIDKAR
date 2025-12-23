import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar, Card, Title, Paragraph, Chip, Button } from 'react-native-paper';
import MapaUsuarios from './MapaUsuarios';
import Meteor, { useTracker } from '@meteorrn/core';

const MapaUsuariosScreen = ({ navigation }) => {
  const [filtroRol, setFiltroRol] = useState('todos');

  const { estadisticas } = useTracker(() => {
    const handle = Meteor.subscribe('user',{
        $or: [
          { 'cordenadas.latitude': { $exists: true } },
          { 'coordenadas.latitude': { $exists: true } }
        ]
      });
    const usuarios = Meteor.users.find({
      $or: [
        { 'cordenadas.latitude': { $exists: true } },
        { 'coordenadas.latitude': { $exists: true } }
      ]
    }).fetch();
    return {
      estadisticas: {
        total: usuarios.length,
        online: usuarios.filter(u => u.online).length,
        cadetes: usuarios.filter(u => u.modoCadete).length,
        admins: usuarios.filter(u => u.profile?.role === 'admin').length,
        empresas: usuarios.filter(u => u.profile?.roleComercio?.includes('EMPRESA')).length,
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <Appbar style={{ backgroundColor: '#6200ee' }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Ubicación de Usuarios" />
        <Appbar.Action icon="refresh" onPress={() => {
          // Forzar re-render del mapa
          setFiltroRol(filtroRol);
        }} />
      </Appbar>

      <View style={styles.content}>
        {/* Estadísticas */}
        <Card style={styles.statsCard}>
          <Card.Content>
            <Title>📊 Estadísticas en Tiempo Real</Title>
            <View style={styles.chipsContainer}>
              <Chip icon="account-group" style={styles.chip}>
                Total: {estadisticas.total}
              </Chip>
              <Chip icon="circle" textStyle={{ color: '#4CAF50' }} style={styles.chip}>
                Online: {estadisticas.online}
              </Chip>
              <Chip icon="bike" style={styles.chip}>
                Cadetes: {estadisticas.cadetes}
              </Chip>
              <Chip icon="shield-account" style={styles.chip}>
                Admins: {estadisticas.admins}
              </Chip>
              <Chip icon="store" style={styles.chip}>
                Empresas: {estadisticas.empresas}
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Filtros con Button.Group alternativo */}
        <Card style={styles.filterCard}>
          <Card.Content>
            <Paragraph style={styles.filterTitle}>Filtrar por rol:</Paragraph>
            <View style={styles.buttonGroup}>
              <Button
                mode={filtroRol === 'todos' ? 'contained' : 'outlined'}
                onPress={() => setFiltroRol('todos')}
                style={styles.filterButton}
                icon="account-group"
                compact
              >
                Todos
              </Button>
              <Button
                mode={filtroRol === 'cadetes' ? 'contained' : 'outlined'}
                onPress={() => setFiltroRol('cadetes')}
                style={styles.filterButton}
                icon="bike"
                compact
              >
                Cadetes
              </Button>
              <Button
                mode={filtroRol === 'admins' ? 'contained' : 'outlined'}
                onPress={() => setFiltroRol('admins')}
                style={styles.filterButton}
                icon="shield-account"
                compact
              >
                Admins
              </Button>
              <Button
                mode={filtroRol === 'empresas' ? 'contained' : 'outlined'}
                onPress={() => setFiltroRol('empresas')}
                style={styles.filterButton}
                icon="store"
                compact
              >
                Empresas
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Mapa */}
        <View style={styles.mapContainer}>
          <MapaUsuarios filtroRol={filtroRol} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  statsCard: {
    margin: 8,
    elevation: 4,
  },
  filterCard: {
    margin: 8,
    marginTop: 0,
    elevation: 2,
  },
  filterTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    marginBottom: 4,
  },
  mapContainer: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
  },
});

export default MapaUsuariosScreen;
