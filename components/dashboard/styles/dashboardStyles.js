import { Platform, StyleSheet } from "react-native";

export const dashboardStyles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 260,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  loadingText: {
    fontSize: 15,
    marginTop: 14,
    opacity: 0.72,
  },
  header: {
    marginBottom: 18,
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
    gap: 6,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    opacity: 0.72,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.74,
  },
  sourceCard: {
    borderRadius: 18,
    marginBottom: 16,
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
});

export const kpiCardStyles = StyleSheet.create({
  card: {
    borderRadius: 18,
    flex: 1,
    minHeight: 148,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 18,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  gradient: {
    flex: 1,
    justifyContent: "space-between",
    minHeight: 148,
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
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  trendChip: {
    backgroundColor: "rgba(255,255,255,0.18)",
    height: 28,
    justifyContent: "center",
  },
  trendText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  value: {
    color: "#ffffff",
    fontWeight: "900",
    marginTop: 10,
  },
  subtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 8,
  },
});

export const segmentedButtonsStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  button: {
    borderWidth: 1,
    minHeight: 40,
  },
  buttonActive: {},
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
    borderRadius: 20,
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
        elevation: 3,
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
    paddingRight: 12,
  },
  icon: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  chipColumn: {
    alignItems: "flex-end",
    gap: 6,
  },
  chart: {
    alignSelf: "center",
    borderRadius: 18,
    marginVertical: 8,
  },
  insightBox: {
    borderRadius: 16,
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: "800",
    opacity: 0.8,
  },
  insightRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  insightLabel: {
    fontSize: 12,
    opacity: 0.72,
  },
  insightValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  chartEmpty: {
    alignItems: "center",
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 8,
    justifyContent: "center",
    minHeight: 220,
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
    paddingBottom: 28,
  },
  heroCard: {
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 16,
    overflow: "hidden",
  },
  heroContent: {
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    opacity: 0.68,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.78,
  },
  heroChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});

export default dashboardStyles;
