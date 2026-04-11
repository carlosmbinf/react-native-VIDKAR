import React from "react";

import ScreenFallback from "../shared/ScreenFallback";

const ProductosScreen = () => (
  <ScreenFallback
    title="ComerciosList"
    legacyPath="components/productos/ProductosScreen.jsx"
    description="Pantalla espejo para comercios cercanos y productos por tienda según la ubicación del usuario."
  />
);

export default ProductosScreen;
