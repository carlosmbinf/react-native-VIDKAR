import React, { useState, useRef } from 'react';
import {
  View,
  Dimensions,
  Animated,
  PanResponder,
  Vibration,
} from 'react-native';
import { Text } from 'react-native-paper';
import { sliderStyles } from '../styles/pedidosStyles';

/**
 * Componente de deslizamiento para confirmar acciones críticas
 * 
 * @param {Function} onConfirm - Callback ejecutado al completar el deslizamiento
 * @param {string} backgroundColor - Color de fondo del slider (default: '#2196F3')
 * @param {string} icon - Icono/emoji a mostrar en el thumb (default: '▶')
 * @param {string} text - Texto instructivo del slider (default: 'Deslizar para confirmar')
 * @param {boolean} disabled - Deshabilita la interacción (default: false)
 * 
 * @example
 * <SlideToConfirm
 *   onConfirm={() => handleAction()}
 *   backgroundColor="#4CAF50"
 *   icon="✓"
 *   text="Deslizar para marcar listo"
 * />
 */
const SlideToConfirm = ({ 
  onConfirm, 
  backgroundColor = '#2196F3',
  icon = '▶',
  text = 'Deslizar para confirmar',
  disabled = false 
}) => {
  const [isSliding, setIsSliding] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // ✅ CORREGIDO: Cálculo preciso para que el thumb llegue exactamente al borde
  const SCREEN_WIDTH = Dimensions.get('window').width;
  const SLIDER_HORIZONTAL_PADDING = SCREEN_WIDTH * 0.18; // padding del actionsContainer (16px × 2)
  const THUMB_SIZE = 52; // Tamaño del thumb
  const TRACK_LEFT_PADDING = 4; // left padding donde inicia el thumb
  const TRACK_RIGHT_PADDING = 4; // right padding donde debe terminar el thumb
  
  // Ancho total disponible del track
  const TRACK_WIDTH = SCREEN_WIDTH - SLIDER_HORIZONTAL_PADDING;
  
  // Recorrido máximo = ancho del track - tamaño del thumb - padding izquierdo - padding derecho
  const MAX_SLIDE = TRACK_WIDTH - THUMB_SIZE - TRACK_LEFT_PADDING - TRACK_RIGHT_PADDING;
  console.log("[SlideToConfirm] SCREEN_WIDTH:", SCREEN_WIDTH);
  console.log("[SlideToConfirm] SLIDER_HORIZONTAL_PADDING:", SLIDER_HORIZONTAL_PADDING);
  console.log("[SlideToConfirm] TRACK_WIDTH:", TRACK_WIDTH);
  console.log("[SlideToConfirm] MAX_SLIDE:", MAX_SLIDE);
    console.log("porciento", 1-SLIDER_HORIZONTAL_PADDING/SCREEN_WIDTH);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      
      onPanResponderGrant: () => {
        setIsSliding(true);
        Vibration.vibrate(10);
      },
      
      onPanResponderMove: (evt, gestureState) => {
        if (disabled) return;
        
        const newValue = Math.max(0, Math.min(gestureState.dx, MAX_SLIDE));
        slideAnim.setValue(newValue);
      },
      
      onPanResponderRelease: (evt, gestureState) => {
        setIsSliding(false);
        
        // ✅ Threshold: 90% del recorrido real
        if (gestureState.dx > MAX_SLIDE * 0.9) {
          Vibration.vibrate([0, 50, 100, 50]);
          
          Animated.spring(slideAnim, {
            toValue: MAX_SLIDE,
            useNativeDriver: false,
            speed: 20,
            bounciness: 0,
          }).start(() => {
            onConfirm();
            setTimeout(() => {
              Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
              }).start();
            }, 500);
          });
        } else {
          Vibration.vibrate(50);
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: false,
            speed: 12,
            bounciness: 8,
          }).start();
        }
      },
    })
  ).current;

  const textOpacity = slideAnim.interpolate({
    inputRange: [0, MAX_SLIDE * 0.3, MAX_SLIDE * 0.7],
    outputRange: [1, 0.8, 0],
  });

  // ✅ NUEVO: Interpolación de color del texto
  // Cambia del color del slider (azul) a blanco a medida que avanza el progreso
  const textColor = slideAnim.interpolate({
    inputRange: [0, MAX_SLIDE * 0.4, MAX_SLIDE],
    outputRange: [backgroundColor, backgroundColor, '#FFFFFF'],
  });

  const trackColor = slideAnim.interpolate({
    inputRange: [0, MAX_SLIDE],
    outputRange: [backgroundColor + '20', backgroundColor + 'FF'],
  });

  return (
    <View style={sliderStyles.sliderContainer}>
      <Animated.View 
        style={[
          sliderStyles.sliderTrack, 
          { 
            backgroundColor: trackColor,
            borderColor: backgroundColor,
          }
        ]}
      >
        <Animated.Text 
          style={[
            sliderStyles.sliderText, 
            { 
            //   opacity: textOpacity,
              color: textColor, // ✅ Usa color interpolado en lugar de estático
            }
          ]}
        >
          {text}
        </Animated.Text>

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            sliderStyles.sliderThumb,
            {
              backgroundColor: backgroundColor,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <Text style={sliderStyles.thumbIcon}>{icon}</Text>
        </Animated.View>

        <Animated.View
          style={[
            sliderStyles.progressIndicator,
            {
              width: slideAnim,
              backgroundColor: backgroundColor + '20',
            },
          ]}
        />
      </Animated.View>
    </View>
  );
};

export default SlideToConfirm;
