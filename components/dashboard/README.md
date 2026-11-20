# Centro de Analítica VIDKAR (Dashboard)

Módulo ejecutivo de analítica de datos e inteligencia de negocio para VIDKAR Mobile (Expo / React Native).

## Dimensiones de Datos Analizadas

1. **Tráfico de Red y Servicios (VPN & Proxy)**:
   - Volumen de transferencias acumulado en Gigabytes / Terabytes.
   - Comparativo dinámico de tráfico en túnel VPN vs conexiones Proxy.
   - Ratio de adopción: Usuarios activos en el periodo vs total registrado.
   - Navegación temporal interactiva: Últimas 24 Horas (`HORA`), Mes Actual (`DIARIO`) e Histórico Anual (`MENSUAL`).

2. **Finanzas y Rentabilidad de Recargas**:
   - Facturación bruta real (USD cobrado).
   - Costo operativo directo de adquisición de saldo de proveedores.
   - Ganancia neta consolidada y margen porcentual de beneficio.
   - Métricas promedio: Ticket medio y utilidad neta por recarga procesada.
   - Desglose por moneda (USD, CUP, MLC, etc.) y canal de pago (Transfermóvil, EnZona, etc.).
   - Curva de tendencia mensual e identificación del mes récord de utilidad.

3. **Rendimiento Comercial de Distribuidores y Ventas**:
   - Facturación Vidkar del periodo vs comisiones devengadas por administradores.
   - Cartera pendiente por cobrar y volumen transaccionado total.
   - Comparativa y ranking por distribuidor (Ventas, Comisiones, Deudas).
   - Acumulado consolidado a 12 meses y balance histórico total.

## Componentes

- `DashboardScreen.native.jsx`: Hub ejecutivo con barra de navegación por dominios (`Resumen`, `Tráfico de Red`, `Finanzas`, `Distribuidores`, `Vista Completa`).
- `DashBoardPrincipal.native.jsx`: Módulo interactivo de tráfico de red y ventas con selector dinámico de horizonte temporal.
- `RechargeProfitCard.native.jsx`: Tarjeta financiera ejecutiva con selector de tendencia, divisas y métodos de cobro.
- `KPICard.jsx`: Tarjeta de métrica con gradiente, animación fluida y badges de variación.
- `CustomSegmentedButtons.jsx`: Selector segmentado táctil para filtrado interactivo.
