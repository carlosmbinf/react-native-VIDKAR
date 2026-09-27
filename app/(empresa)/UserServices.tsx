import WelcomeServicesManagementScreen from "../../components/users/welcome-services-management-screen";
import { EMPRESA_BRAND } from "../../components/empresa/styles/empresaTheme";

export default function UserServicesRoute() {
  return (
    <WelcomeServicesManagementScreen
      headerBackgroundColor={EMPRESA_BRAND}
      profileRoute="/(empresa)/User"
    />
  );
}
