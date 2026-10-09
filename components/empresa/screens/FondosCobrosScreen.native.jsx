import EmpresaTopBar from "../components/EmpresaTopBar.native";
import FondosCobrosContent from "./FondosCobrosContent";

export default function NativeFondosCobrosScreen() {
  return (
    <FondosCobrosContent
      header={<EmpresaTopBar title="Fondos y cobros" subtitle="Saldo y destino de liquidaciones" />}
    />
  );
}