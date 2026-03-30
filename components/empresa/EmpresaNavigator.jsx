import React from 'react';

import ModeShell from '../shared/ModeShell';

const EmpresaNavigator = () => {
  return (
    <ModeShell
      color="#673AB7"
      title="Modo empresa"
      subtitle="Base del navigator de empresa con foco en pedidos de preparación, tiendas, productos y futuras pantallas operativas del comercio."
      badge="Empresa activa"
      actions={[
        {
          label: 'Pedidos en preparación',
          description: 'Entrada principal equivalente a PedidosPreparacion del proyecto legacy.',
          icon: 'clipboard-list-outline',
          href: '/(empresa)/PedidosPreparacion',
        },
        {
          label: 'Mis tiendas',
          description: 'Espacio para la lista de tiendas y el detalle de cada comercio.',
          icon: 'shopping-outline',
          href: '/(empresa)/MisTiendas',
        },
        {
          label: 'Productos',
          description: 'Punto de acceso futuro para crear, editar y administrar productos del comercio.',
          icon: 'tag-outline',
          href: '/(empresa)/ProductoForm',
        },
      ]}
    />
  );
};

export default EmpresaNavigator;