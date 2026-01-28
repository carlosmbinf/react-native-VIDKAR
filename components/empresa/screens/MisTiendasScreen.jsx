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
  IconButton,
  Surface, // ✅ NUEVO
  Appbar, // ✅ AGREGADO
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Meteor, { useTracker } from '@meteorrn/core';
import { TiendasComercioCollection, ProductosComercioCollection } from '../../collections/collections';
import LocationPicker from '../components/LocationPicker';
import MapaTiendaCardBackground from '../maps/MapaTiendaCardBackground'; // ✅ NUEVO
import MenuHeader from '../../Header/MenuHeader';

const CARD_HEIGHT = 200; // ✅ single source of truth para mapa/overlay

const MisTiendasScreen = ({ navigation, openDrawer }) => {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTiendaId, setEditingTiendaId] = useState(null); // ✅ NUEVO (null = crear)
  const [newTienda, setNewTienda] = useState({
    title: '',
    descripcion: '',
    coordenadas: null // ✅ Inicialmente null, se llenará automáticamente
  });
  const [errors, setErrors] = useState({});

  const isEditing = !!editingTiendaId;

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

  const resetDialogState = () => {
    setShowCreateDialog(false);
    setEditingTiendaId(null);
    setNewTienda({ title: '', descripcion: '', coordenadas: null });
    setErrors({});
  };

  const openCreateDialog = () => {
    setEditingTiendaId(null);
    setNewTienda({ title: '', descripcion: '', coordenadas: null });
    setErrors({});
    setShowCreateDialog(true);
  };

  const openEditDialog = (tienda) => {
    setEditingTiendaId(tienda?._id || null);
    setNewTienda({
      title: tienda?.title || '',
      descripcion: tienda?.descripcion || '',
      coordenadas: tienda?.coordenadas || null,
    });
    setErrors({});
    setShowCreateDialog(true);
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
        resetDialogState();
      }
    });
  };

  const handleUpdateTienda = () => {
    if (!validateForm()) {
      Alert.alert('Errores de validación', 'Por favor corrige los errores antes de continuar');
      return;
    }

    Meteor.call(
      'tiendas.update',
      {
        tiendaId: editingTiendaId,
        updates: {
          title: newTienda.title.trim(),
          descripcion: newTienda.descripcion.trim(),
          coordenadas: newTienda.coordenadas,
        },
      },
      (error) => {
        if (error) {
          Alert.alert('Error', error.reason || 'No se pudo actualizar la tienda');
          return;
        }
        Alert.alert('Éxito', 'Tienda actualizada correctamente');
        resetDialogState();
      }
    );
  };

  // ✅ Handler para cambio de ubicación
  const handleLocationChange = (location) => {
    setNewTienda({ ...newTienda, coordenadas: location });
    // Limpiar error de coordenadas si existe
    if (errors.coordenadas) {
      setErrors({ ...errors, coordenadas: null });
    }
  };

  const handleNavigateToTiendaDetail = (tienda) => {
    navigation.navigate('TiendaDetail', {
      tienda,
      tiendaId: tienda._id
    });
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

    const coordsLabel = tienda?.coordenadas
      ? `${tienda.coordenadas.latitude.toFixed(4)}, ${tienda.coordenadas.longitude.toFixed(4)}`
      : 'Sin ubicación';

    const productosLabel = `${productosCount[tienda._id] || 0} producto${(productosCount[tienda._id] || 0) !== 1 ? 's' : ''}`;

    return (
      <Animated.View style={[styles.cardContainer, { transform: [{ scale: scaleAnim }] }]}>
        <Card
          style={[styles.tiendaCard, { height: CARD_HEIGHT }]}
          onPress={() => handleNavigateToTiendaDetail(tienda)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <View style={[{ position: 'absolute', height: CARD_HEIGHT, top: 0, left: 0, right: 0 }]}>
            <MapaTiendaCardBackground tienda={tienda} height='100%' />
          </View>

          {/* ✅ Overlay encima del mapa */}
          <Card.Content style={[styles.cardContentOverlay, { height: CARD_HEIGHT }]}>

            <Surface style={styles.overlayHeader}>
              <View style={styles.infoChipContent}>
                <Text variant="titleSmall" style={styles.tiendaTitleChip} numberOfLines={1}>
                  {tienda.title}
                </Text>
                {!!tienda.descripcion && (
                  <Text variant="bodySmall" style={styles.tiendaSubtitleChip} numberOfLines={1}>
                    {tienda.descripcion}
                  </Text>
                )}
              </View>
              <IconButton
                icon="pencil"
                size={18}
                onPress={() => openEditDialog(tienda)}
                accessibilityLabel="Editar tienda"
                iconColor="#FFFFFF"
                style={styles.editButton}
              />
            </Surface>

            <View style={styles.chipsRow}>
              <Chip
                icon="package-variant"
                style={styles.chipPrimary}
                textStyle={styles.chipText}
                compact
                numberOfLines={1}
              >
                {productosLabel}
              </Chip>

              <Chip
                icon="map-marker"
                style={styles.chipSecondary}
                textStyle={styles.chipText}
                compact
                numberOfLines={1}
              >
                {coordsLabel}
              </Chip>
            </View>
          </Card.Content>

          <Card.Actions style={styles.cardActions}>
            <Button mode="text" onPress={() => handleNavigateToTiendaDetail(tienda)} textColor="#673AB7">
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
    <Surface style={styles.container}>
      {/* ✅ AGREGADO: Appbar con drawer */}
      <Appbar style={{
        // backgroundColor: '#3f51b5',
        height: insets.top + 50,
        paddingTop: insets.top,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
             <Appbar.BackAction
              color='red'
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                }
              }}
            />
            <Text style={{fontSize:20, alignSelf:'center'}}>Tiendas</Text>
          </View>
          <MenuHeader navigation={navigation} />
        </View>
      </Appbar>

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
            onPress={openCreateDialog}
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
          onPress={openCreateDialog}
        />
      )}

      <Portal>
        <Dialog
          visible={showCreateDialog}
          onDismiss={resetDialogState}
          style={styles.dialog}
        >
          <Dialog.Title>{isEditing ? 'Editar Tienda' : 'Crear Nueva Tienda'}</Dialog.Title>
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
            <Button onPress={resetDialogState}>
              Cancelar
            </Button>
            <Button
              onPress={isEditing ? handleUpdateTienda : handleCreateTienda}
              disabled={!newTienda.coordenadas}
            >
              {isEditing ? 'Guardar' : 'Crear'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#F5F5F5',
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

  cardContentOverlay: {
    paddingVertical: 5,
    paddingHorizontal: 5,
    justifyContent: 'space-between',
  },

  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    alignContent: "center",
    gap: 10,
    padding: 5,
    borderRadius: 12,
    paddingLeft: 15
  },

  infoChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 0,
  },

  infoChipContent: {
    gap: 2,
  },

  tiendaTitleChip: {
    fontWeight: '700',
    // color: '#1F1F1F',
    letterSpacing: 0.1,
  },

  tiendaSubtitleChip: {
    // color: '#616161',
    fontSize: 11,
    lineHeight: 14,
  },

  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },

  chipPrimary: {
    // backgroundColor: 'rgba(255,255,255,0.92)',
    // height: 28,
  },

  chipSecondary: {
    // backgroundColor: 'rgba(255,255,255,0.82)',
    // height: 28,
  },

  chipText: {
    fontSize: 11,
    fontWeight: '600',
    // color: '#424242',
  },

  editButton: {
    margin: 0,
    backgroundColor: 'rgba(103,58,183,0.90)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
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
