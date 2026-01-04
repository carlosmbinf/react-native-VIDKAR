import React, { useState } from 'react';
import { View, StyleSheet, Animated, LayoutAnimation, Platform, UIManager, FlatList } from 'react-native';
import { 
  Card, Text, Chip, IconButton, Divider, Surface 
} from 'react-native-paper';
import ProductoCard from './ProductoCard';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TiendaCard = ({ tienda, index, searchQuery }) => {
  const [expanded, setExpanded] = useState(true);
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
    
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Calcular distancia (placeholder - requeriría geolocalización del usuario)
  const distancia = tienda.coordenadas ? '~2.5 km' : 'N/A';

  const renderProductoItem = ({ item, index }) => (
    <ProductoCard 
      producto={item}
      tienda={tienda}
      searchQuery={searchQuery}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyProductos}>
      <IconButton icon="package-variant-closed" size={40} iconColor="#ccc" />
      <Text variant="bodySmall" style={styles.emptyText}>
        No hay productos disponibles
      </Text>
    </View>
  );

  return (
    <View style={[styles.card, { marginTop: 16}]} >
      {/* Header de la tienda */}
      <Card.Content>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text variant="titleLarge" style={styles.tiendaTitle} numberOfLines={1}>
                {tienda.title}
              </Text>
              {tienda.pinColor && (
                <View 
                  style={[styles.colorPin, { backgroundColor: tienda.pinColor }]} 
                />
              )}
            </View>

            {tienda.descripcion && (
              <Text 
                variant="bodySmall" 
                style={styles.descripcion}
                numberOfLines={expanded ? undefined : 2}
              >
                {tienda.descripcion}
              </Text>
            )}

            {/* Chips de info */}
            <View style={styles.chipsRow}>
              <Chip 
                icon="package-variant" 
                mode="flat" 
                compact 
                // style={styles.chip}
                textStyle={styles.chipText}
              >
                {tienda.totalProductos} producto{tienda.totalProductos !== 1 ? 's' : ''}
              </Chip>
              
              {tienda.productosDisponibles < tienda.totalProductos && (
                <Chip 
                  icon="alert-circle-outline" 
                  mode="flat" 
                  compact 
                  style={[styles.chip, styles.chipWarning]}
                  textStyle={styles.chipText}
                >
                  {tienda.productosDisponibles} disponible{tienda.productosDisponibles !== 1 ? 's' : ''}
                </Chip>
              )}

              {tienda.coordenadas && (
                <Chip 
                  icon="map-marker" 
                  mode="flat" 
                  compact 
                //   style={styles.chip}
                  textStyle={styles.chipText}
                >
                  {distancia}
                </Chip>
              )}
            </View>
          </View>

          {/* Botón expandir */}
          <Animated.View style={{ transform: [{ rotate }] }}>
            <IconButton
              icon="chevron-down"
              size={28}
              onPress={toggleExpand}
              style={styles.expandButton}
            />
          </Animated.View>
        </View>
      </Card.Content>

      {/* Lista HORIZONTAL de productos (expandible) */}
      {expanded && (
        <>
          <Divider style={{ marginTop: 8 }} />
          
          {/* Header de productos */}
          <View style={styles.productosHeader}>
            <Text variant="labelLarge" style={styles.productosHeaderText}>
              📦 Productos disponibles
            </Text>
            <Chip 
              compact 
              mode="outlined" 
            //   style={styles.countChip}
              textStyle={styles.countChipText}
            >
              {tienda.productos.length}
            </Chip>
          </View>

          {/* FlatList HORIZONTAL de productos */}
          <FlatList
            horizontal
            data={tienda.productos}
            renderItem={renderProductoItem}
            keyExtractor={(item) => item._id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productosListContent}
            ListEmptyComponent={renderEmptyState}
            snapToInterval={192} // ✅ Snap a cada card (180 width + 12 margin)
            decelerationRate="fast"
            pagingEnabled={false}
          />

          {/* Footer con padding */}
          <View style={{ height: 12 }} />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    
    width: "100%",
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tiendaTitle: {
    fontWeight: 'bold',
    flex: 1,
  },
  colorPin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  descripcion: {
    marginBottom: 10,
    opacity: 0.7,
    lineHeight: 20,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    height: 28,
  },
  chipWarning: {
    backgroundColor: '#FFF3E0',
  },
  chipText: {
    fontSize: 11,
  },
  expandButton: {
    margin: 0,
  },
  productosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  productosHeaderText: {
    fontWeight: '600',
  },
  countChip: {
    height: 24,
  },
  countChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  productosListContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyProductos: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    opacity: 0.5,
    marginTop: 8,
  },
});

export default TiendaCard;
