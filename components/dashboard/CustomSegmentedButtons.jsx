import React from 'react';
import { View } from 'react-native';
import { Chip } from 'react-native-paper';
import { segmentedButtonsStyles } from './styles/dashboardStyles';

/**
 * Componente de Tabs personalizados usando Chips
 * Compatible con React Native Paper v4 (SegmentedButtons es v5+)
 * @param {string} value - Valor actualmente seleccionado
 * @param {Function} onValueChange - Callback cuando cambia la selección
 * @param {Array} buttons - Array de objetos con {value, label, icon}
 */
const CustomSegmentedButtons = ({ value, onValueChange, buttons }) => {
    return (
        <View style={segmentedButtonsStyles.container}>
            {buttons.map((button) => (
                <Chip
                    key={button.value}
                    selected={value === button.value}
                    onPress={() => onValueChange(button.value)}
                    icon={button.icon}
                    mode={value === button.value ? 'flat' : 'outlined'}
                    style={[
                        segmentedButtonsStyles.button,
                        value === button.value && segmentedButtonsStyles.buttonActive
                    ]}
                    textStyle={[
                        segmentedButtonsStyles.buttonText,
                        value === button.value && segmentedButtonsStyles.buttonTextActive
                    ]}
                >
                    {button.label}
                </Chip>
            ))}
        </View>
    );
};

export default CustomSegmentedButtons;
