import React from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Dialog, Portal, TextInput, Button, Switch, Text, Divider, Chip, HelperText } from 'react-native-paper';
import Meteor from '@meteorrn/core';
import { ConfigCollection } from '../collections/collections';

const PropertyDialog = ({ visible, onDismiss, data }) => {
  const isEdit = !!data?._id;
  const isAdmin = Meteor.user()?.profile?.role === 'admin';
  const currentUserId = Meteor.userId();

  const [type, setType] = React.useState('');
  const [clave, setClave] = React.useState('');
  const [valor, setValor] = React.useState('');
  const [comentario, setComentario] = React.useState('');
  const [active, setActive] = React.useState(true);
  const [idAdminConfigurado, setIdAdminConfigurado] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  // Errores de validación
  const [errors, setErrors] = React.useState({
    type: '',
    clave: '',
    idAdmin: ''
  });

  React.useEffect(() => {
    if (data) {
      // Modo edición: cargar datos existentes (mantener idAdminConfigurado original)
      setType(data.type || '');
      setClave(data.clave || '');
      setValor(String(data.valor || ''));
      setComentario(data.comentario || '');
      setActive(data.active !== false);
      setIdAdminConfigurado(data.idAdminConfigurado || ''); // ✅ Mantener el original
    } else {
      // Modo creación: valores por defecto
      setType('');
      setClave('');
      setValor('');
      setComentario('');
      setActive(true);
      setIdAdminConfigurado(currentUserId); // Auto-rellenar con usuario actual
    }
    // Limpiar errores al cambiar data
    setErrors({ type: '', clave: '', idAdmin: '' });
  }, [data, currentUserId]);

  const validateFields = () => {
    const newErrors = { type: '', clave: '', idAdmin: '' };
    let isValid = true;

    if (!type.trim()) {
      newErrors.type = 'El tipo es obligatorio';
      isValid = false;
    }

    if (!clave.trim()) {
      newErrors.clave = 'La clave es obligatoria';
      isValid = false;
    }

    // ✅ MODIFICADO: Solo validar idAdmin en creación
    if (!isEdit) {
      if (!idAdminConfigurado.trim()) {
        newErrors.idAdmin = 'El ID de administrador es obligatorio';
        isValid = false;
      } else if (idAdminConfigurado.trim().length < 8) {
        newErrors.idAdmin = 'ID inválido (mínimo 8 caracteres)';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = () => {
    if (!validateFields()) {
      return;
    }

    setLoading(true);
    const payload = {
      type: type.trim(),
      clave: clave.trim(),
      valor: valor.trim(),
      comentario: comentario.trim(),
      active: !!active,
      // ✅ MODIFICADO: En edición, mantener el idAdminConfigurado original
      // Solo en creación se usa el valor del estado
      ...(isEdit 
        ? { idAdminConfigurado: data.idAdminConfigurado } 
        : { idAdminConfigurado: idAdminConfigurado.trim() }
      )
    };

    if (isEdit) {
      ConfigCollection.update(data._id, { $set: payload }, (err) => {
        setLoading(false);
        if (err) {
          Alert.alert('Error', err.reason || 'No se pudo actualizar la propiedad');
        } else {
          Alert.alert('Éxito', 'Propiedad actualizada correctamente');
          onDismiss();
        }
      });
    } else {
      ConfigCollection.insert(payload, (err) => {
        setLoading(false);
        if (err) {
          Alert.alert('Error', err.reason || 'No se pudo crear la propiedad');
        } else {
          Alert.alert('Éxito', 'Propiedad creada correctamente');
          onDismiss();
        }
      });
    }
  };

  const handleDelete = () => {
    if (!isAdmin || !data?._id) return;
    Alert.alert(
      'Confirmar eliminación',
      '¿Está seguro de eliminar esta propiedad?\nEsta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setLoading(true);
            ConfigCollection.remove(data._id, (err) => {
              setLoading(false);
              if (err) {
                Alert.alert('Error', err.reason || 'No se pudo eliminar la propiedad');
              } else {
                Alert.alert('Éxito', 'Propiedad eliminada correctamente');
                onDismiss();
              }
            });
          }
        }
      ]
    );
  };

  const formatFecha = (d) => (d ? new Date(d).toLocaleString() : '-');

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.dialogTitle}>
          {isEdit ? '✏️ Editar Propiedad' : '➕ Nueva Propiedad'}
        </Dialog.Title>
        
        <Dialog.ScrollArea style={{ maxHeight: 500 }}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            
            {/* Sección: Información de auditoría (solo en edición) */}
            {isEdit && (
              <View style={styles.auditSection}>
                <Text style={styles.sectionTitle}>📋 Información de Auditoría</Text>
                
                {data?.createdAt && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>📅 Creado:</Text>
                    <Text style={styles.infoValue}>{formatFecha(data.createdAt)}</Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>👤 Admin Configurador:</Text>
                  <Chip 
                    compact 
                    icon="account-lock" 
                    style={styles.adminChip}
                    textStyle={{ fontSize: 11 }}
                  >
                    {data?.idAdminConfigurado?.substring(0, 12) || 'N/A'}...
                  </Chip>
                </View>

                {/* ✅ NUEVO: Mensaje informativo sobre inmutabilidad */}
                <HelperText type="info" visible style={{ marginTop: 8 }}>
                  🔒 El administrador configurador no puede ser modificado
                </HelperText>

                <Divider style={styles.divider} />
              </View>
            )}

            {/* Sección: Identificadores (bloqueados en edición) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                🔑 Identificadores {isEdit && '(No modificables)'}
              </Text>

              <TextInput
                label="Tipo *"
                mode="outlined"
                value={type}
                onChangeText={(text) => {
                  setType(text);
                  if (errors.type) setErrors({ ...errors, type: '' });
                }}
                style={styles.input}
                disabled={isEdit}
                placeholder="CONFIG, DESCUENTOS, TARIFAS, etc."
                error={!!errors.type}
              />
              {!!errors.type && (
                <HelperText type="error" visible={!!errors.type}>
                  {errors.type}
                </HelperText>
              )}

              <TextInput
                label="Clave *"
                mode="outlined"
                value={clave}
                onChangeText={(text) => {
                  setClave(text);
                  if (errors.clave) setErrors({ ...errors, clave: '' });
                }}
                style={styles.input}
                disabled={isEdit}
                placeholder="UYU, TARJETA_CUP_123, etc."
                error={!!errors.clave}
              />
              {!!errors.clave && (
                <HelperText type="error" visible={!!errors.clave}>
                  {errors.clave}
                </HelperText>
              )}

              {isEdit && (
                <HelperText type="info" visible>
                  ℹ️ Tipo y Clave no se pueden modificar para mantener la integridad del sistema
                </HelperText>
              )}
            </View>

            <Divider style={styles.divider} />

            {/* Sección: Contenido (siempre editable) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📝 Contenido</Text>

              <TextInput
                label="Valor"
                mode="outlined"
                value={valor}
                onChangeText={setValor}
                style={styles.input}
                placeholder="Ingrese el valor asociado a la clave"
                multiline
                numberOfLines={2}
              />

              <TextInput
                label="Comentario"
                mode="outlined"
                value={comentario}
                onChangeText={setComentario}
                style={styles.input}
                placeholder="Descripción o notas adicionales (opcional)"
                multiline
                numberOfLines={3}
              />
            </View>

            <Divider style={styles.divider} />

            {/* Sección: Configuración */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚙️ Configuración</Text>

              {/* ✅ MODIFICADO: Admin ID solo editable en creación */}
              {!isEdit && (
                <>
                  <TextInput
                    label="ID Administrador *"
                    mode="outlined"
                    value={idAdminConfigurado}
                    onChangeText={(text) => {
                      setIdAdminConfigurado(text);
                      if (errors.idAdmin) setErrors({ ...errors, idAdmin: '' });
                    }}
                    style={styles.input}
                    placeholder="ID del usuario administrador"
                    error={!!errors.idAdmin}
                    left={<TextInput.Icon icon="account-key" />}
                  />
                  {!!errors.idAdmin && (
                    <HelperText type="error" visible={!!errors.idAdmin}>
                      {errors.idAdmin}
                    </HelperText>
                  )}
                  <HelperText type="info" visible>
                    💡 Por defecto se usa tu ID de usuario actual
                  </HelperText>
                </>
              )}

              {/* Switch Activo */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Estado Activo</Text>
                  <Text style={styles.switchHelper}>
                    {active ? '✅ La propiedad está habilitada' : '🔒 La propiedad está deshabilitada'}
                  </Text>
                </View>
                <Switch 
                  value={active} 
                  onValueChange={setActive}
                  color="#28a745"
                />
              </View>
            </View>

          </ScrollView>
        </Dialog.ScrollArea>

        <Divider />

        <Dialog.Actions style={styles.dialogActions}>
          {isEdit && isAdmin && (
            <Button 
              onPress={handleDelete} 
              textColor="#dc3545" 
              disabled={loading}
              icon="delete"
            >
              Eliminar
            </Button>
          )}
          <View style={{ flex: 1 }} />
          <Button 
            onPress={onDismiss} 
            disabled={loading}
            mode="outlined"
          >
            Cancelar
          </Button>
          <Button 
            mode="contained" 
            onPress={handleSave} 
            loading={loading} 
            disabled={loading}
            icon={isEdit ? "content-save" : "plus"}
            style={{ marginLeft: 8 }}
          >
            {isEdit ? 'Guardar' : 'Crear'}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxWidth: 650,
    alignSelf: 'center',
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  section: {
    marginVertical: 8,
  },
  auditSection: {
    marginBottom: 8,
    padding: 12,
    backgroundColor: 'rgba(98, 0, 238, 0.05)',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    // color: '#333',
  },
  input: {
    marginBottom: 4,
  },
  divider: {
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: '600',
    marginRight: 8,
    fontSize: 13,
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    color: '#666',
  },
  adminChip: {
    backgroundColor: '#6200ee',
  },
  adminChipLocked: {
    backgroundColor: '#666',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 8,
    marginTop: 8,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  switchHelper: {
    fontSize: 12,
    color: '#666',
  },
  dialogActions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});

export default PropertyDialog;
