import CommerceCategoriesManagementScreen from "../../components/users/commerce-categories-management-screen";
import { EMPRESA_BRAND } from "../../components/empresa/styles/empresaTheme";

export default function UserCommerceCategoriesRoute() {
  return <CommerceCategoriesManagementScreen headerBackgroundColor={EMPRESA_BRAND} profileRoute="/(empresa)/User" servicesRoute="/(empresa)/UserServices" />;
}
