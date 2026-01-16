import React from 'react';
import { View } from 'react-native';
import { 
  Text, 
  Card, 
  TextInput, 
  HelperText, 
  Divider, 
  Chip, 
  Switch 
} from 'react-native-paper';
import styles from './styles';

const ProductoPriceSection = ({ 
  formData, 
  errors, 
  onChange 
}) => {
  return (
    <Card style={styles.formCard}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          💰 Precio y Disponibilidad
        </Text>
        <Divider style={styles.divider} />

        <TextInput
          label="Precio *"
          value={formData.precio}
          onChangeText={(text) => onChange('precio', text)}
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

        {/* Selector de moneda */}
        <View style={styles.currencySelectorHorizontal}>
          <Text variant="bodySmall" style={styles.currencyLabelHorizontal}>
            Moneda:
          </Text>
          <View style={styles.currencyChipsHorizontal}>
            {['USD', 'CUP', 'UYU'].map((currency) => (
              <Chip
                key={currency}
                mode="outlined"
                selected={formData.monedaPrecio === currency}
                onPress={() => onChange('monedaPrecio', currency)}
                style={[
                  styles.currencyChipHorizontal,
                  formData.monedaPrecio === currency && styles.currencyChipSelected
                ]}
                selectedColor="#673AB7"
                textStyle={
                  formData.monedaPrecio === currency 
                    ? styles.currencyChipTextSelected 
                    : styles.currencyChipText
                }
              >
                {currency}
              </Chip>
            ))}
          </View>
        </View>

        {/* Switch de elaboración */}
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text variant="bodyLarge">Producto de elaboración</Text>
            <Text variant="bodySmall" style={styles.switchDescription}>
              Se prepara bajo pedido (sin stock fijo)
            </Text>
          </View>
          <Switch
            value={formData.productoDeElaboracion}
            onValueChange={(value) => onChange('productoDeElaboracion', value)}
            color="#673AB7"
          />
        </View>

        {/* Campo de cantidad (solo si no es de elaboración) */}
        {!formData.productoDeElaboracion && (
          <>
            <TextInput
              label="Cantidad en stock *"
              value={formData.count}
              onChangeText={(text) => onChange('count', text)}
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
  );
};

export default ProductoPriceSection;
