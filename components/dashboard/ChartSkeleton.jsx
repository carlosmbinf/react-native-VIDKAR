import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { chartSkeletonStyles } from './styles/dashboardStyles';

/**
 * Componente de Skeleton Loader con animación de pulso
 * Se muestra mientras los datos del dashboard están cargando
 */
const ChartSkeleton = () => {
    const pulseAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.3,
                    duration: 1000,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, []);

    return (
        <Animated.View style={[chartSkeletonStyles.container, { opacity: pulseAnim }]}>
            <View style={chartSkeletonStyles.line} />
            <View style={[chartSkeletonStyles.line, chartSkeletonStyles.lineShort]} />
            <View style={[chartSkeletonStyles.line, chartSkeletonStyles.lineShorter]} />
        </Animated.View>
    );
};

export default ChartSkeleton;
