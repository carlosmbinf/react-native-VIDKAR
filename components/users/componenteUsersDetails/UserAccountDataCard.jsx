import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { Card, Title, Text, Button, TextInput, Switch } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { StyleSheet } from 'react-native';
import Meteor from '@meteorrn/core';

const UserAccountDataCard = ({ item, navigation }) => {
  const [edit, setEdit] = useState(false);
  const [username, setUsername] = useState(item?.username || '');
  const [email, setEmail] = useState(item?.emails?.[0]?.address || '');

  return (
    <Card elevation={12} style={styles.cards}>
      {edit ? (
        <Card.Content>
          <View style={styles.element}>
            <Title style={styles.title}>{'Datos de Usuario'}</Title>

            <Text style={styles.data}>
              <MaterialCommunityIcons
                name="shield-account"
                size={26}
              />{' '}
              {Meteor.user().username == 'carlosmbinf' ? (
                <Switch
                  value={item.profile && item.profile.role == 'admin'}
                  onValueChange={() =>
                    Meteor.users.update(item._id, {
                      $set: {
                        'profile.role':
                          item.profile.role == 'admin' ? 'user' : 'admin',
                      },
                    })
                  }
                />
              ) : (
                item.profile && item.profile.role
              )}
            </Text>
            <TextInput
              require
              mode="outlined"
              value={username}
              onChangeText={setUsername}
              label={'UserName'}
              textContentType="username"
              placeholderTextColor={Colors.darker}
              style={{
                height: 44,
                marginBottom: 10,
              }}
            />
            {Meteor.user().profile.role == 'admin' ? (
              <TextInput
                require
                mode="outlined"
                value={email}
                onChangeText={setEmail}
                label={'Email'}
                textContentType="emailAddress"
                placeholderTextColor={Colors.darker}
                style={{
                  height: 44,
                  marginBottom: 10,
                }}
              />
            ) : (
              <Text style={styles.data}>
                <MaterialCommunityIcons name="email" size={26} />{' '}
                {item.emails[0].address}
              </Text>
            )}
          </View>
        </Card.Content>
      ) : (
        <Card.Content>
          <View style={styles.element}>
            <Title style={styles.title}>{'Datos de Usuario'}</Title>
            <Text style={styles.data}>
              <MaterialCommunityIcons name="shield-account" size={20} />{' '}
              {item.profile && item.profile.role}
            </Text>
            <Text style={styles.data}>
              <MaterialCommunityIcons name="account" size={20} />{' '}
              {item.username}
            </Text>
            <Text style={styles.data}>
              <MaterialCommunityIcons name="email" size={20} />{' '}
              {item.emails && item.emails[0].address}
            </Text>
          </View>
        </Card.Content>
      )}
      {!edit ? (
        <Card.Actions style={{justifyContent: 'space-around'}}>
          <Button onPress={() => setEdit(true)}>
            <MaterialIcons name="edit" size={30} />
          </Button>
        </Card.Actions>
      ) : (
        <Card.Actions style={{justifyContent: 'space-around'}}>
          <Button onPress={() => setEdit(false)}>
            <MaterialIcons name="cancel" size={30} />
          </Button>
          <Button
            onPress={() => {
              email != '' && username != ''
                ? (Meteor.users.update(item._id, {
                    $set: {
                      emails: [
                        {
                          address: email,
                          username: username,
                        },
                      ],
                    },
                  }),
                  Alert.alert(
                    'Info!!!',
                    'Se Cambio el Correo y el Usuario correctamente!!!',
                  ))
                : (email != '' &&
                    (Meteor.users.update(item._id, {
                      $set: {emails: [{address: email}]},
                    }),
                    Alert.alert(
                      'Info!!!',
                      'Se Cambio el Correo correctamente!!!',
                    )),
                  username != '' &&
                    (Meteor.users.update(item._id, {
                      $set: {username: username},
                    }),
                    Alert.alert(
                      'Info!!!',
                      'Se Cambio el usuario correctamente!!!',
                    )),
                  email != '' &&
                    username != '' &&
                    item._id == Meteor.userId() &&
                    (Meteor.logut(),
                    navigation.navigate('Loguin')));
            }}>
            <MaterialIcons name="save" size={30} />
          </Button>
        </Card.Actions>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  cards: {
    marginBottom: 20,
    borderRadius: 20,
  },
  element: {
    fontSize: 12,
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
    paddingBottom: 5,
  },
  data: {
    padding: 3,
  },
});

export default UserAccountDataCard;
