import React, { useState, useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import { Surface, ActivityIndicator, IconButton } from 'react-native-paper';
import Meteor from '@meteorrn/core';

const ProductoImage = ({ productoId, style }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    
    Meteor.call('findImgbyProduct', productoId, (err, url) => {
      setLoading(false);
      if (!err && url) {
        console.log("Imagen del producto cargada:", url);
        setImageUrl(url);
      } else {
        setError(true);
      }
    });
  }, [productoId]);

  if (loading) {
    return (
      <Surface style={[styles.container, style]}>
        <ActivityIndicator size="small" color="#673AB7" />
      </Surface>
    );
  }

  if (error || !imageUrl) {
    return (
      <Surface style={[styles.container, styles.placeholder, style]}>
        <IconButton icon="image-off" size={28} iconColor="#BDBDBD" />
      </Surface>
    );
  }

  return (
    <Image
      source={{ uri: imageUrl }}
      style={[styles.container, style]}
      resizeMode="cover"
    />
  );
};

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    backgroundColor: '#FAFAFA',
  },
});

export default ProductoImage;
