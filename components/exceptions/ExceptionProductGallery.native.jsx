import React from "react";
import ProductImageCarousel from "../productos/ProductImageCarousel";

export default function ExceptionProductGallery({ images }) {
  return <ProductImageCarousel images={images} size={180} resizeMode="contain" style={{ width: "100%", borderRadius: 16 }} />;
}
