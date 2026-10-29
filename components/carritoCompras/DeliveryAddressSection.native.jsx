import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Checkbox, Chip, HelperText, Icon, IconButton, Text, TextInput, TouchableRipple, useTheme } from 'react-native-paper';

export default function DeliveryAddressSection({ addresses, addressLabel, busy, children, error, loading, makeDefault, onDefault, onLabelChange, onMakeDefaultChange, onNew, onRemove, onRetry, onSaveChange, onSelect, saveAddress, selectedId }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text variant="titleMedium">Tus direcciones</Text>
      {loading ? <View accessibilityRole="progressbar" style={styles.loading}><ActivityIndicator size="small" /><Text>Cargando direcciones…</Text></View> : null}
      {error ? <View><HelperText type="error" visible>{error}</HelperText><Button disabled={busy} onPress={onRetry}>Reintentar</Button></View> : null}
      {!loading && !error && addresses.length === 0 ? <Text style={{ color: colors.onSurfaceVariant }}>Todavía no tienes direcciones guardadas. Puedes guardar una nueva para tu próxima compra.</Text> : null}
      {addresses.map((address) => (
        <Card key={address.id} mode="outlined" style={{ borderColor: address.id === selectedId ? colors.primary : colors.outlineVariant, backgroundColor: address.id === selectedId ? colors.secondaryContainer : colors.surface }}>
          <View style={styles.addressRow}>
            <TouchableRipple accessibilityRole="radio" accessibilityState={{ checked: address.id === selectedId, disabled: busy }} accessibilityLabel={`${address.label}, ${address.street}, ${address.houseNumber || 'sin número'}${address.isDefault ? ', predeterminada' : ''}`} disabled={busy} onPress={() => onSelect(address)} style={styles.addressSelect}>
              <View style={styles.addressContent}>
                <Icon color={address.id === selectedId ? colors.primary : colors.onSurfaceVariant} size={23} source={address.id === selectedId ? 'radiobox-marked' : 'radiobox-blank'} />
                <View style={styles.addressCopy}>
                  <Text variant="titleSmall">{address.label}</Text>
                  <Text style={{ color: colors.onSurfaceVariant }}>{[address.street, address.houseNumber].filter(Boolean).join(' · ')}</Text>
                  {address.isDefault ? <Chip compact style={styles.chip} textStyle={styles.chipText}>Predeterminada</Chip> : null}
                </View>
              </View>
            </TouchableRipple>
            <View>
              {!address.isDefault ? <IconButton accessibilityLabel={`Marcar ${address.label} como predeterminada`} disabled={busy} icon="star-outline" onPress={() => onDefault(address)} size={20} /> : null}
              <IconButton accessibilityLabel={`Eliminar dirección ${address.label}`} disabled={busy} icon="delete-outline" onPress={() => onRemove(address)} size={20} />
            </View>
          </View>
        </Card>
      ))}
      <Button disabled={busy} icon="plus" mode={selectedId ? 'outlined' : 'contained-tonal'} onPress={onNew}>Usar una dirección nueva</Button>
      {children}
      {!selectedId ? <View style={styles.saveOptions}>
        <Checkbox.Item disabled={busy} label="Guardar esta dirección para próximas compras" labelStyle={styles.checkboxLabel} onPress={() => onSaveChange(!saveAddress)} position="leading" status={saveAddress ? 'checked' : 'unchecked'} style={styles.checkbox} />
        {saveAddress ? <>
          <TextInput accessibilityLabel="Nombre de la dirección" disabled={busy} label="Nombre de la dirección" maxLength={60} mode="outlined" onChangeText={onLabelChange} placeholder="Casa, Trabajo…" value={addressLabel} />
          <Checkbox.Item disabled={busy} label="Usar como dirección predeterminada" labelStyle={styles.checkboxLabel} onPress={() => onMakeDefaultChange(!makeDefault)} position="leading" status={makeDefault ? 'checked' : 'unchecked'} style={styles.checkbox} />
        </> : null}
      </View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, paddingBottom: 16 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addressRow: { flexDirection: 'row', alignItems: 'center' },
  addressSelect: { flex: 1, minWidth: 0, borderRadius: 12 },
  addressContent: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  addressCopy: { flex: 1, minWidth: 0, gap: 5 },
  chip: { alignSelf: 'flex-start' },
  chipText: { fontSize: 11 },
  saveOptions: { gap: 8 },
  checkbox: { paddingHorizontal: 0 },
  checkboxLabel: { textAlign: 'left' },
});
