import React from "react";

import ScreenFallback from "../shared/ScreenFallback";

const ProductosScreen = () => (
  <ScreenFallback
    title="Productos Cubacel"
    legacyPath="components/cubacel/Productos.jsx"
    description="Pantalla Cubacel disponible en nativo mediante la variante .native.jsx y con fallback seguro para web."
  />
);

export default ProductosScreen;
