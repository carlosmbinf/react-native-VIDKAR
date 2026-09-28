import ProductImageCarousel from "../../productos/ProductImageCarousel";

const ProductoImage = ({ productoId, size = 104, fill = false, style = null }) => (
  <ProductImageCarousel
    fill={fill}
    productId={productoId}
    resizeMode="cover"
    size={size}
    style={style}
  />
);

export default ProductoImage;