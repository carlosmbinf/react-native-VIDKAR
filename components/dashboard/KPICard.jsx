import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { formatLargeNumber, getDynamicFontSize } from './utils/formatUtils';
import { kpiCardStyles } from './styles/dashboardStyles';

/**
 * Componente de KPI Card animado con gradientes
 * @param {string} title - Título del KPI
 * @param {number|string} value - Valor del KPI
 * @param {string} subtitle - Subtítulo opcional
 * @param {string} icon - Nombre del ícono de MaterialCommunityIcons
 * @param {string} color - Color del gradiente (hex)
 * @param {number} trend - Porcentaje de tendencia (positivo/negativo)
 * @param {number} delay - Delay de animación en ms
 * @param {boolean} isLargeNumber - Si debe aplicar formato de número grande
 */
const KPICard = ({ 
    title, 
    value, 
    subtitle, 
    icon, 
    color, 
    trend, 
    delay = 0, 
    isLargeNumber = false 
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                delay,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                delay,
                useNativeDriver: true,
            })
        ]).start();
    }, [delay]);

    const displayValue = isLargeNumber ? formatLargeNumber(value) : value;
    const fontSize = getDynamicFontSize(displayValue);

    return (
        <Animated.View style={[
            kpiCardStyles.card,
            {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
            }
        ]}>
            <LinearGradient
                colors={[color + 'DD', color + '88']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={kpiCardStyles.gradient}
            >
                <View style={kpiCardStyles.header}>
                    <View style={kpiCardStyles.iconContainer}>
                        <Icon name={icon} size={25} color="rgba(255,255,255,0.9)" />
                    </View>
                    {trend && (
                        <Chip 
                            icon={trend > 0 ? 'arrow-up' : 'arrow-down'} 
                            style={kpiCardStyles.trendChip}
                            textStyle={kpiCardStyles.trendText}
                        >
                            {Math.abs(trend)}%
                        </Chip>
                    )}
                </View>
                <Text style={kpiCardStyles.title}>{title}</Text>
                <Text 
                    style={[kpiCardStyles.value, { fontSize }]}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    minimumFontScale={0.6}
                >
                    {displayValue}
                </Text>
                {subtitle && <Text style={kpiCardStyles.subtitle}>{subtitle}</Text>}
            </LinearGradient>
        </Animated.View>
    );
};

export default KPICard;
