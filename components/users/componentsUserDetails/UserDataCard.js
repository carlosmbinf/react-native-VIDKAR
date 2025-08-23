import React, {memo, useMemo, useState} from 'react';
import {View} from 'react-native';
import {Card, Title, Text, Button, TextInput, Switch} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Meteor from '@meteorrn/core';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import {Alert, useColorScheme} from 'react-native';

const UserDataCard = ({item, styles, edit, setEdit, navigation}) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');

  if (!item) return null;

  const onSaveUserInfo = () => {
    const hasEmail = email && email !== '';
    const hasUser = username && username !== '';

    if (hasEmail && hasUser) {
      Meteor.users.update(item._id, {
        $set: {emails: [{address: email, username}]},
      });
      Alert.alert('Info!!!', 'Se Cambio el Correo y el Usuario correctamente!!!');
    } else {
      if (hasEmail) {
        Meteor.users.update(item._id, {$set: {emails: [{address: email}]}});
        Alert.alert('Info!!!', 'Se Cambio el Correo correctamente!!!');
      }
      if (hasUser) {
        Meteor.users.update(item._id, {$set: {username}});
        Alert.alert('Info!!!', 'Se Cambio el usuario correctamente!!!');
      }
    }

    if (hasEmail && hasUser && item._id === Meteor.userId()) {
      Meteor.logout();
      navigation && navigation.navigate && navigation.navigate('Loguin');
    }
  };

  const onToggleRole = () => {
    Meteor.users.update(item._id, {
      $set: {
        'profile.role': item?.profile?.role === 'admin' ? 'user' : 'admin',
      },
    });
  };

  const onChangePassword = () => {
    if (password !== repeatPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }
    Meteor.call(
      'changePasswordServer',
      item._id,
      Meteor.userId(),
      password,
      (error) => {
        if (error) {
          alert(error.message);
        } else {
          alert('Contraseña Cambiada Correctamente');
        }
      },
    );
  };

  return (
    <>
      <Card elevation={12} style={styles.cards}>
        <Card.Content>
          <View style={styles.element}>
            <Title style={styles.title}>{'Datos de Usuario'}</Title>
            {edit ? (
              <>
                <Text style={styles.data}>
                  <MaterialCommunityIcons name="shield-account" size={26} />{' '}
                  {Meteor.user()?.username === 'carlosmbinf' ? (
                    <Switch
                      value={item?.profile?.role === 'admin'}
                      onValueChange={onToggleRole}
                    />
                  ) : (
                    item?.profile?.role
                  )}
                </Text>
                <TextInput
                  mode="outlined"
                  value={username}
                  onChangeText={setUsername}
                  label={'UserName'}
                  textContentType="username"
                  placeholderTextColor={!isDarkMode ? Colors.darker : Colors.lighter}
                  style={{height: 44, marginBottom: 10}}
                />
                {Meteor.user()?.profile?.role === 'admin' ? (
                  <TextInput
                    mode="outlined"
                    value={email}
                    onChangeText={setEmail}
                    label={'Email'}
                    textContentType="emailAddress"
                    placeholderTextColor={!isDarkMode ? Colors.darker : Colors.lighter}
                    style={{height: 44, marginBottom: 10}}
                  />
                ) : (
                  <Text style={styles.data}>
                    <MaterialCommunityIcons name="email" size={26} />{' '}
                    {item?.emails?.[0]?.address}
                  </Text>
                )}
                <View style={{justifyContent: 'space-around', flexDirection: 'row', marginTop: 10}}>
                  <Button onPress={() => setEdit(false)}>
                    <MaterialCommunityIcons name="cancel" size={30} />
                  </Button>
                  <Button onPress={onSaveUserInfo}>
                    <MaterialCommunityIcons name="content-save" size={30} />
                  </Button>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.data}>
                  <MaterialCommunityIcons name="shield-account" size={20} />{' '}
                  {item?.profile?.role}
                </Text>
                <Text style={styles.data}>
                  <MaterialCommunityIcons name="account" size={20} /> {item?.username}
                </Text>
                <Text style={styles.data}>
                  <MaterialCommunityIcons name="email" size={20} /> {item?.emails?.[0]?.address}
                </Text>
                <View style={{justifyContent: 'space-around', flexDirection: 'row', marginTop: 10}}>
                  <Button onPress={() => setEdit(true)}>
                    <MaterialCommunityIcons name="pencil" size={30} />
                  </Button>
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
              label={'Contraseña'}
              textContentType="password"
              keyboardType="password"
              secureTextEntry={true}
              placeholderTextColor={!isDarkMode ? Colors.darker : Colors.lighter}
              style={{height: 44, marginBottom: 10}}
            />
            <TextInput
              mode="outlined"
              value={repeatPassword}
              onChangeText={setRepeatPassword}
              label={'Repite la Contraseña'}
              textContentType="password"
              keyboardType="password"
              secureTextEntry={true}
              placeholderTextColor={!isDarkMode ? Colors.darker : Colors.lighter}
              style={{height: 44, marginBottom: 10}}
            />
          </Card.Content>
          <Card.Actions style={{justifyContent: 'space-around'}}>
            <Button onPress={() => setEdit(false)}>
              <MaterialCommunityIcons name="cancel" size={30} />
            </Button>
            <Button onPress={onChangePassword}>
              <MaterialCommunityIcons name="content-save" size={30} />
            </Button>
          </Card.Actions>
        </Card>
      )}
    </>
  );
};

export default memo(UserDataCard);
