import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  TextInput,
  Button,
  Switch,
  Text,
  Card,
  HelperText,
  ActivityIndicator,
  Chip,
  IconButton,
  Divider,
} from 'react-native-paper';
import Meteor from '@meteorrn/core';
import { launchImageLibrary } from 'react-native-image-picker';

const ProductoFormScreen = ({ producto, tienda, onBack }) => {
  const isEditing = !!producto?._id;

  const [formData, setFormData] = useState({
    name: '',
    descripcion: '',
    precio: '',
    monedaPrecio: 'USD',
    count: '',
    productoDeElaboracion: false,
    comentario: '',
  });

  const [imagen, setImagen] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (isEditing && producto) {
      setFormData({
        name: producto.name || '',
        descripcion: producto.descripcion || '',
        precio: producto.precio?.toString() || '',
        monedaPrecio: producto.monedaPrecio || 'USD',
        count: producto.count?.toString() || '',
        productoDeElaboracion: producto.productoDeElaboracion || false,
        comentario: producto.comentario || '',
      });

      if (producto._id) {
        loadExistingImage(producto._id);
      }
    }
  }, [producto, isEditing]);

  const loadExistingImage = async (productoId) => {
    try {
      Meteor.call('findImgbyProduct', productoId, (error, imageUrl) => {
        if (!error && imageUrl) {
          setImagenPreview(imageUrl);
        }
      });
    } catch (error) {
      console.warn('[ProductoForm] Error cargando imagen:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'El nombre no puede exceder 50 caracteres';
    }

    if (!formData.descripcion.trim()) {
      newErrors.descripcion = 'La descripción es obligatoria';
    } else if (formData.descripcion.trim().length < 10) {
      newErrors.descripcion = 'La descripción debe tener al menos 10 caracteres';
    } else if (formData.descripcion.trim().length > 200) {
      newErrors.descripcion = 'La descripción no puede exceder 200 caracteres';
    }

    const precio = parseFloat(formData.precio);
    if (!formData.precio || isNaN(precio)) {
      newErrors.precio = 'El precio es obligatorio';
    } else if (precio <= 0) {
      newErrors.precio = 'El precio debe ser mayor a 0';
    } else if (precio > 999999) {
      newErrors.precio = 'El precio es demasiado alto';
    }

    if (!formData.productoDeElaboracion) {
      const count = parseInt(formData.count);
      if (formData.count === '' || isNaN(count)) {
        newErrors.count = 'La cantidad es obligatoria';
      } else if (count < 0) {
        newErrors.count = 'La cantidad no puede ser negativa';
      } else if (count > 999999) {
        newErrors.count = 'La cantidad es demasiado alta';
      }
    }

    if (formData.comentario && formData.comentario.length > 500) {
      newErrors.comentario = 'El comentario no puede exceder 500 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
      } else if (response.errorCode) {
        Alert.alert('Error', `No se pudo seleccionar la imagen: ${response.errorMessage}`);
      } else if (response.assets && response.assets[0]) {
        const asset = response.assets[0];

        const maxSize = 5 * 1024 * 1024;
        if (asset.fileSize > maxSize) {
          Alert.alert(
            'Imagen muy pesada',
            `La imagen debe pesar menos de 5MB. Tamaño actual: ${(asset.fileSize / (1024 * 1024)).toFixed(2)}MB`
          );
          return;
        }

        if (!asset.type || !asset.type.startsWith('image/')) {
          Alert.alert('Error', 'Solo se permiten archivos de imagen');
          return;
        }

        setImagen({
          uri: asset.uri,
          fileName: asset.fileName || 'producto.jpg',
          fileSize: asset.fileSize,
          type: asset.type,
        });
        setImagenPreview(asset.uri);
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
          onPress: () => {
            setImagen(null);
            setImagenPreview(null);
          }
        }
      ]
    );
  };

  const uploadImage = async (productoId) => {
    if (!imagen) return null;

    setUploadingImage(true);

    try {
      console.log('[ProductoForm] Upload de imagen pendiente de implementación');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUploadingImage(false);
      return null;
    } catch (error) {
      setUploadingImage(false);
      console.error('[ProductoForm] Error subiendo imagen:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Errores de validación', 'Por favor corrige los errores antes de continuar');
      return;
    }

    setLoading(true);

    try {
      const productoData = {
        idTienda: producto?.idTienda || tienda._id,
        name: formData.name.trim(),
        descripcion: formData.descripcion.trim(),
        precio: parseFloat(formData.precio),
        monedaPrecio: formData.monedaPrecio,
        count: formData.productoDeElaboracion ? 0 : parseInt(formData.count),
        productoDeElaboracion: formData.productoDeElaboracion,
        comentario: formData.comentario.trim(),
      };

      if (isEditing) {
        Alert.alert('Info', 'La edición de productos aún no está implementada en el backend');
        setLoading(false);
      } else {
        Meteor.call('addProducto', productoData, async (error, productoId) => {
          if (error) {
            setLoading(false);
            Alert.alert('Error', error.reason || 'No se pudo crear el producto');
          } else {
            if (imagen) {
              try {
                await uploadImage(productoId);
              } catch (uploadError) {
                console.warn('[ProductoForm] Error subiendo imagen:', uploadError);
              }
            }

            setLoading(false);
            Alert.alert(
              'Éxito',
              'Producto creado correctamente',
              [{ text: 'OK', onPress: onBack }]
            );
          }
        });
      }
    } catch (error) {
      setLoading(false);
      console.error('[ProductoForm] Error en handleSubmit:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.formCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              {isEditing ? '✏️ Editar Producto' : '➕ Nuevo Producto'}
            </Text>
            <Divider style={styles.divider} />

            <TextInput
              label="Nombre del producto *"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              mode="outlined"
              style={styles.input}
              error={!!errors.name}
              maxLength={50}
              left={<TextInput.Icon icon="package-variant" />}
              right={<TextInput.Affix text={`${formData.name.length}/50`} />}
            />
            <HelperText type="error" visible={!!errors.name}>
              {errors.name}
            </HelperText>

            <TextInput
              label="Descripción *"
              value={formData.descripcion}
              onChangeText={(text) => setFormData({ ...formData, descripcion: text })}
              mode="outlined"
              multiline
              numberOfLines={4}
              style={styles.input}
              error={!!errors.descripcion}
              maxLength={200}
              left={<TextInput.Icon icon="text" />}
              right={<TextInput.Affix text={`${formData.descripcion.length}/200`} />}
            />
            <HelperText type="error" visible={!!errors.descripcion}>
              {errors.descripcion}
            </HelperText>
          </Card.Content>
        </Card>

        <Card style={styles.formCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              💰 Precio y Disponibilidad
            </Text>
            <Divider style={styles.divider} />

            <TextInput
              label="Precio *"
              value={formData.precio}
              onChangeText={(text) => setFormData({ ...formData, precio: text })}
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
              error={!!errors.precio}
              left={<TextInput.Icon icon="currency-usd" />}
            />
            <HelperText type="error" visible={!!errors.precio}>
              {errors.precio}
            </HelperText>

            <View style={styles.currencySelectorHorizontal}>
              <Text variant="bodySmall" style={styles.currencyLabelHorizontal}>
                Moneda:
              </Text>
              <View style={styles.currencyChipsHorizontal}>
                <Chip
                  mode="outlined"
                  selected={formData.monedaPrecio === 'USD'}
                  onPress={() => setFormData({ ...formData, monedaPrecio: 'USD' })}
                  style={[
                    styles.currencyChipHorizontal,
                    formData.monedaPrecio === 'USD' && styles.currencyChipSelected
                  ]}
                  selectedColor="#673AB7"
                  textStyle={formData.monedaPrecio === 'USD' ? styles.currencyChipTextSelected : styles.currencyChipText}
                >
                  USD
                </Chip>
                <Chip
                  mode="outlined"
                  selected={formData.monedaPrecio === 'CUP'}
                  onPress={() => setFormData({ ...formData, monedaPrecio: 'CUP' })}
                  style={[
                    styles.currencyChipHorizontal,
                    formData.monedaPrecio === 'CUP' && styles.currencyChipSelected
                  ]}
                  selectedColor="#673AB7"
                  textStyle={formData.monedaPrecio === 'CUP' ? styles.currencyChipTextSelected : styles.currencyChipText}
                >
                  CUP
                </Chip>
                <Chip
                  mode="outlined"
                  selected={formData.monedaPrecio === 'UYU'}
                  onPress={() => setFormData({ ...formData, monedaPrecio: 'UYU' })}
                  style={[
                    styles.currencyChipHorizontal,
                    formData.monedaPrecio === 'UYU' && styles.currencyChipSelected
                  ]}
                  selectedColor="#673AB7"
                  textStyle={formData.monedaPrecio === 'UYU' ? styles.currencyChipTextSelected : styles.currencyChipText}
                >
                  UYU
                </Chip>
              </View>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text variant="bodyLarge">Producto de elaboración</Text>
                <Text variant="bodySmall" style={styles.switchDescription}>
                  Se prepara bajo pedido (sin stock fijo)
                </Text>
              </View>
              <Switch
                value={formData.productoDeElaboracion}
                onValueChange={(value) =>
                  setFormData({ ...formData, productoDeElaboracion: value })
                }
                color="#673AB7"
              />
            </View>

            {!formData.productoDeElaboracion && (
              <>
                <TextInput
                  label="Cantidad en stock *"
                  value={formData.count}
                  onChangeText={(text) => setFormData({ ...formData, count: text })}
                  mode="outlined"
                  keyboardType="number-pad"
                  style={styles.input}
                  error={!!errors.count}
                  left={<TextInput.Icon icon="package-variant-closed" />}
                />
                <HelperText type="error" visible={!!errors.count}>
                  {errors.count}
                </HelperText>
              </>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.formCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              📸 Imagen del Producto
            </Text>
            <Divider style={styles.divider} />

            {imagenPreview ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: imagenPreview }} style={styles.imagePreview} />
                <View style={styles.imageOverlay}>
                  <IconButton
                    icon="close-circle"
                    iconColor="#FF5252"
                    size={32}
                    onPress={handleRemoveImage}
                    style={styles.removeImageButton}
                  />
                </View>
                {imagen && (
                  <Text variant="bodySmall" style={styles.imageInfo}>
                    {imagen.fileName} ({(imagen.fileSize / 1024).toFixed(2)} KB)
                  </Text>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.imagePickerPlaceholder}
                onPress={handleSelectImage}
              >
                <IconButton icon="camera-plus" size={48} iconColor="#673AB7" />
                <Text variant="bodyLarge" style={styles.imagePickerText}>
                  Seleccionar imagen
                </Text>
                <Text variant="bodySmall" style={styles.imagePickerHint}>
                  Máximo 5MB (JPG, PNG)
                </Text>
              </TouchableOpacity>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.formCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              📝 Información Adicional
            </Text>
            <Divider style={styles.divider} />

            <TextInput
              label="Comentarios (opcional)"
              value={formData.comentario}
              onChangeText={(text) => setFormData({ ...formData, comentario: text })}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              error={!!errors.comentario}
              maxLength={500}
              left={<TextInput.Icon icon="note-text" />}
              right={<TextInput.Affix text={`${formData.comentario.length}/500`} />}
            />
            <HelperText type="info">
              Información extra para clientes o personal
            </HelperText>
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={onBack}
            style={styles.button}
            disabled={loading || uploadingImage}
          >
            Cancelar
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={[styles.button, styles.submitButton]}
            disabled={loading || uploadingImage}
            loading={loading || uploadingImage}
          >
            {uploadingImage ? 'Subiendo imagen...' : isEditing ? 'Guardar Cambios' : 'Crear Producto'}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  formCard: {
    elevation: 2,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#673AB7',
  },
  divider: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 4,
  },
  currencySelectorHorizontal: {
    marginTop: 8,
    marginBottom: 16,
  },
  currencyLabelHorizontal: {
    marginBottom: 8,
    color: '#757575',
    fontSize: 13,
    fontWeight: '600',
  },
  currencyChipsHorizontal: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  currencyChipHorizontal: {
    minWidth: 70,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  currencyChipSelected: {
    backgroundColor: '#F3E5F5',
    borderColor: '#673AB7',
    borderWidth: 2,
  },
  currencyChipText: {
    color: '#757575',
    fontWeight: '500',
    fontSize: 13,
  },
  currencyChipTextSelected: {
    color: '#673AB7',
    fontWeight: 'bold',
    fontSize: 13,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    padding: 12,
    // backgroundColor: '#F3E5F5',
    borderRadius: 8,
  },
  switchInfo: {
    flex: 1,
  },
  switchDescription: {
    color: '#757575',
    marginTop: 4,
  },
  imageContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  removeImageButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  imageInfo: {
    marginTop: 8,
    color: '#757575',
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 8,
    // backgroundColor: '#FAFAFA',
  },
  imagePickerText: {
    color: '#673AB7',
    fontWeight: '600',
    marginTop: 8,
  },
  imagePickerHint: {
    color: '#757575',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  button: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#673AB7',
  },
});

export default ProductoFormScreen;
