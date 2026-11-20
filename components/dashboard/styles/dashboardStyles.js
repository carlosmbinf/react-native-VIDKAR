import { Platform, StyleSheet } from "react-native";

export const dashboardStyles = StyleSheet.create({
  section: {
    paddingBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 240,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 14,
    opacity: 0.76,
  },
  header: {
    marginBottom: 16,
  },
  headerTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headerTitleBlock: {
    flex: 1,
    gap: 4,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    opacity: 0.78,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.72,
  },
  sourceCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
  },
  sourceCardContent: {
    gap: 12,
  },
  sourceRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  sourceIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  sourceTextBlock: {
    flex: 1,
    gap: 2,
  },
  sourceLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  sourceDescription: {
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.7,
  },
  kpiContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  segmentedContainer: {
    marginBottom: 14,
  },
  horizonContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  horizonButton: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 10,
  },
  horizonButtonActive: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  horizonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  horizonTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
});

export const kpiCardStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    minHeight: 144,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  gradient: {
    flex: 1,
    justifyContent: "space-between",
    minHeight: 144,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconContainer: {
    alignItems: "center",
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  trendChip: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 10,
    height: 26,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  trendText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  title: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  value: {
    color: "#ffffff",
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 6,
  },
  subtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 6,
  },
});

export const segmentedButtonsStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  button: {
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 38,
  },
  buttonActive: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  buttonTextActive: {
    fontWeight: "800",
  },
});

export const chartStyles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  titleRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
    paddingRight: 10,
  },
  icon: {
    alignItems: "center",
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
  },
  chipColumn: {
    alignItems: "flex-end",
    gap: 6,
  },
  chart: {
    alignSelf: "center",
    borderRadius: 18,
    marginVertical: 6,
  },
  insightBox: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  insightRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  insightLabel: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.72,
  },
  insightValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  chartEmpty: {
    alignItems: "center",
    borderRadius: 18,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 8,
    justifyContent: "center",
    minHeight: 210,
    padding: 24,
  },
  chartEmptyTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  chartEmptyText: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.7,
    textAlign: "center",
  },
});

export const statsStyles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  item: {
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minWidth: "46%",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 6,
    opacity: 0.7,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 20,
    fontWeight: "800",
  },
});

export const chartSkeletonStyles = StyleSheet.create({
  container: {
    borderRadius: 18,
    height: 180,
    justifyContent: "center",
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
    width: "100%",
  },
  line: {
    borderRadius: 6,
    height: 12,
    opacity: 0.3,
    width: "100%",
  },
  lineShort: {
    marginTop: 12,
    width: "78%",
  },
  lineShorter: {
    marginTop: 12,
    width: "56%",
  },
});

export const dashboardScreenStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 36,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  heroContent: {
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  heroTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroLiveBadge: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroLiveDot: {
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  heroLiveText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.78,
  },
  domainNavWrapper: {
    marginTop: 14,
  },
  domainNavScroll: {
    gap: 8,
    paddingHorizontal: 16,
  },
  domainNavButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  domainNavButtonActive: {
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  domainNavText: {
    fontSize: 13,
    fontWeight: "700",
  },
  domainNavTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  overviewSection: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  overviewSectionHeader: {
    gap: 4,
    marginBottom: 14,
  },
  overviewSectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  overviewSectionSubtitle: {
    fontSize: 13,
    opacity: 0.72,
  },
  overviewActionCard: {
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    marginBottom: 10,
    overflow: "hidden",
    padding: 16,
  },
  overviewActionIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  overviewActionTextCol: {
    flex: 1,
    gap: 3,
    justifyContent: "center",
  },
  overviewActionTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  overviewActionDesc: {
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.72,
  },
  overviewActionArrow: {
    alignItems: "center",
    justifyContent: "center",
  },
  footerNotice: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 18,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.65,
    textAlign: "center",
  },
});

export default dashboardStyles;
