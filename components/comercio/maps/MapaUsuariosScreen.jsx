import React, { useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Appbar, Card, Title, Paragraph, Chip, Button } from 'react-native-paper';
import MapaUsuarios from './MapaUsuarios';
import Meteor, { useTracker } from '@meteorrn/core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MenuHeader from '../../Header/MenuHeader';

const MapaUsuariosScreen = ({ navigation }) => {
  const [filtroRol, setFiltroRol] = useState('todos');
  const [showFilters, setShowFilters] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

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

  // Toggle panel de filtros con animación
  const toggleFilters = () => {
    const toValue = showFilters ? 0 : 1;
    setShowFilters(!showFilters);
    
    Animated.timing(fadeAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <Appbar style={{
        backgroundColor: '#3f51b5',
        height: insets.top + 50,
        justifyContent: 'center',
        paddingTop: insets.top,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row' }}>
            {navigation?.canGoBack() && (
              <Appbar.BackAction
                color="white"
                onPress={() => {
                  if (navigation?.canGoBack()) {
                    navigation.goBack();
                  }
                }}
              />
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Appbar.Action
              icon={showFilters ? "close" : "filter-variant"}
              color="white"
              onPress={toggleFilters}
            />
            <MenuHeader navigation={navigation} />
          </View>
        </View>
      </Appbar>

      {/* Panel de Filtros Animado */}
      {showFilters && (
        <Animated.View
          style={[
            styles.filtersPanel,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
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

          {/* Filtros */}
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
        </Animated.View>
      )}

      {/* Mapa a Pantalla Completa */}
      <View style={styles.mapContainer}>
        <MapaUsuarios filtroRol={filtroRol} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filtersPanel: {
    paddingHorizontal: 8,
    paddingTop: 8,
    backgroundColor: '#f5f5f5',
    elevation: 4,
    zIndex: 10,
  },
  statsCard: {
    marginBottom: 8,
    elevation: 4,
  },
  filterCard: {
    marginBottom: 8,
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
    width: '100%',
    height: '100%',
  },
});

export default MapaUsuariosScreen;
