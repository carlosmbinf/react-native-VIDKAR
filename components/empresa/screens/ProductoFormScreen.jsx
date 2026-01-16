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
  Surface,
} from 'react-native-paper';
import Meteor from '@meteorrn/core';
import { launchImageLibrary } from 'react-native-image-picker';
const RNFS = require('react-native-fs');

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
  const [loadingImage, setLoadingImage] = useState(false);
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
    setLoadingImage(true);
    try {
      Meteor.call('findImgbyProduct', productoId, (error, imageUrl) => {
        setLoadingImage(false);
        if (!error && imageUrl) {
          setImagenPreview(imageUrl);
        }
      });
    } catch (error) {
      setLoadingImage(false);
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
    if (!imagen || !imagen.uri) return null;
  
    setUploadingImage(true);
  
    return new Promise(async (resolve, reject) => {
      try {
        const uri = imagen.uri;
        const base64Content = await RNFS.readFile(uri, 'base64');
        const fullBase64 = `data:${imagen.type};base64,${base64Content}`;
  
        Meteor.call('comercio.uploadProductImage', productoId, {
          name: imagen.fileName || `foto_${Date.now()}.jpg`,
          type: imagen.type || 'image/jpeg',
          size: imagen.fileSize,
          base64: fullBase64
        }, (error, result) => {
          setUploadingImage(false);
  
          if (error) {
            console.error('[ProductoForm] Error en comercio.uploadProductImage:', error);
            Alert.alert('Error', error.reason || 'No se pudo subir la imagen');
            reject(error);
          } else {
            console.log('[ProductoForm] Imagen subida exitosamente:', result);
            resolve(result);
          }
        });
  
      } catch (error) {
        setUploadingImage(false);
        console.error('[ProductoForm] Error leyendo archivo local:', error);
        Alert.alert('Error', 'No se pudo procesar el archivo en el dispositivo');
        reject(error);
      }
    });
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Errores de validación', 'Por favor corrige los errores antes de continuar');
      return;
    }

    setLoading(true);

    try {
      const productoData = {
        name: formData.name.trim(),
        descripcion: formData.descripcion.trim(),
        precio: parseFloat(formData.precio),
        monedaPrecio: formData.monedaPrecio,
        count: formData.productoDeElaboracion ? 0 : parseInt(formData.count),
        productoDeElaboracion: formData.productoDeElaboracion,
        comentario: formData.comentario.trim(),
      };

      if (isEditing) {
        // ✅ MODO EDICIÓN
        Meteor.call('comercio.editProducto', producto._id, productoData, async (error, result) => {
          if (error) {
            setLoading(false);
            console.error('[ProductoForm] Error editando producto:', error);
            Alert.alert('Error', error.reason || 'No se pudo actualizar el producto');
          } else {
            // ✅ CORRECCIÓN: Subir imagen si existe objeto imagen (nueva selección)
            // No comparar URIs porque imagenPreview es URL del servidor e imagen.uri es local
            if (imagen?.uri) {
              console.log('[ProductoForm] Nueva imagen detectada, iniciando upload...');
              try {
                await uploadImage(producto._id);
                console.log('[ProductoForm] Imagen actualizada tras edición');
              } catch (uploadError) {
                console.warn('[ProductoForm] Error subiendo imagen:', uploadError);
                // No bloquear el flujo si falla la imagen
              }
            } else {
              console.log('[ProductoForm] No hay nueva imagen para subir');
            }

            setLoading(false);
            Alert.alert(
              'Éxito',
              result.message || 'Producto actualizado correctamente',
              [{ text: 'OK', onPress: onBack }]
            );
          }
        });
      } else {
        // ✅ MODO CREACIÓN (existente)
        const nuevoProducto = {
          ...productoData,
          idTienda: tienda._id,
        };

        Meteor.call('addProducto', nuevoProducto, async (error, productoId) => {
          if (error) {
            setLoading(false);
            Alert.alert('Error', error.reason || 'No se pudo crear el producto');
          } else {
            // Subir imagen si existe
            if (imagen?.uri) {
              console.log('[ProductoForm] Imagen detectada, iniciando upload...');
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
              dense
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
              dense
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
              dense
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
                  dense
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
              dense
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
  
  imageCard: {
    elevation: 3,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  imageCardContent: {
    padding: 16,
  },
  imageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    margin: 0,
  },
  imageSkeletonContainer: {
    height: 240,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingText: {
    marginTop: 12,
    color: '#757575',
  },
  imagePreviewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 240,
  },
  imageInfoOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  imageInfoChip: {
    // backgroundColor: 'rgba(255, 255, 255, 0.95)',
    // height: 28,
  },
  imageInfoText: {
    fontSize: 11,
    fontWeight: '600',
    // color: '#424242',
  },
  imagePickerPlaceholder: {
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
  },
  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: '#FAFAFA',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E0E0E0',
    borderRadius: 12,
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

  formCard: {
    elevation: 2,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
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
    borderRadius: 8,
  },
  switchInfo: {
    flex: 1,
  },
  switchDescription: {
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
