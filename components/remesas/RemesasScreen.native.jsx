import MeteorBase from "@meteorrn/core";
import { ScrollView, StyleSheet } from "react-native";
import { Surface, Text } from "react-native-paper";

import AppHeader from "../Header/AppHeader";
import FormularioRemesa from "./FormularioRemesa.native";
import TableListRemesa from "./TableListRemesa.native";
import VentasStepper from "./VentasStepper.native";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const RemesasScreen = () => {
  const user = Meteor.useTracker(() => Meteor.user());

  return (
    <Surface style={styles.screen}>
      <AppHeader
        title="Remesas"
        subtitle="Formulario y seguimiento"
        backHref="/(normal)/Main"
        showBackButton
      />
      <ScrollView contentContainerStyle={styles.content}>
        {user?.permiteRemesas ? (
          <FormularioRemesa />
        ) : (
          <Surface style={styles.disabledCard} elevation={1}>
            <Text style={styles.disabledText}>
              No se puede realizar remesas por el momento.
            </Text>
          </Surface>
        )}
        <VentasStepper />
        <TableListRemesa />
      </ScrollView>
    </Surface>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
  disabledCard: {
    borderRadius: 16,
    margin: 16,
    padding: 18,
  },
  disabledText: {
    textAlign: "center",
  },
  screen: {
    flex: 1,
  },
});

export default RemesasScreen;
