import React, { useState } from 'react';
import { View } from 'react-native';
import { Card, Title, Button, TextInput } from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { StyleSheet } from 'react-native';
import Meteor from '@meteorrn/core';

const UserPasswordChangeCard = ({ item }) => {
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');

  return (
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
          placeholderTextColor={Colors.darker}
          style={{
            height: 44,
            marginBottom: 10,
          }}
        />
        <TextInput
          mode="outlined"
          value={repeatPassword}
          onChangeText={setRepeatPassword}
          label={'Repite la Contraseña'}
          textContentType="password"
          keyboardType="password"
          secureTextEntry={true}
          placeholderTextColor={Colors.darker}
          style={{
            height: 44,
            marginBottom: 10,
          }}
        />
      </Card.Content>
      <Card.Actions style={{justifyContent: 'space-around'}}>
        <Button onPress={() => navigation.setParams({ edit: false })}>
          <MaterialIcons name="cancel" size={30} />
        </Button>
        <Button
          onPress={() => {
            if (password !== repeatPassword) {
              alert('Las contraseñas no coinciden');
              return;
            }
            Meteor.call(
              'changePasswordServer',
              item._id,
              Meteor.userId(),
              password,
              (error, result) => {
                if (error) {
                  alert(error.message);
                } else {
                  alert('Contraseña Cambiada Correctamente');
                }
              },
            );
          }}>
          <MaterialIcons name="save" size={30} />
        </Button>
      </Card.Actions>
    </Card>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    textAlign: 'center',
    paddingBottom: 5,
  },
});

export default UserPasswordChangeCard;
