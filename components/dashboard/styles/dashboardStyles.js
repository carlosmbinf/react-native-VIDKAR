import { StyleSheet, Platform } from 'react-native';

// Estilos para el contenedor principal del Dashboard
export const dashboardStyles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor controlado por React Native Paper theme
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        minHeight: 400,
    },
    loadingText: {
        // color controlado por React Native Paper theme
        fontSize: 16,
        marginTop: 16,
        opacity: 0.7,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 30,
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        // color controlado por React Native Paper theme
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 15,
        // color controlado por React Native Paper theme
        fontWeight: '500',
        opacity: 0.7,
    },
    kpiContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20, // Incrementado de 16 a 20 para más margen
        paddingVertical: 8,
        gap: 12,
    },
    segmentedContainer: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
});

// Estilos para KPICard
export const kpiCardStyles = StyleSheet.create({
    card: {
        flex: 1,
        minHeight: 140,
        borderRadius: 16,
        overflow: 'hidden',
        marginHorizontal: 10, // Añadido para evitar corte de sombras
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                // elevation: 8,
            },
        }),
    },
    gradient: {
        // padding: 12, // Incrementado de 10 a 12 para más espacio interno
        minHeight: 140,
        justifyContent: 'space-between',
        overflow: '',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    trendChip: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        height: 40,
    },
    trendText: {
        fontSize: 11,
        color: '#fff',
    },
    title: {
        fontSize: 13,
        color: '#ffffffcc',
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    value: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
        flexShrink: 1,
        flexWrap: 'wrap', // Cambiado de 'nowrap' a 'wrap' para permitir saltos de línea si es necesario
        maxWidth: '100%', // Añadido para garantizar que no sobrepase el contenedor
    },
    subtitle: {
        fontSize: 12,
        color: '#ffffffaa',
        fontWeight: '500',
    },
});

// Estilos para CustomSegmentedButtons
export const segmentedButtonsStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'space-around',
    },
    button: {
        flex: 1,
        borderColor: '#4CAF50',
    },
    buttonActive: {
        backgroundColor: '#4CAF50',
    },
    buttonText: {
        fontSize: 12,
    },
    buttonTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

// Estilos para Charts
export const chartStyles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 16,
        // backgroundColor controlado por React Native Paper theme
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    icon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        // color controlado por React Native Paper theme
    },
    chart: {
        borderRadius: 16,
        marginVertical: 8,
    },
});

// Estilos para Statistics Grid
export const statsStyles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 16,
    },
    item: {
        flex: 1,
        minWidth: '45%',
        // backgroundColor aplicado individualmente por componente
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        // borderLeftColor aplicado individualmente por componente
    },
    label: {
        fontSize: 12,
        // color controlado por React Native Paper theme
        marginBottom: 6,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        opacity: 0.7,
    },
    value: {
        fontSize: 20,
        fontWeight: 'bold',
        // color controlado por React Native Paper theme
        flexShrink: 1,
    },
});

// Estilos para ChartSkeleton
export const chartSkeletonStyles = StyleSheet.create({
    container: {
        width: '90%',
        height: 200,
        // backgroundColor controlado por React Native Paper theme
        borderRadius: 16,
        padding: 20,
        marginTop: 20,
        justifyContent: 'center',
    },
    line: {
        height: 12,
        // backgroundColor controlado por React Native Paper theme
        borderRadius: 6,
        width: '100%',
        opacity: 0.3,
    },
    lineShort: {
        width: '80%',
        marginTop: 12,
    },
    lineShorter: {
        width: '60%',
        marginTop: 12,
    },
});
