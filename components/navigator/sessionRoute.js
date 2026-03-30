export function resolveSessionRoute(userId, user) {
  if (!userId) {
    return '/(auth)/Loguin';
  }

  if (user?.modoCadete) {
    return '/(cadete)/CadeteNavigator';
  }

  if (user?.modoEmpresa && user?.profile?.roleComercio?.includes('EMPRESA')) {
    return '/(empresa)/EmpresaNavigator';
  }

  return '/(normal)/Main';
}