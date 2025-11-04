import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Platform, ScrollView, Keyboard } from 'react-native';
import { Card, Button, Text, Portal, Dialog, Paragraph, TextInput } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Meteor from '@meteorrn/core';

const DeleteAccountCard = ({ userId, username, navigation }) => {
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const showConfirmDialog = () => {
    setDialogVisible(true);
    setConfirmText('');
  };

  const hideDialog = () => {
    Keyboard.dismiss();
    setDialogVisible(false);
    setConfirmText('');
  };

  const handleDeleteAccount = () => {
    if (confirmText.trim().toUpperCase() !== 'ELIMINAR') {
      Alert.alert(
        '⚠️ Verificación Incorrecta',
        'Por favor escriba "ELIMINAR" exactamente como se indica para confirmar.',
        [{ text: 'Entendido', style: 'cancel' }]
      );
      return;
    }

    Keyboard.dismiss();
    hideDialog();
    setLoading(true);

    Meteor.call('admin.eliminarUsuario', userId, (error, result) => {
      setLoading(false);

      if (error) {
        console.error('Error al eliminar usuario:', error);
        Alert.alert(
          '❌ Error',
          error.reason || error.message || 'No se pudo eliminar la cuenta. Intente nuevamente.',
          [{ text: 'Cerrar', style: 'cancel' }]
        );
        return;
      }

      const { removed } = result || {};
      const totalRemoved = (removed?.logs || 0) + (removed?.registerDataUsers || 0) + (removed?.mensajes || 0);

      Alert.alert(
        '✅ Cuenta Eliminada',
        `Su cuenta "${username}" ha sido eliminada permanentemente.\n\n` +
        `📊 Datos eliminados:\n` +
        `• Logs: ${removed?.logs || 0}\n` +
        `• Registros: ${removed?.registerDataUsers || 0}\n` +
        `• Mensajes: ${removed?.mensajes || 0}\n` +
        `• Total: ${totalRemoved} elementos`,
        [
          {
            text: 'Entendido',
            onPress: () => {
              Meteor.logout(() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              });
            },
          },
        ],
        { cancelable: false }
      );
    });
  };

  return (
    <Card style={styles.card} elevation={3}>
      <Card.Content>
        <View style={styles.header}>
          <MaterialCommunityIcons name="account-remove" size={28} color="#D32F2F" />
          <Text style={styles.title}>Zona Peligrosa</Text>
        </View>

        <View style={styles.warningBox}>
          <MaterialCommunityIcons name="alert-circle" size={20} color="#F57C00" />
          <Text style={styles.warningText}>
            Esta acción es <Text style={styles.bold}>irreversible</Text>
          </Text>
        </View>

        <Paragraph style={styles.description}>
          Al eliminar su cuenta se borrarán <Text style={styles.bold}>permanentemente</Text>:
        </Paragraph>

        <View style={styles.listContainer}>
          <View style={styles.listItem}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#666" />
            <Text style={styles.listText}>Todos sus datos personales</Text>
          </View>
          <View style={styles.listItem}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#666" />
            <Text style={styles.listText}>Historial de consumo y registros</Text>
          </View>
          <View style={styles.listItem}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#666" />
            <Text style={styles.listText}>Mensajes y conversaciones</Text>
          </View>
          <View style={styles.listItem}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#666" />
            <Text style={styles.listText}>Archivos y configuraciones</Text>
          </View>
        </View>

        <Button
          mode="contained"
          onPress={showConfirmDialog}
          loading={loading}
          disabled={loading}
          buttonColor="#D32F2F"
          icon="delete-forever"
          style={styles.deleteButton}
          labelStyle={styles.deleteButtonLabel}
        >
          {loading ? 'Eliminando...' : 'Eliminar Mi Cuenta'}
        </Button>
      </Card.Content>

      <Portal>
        <Dialog 
          visible={dialogVisible} 
          onDismiss={hideDialog} 
          style={[
            styles.dialog,
            keyboardHeight > 0 && {
              marginTop: Platform.OS === 'ios' 
                ? -keyboardHeight   // Subir 50% de la altura del teclado
                : -keyboardHeight  // Subir 35% en Android
            }
          ]}
        >
          <Dialog.Title style={styles.dialogTitle}>
            🛑 ¿Está Completamente Seguro?
          </Dialog.Title>
          
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Dialog.Content>
              <View style={styles.dialogWarning}>
                <MaterialCommunityIcons name="alert-octagon" size={40} color="#D32F2F" />
                <Text style={styles.dialogWarningText}>
                  Esta acción NO se puede deshacer
                </Text>
              </View>

              <Paragraph style={styles.dialogDescription}>
                Su cuenta <Text style={styles.bold}>"{username}"</Text> y todos los datos asociados serán 
                <Text style={styles.bold}> eliminados permanentemente</Text>.
              </Paragraph>

              <Paragraph style={styles.dialogDescription}>
                Para confirmar, escriba <Text style={styles.codeText}>ELIMINAR</Text> en el campo:
              </Paragraph>

              <TextInput
                mode="outlined"
                placeholder="Escriba ELIMINAR aquí"
                value={confirmText}
                onChangeText={setConfirmText}
                autoCapitalize="characters"
                autoCorrect={false}
                style={styles.input}
                outlineColor="#D32F2F"
                activeOutlineColor="#D32F2F"
                error={confirmText && confirmText.trim().toUpperCase() !== 'ELIMINAR'}
                returnKeyType="done"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  if (confirmText.trim().toUpperCase() === 'ELIMINAR') {
                    handleDeleteAccount();
                  }
                }}
              />

              {confirmText && confirmText.trim().toUpperCase() !== 'ELIMINAR' && (
                <View style={styles.errorBox}>
                  <MaterialCommunityIcons name="close-circle" size={16} color="#D32F2F" />
                  <Text style={styles.errorText}>
                    Debe escribir exactamente "ELIMINAR"
                  </Text>
                </View>
              )}
            </Dialog.Content>
          </ScrollView>

          <Dialog.Actions style={styles.dialogActions}>
            <Button
              mode="text"
              onPress={hideDialog}
              textColor="#666"
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleDeleteAccount}
              buttonColor="#D32F2F"
              disabled={confirmText.trim().toUpperCase() !== 'ELIMINAR'}
            >
              Eliminar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginLeft: 12,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#F57C00',
  },
  warningText: {
    fontSize: 14,
    color: '#E65100',
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: '#777',
    marginBottom: 12,
    lineHeight: 20,
  },
  listContainer: {
    marginBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  listText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  bold: {
    fontWeight: 'bold',
    color: '#D32F2F',
  },
  deleteButton: {
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 24,
    marginLeft: 24,
    marginRight: 24,
  },
  deleteButtonLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  dialog: {
    borderRadius: 16,
    maxWidth: 500,
    alignSelf: 'center',
  },
  scrollView: {
    maxHeight: 250, // Altura fija razonable
  },
  scrollContent: {
    paddingBottom: 8,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D32F2F',
    textAlign: 'center',
    paddingVertical: 10,
  },
  dialogWarning: {
    alignItems: 'center',
    marginBottom: 12,
  },
  dialogWarningText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginTop: 6,
    textAlign: 'center',
  },
  dialogDescription: {
    fontSize: 13,
    color: '#333',
    marginBottom: 10,
    lineHeight: 18,
    textAlign: 'justify',
  },
  input: {
    marginTop: 12,
    marginBottom: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#D32F2F',
    marginLeft: 6,
  },
  dialogActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
});

export default DeleteAccountCard;