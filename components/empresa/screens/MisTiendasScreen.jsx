import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Card,
  Text,
  FAB,
  Avatar,
  Chip,
  ActivityIndicator,
  Portal,
  Dialog,
  Button,
  TextInput,
  Divider,
} from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { TiendasComercioCollection, ProductosComercioCollection } from '../../collections/collections';
import LocationPicker from '../components/LocationPicker';

const MisTiendasScreen = ({ onNavigateToTiendaDetail }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTienda, setNewTienda] = useState({
    title: '',
    descripcion: '',
    coordenadas: null // ✅ Inicialmente null, se llenará automáticamente
  });
  const [errors, setErrors] = useState({});

  // ✅ Suscripción reactiva a tiendas del usuario
  const { tiendas, productosCount, ready } = useTracker(() => {
    const userId = Meteor.userId();
    const tiendasSub = Meteor.subscribe('tiendas', { idUser: userId });
    const productosSub = Meteor.subscribe('productosComercio');

    const tiendas = TiendasComercioCollection.find({ idUser: userId }).fetch();

    // Contar productos por tienda
    const productosCount = {};
    tiendas.forEach((tienda) => {
      productosCount[tienda._id] = ProductosComercioCollection.find({
        idTienda: tienda._id
      }).count();
    });

    return {
      tiendas,
      productosCount,
      ready: tiendasSub.ready() && productosSub.ready()
    };
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  // ✅ Validaciones mejoradas
  const validateForm = () => {
    const newErrors = {};

    if (!newTienda.title.trim()) {
      newErrors.title = 'El nombre es obligatorio';
    } else if (newTienda.title.trim().length < 3) {
      newErrors.title = 'Mínimo 3 caracteres';
    }

    if (!newTienda.descripcion.trim()) {
      newErrors.descripcion = 'La descripción es obligatoria';
    } else if (newTienda.descripcion.trim().length < 10) {
      newErrors.descripcion = 'Mínimo 10 caracteres';
    }

    if (!newTienda.coordenadas) {
      newErrors.coordenadas = 'Debes obtener la ubicación de la tienda';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateTienda = () => {
    if (!validateForm()) {
      Alert.alert('Errores de validación', 'Por favor corrige los errores antes de continuar');
      return;
    }

    Meteor.call('addEmpresa', {
      ...newTienda,
      idUser: Meteor.userId(),
      pinColor: '#673AB7'
    }, (error, result) => {
      if (error) {
        Alert.alert('Error', error.reason || 'No se pudo crear la tienda');
      } else {
        Alert.alert('Éxito', 'Tienda creada correctamente');
        setShowCreateDialog(false);
        setNewTienda({
          title: '',
          descripcion: '',
          coordenadas: null
        });
        setErrors({});
      }
    });
  };

  // ✅ Handler para cambio de ubicación
  const handleLocationChange = (location) => {
    setNewTienda({ ...newTienda, coordenadas: location });
    // Limpiar error de coordenadas si existe
    if (errors.coordenadas) {
      setErrors({ ...errors, coordenadas: null });
    }
  };

  const renderTiendaCard = ({ item: tienda }) => {
    const scaleAnim = new Animated.Value(1);

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={[styles.cardContainer, { transform: [{ scale: scaleAnim }] }]}>
        <Card
          style={styles.tiendaCard}
          onPress={() => onNavigateToTiendaDetail(tienda)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Card.Content style={styles.cardContent}>
            <View style={styles.headerRow}>
              <Avatar.Icon
                size={48}
                icon="store"
                style={{ backgroundColor: tienda.pinColor || '#673AB7' }}
              />
              <View style={styles.headerText}>
                <Text variant="titleMedium" style={styles.tiendaTitle} numberOfLines={1}>
                  {tienda.title}
                </Text>
                <Text variant="bodySmall" style={styles.tiendaSubtitle} numberOfLines={1}>
                  {tienda.descripcion || 'Sin descripción'}
                </Text>
              </View>
            </View>

            {/* ✅ Chips informativos */}
            <View style={styles.chipsContainer}>
              <Chip
                icon="package-variant"
                style={styles.chip}
                textStyle={styles.chipText}
              >
                {productosCount[tienda._id] || 0} productos
              </Chip>
              <Chip
                icon="map-marker"
                style={styles.chip}
                textStyle={styles.chipText}
              >
                {tienda.coordenadas
                  ? `${tienda.coordenadas.latitude.toFixed(4)}, ${tienda.coordenadas.longitude.toFixed(4)}`
                  : 'Sin ubicación'}
              </Chip>
            </View>
          </Card.Content>

          <Card.Actions style={styles.cardActions}>
            <Button
              mode="text"
              onPress={() => onNavigateToTiendaDetail(tienda)}
              textColor="#673AB7"
            >
              Ver Detalles
            </Button>
          </Card.Actions>
        </Card>
      </Animated.View>
    );
  };

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#673AB7" />
        <Text style={styles.loadingText}>Cargando tiendas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {tiendas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Avatar.Icon size={100} icon="store-off-outline" style={styles.emptyIcon} />
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            No tienes tiendas aún
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtitle}>
            Crea tu primera tienda para comenzar a vender
          </Text>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => setShowCreateDialog(true)}
            style={styles.emptyButton}
          >
            Crear Mi Primera Tienda
          </Button>
        </View>
      ) : (
        <FlatList
          data={tiendas}
          renderItem={renderTiendaCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#673AB7']}
            />
          }
        />
      )}

      {tiendas.length > 0 && (
        <FAB
          style={styles.fab}
          icon="plus"
          label="Nueva Tienda"
          onPress={() => setShowCreateDialog(true)}
        />
      )}

      <Portal>
        <Dialog 
          visible={showCreateDialog} 
          onDismiss={() => {
            setShowCreateDialog(false);
            setNewTienda({ title: '', descripcion: '', coordenadas: null });
            setErrors({});
          }}
          style={styles.dialog}
        >
          <Dialog.Title>Crear Nueva Tienda</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView 
              contentContainerStyle={styles.dialogContent}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                label="Nombre de la tienda *"
                value={newTienda.title}
                onChangeText={(text) => {
                  setNewTienda({ ...newTienda, title: text });
                  if (errors.title) setErrors({ ...errors, title: null });
                }}
                mode="outlined"
                style={styles.input}
                error={!!errors.title}
                maxLength={50}
              />
              {errors.title && (
                <Text style={styles.errorText}>{errors.title}</Text>
              )}

              <TextInput
                label="Descripción *"
                value={newTienda.descripcion}
                onChangeText={(text) => {
                  setNewTienda({ ...newTienda, descripcion: text });
                  if (errors.descripcion) setErrors({ ...errors, descripcion: null });
                }}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
                error={!!errors.descripcion}
                maxLength={200}
              />
              {errors.descripcion && (
                <Text style={styles.errorText}>{errors.descripcion}</Text>
              )}

              <Divider style={styles.divider} />

              {/* ✅ NUEVO: Componente de ubicación */}
              <LocationPicker
                initialLocation={newTienda.coordenadas}
                onLocationChange={handleLocationChange}
              />
              {errors.coordenadas && (
                <Text style={styles.errorText}>{errors.coordenadas}</Text>
              )}

              <Text variant="bodySmall" style={styles.hint}>
                💡 Todos los campos marcados con * son obligatorios
              </Text>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => {
              setShowCreateDialog(false);
              setNewTienda({ title: '', descripcion: '', coordenadas: null });
              setErrors({});
            }}>
              Cancelar
            </Button>
            <Button 
              onPress={handleCreateTienda}
              disabled={!newTienda.coordenadas} // Deshabilitar si no hay ubicación
            >
              Crear
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#757575',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    backgroundColor: '#E1BEE7',
    marginBottom: 24,
  },
  emptyTitle: {
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#757575',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#673AB7',
  },
  listContent: {
    padding: 16,
  },
  cardContainer: {
    marginBottom: 16,
  },
  tiendaCard: {
    elevation: 3,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardContent: {
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  tiendaTitle: {
    fontWeight: 'bold',
    // color: '#212121',
  },
  tiendaSubtitle: {
    color: '#757575',
    marginTop: 2,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    // backgroundColor: '#F3E5F5',
  },
  chipText: {
    fontSize: 12,
  },
  cardActions: {
    justifyContent: 'flex-end',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#673AB7',
  },
  input: {
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 12,
  },
  hint: {
    color: '#757575',
    marginTop: 8,
    textAlign: 'center',
  },
  dialog: {
    maxHeight: '90%',
  },
  dialogContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
});

export default MisTiendasScreen;
