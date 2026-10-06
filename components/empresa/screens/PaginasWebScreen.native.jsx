import EmpresaTopBar from "../components/EmpresaTopBar.native";
import PaginasWebScreen from "./EmpresaWebsitesScreen";

export default function NativePaginasWebScreen() {
  return <PaginasWebScreen header={<EmpresaTopBar title="Páginas web" subtitle="Creación y seguimiento" />} />;
}
