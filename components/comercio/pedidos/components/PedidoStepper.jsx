import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Componente de stepper para mostrar el progreso del pedido
 * @param {Number} currentStep - Paso actual (1-5)
 * @param {Boolean} isCanceled - Si el pedido está cancelado
 */
const PedidoStepper = ({ currentStep, isCanceled }) => {
  const steps = [
    { key: 1, label: 'Preparando', icon: 'chef-hat' },
    { key: 2, label: 'Cadete en local', icon: 'storefront' },
    { key: 3, label: 'En camino', icon: 'motorbike' },
    { key: 4, label: 'En destino', icon: 'map-marker-check' },
    { key: 5, label: 'Entregado', icon: 'check-circle' },
  ];

//   if (isCanceled) {
//     return (
//       <View style={styles.canceledContainer}>
//         <MaterialCommunityIcons name="close-circle" size={32} color="#D32F2F" />
//         <Text variant="titleMedium" style={styles.canceledText}>
//           Pedido Cancelado
//         </Text>
//       </View>
//     );
//   }

  return (
    <View style={styles.stepperContainer}>
      {steps.map((step, index) => {
        const isActive = currentStep >= step.key;
        const isLast = index === steps.length - 1;

        return (
          <View key={step.key} style={styles.stepWrapper}>
            <View style={styles.stepCircleContainer}>
              <Surface
                style={[
                  styles.stepCircle,
                  isActive && styles.stepCircleActive,
                  currentStep === step.key && styles.stepCircleCurrent
                ]}
                elevation={isActive ? 2 : 0}
              >
                <MaterialCommunityIcons
                  name={step.icon}
                  size={20}
                  color={isActive ? '#FFFFFF' : '#9E9E9E'}
                />
              </Surface>

              {!isLast && (
                <View
                  style={[
                    styles.stepConnector,
                    isActive && currentStep > step.key && styles.stepConnectorActive
                  ]}
                />
              )}
            </View>

            <Text
              variant="bodySmall"
              style={[
                styles.stepLabel,
                isActive && styles.stepLabelActive,
                currentStep === step.key && styles.stepLabelCurrent
              ]}
              numberOfLines={2}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 16,
    zIndex: 1000,
  },
  stepWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  stepCircleContainer: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  stepCircleActive: {
    backgroundColor: '#FF6F00',
    borderColor: '#FF6F00',
  },
  stepCircleCurrent: {
    backgroundColor: '#FF8F00',
    borderColor: '#FF8F00',
    transform: [{ scale: 1.1 }],
  },
  stepConnector: {
    position: 'absolute',
    top: 20,
    left: '20%',
    width: "60%",
    height: 2,
    backgroundColor: '#E0E0E0',
    transform: [{ translateX: 20 }],
  },
  stepConnectorActive: {
    backgroundColor: '#FF6F00',
  },
  stepLabel: {
    fontSize: 10,
    textAlign: 'center',
    color: '#9E9E9E',
    paddingHorizontal: 4,
  },
  stepLabelActive: {
    // color: '#424242',
    fontWeight: '600',
  },
  stepLabelCurrent: {
    color: '#FF6F00',
    fontWeight: 'bold',
  },
  canceledContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  canceledText: {
    marginLeft: 12,
    color: '#D32F2F',
    fontWeight: 'bold',
  },
});

export default PedidoStepper;
