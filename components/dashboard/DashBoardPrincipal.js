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
    const [ventasViewMode, setVentasViewMode] = useState('mensual'); // 'mensual', 'por-admin', 'deudas'
    const [ventasPorAdmin, setVentasPorAdmin] = useState([]);
    const [adminLabels, setAdminLabels] = useState([]);
    const [totalDeudas, setTotalDeudas] = useState(0);

    const scrollY = useRef(new Animated.Value(0)).current;

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

            const dataVentas = [];
            const labels = [];
            const totalVendidoArray = [];
            const gananciasArray = [];

            // Calcular ventas de los últimos 12 meses
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

                labels.push(dateStartMonth.format('MMM'));
                totalVendidoArray.push(totalMes);
                gananciasArray.push(gananciasMes);
            }

            setVentasLabels(labels);
            setTotalVendido(totalVendidoArray);
            setGananciasAdmin(gananciasArray);
            
            // Calcular ventas por admin (mes actual)
            const dateStartMonth = moment().startOf('month');
            const dateEndMonth = moment().endOf('month');
            
            const admins = Meteor.users.find({ 'profile.role': 'admin' }).fetch();
            const ventasPorAdminArray = [];
            const adminLabelsArray = [];
            let totalDeudasAcumuladas = 0;
            
            admins.forEach(admin => {
                let totalVendidoAdmin = 0;
                let gananciasAdminTotal = 0;
                let deudasAdmin = 0;
                
                ventas.forEach(venta => {
                    if (venta.adminId === admin._id) {
                        const fechaVenta = moment(venta.createdAt);
                        
                        // Ventas del mes actual
                        if (fechaVenta.isBetween(dateStartMonth, dateEndMonth, null, '[]')) {
                            totalVendidoAdmin += venta.precio || 0;
                            gananciasAdminTotal += venta.gananciasAdmin || 0;
                            
                            // Deudas (ventas no cobradas)
                            if (!venta.cobrado) {
                                deudasAdmin += venta.precio || 0;
                            }
                        }
                        
                        // Total de deudas (sin filtro de fecha)
                        if (!venta.cobrado) {
                            totalDeudasAcumuladas += venta.precio || 0;
                        }
                    }
                });
                
                if (totalVendidoAdmin > 0) {
                    const nombreAdmin = `${admin.profile?.firstName || ''} ${admin.profile?.lastName || ''}`.trim() || 'Sin nombre';
                    ventasPorAdminArray.push({
                        totalVendido: totalVendidoAdmin,
                        ganancias: gananciasAdminTotal,
                        deudas: deudasAdmin
                    });
                    adminLabelsArray.push(nombreAdmin.length > 15 ? nombreAdmin.substring(0, 15) + '...' : nombreAdmin);
                }
            });
            
            setVentasPorAdmin(ventasPorAdminArray);
            setAdminLabels(adminLabelsArray);
            setTotalDeudas(totalDeudasAcumuladas);

            console.log(`👥 [DashboardVentas] Admins con ventas: ${adminLabelsArray.length}`);
            console.log(`💰 [DashboardVentas] Total deudas: $${totalDeudasAcumuladas.toFixed(2)}`);

            // Actualizar KPIs de ventas
            const totalVentasPeriodo = totalVendidoArray.reduce((a, b) => a + b, 0);
            const totalGananciasPeriodo = gananciasArray.reduce((a, b) => a + b, 0);
            
            console.log(`📊 [DashboardVentas] Total ventas 12 meses: $${totalVentasPeriodo.toFixed(2)}`);
            console.log(`💵 [DashboardVentas] Total ganancias 12 meses: $${totalGananciasPeriodo.toFixed(2)}`);
            
            setKpiData(prev => ({
                ...prev,
                totalVentas: totalVentasPeriodo,
                totalGanancias: totalGananciasPeriodo,
                totalDeudas: totalDeudasAcumuladas
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
                            const avgVPN = totalVPN / vpnData.length;
                            const avgProxy = totalProxy / proxyData.length;

                            setKpiData({
                                totalUsers: result.length,
                                activeUsers: result.filter(r => r.VPN > 0 || r.PROXY > 0).length,
                                totalConsumo: (totalVPN + totalProxy).toFixed(2),
                                totalVentas: result.reduce((sum, item) => sum + (item.ventas || 0), 0)
                            });
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
        // Refetch ventas cuando cambiamos a vista de ventas
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
                    <Text style={dashboardStyles.headerTitle}>Dashboard</Text>
                    <Chip 
                        icon={periodInfo.icon}
                        style={{ backgroundColor: periodInfo.color }}
                        textStyle={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}
                    >
                        {periodInfo.label}
                    </Chip>
                </View>
                <Text style={dashboardStyles.headerSubtitle}>
                    {periodInfo.description || `Análisis de ${type === 'VPN' ? 'VPN' : type === 'PROXY' ? 'Proxy' : 'General'}`}
                </Text>
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
                ) : (
                    <>
                        <KPICard
                            title="Total Ventas"
                            value={`$${(kpiData.totalVentas || 0).toFixed(2)}`}
                            subtitle="Últimos 12 meses"
                            icon="cash-multiple"
                            color="#FF9800"
                            trend={15}
                            delay={0}
                        />
                        <KPICard
                            title="Deudas Pendientes"
                            value={`$${(kpiData.totalDeudas || 0).toFixed(2)}`}
                            subtitle="No cobradas"
                            icon="alert-circle"
                            color="#F44336"
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
                        // Solo mostrar tab de Ventas si NO estamos en período de 24 horas
                        ...(periodInfo.type !== 'HORA' ? [{ value: 'ventas', label: 'Ventas', icon: 'currency-usd' }] : [])
                    ]}
                />
            </View>

            {/* Info del período de datos */}
            {x.length > 0 && (
                <Card style={{ marginHorizontal: 16, marginBottom: 8 }}>
                    <Card.Content style={{ paddingVertical: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Icon name="information-outline" size={20} color={periodInfo.color} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12, fontWeight: '600' }}>
                                    Mostrando {x.length} registros
                                </Text>
                                <Text style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>
                                    {periodInfo.type === 'DIA' && `Del día 1 al ${x.length} del mes`}
                                    {periodInfo.type === 'MES' && `Desde ${x[0]} hasta ${x[x.length - 1]}`}
                                    {periodInfo.type === 'HORA' && `Análisis por horas del día`}
                                    {periodInfo.type === 'AÑO' && `Comparativa anual de ${x.length} años`}
                                    {periodInfo.type === 'GENERAL' && `Análisis general del período`}
                                </Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>
            )}

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
                                            style={{ backgroundColor: periodInfo.color + '33', height: 24 }}
                                            textStyle={{ color: periodInfo.color, fontWeight: 'bold', fontSize: 10 }}
                                        >
                                            {periodInfo.label}
                                        </Chip>
                                        <Chip icon="trending-up" style={{ backgroundColor: '#4CAF5033', height: 24 }}>
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
                                            style={{ backgroundColor: periodInfo.color + '33', height: 24 }}
                                            textStyle={{ color: periodInfo.color, fontWeight: 'bold', fontSize: 10 }}
                                        >
                                            {periodInfo.label}
                                        </Chip>
                                        <Chip icon="trending-up" style={{ backgroundColor: '#2196F333', height: 24 }}>
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

                    {selectedView === 'ventas' && ventasLabels.length > 0 && (
                        <Card style={chartStyles.card}>
                            <Card.Content>
                                <View style={chartStyles.header}>
                                    <View style={chartStyles.titleRow}>
                                        <View style={[chartStyles.icon, { backgroundColor: '#FF9800' }]}>
                                            <Icon name="currency-usd" size={24} color="#fff" />
                                        </View>
                                        <Text style={chartStyles.title}>Histórico de Ventas</Text>
                                    </View>
                                </View>

                                {/* Tabs internos de ventas */}
                                <ScrollView 
                                    horizontal 
                                    showsHorizontalScrollIndicator={false}
                                    style={{ marginBottom: 16, marginTop: 8 }}
                                >
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <Chip
                                            icon="chart-line"
                                            selected={ventasViewMode === 'mensual'}
                                            onPress={() => setVentasViewMode('mensual')}
                                            style={{
                                                backgroundColor: ventasViewMode === 'mensual' ? '#FF9800' : theme.colors.surface,
                                                borderColor: '#FF9800',
                                                borderWidth: 1.5
                                            }}
                                            textStyle={{ 
                                                color: ventasViewMode === 'mensual' ? '#fff' : theme.colors.text,
                                                fontWeight: 'bold' 
                                            }}
                                        >
                                            12 Meses
                                        </Chip>
                                        <Chip
                                            icon="account-group"
                                            selected={ventasViewMode === 'por-admin'}
                                            onPress={() => setVentasViewMode('por-admin')}
                                            style={{
                                                backgroundColor: ventasViewMode === 'por-admin' ? '#2196F3' : theme.colors.surface,
                                                borderColor: '#2196F3',
                                                borderWidth: 1.5
                                            }}
                                            textStyle={{ 
                                                color: ventasViewMode === 'por-admin' ? '#fff' : theme.colors.text,
                                                fontWeight: 'bold' 
                                            }}
                                        >
                                            Por Admin
                                        </Chip>
                                        <Chip
                                            icon="alert-circle"
                                            selected={ventasViewMode === 'deudas'}
                                            onPress={() => setVentasViewMode('deudas')}
                                            style={{
                                                backgroundColor: ventasViewMode === 'deudas' ? '#F44336' : theme.colors.surface,
                                                borderColor: '#F44336',
                                                borderWidth: 1.5
                                            }}
                                            textStyle={{ 
                                                color: ventasViewMode === 'deudas' ? '#fff' : theme.colors.text,
                                                fontWeight: 'bold' 
                                            }}
                                        >
                                            Deudas
                                        </Chip>
                                    </View>
                                </ScrollView>

                                {/* Gráfico Mensual (12 meses) */}
                                {ventasViewMode === 'mensual' && (
                                    <>
                                        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                                            <Chip 
                                                icon="calendar-month"
                                                style={{ backgroundColor: '#FF980033', height: 24 }}
                                                textStyle={{ color: '#FF9800', fontWeight: 'bold', fontSize: 10 }}
                                            >
                                                Últimos 12 meses
                                            </Chip>
                                            <Chip icon="trending-up" style={{ backgroundColor: '#4CAF5033', height: 24 }}>
                                                +15%
                                            </Chip>
                                        </View>
                                        <LineChart
                                            data={{
                                                labels: ventasLabels,
                                                datasets: [
                                                    {
                                                        data: totalVendido,
                                                        color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
                                                        strokeWidth: 3
                                                    },
                                                    {
                                                        data: gananciasAdmin,
                                                        color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`,
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
                                                    stroke: "#FF9800"
                                                }
                                            }}
                                            bezier
                                            style={chartStyles.chart}
                                            withShadow={true}
                                            withInnerLines={true}
                                        />
                                    </>
                                )}

                                {/* Gráfico Por Admin (mes actual) */}
                                {ventasViewMode === 'por-admin' && adminLabels.length > 0 && (
                                    <>
                                        <Chip 
                                            icon="calendar-check"
                                            style={{ backgroundColor: '#2196F333', height: 24, marginBottom: 12 }}
                                            textStyle={{ color: '#2196F3', fontWeight: 'bold', fontSize: 10 }}
                                        >
                                            Mes actual
                                        </Chip>
                                        <BarChart
                                            data={{
                                                labels: adminLabels,
                                                datasets: [
                                                    {
                                                        data: ventasPorAdmin.map(v => v.totalVendido)
                                                    }
                                                ]
                                            }}
                                            width={width - 56}
                                            height={240}
                                            yAxisPrefix="$"
                                            fromZero={true}
                                            chartConfig={{
                                                ...chartConfig,
                                                barPercentage: 0.6,
                                                color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                                            }}
                                            style={chartStyles.chart}
                                            showValuesOnTopOfBars={false}
                                        />
                                    </>
                                )}

                                {/* Gráfico de Deudas por Admin */}
                                {ventasViewMode === 'deudas' && adminLabels.length > 0 && (
                                    <>
                                        <Chip 
                                            icon="alert"
                                            style={{ backgroundColor: '#F4433633', height: 24, marginBottom: 12 }}
                                            textStyle={{ color: '#F44336', fontWeight: 'bold', fontSize: 10 }}
                                        >
                                            Pendientes de cobro
                                        </Chip>
                                        <BarChart
                                            data={{
                                                labels: adminLabels,
                                                datasets: [
                                                    {
                                                        data: ventasPorAdmin.map(v => v.deudas)
                                                    }
                                                ]
                                            }}
                                            width={width - 56}
                                            height={240}
                                            yAxisPrefix="$"
                                            fromZero={true}
                                            chartConfig={{
                                                ...chartConfig,
                                                barPercentage: 0.6,
                                                color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
                                            }}
                                            style={chartStyles.chart}
                                            showValuesOnTopOfBars={false}
                                        />
                                    </>
                                )}

                                {ventasViewMode === 'por-admin' && adminLabels.length === 0 && (
                                    <View style={{ padding: 32, alignItems: 'center' }}>
                                        <Icon name="information" size={48} color={theme.colors.disabled} />
                                        <Text style={{ color: theme.colors.disabled, marginTop: 8, textAlign: 'center' }}>
                                            No hay ventas registradas este mes
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
                                        style={{ backgroundColor: periodInfo.color + '33' }}
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
                                    icon={selectedView === 'ventas' ? 'calendar-month' : periodInfo.icon}
                                    style={{ backgroundColor: (selectedView === 'ventas' ? '#FF9800' : periodInfo.color) + '33' }}
                                    textStyle={{ color: selectedView === 'ventas' ? '#FF9800' : periodInfo.color, fontWeight: 'bold', fontSize: 11 }}
                                >
                                    {selectedView === 'ventas' ? '12 meses' : periodInfo.label}
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
                            ) : (
                                <View style={statsStyles.grid}>
                                    <View style={[statsStyles.item, { backgroundColor: '#FF980015', borderLeftColor: '#FF9800' }]}>
                                        <Text style={statsStyles.label}>Promedio Mensual</Text>
                                        <Text 
                                            style={statsStyles.value}
                                            adjustsFontSizeToFit
                                            numberOfLines={1}
                                            minimumFontScale={0.7}
                                        >
                                            ${totalVendido.length > 0 ? (totalVendido.reduce((a, b) => a + b, 0) / totalVendido.length).toFixed(2) : '0.00'}
                                        </Text>
                                    </View>
                                    <View style={[statsStyles.item, { backgroundColor: '#9C27B015', borderLeftColor: '#9C27B0' }]}>
                                        <Text style={statsStyles.label}>Ganancias Promedio</Text>
                                        <Text 
                                            style={statsStyles.value}
                                            adjustsFontSizeToFit
                                            numberOfLines={1}
                                            minimumFontScale={0.7}
                                        >
                                            ${gananciasAdmin.length > 0 ? (gananciasAdmin.reduce((a, b) => a + b, 0) / gananciasAdmin.length).toFixed(2) : '0.00'}
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
                                    <View style={[statsStyles.item, { backgroundColor: '#2196F315', borderLeftColor: '#2196F3' }]}>
                                        <Text style={statsStyles.label}>Margen Ganancia</Text>
                                        <Text 
                                            style={statsStyles.value}
                                            adjustsFontSizeToFit
                                            numberOfLines={1}
                                            minimumFontScale={0.7}
                                        >
                                            {totalVendido.reduce((a, b) => a + b, 0) > 0 
                                                ? ((gananciasAdmin.reduce((a, b) => a + b, 0) / totalVendido.reduce((a, b) => a + b, 0)) * 100).toFixed(1) 
                                                : '0.0'}%
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