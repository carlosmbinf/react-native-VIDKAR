import React from 'react';
import { View, Image, TouchableOpacity, Alert } from 'react-native';
import {
  Text,
  Card,
  IconButton,
  ActivityIndicator,
  Chip,
  Surface,
} from 'react-native-paper';
import { launchImageLibrary } from 'react-native-image-picker';
import styles from './styles';

const ProductoImageSection = ({ 
  imagenPreview, 
  loadingImage, 
  imagen, 
  onImageSelect, 
  onImageRemove 
}) => {
  const handleSelectImage = () => {
    const options = {
      mediaType: 'photo',
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.8,
      includeBase64: false,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('Usuario canceló selección de imagen');
        return;
      }
      
      if (response.errorCode) {
        Alert.alert('Error', `No se pudo seleccionar la imagen: ${response.errorMessage}`);
        return;
      }
      
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];

        // Validación de tamaño
        const maxSize = 5 * 1024 * 1024;
        if (asset.fileSize > maxSize) {
          Alert.alert(
            'Imagen muy pesada',
            `La imagen debe pesar menos de 5MB. Tamaño actual: ${(asset.fileSize / (1024 * 1024)).toFixed(2)}MB`
          );
          return;
        }

        // Validación de tipo
        if (!asset.type || !asset.type.startsWith('image/')) {
          Alert.alert('Error', 'Solo se permiten archivos de imagen');
          return;
        }

        onImageSelect({
          uri: asset.uri,
          fileName: asset.fileName || 'producto.jpg',
          fileSize: asset.fileSize,
          type: asset.type,
        });
      }
    });
  };

  const handleRemoveImage = () => {
    Alert.alert(
      '¿Eliminar imagen?',
      'Se eliminará la imagen seleccionada',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: onImageRemove
        }
      ]
    );
  };

  return (
    <Card style={styles.imageCard}>
      <Card.Content style={styles.imageCardContent}>
        <View style={styles.imageHeaderRow}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            📸 Imagen del Producto
          </Text>
          {(imagenPreview || loadingImage) && (
            <View style={styles.imageActions}>
              {!loadingImage && (
                <>
                  <IconButton
                    icon="camera-flip"
                    size={20}
                    onPress={handleSelectImage}
                    iconColor="#673AB7"
                    style={styles.actionButton}
                  />
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={handleRemoveImage}
                    iconColor="#FF5252"
                    style={styles.actionButton}
                  />
                </>
              )}
            </View>
          )}
        </View>

        {loadingImage ? (
          <Surface style={styles.imageSkeletonContainer}>
            <ActivityIndicator size="large" color="#673AB7" />
            <Text variant="bodySmall" style={styles.loadingText}>
              Cargando imagen...
            </Text>
          </Surface>
        ) : imagenPreview ? (
          <Surface style={styles.imagePreviewContainer} elevation={2}>
            <Image 
              source={{ uri: imagenPreview }} 
              style={styles.imagePreview}
              resizeMode="cover"
            />
            {imagen && (
              <View style={styles.imageInfoOverlay}>
                <Chip
                  mode="flat"
                  compact
                  icon="file-image"
                  style={styles.imageInfoChip}
                  textStyle={styles.imageInfoText}
                >
                  {(imagen.fileSize / 1024).toFixed(0)} KB
                </Chip>
              </View>
            )}
          </Surface>
        ) : (
          <TouchableOpacity
            style={styles.imagePickerPlaceholder}
            onPress={handleSelectImage}
          >
            <Surface style={styles.placeholderContent} elevation={1}>
              <IconButton 
                icon="camera-plus" 
                size={48} 
                iconColor="#673AB7"
              />
              <Text variant="titleMedium" style={styles.imagePickerText}>
                Toca para agregar imagen
              </Text>
              <Text variant="bodySmall" style={styles.imagePickerHint}>
                Máximo 5MB • JPG, PNG
              </Text>
            </Surface>
          </TouchableOpacity>
        )}
      </Card.Content>
    </Card>
  );
};

export default ProductoImageSection;
