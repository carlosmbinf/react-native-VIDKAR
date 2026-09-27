import MCPSettingsScreen from "../../components/mcp/MCPSettingsScreen";
import { EMPRESA_BRAND } from "../../components/empresa/styles/empresaTheme";

export default function MCPSettingsRoute() {
  return (
    <MCPSettingsScreen
      backHref="/(empresa)/EmpresaNavigator"
      headerBackgroundColor={EMPRESA_BRAND}
    />
  );
}
