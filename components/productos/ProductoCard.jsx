import React, { useState } from 'react';
import { View, StyleSheet, Image, Pressable, Platform } from 'react-native';
import { 
  Surface, Text, Chip, IconButton 
} from 'react-native-paper';
import Meteor from '@meteorrn/core';
import AddToCartDialog from './AddToCartDialog';

const ProductoCard = ({ producto, tienda, searchQuery }) => {
  const [dialogVisible, setDialogVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  React.useEffect(() => {
    Meteor.call('findImgbyProduct', producto._id, (err, url) => {
      if (!err && url) {
        setImageUrl(url);
      }
    });
  }, [producto._id]);

  const estaDisponible = producto.productoDeElaboracion || producto.count > 0;
  const precioFormateado = `${producto.precio.toFixed(2)} ${producto.monedaPrecio || 'USD'}`;

  // Highlight de búsqueda
  const highlightText = (text) => {
    if (!searchQuery?.trim() || !text) return text;
    
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchQuery.toLowerCase() 
        ? <Text key={i} style={styles.highlight}>{part}</Text> 
        : part
    );
  };

  return (
    <>
      <Pressable 
        onPress={() => estaDisponible && setDialogVisible(true)}
        android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
        style={({ pressed }) => [
          styles.cardContainer
        ]}
      >
        <View style={styles.cardInner}>
          <Surface 
            style={[
              styles.card, 
              !estaDisponible && styles.cardDisabled
            ]} 
            elevation={4}
          >
            {/* Imagen del producto */}
          <View style={styles.imageContainer}>
            {imageUrl ? (
              <Image 
                source={{ uri: imageUrl }} 
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.image, styles.placeholderImage]}>
                <IconButton icon="image-off" size={32} iconColor="#ccc" />
              </View>
            )}

            {/* Badge de estado en esquina */}
            {!producto.productoDeElaboracion && producto.count <= 5 && (
              <View style={styles.stockBadge}>
                <Chip 
                  mode="flat" 
                  compact
                  style={[
                    styles.stockChip,
                    producto.count === 0 && styles.stockChipError,
                    producto.count > 0 && producto.count <= 5 && styles.stockChipWarning
                  ]}
                  textStyle={styles.stockChipText}
                >
                  {producto.count === 0 ? 'Agotado' : `${producto.count} unid.`}
                </Chip>
              </View>
            )}

            {producto.productoDeElaboracion && (
              <View style={styles.stockBadge}>
                <Chip 
                  mode="flat" 
                  compact
                  icon="chef-hat"
                  style={styles.elaboracionChip}
                  textStyle={styles.elaboracionChipText}
                >
                  Elaboración
                </Chip>
              </View>
            )}
          </View>

          {/* Información del producto */}
          <View style={styles.content}>
            <Text 
              variant="titleSmall" 
              style={styles.nombre}
              numberOfLines={1}
            >
              {highlightText(producto.name)}
            </Text>

            {producto.descripcion && (
              <Text 
                variant="bodySmall" 
                style={styles.descripcion}
                numberOfLines={3}
              >
                {highlightText(producto.descripcion)}
              </Text>
            )}

            {/* Precio destacado */}
            <View style={styles.precioContainer}>
              <Text variant="titleMedium" style={styles.precio}>
                {precioFormateado}
              </Text>
            </View>
          </View>
        </Surface>
        </View>
      </Pressable>

      {/* Dialog para agregar al carrito */}
      <AddToCartDialog
        visible={dialogVisible}
        onDismiss={() => setDialogVisible(false)}
        producto={producto}
        tienda={tienda}
      />
    </>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginRight: 16, // ✅ Mayor espacio horizontal entre cards (antes 12)
    marginVertical: 8, // ✅ Espacio vertical para que se vea la sombra
  },
  pressedIOS: {
    opacity: 0.7, // ✅ Efecto nativo de iOS al tocar
  },
  cardInner: {
    width: 180,
    // ✅ Sombras para iOS en el contenedor (sin overflow)
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 0, // elevation se maneja en Surface
      },
    }),
  },
  card: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden', // ✅ overflow solo en el card interno
  },
  cardDisabled: {
    opacity: 0.6,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 160, // ✅ Altura fija para consistencia
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },stockChip: {
        backgroundColor: 'rgba(76, 175, 80, 0.60)', // ✅ Verde con transparencia
        // height: 24,
        padding:0
      },
      stockChipWarning: {
        backgroundColor: 'rgba(255, 152, 0, 0.60)', // ✅ Naranja con transparencia
      },
      stockChipError: {
        backgroundColor: 'rgba(244, 67, 54, 0.60)', // ✅ Rojo con transparencia
      },
      stockChipText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#424242', // ✅ Texto oscuro legible en ambos modos
      },
      elaboracionChip: {
        backgroundColor: 'rgba(156, 39, 176, 0.60)', // ✅ Púrpura con transparencia
        // height: 24,
      },
  elaboracionChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    padding: 12,
    paddingBottom: 14,
  },
  nombre: {
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 16,
    fontSize: 13, // ✅ Letra más pequeña para que quepa en una línea
  },
  descripcion: {
    opacity: 0.7,
    marginBottom: 10,
    lineHeight: 16,
    fontSize: 12,
  },
  highlight: {
    backgroundColor: '#FFEB3B',
    fontWeight: 'bold',
  },
  precioContainer: {
    marginBottom: 0,
    paddingVertical: 6,
    paddingHorizontal: 8,
    // backgroundColor: '#E3F2FD',
    borderRadius: 8,
    alignItems: 'center',
  },
});

export default ProductoCard;
