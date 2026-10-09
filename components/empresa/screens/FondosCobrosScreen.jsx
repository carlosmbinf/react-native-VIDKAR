import AppHeader from "../../Header/AppHeader";
import { EMPRESA_BRAND } from "../styles/empresaTheme";
import FondosCobrosContent from "./FondosCobrosContent";

export default function FondosCobrosScreen() {
  return (
    <FondosCobrosContent
      header={(
        <AppHeader
          backHref="/(empresa)/EmpresaNavigator"
          backgroundColor={EMPRESA_BRAND}
          showBackButton
          subtitle="Saldo y destino de liquidaciones"
          title="Fondos y cobros"
        />
      )}
    />
  );
}