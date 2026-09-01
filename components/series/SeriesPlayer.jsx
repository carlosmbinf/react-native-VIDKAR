import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

export default function SeriesPlayerWeb() {
  return <View style={styles.screen}><Text variant="headlineSmall">Reproducción de Series</Text><Text style={styles.copy}>La reproducción de capítulos está disponible en la aplicación nativa con VLC.</Text><Button mode="outlined" onPress={() => Linking.openURL("https://www.vidkar.com")}>Volver a VIDKAR</Button></View>;
}

const styles = StyleSheet.create({ screen: { alignItems: "center", backgroundColor: "#020617", flex: 1, gap: 16, justifyContent: "center", padding: 24 }, copy: { color: "#cbd5e1", maxWidth: 420, textAlign: "center" } });
