import { StyleSheet } from "react-native";

export const loginScreenStyles = StyleSheet.create({
  altText: {
    color: "rgba(226, 232, 240, 0.82)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textAlign: "center",
    textTransform: "uppercase",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  blurCard: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 32,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    width: "100%",
  },
  blurCardContent: {
    alignItems: "stretch",
    paddingHorizontal: 28,
    paddingVertical: 28,
  },
  brandBadge: {
    alignItems: "center",
    backgroundColor: "rgba(37, 99, 235, 0.24)",
    borderColor: "rgba(191, 219, 254, 0.18)",
    borderRadius: 28,
    borderWidth: 1,
    height: 84,
    justifyContent: "center",
    marginBottom: 22,
    width: 84,
  },
  brandDescription: {
    color: "rgba(226, 232, 240, 0.86)",
    fontSize: 16,
    lineHeight: 26,
    maxWidth: 520,
  },
  brandEyebrow: {
    color: "#93c5fd",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  brandHighlightCard: {
    backgroundColor: "rgba(15, 23, 42, 0.34)",
    borderColor: "rgba(148, 163, 184, 0.16)",
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 148,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  brandHighlightLabel: {
    color: "rgba(191, 219, 254, 0.78)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  brandHighlights: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 30,
  },
  brandHighlightValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  brandPanel: {
    justifyContent: "center",
  },
  brandPanelStacked: {
    marginBottom: 24,
    width: "100%",
  },
  brandPanelWide: {
    flex: 1,
    maxWidth: 560,
    paddingRight: 26,
  },
  brandTitle: {
    color: "#ffffff",
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: 1.6,
    lineHeight: 50,
    marginBottom: 16,
  },
  screen: {
    flex: 1,
  },
  dividerLine: {
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    flex: 1,
    height: 1,
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    marginTop: 4,
  },
  fieldsBlock: {
    gap: 12,
    marginBottom: 20,
  },
  footerPanel: {
    marginTop: 18,
  },
  footerText: {
    color: "rgba(226, 232, 240, 0.74)",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  formDescription: {
    color: "rgba(226, 232, 240, 0.78)",
    fontSize: 14,
    lineHeight: 22,
  },
  formEyebrow: {
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  formHeader: {
    marginBottom: 24,
  },
  formPanel: {
    maxWidth: 480,
    width: "100%",
  },
  safeArea: {
    flex: 1,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.02)",
    width: "100%",
  },
  layoutShell: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: "auto",
    width: "100%",
  },
  layoutShellStacked: {
    maxWidth: 560,
  },
  layoutShellWide: {
    columnGap: 32,
    flexGrow: 1,
    flexDirection: "row",
    justifyContent: "center",
    maxWidth: 1180,
  },
  mainLandscape: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  mainPortrait: {
    flexDirection: "column",
  },
  primaryButton: {
    borderRadius: 16,
    marginTop: 2,
  },
  primaryButtonContent: {
    height: 52,
  },
  primaryButtonLabel: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  reconnectButton: {
    borderRadius: 14,
    height: 52,
  },
  reconnectButtonContent: {
    height: 52,
    paddingHorizontal: 4,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  scrollContentCentered: {
    justifyContent: "center",
  },
  scrollContentStacked: {
    justifyContent: "flex-start",
  },
  serverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  serverCard: {
    backgroundColor: "rgba(15, 23, 42, 0.22)",
    borderColor: "rgba(148, 163, 184, 0.16)",
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 18,
    padding: 14,
  },
  serverInput: {
    backgroundColor: "rgba(255,255,255,0.02)",
    flex: 1,
  },
  serverLabel: {
    color: "rgba(226, 232, 240, 0.8)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  socialButtons: {
    gap: 10,
  },
  socialSection: {
    marginTop: 18,
  },
  secondaryButton: {
    borderColor: "rgba(191, 219, 254, 0.22)",
    borderRadius: 16,
  },
  secondaryButtonContent: {
    height: 50,
  },
  statusText: {
    color: "#93c5fd",
    marginTop: 12,
    textAlign: "center",
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
    marginBottom: 10,
    textAlign: "left",
  },
});
