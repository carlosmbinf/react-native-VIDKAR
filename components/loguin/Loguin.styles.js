import { StyleSheet } from "react-native";

export const loginScreenStyles = StyleSheet.create({
  screen: {
    minHeight: "100%",
    minWidth: "100%",
  },
  safeArea: {
    position: "absolute",
    minHeight: "100%",
    minWidth: "100%",
  },
  scrollLandscapeContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 0,
  },
  mainLandscape: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  mainPortrait: {
    flexDirection: "column",
  },
  container: {
    alignItems: "center",
    justifyContent: "center",
    margin: 10,
    zIndex: 1,
  },
  brandLandscape: {
    marginRight: 24,
  },
  formLandscape: {
    marginLeft: 24,
  },
  blurCard: {
    position: "relative",
    borderRadius: 25,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  blurCardContent: {
    padding: 15,
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    justifyContent: "center",
    alignContent: "center",
    textAlign: "center",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "transparent",
    width: 250,
    marginBottom: 10,
  },
  altText: {
    fontSize: 16,
    justifyContent: "center",
    alignContent: "center",
    textAlign: "center",
  },
  serverRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  serverInput: {
    backgroundColor: "transparent",
    flex: 1,
    marginRight: 8,
  },
  reconnectButton: {
    height: 36,
  },
  reconnectButtonContent: {
    height: 36,
  },
  statusText: {
    color: "#ffffff",
    marginBottom: 10,
    textAlign: "center",
  },
});
