import React, { useRef } from 'react';
import { StatusBar } from 'react-native';
import Drawer from 'react-native-drawer';
import { Appbar } from 'react-native-paper';
import HomePedidosComercio from '../comercio/pedidos/HomePedidosComercio';
import CadeteDrawerContent from './CadeteDrawerContent';

const CadeteNavigator = () => {
  const drawerRef = useRef(null);

  const openDrawer = () => {
    drawerRef.current?.open();
  };

  const closeDrawer = () => {
    drawerRef.current?.close();
  };

  return (
    <>
      <StatusBar
        translucent={false}
        backgroundColor={'#4CAF50'}
        barStyle={'light-content'}
      />
      <Drawer
        ref={drawerRef}
        type="overlay"
        content={<CadeteDrawerContent closeDrawer={closeDrawer} />}
        tapToClose={true}
        openDrawerOffset={0.3} // 70% del ancho de pantalla para el contenido principal
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
        {/* Header principal con botón de menú */}
        <Appbar.Header style={{ backgroundColor: '#4CAF50' }}>
          <Appbar.Action 
            icon="menu" 
            color="#FFFFFF"
            onPress={openDrawer} 
          />
          <Appbar.Content 
            title="Mis Pedidos" 
            titleStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
          />
          <Appbar.Action 
            icon="bell-outline" 
            color="#FFFFFF"
            onPress={() => {
              // TODO: Implementar notificaciones
              console.log('Notificaciones');
            }} 
          />
        </Appbar.Header>

        {/* Contenido principal */}
        <HomePedidosComercio />
      </Drawer>
    </>
  );
};

export default CadeteNavigator;