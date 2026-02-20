import { StyleSheet } from 'react-native';

export const pedidosStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#757575',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#757575',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  listContentTablet: {
    paddingHorizontal: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    gap: 16,
  },
  headerBadge: {
    marginRight: 16,
  },
  badgeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
});

export const cardStyles = StyleSheet.create({
  pedidoCard: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 16,
    borderBottomLeftRadius: 45,
    borderBottomRightRadius: 45,
    marginBottom: 16,
    overflow: 'hidden',
    flex: 1, // ✅ Ocupa altura completa en grid
    minWidth: 0,
    maxWidth: '100%',
    elevation: 4,
  },
  tiendaBanner: {
    paddingVertical: 5,
    paddingHorizontal: 20,
  },
  tiendaBannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tiendaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  tiendaIcon: {
    fontSize: 28,
  },
  tiendaTexts: {
    flex: 1,
  },
  tiendaNombre: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tiendaSubtitle: {
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
    fontStyle: 'italic',
  },
  itemsBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  cardContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1, // ✅ Permite distribución interna
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    minHeight: 70, // ✅ Altura mínima fija
    marginBottom: 16,
  },
  metaLeft: {
    flex: 1,
    gap: 8,
  },
  orderNumber: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  estadoChipText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  metaRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  tiempoLabel: {
    color: '#757575',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tiempoValor: {
    fontWeight: '600',
  },
  sectionDivider: {
    // marginVertical: 8, // Reducido de 16
    backgroundColor: '#E0E0E0',
  },
});

export const productosStyles = StyleSheet.create({
  productosSection: {
    flex: 1, // ✅ NUEVO: Esta sección crece para llenar espacio disponible
    minHeight: 100, // ✅ Altura mínima garantizada
  },
  sectionTitle: {
    fontWeight: '600',
    // color: '#424242',
    marginBottom: 8, // Reducido de 12
    letterSpacing: 0.5,
  },
  productosList: {
    flex: 1, // ✅ Lista flexible dentro de su contenedor
    gap: 8, // Reducido de 12
  },
  productoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4, // Reducido de 8
  },
  cantidadBadge: {
    marginTop: 2,
  },
  productoInfo: {
    flex: 1,
    gap: 6,
  },
  productoNombre: {
    fontWeight: '700',
    lineHeight: 22,
  },
  tiendaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tiendaTagIcon: {
    fontSize: 12,
  },
  tiendaTagText: {
    color: '#1976D2',
    fontWeight: '600',
  },
  comentarioContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 8,
    marginTop: 4, // Reducido de 6
  },
  comentarioIcon: {
    fontSize: 14,
    lineHeight: 18,
  },
  productoComentario: {
    flex: 1,
    fontStyle: 'italic',
    color: '#616161',
    lineHeight: 18,
  },
  productoDivider: {
    marginVertical: 6, // Reducido de 8
    backgroundColor: '#EEEEEE',
  },
});

export const pagoStyles = StyleSheet.create({
  pagoSection: {
    minHeight: 80, // ✅ NUEVO: Altura fija para consistencia
    justifyContent: 'center', // ✅ Centrar contenido verticalmente
    marginVertical: 12,
    gap: 8, // Reducido de 12
  },
  pagoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12, // Reducido de 16
  },
  pagoMetodo: {
    gap: 6,
  },
  pagoLabel: {
    color: '#757575',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pagoChipText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 11,
  },
  pagoTotal: {
    alignItems: 'flex-end',
    gap: 2, // Reducido de 4
  },
  totalLabel: {
    color: '#757575',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValor: {
    fontWeight: 'bold',
  },
});

export const accionesStyles = StyleSheet.create({
  cardActions: {
    minHeight: 90, // ✅ NUEVO: Altura fija para consistencia
    paddingHorizontal: 16,
    paddingVertical: 16,
    // backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    justifyContent: 'center', // ✅ Centrar contenido verticalmente
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  buttonSecondary: {
    borderColor: '#BDBDBD',
  },
  listoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    borderRadius: 8,
    minHeight: 60, // ✅ Altura mínima para consistencia
  },
  listoIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listoIcon: {
    fontSize: 24,
  },
  listoText: {
    flex: 1,
    fontWeight: '600',
    lineHeight: 20,
  },
});

export const sliderStyles = StyleSheet.create({
  sliderContainer: {
    width: '100%',
    marginTop: 8,
  },
  sliderTrack: {
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  sliderText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    zIndex: 1,
  },
  sliderThumb: {
    position: 'absolute',
    left: 4,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 3,
  },
  thumbIcon: {
    fontSize: 30,
    lineHeight: 35,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  progressIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 30,
    zIndex: 0,
  },
});
