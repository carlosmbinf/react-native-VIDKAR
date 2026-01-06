import React, { useRef, useState } from 'react';
import { StatusBar, View, StyleSheet, Dimensions } from 'react-native';
import Drawer from 'react-native-drawer';
import { Appbar, FAB } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EmpresaDrawerContent from './EmpresaDrawerContent';
import MisTiendasScreen from './screens/MisTiendasScreen';
import TiendaDetailScreen from './screens/TiendaDetailScreen';
import ProductoFormScreen from './screens/ProductoFormScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EmpresaNavigator = () => {
  const drawerRef = useRef(null);
  const insets = useSafeAreaInsets();
  const topInset = insets?.top || 0;

  // ✅ Estado de navegación simple (sin react-navigation para mantener consistencia con Cadete)
  const [currentScreen, setCurrentScreen] = useState('tiendas');
  const [selectedTienda, setSelectedTienda] = useState(null);
  const [selectedProducto, setSelectedProducto] = useState(null);

  const openDrawer = () => drawerRef.current?.open();
  const closeDrawer = () => drawerRef.current?.close();

  // ✅ Handlers de navegación
  const navigateToTiendaDetail = (tienda) => {
    setSelectedTienda(tienda);
    setCurrentScreen('tiendaDetail');
  };

  const navigateToProductoForm = (producto = null, tiendaId = null) => {
    setSelectedProducto(producto);
    if (!producto && tiendaId) {
      // Crear nuevo producto para una tienda específica
      setSelectedProducto({ idTienda: tiendaId });
    }
    setCurrentScreen('productoForm');
  };

  const navigateBack = () => {
    if (currentScreen === 'productoForm') {
      setCurrentScreen('tiendaDetail');
      setSelectedProducto(null);
    } else if (currentScreen === 'tiendaDetail') {
      setCurrentScreen('tiendas');
      setSelectedTienda(null);
    }
  };

  // ✅ Renderizado condicional de pantallas
  const renderScreen = () => {
    switch (currentScreen) {
      case 'tiendaDetail':
        return (
          <TiendaDetailScreen
            tienda={selectedTienda}
            onNavigateToProductoForm={navigateToProductoForm}
            onBack={navigateBack}
          />
        );
      case 'productoForm':
        return (
          <ProductoFormScreen
            producto={selectedProducto}
            tienda={selectedTienda}
            onBack={navigateBack}
          />
        );
      case 'tiendas':
      default:
        return (
          <MisTiendasScreen
            onNavigateToTiendaDetail={navigateToTiendaDetail}
          />
        );
    }
  };

  // ✅ Título dinámico según pantalla
  const getTitle = () => {
    switch (currentScreen) {
      case 'tiendaDetail':
        return selectedTienda?.title || 'Detalle de Tienda';
      case 'productoForm':
        return selectedProducto?._id ? 'Editar Producto' : 'Nuevo Producto';
      default:
        return 'Mis Tiendas';
    }
  };

  return (
    <>
      <StatusBar
        translucent={false}
        backgroundColor={'#673AB7'} // Violeta para Empresa (diferente del verde de Cadete)
        barStyle={'light-content'}
      />
      <Drawer
        ref={drawerRef}
        type="overlay"
        content={<EmpresaDrawerContent closeDrawer={closeDrawer} onNavigate={setCurrentScreen} />}
        tapToClose={true}
        openDrawerOffset={0.3}
        panCloseMask={0.3}
        closedDrawerOffset={0}
        styles={{
          drawer: {
            shadowColor: '#000000',
            shadowOpacity: 0.8,
            shadowRadius: 3,
            backgroundColor: '#FFFFFF'
          },
          main: { paddingLeft: 0 }
        }}
        tweenHandler={(ratio) => ({
          main: { opacity: Math.max(0.54, 1 - ratio) }
        })}
      >
        {/* ✅ Header con botón de retroceso condicional */}
        <Appbar style={{
          backgroundColor: '#673AB7',
          height: topInset + 56,
          paddingTop: topInset,
          elevation: 4
        }}>
          {currentScreen !== 'tiendas' ? (
            <Appbar.BackAction color="#FFFFFF" onPress={navigateBack} />
          ) : (
            <Appbar.Action icon="menu" color="#FFFFFF" onPress={openDrawer} />
          )}
          <Appbar.Content
            title={getTitle()}
            titleStyle={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 }}
          />
          <Appbar.Action
            icon="bell-outline"
            color="#FFFFFF"
            onPress={() => console.log('Notificaciones')}
          />
        </Appbar>

        {/* ✅ Contenido principal con animación */}
        <View style={styles.screenContainer}>
          {renderScreen()}
        </View>
      </Drawer>
    </>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
});

export default EmpresaNavigator;
