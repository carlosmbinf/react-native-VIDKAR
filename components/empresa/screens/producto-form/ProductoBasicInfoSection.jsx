import React from 'react';
import { Text, Card, TextInput, HelperText, Divider } from 'react-native-paper';
import styles from './styles';

const ProductoBasicInfoSection = ({ 
  isEditing, 
  formData, 
  errors, 
  onChange 
}) => {
  return (
    <Card style={styles.formCard}>
      <Card.Content>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          {isEditing ? '✏️ Editar Producto' : '➕ Nuevo Producto'}
        </Text>
        <Divider style={styles.divider} />

        <TextInput
          label="Nombre del producto *"
          value={formData.name}
          onChangeText={(text) => onChange('name', text)}
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
          onChangeText={(text) => onChange('descripcion', text)}
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
  );
};

export default ProductoBasicInfoSection;
