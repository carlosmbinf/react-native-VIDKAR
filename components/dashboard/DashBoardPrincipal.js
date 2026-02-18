import React, { useEffect, useState, useRef } from 'react';
import { 
    View, 
    Dimensions, 
    ScrollView, 
    Animated,
    RefreshControl
} from 'react-native';
import Meteor, { Mongo, withTracker } from '@meteorrn/core';
import {
    LineChart,
    PieChart,
    BarChart,
} from "react-native-chart-kit";
import { 
    Text, 
    Card, 
    Chip, 
    ActivityIndicator,
    useTheme,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import moment from 'moment';
import 'moment/locale/es';

// Importar componentes separados
import KPICard from './KPICard';
import ChartSkeleton from './ChartSkeleton';
import CustomSegmentedButtons from './CustomSegmentedButtons';
import { formatLargeNumber, detectPeriodType } from './utils/formatUtils';
import { dashboardStyles, chartStyles, statsStyles } from './styles/dashboardStyles';
import { VentasCollection } from '../collections/collections';

moment.locale('es');

const DashBoardPrincipal = ({ type }) => {
    const theme = useTheme();
    const [width, setWidth] = useState(Dimensions.get("window").width);
    const [height, setHeight] = useState(Dimensions.get("window").height);
    const [x, setX] = useState([]);
    const [y, setY] = useState([]);
    const [yProxy, setYProxy] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedView, setSelectedView] = useState('general');
    const [periodInfo, setPeriodInfo] = useState({
        type: 'DESCONOCIDO',
        label: 'Cargando...',
        icon: 'calendar-blank',
        color: '#757575',
        description: ''
    });
    const [kpiData, setKpiData] = useState({
        totalUsers: 0,
        activeUsers: 0,
        totalConsumo: 0,
        totalVentas: 0
    });
    
    // Estados para datos de ventas
    const [ventasData, setVentasData] = useState([]);
    const [ventasLabels, setVentasLabels] = useState([]);
    const [totalVendido, setTotalVendido] = useState([]);
    const [gananciasAdmin, setGananciasAdmin] = useState([]);
    const [ventasViewMode, setVentasViewMode] = useState('por-dia'); // 'por-dia', 'por-mes'
    const [ventasPorAdmin, setVentasPorAdmin] = useState([]);
    const [adminLabels, setAdminLabels] = useState([]);
    const [totalDeudas, setTotalDeudas] = useState(0);

    const scrollY = useRef(new Animated.Value(0)).current;

    // Obtener usuario actual
    const currentUser = Meteor.user();

    // Función para calcular ventas mensuales
    const fetchVentasData = () => {
        try {
            console.log('📊 [DashboardVentas] Iniciando fetchVentasData...');
            
            Meteor.subscribe('ventas', {}, {
                fields: {
                    adminId: 1,
                    precio: 1,
                    cobrado: 1,
                    createdAt: 1,
                    gananciasAdmin: 1
                }
            });
            
            Meteor.subscribe('user', {}, {
                fields: {
                    _id: 1,
                    'profile.firstName': 1,
                    'profile.lastName': 1,
                    'profile.role': 1
                }
            });

            const ventas = VentasCollection.find({}, {
                fields: {
                    adminId: 1,
                    precio: 1,
                    cobrado: 1,
                    createdAt: 1,
                    gananciasAdmin: 1
                }
            }).fetch();

            console.log(`📈 [DashboardVentas] Ventas encontradas: ${ventas.length}`);

            // ===== 1. DATOS DE 12 MESES (GraphicsLinealVentasXMeses) =====
            const labels12Meses = [];
            const totalVendido12Meses = [];
            const ganancias12Meses = [];

            for (let index = 11; index >= 0; index--) {
                const dateStartMonth = moment().subtract(index, 'month').startOf('month');
                const dateEndMonth = moment().subtract(index, 'month').endOf('month');

                let totalMes = 0;
                let gananciasMes = 0;

                ventas.forEach(venta => {
                    const fechaVenta = moment(venta.createdAt);
                    if (fechaVenta.isBetween(dateStartMonth, dateEndMonth, null, '[]')) {
                        totalMes += venta.precio || 0;
                        gananciasMes += venta.gananciasAdmin || 0;
                    }
                });

                labels12Meses.push(dateStartMonth.format('MMM'));
                totalVendido12Meses.push(totalMes);
                ganancias12Meses.push(gananciasMes);
            }

            setVentasLabels(labels12Meses);
            setTotalVendido(totalVendido12Meses);
            setGananciasAdmin(ganancias12Meses);

            // ===== 2. DATOS DEL MES ACTUAL POR ADMIN (GraphicsLinealMensualVentasyDeudas) =====
            const mesActualStart = moment().startOf('month');
            const mesActualEnd = moment().endOf('month');
            
            console.log(`📅 [DashboardVentas] Calculando datos del mes actual: ${mesActualStart.format('MMMM YYYY')}`);
            
            const admins = Meteor.users.find({ 'profile.role': 'admin' }).fetch();
            const ventasPorAdminMesActual = [];
            const adminLabelsMesActual = [];
            
            // Variables para estadísticas del mes actual
            let totalCobradoMesActual = 0;
            let totalGananciasMesActual = 0;
            let totalDeudasMesActual = 0;
            
            admins.forEach(admin => {
                let totalVendidoAdmin = 0;
                let gananciasAdminMesActual = 0;
                let deudasAdminMesActual = 0;
                
                ventas.forEach(venta => {
                    if (venta.adminId === admin._id) {
                        const fechaVenta = moment(venta.createdAt);
                        
                        // ===== SOLO VENTAS DEL MES ACTUAL =====
                        if (fechaVenta.isBetween(mesActualStart, mesActualEnd, null, '[]')) {
                            totalVendidoAdmin += venta.precio || 0;
                            gananciasAdminMesActual += venta.gananciasAdmin || 0;
                            
                            // Deudas SOLO del mes actual
                            if (!venta.cobrado) {
                                deudasAdminMesActual += venta.precio || 0;
                            }
                        }
                    }
                });
                
                // Acumular totales del mes actual
                totalCobradoMesActual += totalVendidoAdmin;
                totalGananciasMesActual += gananciasAdminMesActual;
                totalDeudasMesActual += deudasAdminMesActual;
                
                // Solo agregar admins con ventas en el mes actual
                if (totalVendidoAdmin > 0) {
                    const nombreAdmin = `${admin.profile?.firstName || ''} ${admin.profile?.lastName || ''}`.trim() || 'Sin nombre';
                    ventasPorAdminMesActual.push({
                        totalVendido: totalVendidoAdmin,
                        ganancias: gananciasAdminMesActual,
                        deudas: deudasAdminMesActual
                    });
                    adminLabelsMesActual.push(nombreAdmin.length > 15 ? nombreAdmin.substring(0, 15) + '...' : nombreAdmin);
                }
            });
            
            setVentasPorAdmin(ventasPorAdminMesActual);
            setAdminLabels(adminLabelsMesActual);

            // ===== 3. DATOS HISTÓRICOS TOTALES (GraphicsLinealTotalVentasyDeudas) =====
            let totalVentasHistorico = 0;
            let totalGananciasHistorico = 0;
            let totalDeudasHistoricas = 0;

            ventas.forEach(venta => {
                totalVentasHistorico += venta.precio || 0;
                totalGananciasHistorico += venta.gananciasAdmin || 0;
                if (!venta.cobrado) {
                    totalDeudasHistoricas += venta.precio || 0;
                }
            });

            setTotalDeudas(totalDeudasHistoricas);

            console.log(`📅 [DashboardVentas] === MES ACTUAL (${mesActualStart.format('MMMM YYYY')}) ===`);
            console.log(`👥 [DashboardVentas] Admins con ventas: ${adminLabelsMesActual.length}`);
            console.log(`💰 [DashboardVentas] Total Cobrado: $${totalCobradoMesActual.toFixed(2)}`);
            console.log(`💵 [DashboardVentas] Ganancias Admin: $${totalGananciasMesActual.toFixed(2)}`);
            console.log(`🔴 [DashboardVentas] Deudas del mes: $${totalDeudasMesActual.toFixed(2)}`);
            console.log(`📊 [DashboardVentas] === 12 MESES ===`);
            console.log(`💰 [DashboardVentas] Total 12 meses: $${totalVendido12Meses.reduce((a, b) => a + b, 0).toFixed(2)}`);
            console.log(`💵 [DashboardVentas] Ganancias 12 meses: $${ganancias12Meses.reduce((a, b) => a + b, 0).toFixed(2)}`);
            console.log(`📊 [DashboardVentas] === HISTÓRICO TOTAL ===`);
            console.log(`💰 [DashboardVentas] Total histórico: $${totalVentasHistorico.toFixed(2)}`);
            console.log(`💵 [DashboardVentas] Ganancias históricas: $${totalGananciasHistorico.toFixed(2)}`);
            console.log(`🔴 [DashboardVentas] Deudas históricas: $${totalDeudasHistoricas.toFixed(2)}`);

            // ===== ACTUALIZAR KPIs =====
            setKpiData(prev => ({
                ...prev,
                // Datos de 12 meses
                totalVentas12Meses: totalVendido12Meses.reduce((a, b) => a + b, 0),
                totalGanancias12Meses: ganancias12Meses.reduce((a, b) => a + b, 0),
                
                // Datos del mes actual
                totalCobradoMesActual: totalCobradoMesActual,
                gananciasMesActual: totalGananciasMesActual,
                deudasMesActual: totalDeudasMesActual,
                
                // Datos históricos totales
                totalVentasHistorico: totalVentasHistorico,
                totalGananciasHistorico: totalGananciasHistorico,
                totalDeudasHistoricas: totalDeudasHistoricas
            }));

            console.log('✅ [DashboardVentas] fetchVentasData completado exitosamente');

        } catch (error) {
            console.error('❌ [DashboardVentas] Error fetching ventas data:', error);
        }
    };

    const fetchData = async (showRefreshing = false) => {
        if (showRefreshing) setRefreshing(true);
        else setLoading(true);

        try {
            await new Promise((resolve, reject) => {
                Meteor.call('getDatosDashboardByUser', type, null, (error, result) => {
                    if (error) {
                        console.log("error", error);
                        reject(error);
                    } else {
                        console.log("result", result);
                        if (result && result.length > 0) {
                            // Extraer datos VPN
                            const vpnData = result.map((item) => Number(item.VPN || 0));
                            const proxyData = result.map((item) => Number(item.PROXY || 0));
                            const labels = result
                                .filter((item, index) => index % 2 === 0)
                                .map((item) => item.name.replace(/:00/g, ""));

                            setY(vpnData);
                            setYProxy(proxyData);
                            setX(labels);

                            // Detectar tipo de período
                            const detectedPeriod = detectPeriodType(result.map(item => item.name));
                            setPeriodInfo(detectedPeriod);

                            // Calcular KPIs
                            const totalVPN = vpnData.reduce((a, b) => a + b, 0);
                            const totalProxy = proxyData.reduce((a, b) => a + b, 0);

                            setKpiData(prev => ({
                                ...prev,
                                totalUsers: result.length,
                                activeUsers: result.filter(r => r.VPN > 0 || r.PROXY > 0).length,
                                totalConsumo: (totalVPN + totalProxy).toFixed(2),
                                totalVentas: result.reduce((sum, item) => sum + (item.ventas || 0), 0)
                            }));
                            
                            // Auto-cambiar vista de ventas según el período detectado
                            if (detectedPeriod.type === 'DIA') {
                                // Período diario → Vista "Por Día"
                                setVentasViewMode('por-dia');
                            } else if (detectedPeriod.type === 'MES') {
                                // Período mensual → Vista "Por Mes"
                                setVentasViewMode('por-mes');
                            }
                        }
                        resolve();
                    }
                });
            });
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        fetchVentasData();
    }, [type]);

    useEffect(() => {
        // Refetch cuando cambiamos de vista
        if (selectedView === 'ventas') {
            fetchVentasData();
        }
    }, [selectedView]);

    useEffect(() => {
        // Si estamos en vista de ventas y el período cambia a HORA (24h), cambiar a general
        if (selectedView === 'ventas' && periodInfo.type === 'HORA') {
            setSelectedView('general');
            console.log('⚠️ [Dashboard] Vista de ventas no disponible en período de 24h, cambiando a General');
        }
    }, [periodInfo.type]);

    useEffect(() => {
        const handleDimensionChange = ({ window }) => {
            setWidth(window.width);
            setHeight(window.height);
        };

        const subscription = Dimensions.addEventListener('change', handleDimensionChange);
        return () => subscription?.remove();
    }, []);

    const onRefresh = () => {
        fetchData(true);
    };

    // Configuración de colores para charts (adaptativa al theme)
    const chartConfig = {
        backgroundColor: theme.colors.surface,
        backgroundGradientFrom: theme.colors.surface,
        backgroundGradientTo: theme.colors.surface,
        decimalPlaces: 1,
        color: (opacity = 1) => theme.dark 
            ? `rgba(255, 255, 255, ${opacity})` 
            : `rgba(0, 0, 0, ${opacity})`,
        labelColor: (opacity = 1) => theme.dark 
            ? `rgba(255, 255, 255, ${opacity * 0.9})` 
            : `rgba(0, 0, 0, ${opacity * 0.7})`,
        style: {
            borderRadius: 16
        },
        propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: "#4CAF50"
        },
        propsForBackgroundLines: {
            strokeDasharray: "",
            stroke: theme.dark 
                ? "rgba(255,255,255,0.1)" 
                : "rgba(0,0,0,0.1)"
        }
    };

    const vpnChartConfig = {
        ...chartConfig,
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
        propsForDots: {
            ...chartConfig.propsForDots,
            stroke: "#4CAF50"
        }
    };

    const proxyChartConfig = {
        ...chartConfig,
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
        propsForDots: {
            ...chartConfig.propsForDots,
            stroke: "#2196F3"
        }
    };

    // Datos para gráfico de distribución (adaptativo al theme)
    const pieData = [
        {
            name: "VPN",
            population: y.reduce((a, b) => a + b, 0),
            color: "#4CAF50",
            legendFontColor: theme.colors.text,
            legendFontSize: 13
        },
        {
            name: "Proxy",
            population: yProxy.reduce((a, b) => a + b, 0),
            color: "#2196F3",
            legendFontColor: theme.colors.text,
            legendFontSize: 13
        }
    ];

    // Datos para gráfico comparativo
    const comparativeData = {
        labels: x,
        datasets: [
            {
                data: y,
                color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                strokeWidth: 2
            },
            {
                data: yProxy,
                color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                strokeWidth: 2
            }
        ],
        legend: ["VPN", "Proxy"]
    };

    if (loading && x.length === 0) {
        return (
            <ScrollView style={dashboardStyles.container}>
                <View style={dashboardStyles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={dashboardStyles.loadingText}>Cargando dashboard...</Text>
                    <ChartSkeleton />
                </View>
            </ScrollView>
        );
    }

    return (
        <ScrollView 
            style={dashboardStyles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} />
            }
            onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
        >
            {/* Header */}
            <View style={dashboardStyles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={dashboardStyles.headerTitle}>{periodInfo.description || `Análisis de ${type === 'VPN' ? 'VPN' : type === 'PROXY' ? 'Proxy' : 'General'}`}</Text>
                    <Chip 
                        icon={periodInfo.icon}
                        style={{ backgroundColor: periodInfo.color }}
                        textStyle={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}
                    >
                        {periodInfo.label}
                    </Chip>
                </View>
                {/* <Text style={dashboardStyles.headerSubtitle}>
                    {periodInfo.description || `Análisis de ${type === 'VPN' ? 'VPN' : type === 'PROXY' ? 'Proxy' : 'General'}`}
                </Text> */}
            </View>

            {/* KPIs principales */}
            <View style={dashboardStyles.kpiContainer}>
                {selectedView !== 'ventas' ? (
                    <>
                        <KPICard
                            title="Total Consumo"
                            value={kpiData.totalConsumo}
                            subtitle={periodInfo.description || 'Total acumulado'}
                            icon="chart-line"
                            color="#4CAF50"
                            trend={12}
                            delay={0}
                            isLargeNumber={true}
                        />
                        <KPICard
                            title="Usuarios Activos"
                            value={kpiData.activeUsers}
                            subtitle={`de ${kpiData.totalUsers} usuarios`}
                            icon="account-group"
                            color="#2196F3"
                            trend={8}
                            delay={100}
                        />
                    </>
                ) : ventasViewMode === 'por-dia' ? (
                    <>
                        <KPICard
                            title="Total Cobrado"
                            value={`$${(kpiData.totalCobradoMesActual || 0).toFixed(2)}`}
                            subtitle={moment().format('MMMM YYYY')}
                            icon="cash-check"
                            color="#4CAF50"
                            delay={0}
                        />
                        <KPICard
                            title="Ganancias Admin"
                            value={`$${(kpiData.gananciasMesActual || 0).toFixed(2)}`}
                            subtitle={moment().format('MMMM YYYY')}
                            icon="account-cash"
                            color="#2196F3"
                            delay={100}
                        />
                    </>
                ) : (
                    <>
                        <KPICard
                            title="Total Ventas (12M)"
                            value={`$${(kpiData.totalVentas12Meses || 0).toFixed(2)}`}
                            subtitle="Últimos 12 meses"
                            icon="cash-multiple"
                            color="#FF9800"
                            delay={0}
                        />
                        <KPICard
                            title="Histórico Total"
                            value={`$${(kpiData.totalVentasHistorico || 0).toFixed(2)}`}
                            subtitle="Todas las ventas"
                            icon="trending-up"
                            color="#9C27B0"
                            delay={100}
                        />
                    </>
                )}
            </View>

            {/* Segmented Buttons para cambiar vista */}
            <View style={dashboardStyles.segmentedContainer}>
                <CustomSegmentedButtons
                    value={selectedView}
                    onValueChange={setSelectedView}
                    buttons={[
                        { value: 'general', label: 'General', icon: 'chart-box' },
                        { value: 'vpn', label: 'VPN', icon: 'shield-check' },
                        { value: 'proxy', label: 'Proxy', icon: 'wifi' },
                        // Solo mostrar tab de Ventas si:
                        // 1. NO estamos en período de 24 horas
                        // 2. El usuario es carlosmbinf
                        ...(periodInfo.type !== 'HORA' && currentUser?.username === 'carlosmbinf' ? [{ value: 'ventas', label: 'Ventas', icon: 'currency-usd' }] : [])
                    ]}
                />
            </View>

            {/* Gráfico principal según vista seleccionada */}
            {x.length > 0 && y.length > 0 && (
                <>
                    {selectedView === 'general' && (
                        <Card style={chartStyles.card}>
                            <Card.Content>
                                <View style={chartStyles.header}>
                                    <Text style={chartStyles.title}>Consumo Comparativo</Text>
                                    <Chip 
                                        icon={periodInfo.icon}
                                        style={{ backgroundColor: periodInfo.color + '33' }}
                                        textStyle={{ color: periodInfo.color, fontWeight: 'bold', fontSize: 11 }}
                                    >
                                        {periodInfo.label}
                                    </Chip>
                                </View>
                                <LineChart
                                    data={comparativeData}
                                    width={width - 56}
                                    height={240}
                                    segments={5}
                                    yAxisSuffix=" GB"
                                    fromZero={true}
                                    chartConfig={chartConfig}
                                    bezier
                                    style={chartStyles.chart}
                                    withInnerLines={true}
                                    withOuterLines={true}
                                    withVerticalLines={false}
                                    withHorizontalLines={true}
                                />
                            </Card.Content>
                        </Card>
                    )}

                    {selectedView === 'vpn' && (
                        <Card style={chartStyles.card}>
                            <Card.Content>
                                <View style={chartStyles.header}>
                                    <View style={chartStyles.titleRow}>
                                        <View style={[chartStyles.icon, { backgroundColor: '#4CAF50' }]}>
                                            <Icon name="shield-check" size={24} color="#fff" />
                                        </View>
                                        <Text style={chartStyles.title}>Consumo VPN</Text>
                                    </View>
                                    <View style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                        <Chip 
                                            icon={periodInfo.icon}
                                            style={{ backgroundColor: periodInfo.color + '33', height: 24,justifyContent: "center" }}
                                            textStyle={{ color: periodInfo.color, fontWeight: 'bold', fontSize: 10 }}
                                        >
                                            {periodInfo.label}
                                        </Chip>
                                        <Chip icon="trending-up" style={{ backgroundColor: '#4CAF5033', height: 24,justifyContent: "center" }}>
                                            +12%
                                        </Chip>
                                    </View>
                                </View>
                                <LineChart
                                    data={{
                                        labels: x,
                                        datasets: [{ data: y }]
                                    }}
                                    width={width - 56}
                                    height={240}
                                    segments={5}
                                    yAxisSuffix=" GB"
                                    fromZero={true}
                                    chartConfig={vpnChartConfig}
                                    bezier
                                    style={chartStyles.chart}
                                    withShadow={true}
                                    withInnerLines={true}
                                />
                            </Card.Content>
                        </Card>
                    )}

                    {selectedView === 'proxy' && (
                        <Card style={chartStyles.card}>
                            <Card.Content>
                                <View style={chartStyles.header}>
                                    <View style={chartStyles.titleRow}>
                                        <View style={[chartStyles.icon, { backgroundColor: '#2196F3' }]}>
                                            <Icon name="wifi" size={24} color="#fff" />
                                        </View>
                                        <Text style={chartStyles.title}>Consumo Proxy</Text>
                                    </View>
                                    <View style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                        <Chip 
                                            icon={periodInfo.icon}
                                            style={{ backgroundColor: periodInfo.color + '33', height: 24,justifyContent: "center"}}
                                            textStyle={{ color: periodInfo.color, fontWeight: 'bold', fontSize: 10 }}
                                        >
                                            {periodInfo.label}
                                        </Chip>
                                        <Chip icon="trending-up" style={{ backgroundColor: '#2196F333', height: 24,justifyContent: "center" }}>
                                            +8%
                                        </Chip>
                                    </View>
                                </View>
                                <LineChart
                                    data={{
                                        labels: x,
                                        datasets: [{ data: yProxy }]
                                    }}
                                    width={width - 56}
                                    height={240}
                                    segments={5}
                                    yAxisSuffix=" GB"
                                    fromZero={true}
                                    chartConfig={proxyChartConfig}
                                    bezier
                                    style={chartStyles.chart}
                                    withShadow={true}
                                    withInnerLines={true}
                                />
                            </Card.Content>
                        </Card>
                    )}

                    {selectedView === 'ventas' && (
                        <Card style={chartStyles.card}>
                            <Card.Content>
                                <View style={chartStyles.header}>
                                    <View style={chartStyles.titleRow}>
                                        <View style={[chartStyles.icon, { backgroundColor: '#FF9800' }]}>
                                            <Icon name="currency-usd" size={24} color="#fff" />
                                        </View>
                                        <Text style={chartStyles.title}>
                                            {periodInfo.type === 'DIA' 
                                                ? 'Ventas por Admin (Mes Actual)' 
                                                : 'Ventas por Mes (12 Meses)'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Chip indicador del período según tipo detectado */}
                                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16, marginTop: 8, flexWrap: 'wrap' }}>
                                    {periodInfo.type === 'DIA' ? (
                                        <>
                                            <Chip 
                                                icon="calendar-check"
                                                style={{ backgroundColor: '#4CAF5033', height: 40,justifyContent: "center" }}
                                                textStyle={{ color: '#4CAF50', fontWeight: 'bold', fontSize: 10 }}
                                            >
                                                {moment().format('MMMM YYYY')}
                                            </Chip>
                                            <Chip 
                                                icon="account-group"
                                                style={{ backgroundColor: '#2196F333', height: 40,justifyContent: "center" }}
                                                textStyle={{ color: '#2196F3', fontWeight: 'bold', fontSize: 10 }}
                                            >
                                                {adminLabels.length} admins
                                            </Chip>
                                        </>
                                    ) : (
                                        <Chip 
                                            icon="calendar-range"
                                            style={{ backgroundColor: '#FF980033', height: 40 }}
                                            textStyle={{ color: '#FF9800', fontWeight: 'bold', fontSize: 10 }}
                                        >
                                            Últimos 12 meses
                                        </Chip>
                                    )}
                                </View>

                                {/* VISTA "POR DÍA" - Mes actual por admin (cuando periodInfo.type === 'DIA') */}
                                {periodInfo.type === 'DIA' && adminLabels.length > 0 && (
                                    <>
                                        <BarChart
                                            data={{
                                                labels: adminLabels,
                                                datasets: [
                                                    {
                                                        data: ventasPorAdmin.map(v => v.totalVendido),
                                                        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                                                    },
                                                    {
                                                        data: ventasPorAdmin.map(v => v.ganancias),
                                                        color: (opacity = 1) => `rgba(0, 139, 159, ${opacity})`,
                                                    },
                                                    {
                                                        data: ventasPorAdmin.map(v => v.deudas),
                                                        color: (opacity = 1) => `rgba(211, 47, 47, ${opacity})`,
                                                    }
                                                ]
                                            }}
                                            width={width - 56}
                                            height={240}
                                            yAxisPrefix="$"
                                            fromZero={true}
                                            chartConfig={{
                                                ...chartConfig,
                                                barPercentage: 0.7,
                                            }}
                                            style={chartStyles.chart}
                                            showValuesOnTopOfBars={false}
                                        />
                                        
                                        {/* Leyenda */}
                                        {/* <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                                            <Chip 
                                                icon="cash-check"
                                                style={{ backgroundColor: '#4CAF5033', height: 40 }}
                                                textStyle={{ color: '#4CAF50', fontWeight: 'bold', fontSize: 10 }}
                                            >
                                                Total Vendido
                                            </Chip>
                                            <Chip 
                                                icon="trending-up"
                                                style={{ backgroundColor: 'rgba(0, 139, 159, 0.2)', height: 40 }}
                                                textStyle={{ color: '#008b9f', fontWeight: 'bold', fontSize: 10 }}
                                            >
                                                Ganancias Admin
                                            </Chip>
                                            <Chip 
                                                icon="alert-circle"
                                                style={{ backgroundColor: '#d32f2f33', height: 40 }}
                                                textStyle={{ color: '#d32f2f', fontWeight: 'bold', fontSize: 10 }}
                                            >
                                                Deben
                                            </Chip>
                                        </View> */}
                                        
                                        {/* Estadísticas mes actual */}
                                        <View style={{ marginTop: 16, padding: 12, backgroundColor: 'rgba(76, 175, 80, 0.05)', borderRadius: 12, gap: 10 }}>
                                            <Text style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 4, opacity: 0.8 }}>
                                                📊 Resumen del Mes Actual
                                            </Text>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 12, opacity: 0.7 }}>💰 Ganancias Vidkar:</Text>
                                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#4CAF50' }}>
                                                    ${(kpiData.totalCobradoMesActual || 0).toFixed(2)}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 12, opacity: 0.7 }}>💵 Ganancias Admin:</Text>
                                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#008b9f' }}>
                                                    ${(kpiData.gananciasMesActual || 0).toFixed(2)}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 12, opacity: 0.7 }}>🔴 Deben (mes):</Text>
                                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#d32f2f' }}>
                                                    ${(kpiData.deudasMesActual || 0).toFixed(2)}
                                                </Text>
                                            </View>
                                            <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.1)', marginVertical: 4 }} />
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 12, opacity: 0.7 }}>📈 Total Cobrado:</Text>
                                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#FF9800' }}>
                                                    ${ventasPorAdmin.length > 0 
                                                        ? ((parseInt(kpiData.totalCobradoMesActual)  + parseInt(kpiData.gananciasMesActual) || 0)).toFixed(2)
                                                        : '0.00'}
                                                </Text>
                                            </View>
                                        </View>
                                    </>
                                )}

                                {/* VISTA "POR MES" - 12 meses + histórico total (cuando periodInfo.type === 'MES') */}
                                {periodInfo.type === 'MES' && ventasLabels.length > 0 && (
                                    <>
                                        {/* Gráfico de 12 meses (GraphicsLinealVentasXMeses) */}
                                        <LineChart
                                            data={{
                                                labels: ventasLabels,
                                                datasets: [
                                                    {
                                                        data: totalVendido,
                                                        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                                                        strokeWidth: 3
                                                    },
                                                    {
                                                        data: gananciasAdmin,
                                                        color: (opacity = 1) => `rgba(0, 139, 159, ${opacity})`,
                                                        strokeWidth: 3
                                                    }
                                                ],
                                                legend: ['Total Vendido', 'Ganancias Admin']
                                            }}
                                            width={width - 56}
                                            height={240}
                                            segments={5}
                                            yAxisPrefix="$"
                                            fromZero={true}
                                            chartConfig={{
                                                ...chartConfig,
                                                propsForDots: {
                                                    r: "4",
                                                    strokeWidth: "2",
                                                    stroke: "#4CAF50"
                                                }
                                            }}
                                            bezier
                                            style={chartStyles.chart}
                                            withShadow={true}
                                            withInnerLines={true}
                                        />
                                        
                                        {/* Leyenda */}
                                        {/* <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                                            <Chip 
                                                icon="cash-check"
                                                style={{ backgroundColor: '#4CAF5033', height: 40 }}
                                                textStyle={{ color: '#4CAF50', fontWeight: 'bold', fontSize: 10 }}
                                            >
                                                Total Vendido
                                            </Chip>
                                            <Chip 
                                                icon="trending-up"
                                                style={{ backgroundColor: 'rgba(0, 139, 159, 0.2)', height: 40 }}
                                                textStyle={{ color: '#008b9f', fontWeight: 'bold', fontSize: 10 }}
                                            >
                                                Ganancias Admin
                                            </Chip>
                                        </View> */}
                                        
                                        {/* Estadísticas 12 meses + histórico total */}
                                        <View style={{ marginTop: 16, padding: 12, backgroundColor: 'rgba(255, 152, 0, 0.05)', borderRadius: 12, gap: 10 }}>
                                            <Text style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 4, opacity: 0.8 }}>
                                                📊 Estadísticas 12 Meses
                                            </Text>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 12, opacity: 0.7 }}>💰 Ganancias Vidkar:</Text>
                                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#4CAF50' }}>
                                                    ${(kpiData.totalVentas12Meses || 0).toFixed(2)}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 12, opacity: 0.7 }}>💵 Ganancias Admins:</Text>
                                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#008b9f' }}>
                                                    ${(kpiData.totalGanancias12Meses || 0).toFixed(2)}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 12, opacity: 0.7 }}>📈 Promedio mensual:</Text>
                                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#FF9800' }}>
                                                    ${((parseInt(kpiData.totalVentas12Meses) + parseInt(kpiData.totalGanancias12Meses) || 0) / 12).toFixed(2)}
                                                </Text>
                                            </View>
                                            
                                            <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.1)', marginVertical: 8 }} />
                                            
                                            <Text style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 4, opacity: 0.8 }}>
                                                📊 Histórico Total
                                            </Text>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 12, opacity: 0.7 }}>💰 Total histórico:</Text>
                                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#9C27B0' }}>
                                                    ${(kpiData.totalVentasHistorico || 0).toFixed(2)}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 12, opacity: 0.7 }}>💵 Ganancias históricas:</Text>
                                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#008b9f' }}>
                                                    ${(kpiData.totalGananciasHistorico || 0).toFixed(2)}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 12, opacity: 0.7 }}>🔴 Deudas Totales:</Text>
                                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#F44336' }}>
                                                    ${(kpiData.totalDeudasHistoricas || 0).toFixed(2)}
                                                </Text>
                                            </View>
                                        </View>
                                    </>
                                )}

                                {/* Mensaje cuando no hay datos */}
                                {((periodInfo.type === 'DIA' && adminLabels.length === 0) || 
                                  (periodInfo.type === 'MES' && ventasLabels.length === 0)) && (
                                    <View style={{ padding: 32, alignItems: 'center' }}>
                                        <Icon name="information" size={48} color={theme.colors.disabled} />
                                        <Text style={{ color: theme.colors.disabled, marginTop: 8, textAlign: 'center' }}>
                                            No hay ventas registradas
                                        </Text>
                                    </View>
                                )}
                            </Card.Content>
                        </Card>
                    )}

                    {/* Mensaje de no hay datos de ventas */}
                    {selectedView === 'ventas' && ventasLabels.length === 0 && (
                        <Card style={chartStyles.card}>
                            <Card.Content>
                                <View style={{ padding: 48, alignItems: 'center' }}>
                                    <Icon name="chart-box-outline" size={64} color={theme.colors.disabled} />
                                    <Text style={{ 
                                        color: theme.colors.text, 
                                        marginTop: 16, 
                                        textAlign: 'center',
                                        fontSize: 18,
                                        fontWeight: 'bold'
                                    }}>
                                        Sin datos de ventas
                                    </Text>
                                    <Text style={{ 
                                        color: theme.colors.disabled, 
                                        marginTop: 8, 
                                        textAlign: 'center',
                                        paddingHorizontal: 32
                                    }}>
                                        No se encontraron ventas registradas en los últimos 12 meses
                                    </Text>
                                </View>
                            </Card.Content>
                        </Card>
                    )}

                    {/* Gráfico de distribución (solo para vistas de consumo) */}
                    {selectedView !== 'ventas' && (
                        <Card style={chartStyles.card}>
                            <Card.Content>
                                <View style={chartStyles.header}>
                                    <Text style={chartStyles.title}>Distribución de Consumo</Text>
                                    <Chip 
                                        icon={periodInfo.icon}
                                        style={{ backgroundColor: periodInfo.color + '33',justifyContent: "center" }}
                                        textStyle={{ color: periodInfo.color, fontWeight: 'bold', fontSize: 11 }}
                                    >
                                        {periodInfo.label}
                                    </Chip>
                                </View>
                                <PieChart
                                    data={pieData}
                                    width={width - 56}
                                    height={200}
                                    chartConfig={chartConfig}
                                    accessor="population"
                                    backgroundColor="transparent"
                                    paddingLeft="0"
                                    absolute
                                    style={chartStyles.chart}
                                />
                            </Card.Content>
                        </Card>
                    )}

                    {/* Estadísticas adicionales */}
                    <Card style={chartStyles.card}>
                        <Card.Content>
                            <View style={chartStyles.header}>
                                <Text style={chartStyles.title}>Estadísticas Detalladas</Text>
                                <Chip 
                                    icon={selectedView === 'ventas' 
                                        ? (periodInfo.type === 'DIA' ? 'calendar-today' : 'calendar-range')
                                        : periodInfo.icon}
                                    style={{ backgroundColor: (selectedView === 'ventas' 
                                        ? (periodInfo.type === 'DIA' ? '#4CAF50' : '#FF9800')
                                        : periodInfo.color) + '33',justifyContent: "center" }}
                                    textStyle={{ 
                                        color: selectedView === 'ventas' 
                                            ? (periodInfo.type === 'DIA' ? '#4CAF50' : '#FF9800')
                                            : periodInfo.color, 
                                        fontWeight: 'bold', 
                                        fontSize: 11 
                                    }}
                                >
                                    {selectedView === 'ventas' 
                                        ? (periodInfo.type === 'DIA' ? 'Mes actual' : '12 meses')
                                        : periodInfo.label}
                                </Chip>
                            </View>
                            
                            {selectedView !== 'ventas' ? (
                                <View style={statsStyles.grid}>
                                    <View style={[statsStyles.item, { backgroundColor: '#4CAF5015', borderLeftColor: '#4CAF50' }]}>
                                        <Text style={statsStyles.label}>Promedio VPN</Text>
                                        <Text 
                                            style={statsStyles.value}
                                            adjustsFontSizeToFit
                                            numberOfLines={1}
                                            minimumFontScale={0.7}
                                        >
                                            {formatLargeNumber((y.reduce((a, b) => a + b, 0) / y.length).toFixed(2))}
                                        </Text>
                                    </View>
                                    <View style={[statsStyles.item, { backgroundColor: '#2196F315', borderLeftColor: '#2196F3' }]}>
                                        <Text style={statsStyles.label}>Promedio Proxy</Text>
                                        <Text 
                                            style={statsStyles.value}
                                            adjustsFontSizeToFit
                                            numberOfLines={1}
                                            minimumFontScale={0.7}
                                        >
                                            {formatLargeNumber((yProxy.reduce((a, b) => a + b, 0) / yProxy.length).toFixed(2))}
                                        </Text>
                                    </View>
                                    <View style={[statsStyles.item, { backgroundColor: '#FF980015', borderLeftColor: '#FF9800' }]}>
                                        <Text style={statsStyles.label}>Pico VPN</Text>
                                        <Text 
                                            style={statsStyles.value}
                                            adjustsFontSizeToFit
                                            numberOfLines={1}
                                            minimumFontScale={0.7}
                                        >
                                            {formatLargeNumber(Math.max(...y).toFixed(2))}
                                        </Text>
                                    </View>
                                    <View style={[statsStyles.item, { backgroundColor: '#9C27B015', borderLeftColor: '#9C27B0' }]}>
                                        <Text style={statsStyles.label}>Pico Proxy</Text>
                                        <Text 
                                            style={statsStyles.value}
                                            adjustsFontSizeToFit
                                            numberOfLines={1}
                                            minimumFontScale={0.7}
                                        >
                                            {formatLargeNumber(Math.max(...yProxy).toFixed(2))}
                                        </Text>
                                    </View>
                                </View>
                            ) : periodInfo.type === 'DIA' ? (
                                <View style={statsStyles.grid}>
                                    <View style={[statsStyles.item, { backgroundColor: '#4CAF5015', borderLeftColor: '#4CAF50' }]}>
                                        <Text style={statsStyles.label}>Total Mes</Text>
                                        <Text 
                                            style={statsStyles.value}
                                            adjustsFontSizeToFit
                                            numberOfLines={1}
                                            minimumFontScale={0.7}
                                        >
                                            ${(kpiData.totalCobradoMesActual || 0).toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={[statsStyles.item, { backgroundColor: '#2196F315', borderLeftColor: '#2196F3' }]}>
                                        <Text style={statsStyles.label}>Ganancias</Text>
                                        <Text 
                                            style={statsStyles.value}
                                            adjustsFontSizeToFit
                                            numberOfLines={1}
                                            minimumFontScale={0.7}
                                        >
                                            ${(kpiData.gananciasMesActual || 0).toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={[statsStyles.item, { backgroundColor: '#F4433615', borderLeftColor: '#F44336' }]}>
                                        <Text style={statsStyles.label}>Deudas Mes</Text>
                                        <Text 
                                            style={statsStyles.value}
                                            adjustsFontSizeToFit
                                            numberOfLines={1}
                                            minimumFontScale={0.7}
                                        >
                                            ${(kpiData.deudasMesActual || 0).toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={[statsStyles.item, { backgroundColor: '#FF980015', borderLeftColor: '#FF9800' }]}>
                                        <Text style={statsStyles.label}>Mejor Admin</Text>
                                        <Text 
                                            style={statsStyles.value}
                                            adjustsFontSizeToFit
                                            numberOfLines={1}
                                            minimumFontScale={0.7}
                                        >
                                            ${ventasPorAdmin.length > 0 ? Math.max(...ventasPorAdmin.map(v => v.totalVendido)).toFixed(2) : '0.00'}
                                        </Text>
                                    </View>
                                </View>
                            ) : (
                                <View style={statsStyles.grid}>
                                    <View style={[statsStyles.item, { backgroundColor: '#FF980015', borderLeftColor: '#FF9800' }]}>
                                        <Text style={statsStyles.label}>Total 12 Meses</Text>
                                        <Text 
                                            style={statsStyles.value}
                                            adjustsFontSizeToFit
                                            numberOfLines={1}
                                            minimumFontScale={0.7}
                                        >
                                            ${(kpiData.totalVentas12Meses || 0).toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={[statsStyles.item, { backgroundColor: '#9C27B015', borderLeftColor: '#9C27B0' }]}>
                                        <Text style={statsStyles.label}>Histórico Total</Text>
                                        <Text 
                                            style={statsStyles.value}
                                            adjustsFontSizeToFit
                                            numberOfLines={1}
                                            minimumFontScale={0.7}
                                        >
                                            ${(kpiData.totalVentasHistorico || 0).toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={[statsStyles.item, { backgroundColor: '#4CAF5015', borderLeftColor: '#4CAF50' }]}>
                                        <Text style={statsStyles.label}>Mejor Mes</Text>
                                        <Text 
                                            style={statsStyles.value}
                                            adjustsFontSizeToFit
                                            numberOfLines={1}
                                            minimumFontScale={0.7}
                                        >
                                            ${totalVendido.length > 0 ? Math.max(...totalVendido).toFixed(2) : '0.00'}
                                        </Text>
                                    </View>
                                    <View style={[statsStyles.item, { backgroundColor: '#F4433615', borderLeftColor: '#F44336' }]}>
                                        <Text style={statsStyles.label}>Deudas Total</Text>
                                        <Text 
                                            style={statsStyles.value}
                                            adjustsFontSizeToFit
                                            numberOfLines={1}
                                            minimumFontScale={0.7}
                                        >
                                            ${(kpiData.totalDeudasHistoricas || 0).toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </Card.Content>
                    </Card>

                </>
            )}

            <View style={{ height: 40 }} />
        </ScrollView>
    );
};

export default DashBoardPrincipal;