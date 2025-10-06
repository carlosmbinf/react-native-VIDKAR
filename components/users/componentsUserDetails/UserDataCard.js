import React, {memo, useState, useEffect, useCallback} from 'react';
import {View, Alert} from 'react-native';
import {Card, Title, Text, Button, TextInput, Switch, Snackbar, Avatar, Chip, Divider, HelperText, IconButton} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Meteor from '@meteorrn/core';

// Utils añadidos (reutilizables a futuro)
const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const hashColor = (seed = '') => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  const c = (h & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

const formatDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleString('es-ES', {hour12: false});
  } catch {
    return '';
  }
};

const UserDataCard = ({item, styles, edit, setEdit, navigation}) => {
  const [form, setForm] = useState({username: '', email: ''});
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({visible: false, message: '', type: 'info'});
  const [focus, setFocus] = useState(null); // campo enfocado

  useEffect(() => {
    if (edit && item) {
      setForm({
        username: item?.username || '',
        email: item?.emails?.[0]?.address || '',
      });
      setPassword('');
      setRepeatPassword('');
      setErrors({});
    }
  }, [edit, item]);

  const validate = useCallback(() => {
    const e = {};
    if (form.username && form.username.trim().length < 3) e.username = 'Mínimo 3 caracteres';
    if (form.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) e.email = 'Formato de email inválido';
    }
    if (password || repeatPassword) {
      if (password.length < 8) e.password = 'Mínimo 8 caracteres';
      const complexity =
        /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
      if (!complexity) e.password = 'Debe incluir mayúscula, minúscula y número';
      if (password !== repeatPassword) e.repeatPassword = 'No coincide';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form, password, repeatPassword]);

  useEffect(() => {
    if (edit) validate();
  }, [form, password, repeatPassword, edit, validate]);

  const hasChanges = useCallback(() => {
    if (!item) return false;
    const changedUser = form.username && form.username !== item.username;
    const changedEmail =
      form.email && form.email !== (item?.emails?.[0]?.address || '');
    return changedUser || changedEmail;
  }, [form, item]);

  const onSaveUserInfo = async () => {
    if (!validate()) {
      setFeedback({visible: true, message: 'Corrige los errores antes de guardar', type: 'error'});
      return;
    }
    if (!hasChanges()) {
      setFeedback({visible: true, message: 'Sin cambios que guardar', type: 'info'});
      return;
    }
    try {
      setSaving(true);
      const $set = {};
      if (form.email && form.email !== item?.emails?.[0]?.address) {
        $set.emails = [{address: form.email.trim()}];
      }
      if (form.username && form.username !== item?.username) {
        $set.username = form.username.trim();
      }
      if (Object.keys($set).length) {
        Meteor.users.update(item._id, {$set});
      }
      setFeedback({visible: true, message: 'Datos actualizados', type: 'success'});
      if (item._id === Meteor.userId() && ($set.username || $set.emails)) {
        Meteor.logout();
        navigation?.navigate?.('Loguin');
      }
      setEdit(false);
    } catch (err) {
      setFeedback({visible: true, message: 'Error al guardar', type: 'error'});
    } finally {
      setSaving(false);
    }
  };

  const onToggleRole = () => {
    if (Meteor.user()?.username !== 'carlosmbinf') return;
    Alert.alert(
      'Confirmar',
      `¿Cambiar rol a ${item?.profile?.role === 'admin' ? 'user' : 'admin'}?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Sí',
          onPress: () =>
            Meteor.users.update(item._id, {
              $set: {
                'profile.role': item?.profile?.role === 'admin' ? 'user' : 'admin',
              },
            }),
        },
      ],
    );
  };

  const passwordStrength = (() => {
    if (!password) return {label: '', color: undefined};
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) return {label: 'Débil', color: '#d9534f'};
    if (score === 3) return {label: 'Media', color: '#f0ad4e'};
    return {label: 'Fuerte', color: '#5cb85c'};
  })();

  const onChangePassword = () => {
    if (!password && !repeatPassword) {
      setFeedback({visible: true, message: 'Ingresa la nueva contraseña', type: 'info'});
      return;
    }
    if (!validate()) return;
    Meteor.call('changePasswordServer', item._id, Meteor.userId(), password, (error) => {
      if (error) {
        setFeedback({visible: true, message: error.message, type: 'error'});
      } else {
        setFeedback({visible: true, message: 'Contraseña cambiada', type: 'success'});
        setPassword('');
        setRepeatPassword('');
      }
    });
  };

  const changed = {
    username: !!item && form.username !== item?.username && form.username !== '',
    email: !!item && form.email !== (item?.emails?.[0]?.address || '') && form.email !== '',
  };

  const handleCancelEdit = () => {
    if (hasChanges()) {
      Alert.alert(
        'Descartar cambios',
        'Hay cambios sin guardar. ¿Deseas descartarlos?',
        [
          {text: 'Seguir editando', style: 'cancel'},
          {
            text: 'Descartar',
            style: 'destructive',
            onPress: () => {
              setEdit(false);
              setErrors({});
            },
          },
        ],
      );
    } else {
      setEdit(false);
    }
  };

  console.log("item",item);
  return (
    <>
      <Card elevation={12} style={styles.cards} testID="user-data-card">
        <Card.Content>
          <View style={styles.element}>
            {/* Header identidad */}
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
              <Avatar.Text
                size={48}
                label={getInitials(item?.username || item?.profile?.name || 'U')}
                style={{backgroundColor: hashColor(item?.username || item?._id || 'U')}}
              />
              <View style={{marginLeft: 12, flex: 1}}>
                <Title style={[styles.title, {marginBottom: 2}]} numberOfLines={1}>
                  {item?.username || 'Usuario'}
                </Title>
                <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
                  <Chip
                    compact
                    style={{
                      backgroundColor:
                        item?.profile?.role === 'admin' ? '#FFEBEE' : '#E3F2FD',
                    }}
                    textStyle={{
                      color: item?.profile?.role === 'admin' ? '#C62828' : '#1565C0',
                      fontSize: 11,
                    }}
                    icon={item?.profile?.role === 'admin' ? 'shield-crown' : 'account'}>
                    {item?.profile?.role || 'N/R'}
                  </Chip>
                  {/* <Chip
                    compact
                    icon={item?.emails?.[0]?.verified ? 'check-circle' : 'alert-circle'}
                    style={{
                      backgroundColor: item?.emails?.[0]?.verified ? '#E8F5E9' : '#FFF8E1',
                    }}
                    textStyle={{
                      color: item?.emails?.[0]?.verified ? '#2E7D32' : '#FF8F00',
                      fontSize: 11,
                    }}>
                    {item?.emails?.[0]?.verified ? 'Email verificado' : 'Sin verificar'}
                  </Chip> */}
                  {item?.createdAt && (
                    <Chip compact icon="clock" style={{backgroundColor: '#F3E5F5'}} textStyle={{fontSize: 11, color: '#6A1B9A'}}>
                      Alta: {formatDate(item?.createdAt).split(' ')[0]}
                    </Chip>
                  )}
                </View>
              </View>
              {!edit && (
                <IconButton
                  icon="pencil"
                  onPress={() => setEdit(true)}
                  accessibilityLabel="Editar usuario"
                  testID="edit-user-btn"
                />
              )}
            </View>

            <Divider style={{marginVertical: 6}} />

            {edit ? (
              <>
                {/* Sección: Identidad */}
                <Text style={{fontSize: 13, opacity: 0.6, marginBottom: 4}}>Identidad</Text>
                <TextInput
                  mode="outlined"
                  value={form.username}
                  onFocus={() => setFocus('username')}
                  onBlur={() => setFocus(null)}
                  onChangeText={(v) => setForm((p) => ({...p, username: v}))}
                  label="Usuario"
                  autoCapitalize="none"
                  error={!!errors.username}
                  disabled={saving}
                  outlineColor={changed.username ? '#1976D2' : undefined}
                  right={
                    changed.username ? (
                      <TextInput.Icon icon="circle-edit-outline" forceTextInputFocus={false} />
                    ) : undefined
                  }
                  style={{height: 48, marginBottom: 2}}
                />
                <HelperText
                  type={errors.username ? 'error' : 'info'}
                  visible={focus === 'username' || !!errors.username}
                  style={{marginBottom: 4}}>
                  {errors.username ? errors.username : 'Mínimo 3 caracteres.'}
                </HelperText>

                {/* Sección: Contacto */}
                <Text style={{fontSize: 13, opacity: 0.6, marginTop: 4, marginBottom: 4}}>
                  Contacto
                </Text>
                {Meteor.user()?.profile?.role === 'admin' ? (
                  <>
                    <TextInput
                      mode="outlined"
                      value={form.email}
                      onFocus={() => setFocus('email')}
                      onBlur={() => setFocus(null)}
                      onChangeText={(v) => setForm((p) => ({...p, email: v}))}
                      label="Email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      error={!!errors.email}
                      disabled={saving}
                      outlineColor={changed.email ? '#1976D2' : undefined}
                      right={
                        changed.email ? (
                          <TextInput.Icon icon="circle-edit-outline" forceTextInputFocus={false} />
                        ) : undefined
                      }
                      style={{height: 48, marginBottom: 2}}
                    />
                    <HelperText
                      type={errors.email ? 'error' : 'info'}
                      visible={focus === 'email' || !!errors.email}
                      style={{marginBottom: 4}}>
                      {errors.email ? errors.email : 'Formato válido: usuario@dominio'}
                    </HelperText>
                  </>
                ) : (
                  <Text style={styles.data}>
                    <MaterialCommunityIcons name="email" size={20} /> {item?.emails?.[0]?.address}
                  </Text>
                )}

                {/* Sección: Rol */}
                <Text style={{fontSize: 13, opacity: 0.6, marginTop: 8, marginBottom: 4}}>
                  Rol
                </Text>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Text style={[styles.data, {flex: 1}]}>
                    <MaterialCommunityIcons name="shield-account" size={22} />{' '}
                    {item?.profile?.role}
                  </Text>
                  {Meteor.user()?.username === 'carlosmbinf' && (
                    <Switch
                      value={item?.profile?.role === 'admin'}
                      onValueChange={onToggleRole}
                      disabled={saving}
                    />
                  )}
                </View>

                <View
                  style={{
                    justifyContent: 'space-around',
                    flexDirection: 'row',
                    marginTop: 14,
                  }}>
                  <Button
                    mode="text"
                    onPress={handleCancelEdit}
                    disabled={saving}
                    testID="cancel-edit-btn"
                    icon="close-circle-outline">
                    Cancelar
                  </Button>
                  <Button
                    mode="contained"
                    onPress={onSaveUserInfo}
                    loading={saving}
                    icon="content-save-outline"
                    disabled={saving || !hasChanges() || Object.keys(errors).length > 0}
                    testID="save-user-btn">
                    Guardar
                  </Button>
                </View>
              </>
            ) : (
              <>
                {/* Vista lectura optimizada */}
                <View style={{marginTop: 4}}>
                  <Text style={styles.data}>
                    <MaterialCommunityIcons name="account" size={18} /> {item?.username}
                  </Text>
                  <Text style={styles.data}>
                    <MaterialCommunityIcons name="email" size={18} /> {item?.emails?.[0]?.address}
                  </Text>
                  {item?.createdAt && (
                    <Text style={[styles.data, {opacity: 0.7}]}>
                      <MaterialCommunityIcons name="calendar" size={16} /> Alta:{' '}
                      {formatDate(item?.createdAt)}
                    </Text>
                  )}
                </View>
              </>
            )}
          </View>
        </Card.Content>
      </Card>

      {edit && (
        <Card
          style={{
            width: '100%',
            padding: 10,
            elevation: 12,
            borderRadius: 20,
            marginBottom: 20,
          }}>
          <Card.Content>
            <Title style={styles.title}>{'Cambiar Contraseña:'}</Title>
            <TextInput
              mode="outlined"
              value={password}
              onChangeText={setPassword}
              label="Contraseña"
              secureTextEntry={!showPassword}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword((s) => !s)}
                />
              }
              error={!!errors.password}
              disabled={saving}
              style={{height: 48, marginBottom: 4}}
            />
            {passwordStrength.label !== '' && (
              <Text style={{color: passwordStrength.color, marginBottom: 4}}>
                Fortaleza: {passwordStrength.label}
              </Text>
            )}
            {errors.password && (
              <Text style={{color: '#d9534f', marginBottom: 6}}>{errors.password}</Text>
            )}
            <TextInput
              mode="outlined"
              value={repeatPassword}
              onChangeText={setRepeatPassword}
              label="Repite la Contraseña"
              secureTextEntry={!showRepeatPassword}
              right={
                <TextInput.Icon
                  icon={showRepeatPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowRepeatPassword((s) => !s)}
                />
              }
              error={!!errors.repeatPassword}
              disabled={saving}
              style={{height: 48, marginBottom: 4}}
            />
            {errors.repeatPassword && (
              <Text style={{color: '#d9534f', marginBottom: 6}}>{errors.repeatPassword}</Text>
            )}
          </Card.Content>
          <Card.Actions style={{justifyContent: 'space-around'}}>
            <Button onPress={() => setEdit(false)} disabled={saving}>
              <MaterialCommunityIcons name="cancel" size={30} />
            </Button>
            <Button
              onPress={onChangePassword}
              disabled={
                saving ||
                !password ||
                !repeatPassword ||
                Object.keys(errors).some((k) => k.includes('password'))
              }>
              <MaterialCommunityIcons name="content-save" size={30} />
            </Button>
          </Card.Actions>
        </Card>
      )}
      <Snackbar
        visible={feedback.visible}
        onDismiss={() => setFeedback((f) => ({...f, visible: false}))}
        duration={3000}
        style={
          feedback.type === 'error'
            ? {backgroundColor: '#d9534f'}
            : feedback.type === 'success'
            ? {backgroundColor: '#5cb85c'}
            : undefined
        }>
        {feedback.message}
      </Snackbar>
    </>
  );
};

export default memo(UserDataCard);
