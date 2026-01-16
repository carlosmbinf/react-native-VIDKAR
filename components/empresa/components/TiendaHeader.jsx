import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Avatar, Chip } from 'react-native-paper';

const TiendaHeader = ({ tienda, productosCount }) => {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.headerRow}>
          <Avatar.Icon 
            size={56} 
            icon="store" 
            style={{ backgroundColor: tienda.pinColor }} 
          />
          <View style={styles.details}>
            <Text variant="headlineSmall" style={styles.nombre}>
              {tienda.title}
            </Text>
            <Text variant="bodyMedium" style={styles.descripcion}>
              {tienda.descripcion || 'Sin descripción'}
            </Text>
            <Chip
              icon="package-variant"
              style={styles.chip}
              textStyle={styles.chipText}
              compact
            >
              {productosCount} productos
            </Chip>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
    elevation: 2,
    borderRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  details: {
    flex: 1,
    marginLeft: 16,
  },
  nombre: {
    fontWeight: 'bold',
    color: '#212121',
  },
  descripcion: {
    color: '#757575',
    marginTop: 4,
  },
  chip: {
    height: 30,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontSize: 12,
  },
});

export default TiendaHeader;
