import React, { useState } from 'react';
import FontAwesome5Icon from '@expo/vector-icons/FontAwesome5';
import { Appearance, Dimensions, ImageBackground, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { loginScreenStyles as styles } from './Loguin.styles';

const { width: screenWidth } = Dimensions.get('window');
const { height: screenHeight } = Dimensions.get('window');

const Loguin = () => {
  const [isDarkMode] = useState(Appearance.getColorScheme() === 'dark');
  const [isLandscape] = useState(screenWidth > screenHeight);

  const backgroundStyle = {
    minHeight: '100%',
    minWidth: '100%',
    marginTop: isLandscape ? 0 : '5%',
  };

  return (
    <View style={styles.screen}>
      <ImageBackground
        source={require('../files/space-bg-shadowcodex.jpg')}
        style={{ width: '100%', height: '100%', position: 'relative', left: 0, top: 0, zIndex: 0 }}
        resizeMode="cover"
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={isLandscape ? styles.scrollLandscapeContent : undefined}>
          <View style={[backgroundStyle, isLandscape ? styles.mainLandscape : styles.mainPortrait]}>
            <View style={[styles.container, isLandscape && styles.brandLandscape]}>
              <Text style={{ fontSize: 30, color: 'white' }}>
                <FontAwesome5Icon name="house-user" size={100} />
              </Text>
              <Text style={{ fontSize: 30, color: 'white' }}>🅥🅘🅓🅚🅐🅡</Text>
            </View>

            <View style={[styles.container, isLandscape && styles.formLandscape]}>
              <View style={styles.blurCard}>
                <View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: isDarkMode ? 'rgba(10, 18, 32, 0.72)' : 'rgba(255, 255, 255, 0.68)',
                    },
                  ]}
                />
                <View style={styles.blurCardContent}>
                  <Text style={styles.title}>Inicio de Session</Text>
                  <TextInput mode="flat" label="Usuario" disabled style={styles.input} />
                  <TextInput mode="flat" label="Contraseña" secureTextEntry disabled style={styles.input} />
                  <Button mode="contained" disabled>
                    Iniciar Sessión
                  </Button>
                  <View style={{ height: 12 }} />
                  <Text style={styles.altText}>O</Text>
                  <View style={{ height: 10 }} />
                  <Button mode="outlined" icon="google" disabled>
                    Entrar con Google
                  </Button>
                  <View style={{ height: 10 }} />
                  <Text style={styles.statusText}>Vista web segura del login legacy</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default Loguin;