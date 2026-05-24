export function userHasEmpresaRole(user) {
  const roleComercio = user?.profile?.roleComercio;

  if (Array.isArray(roleComercio)) {
    return roleComercio.includes('EMPRESA');
  }

  return String(roleComercio || '').includes('EMPRESA');
}

export function resolveSessionRoute(userId, user) {
  if (!userId) {
    return '/(auth)/Loguin';
  }

  if (user?.modoCadete) {
    return '/(cadete)/CadeteNavigator';
  }

  if (user?.modoEmpresa && userHasEmpresaRole(user)) {
    return '/(empresa)/EmpresaNavigator';
  }

  return '/(normal)/Main';
}