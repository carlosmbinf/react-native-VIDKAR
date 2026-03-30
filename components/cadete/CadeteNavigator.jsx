import React from 'react';

import ModeShell from '../shared/ModeShell';

const CadeteNavigator = () => {
  return (
    <ModeShell
      color="#4CAF50"
      title="Modo cadete"
      subtitle="Replica el patrón del legacy donde el modo cadete entra directo al flujo operativo de pedidos y conserva un shell propio separado del resto de la aplicación."
      badge="Cadete activo"
      actions={[
        {
          label: 'Mis pedidos',
          description: 'Pantalla principal equivalente a HomePedidosComercio del flujo cadete.',
          icon: 'truck-delivery-outline',
          href: '/(cadete)/HomePedidosComercio',
        },
        {
          label: 'Incidencias y mensajes',
          description: 'Reserva para pantallas auxiliares del trabajo de reparto.',
          icon: 'bell-outline',
          href: '/(normal)/Mensajes',
        },
      ]}
    />
  );
};

export default CadeteNavigator;