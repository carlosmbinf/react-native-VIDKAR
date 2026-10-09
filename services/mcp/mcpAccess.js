const PRINCIPAL_ADMIN_USERNAME = "carlosmbinf";

export const isPrincipalAdmin = (user) =>
  String(user?.username || "").trim().toLowerCase() === PRINCIPAL_ADMIN_USERNAME;

export const isMCPAdmin = (user) => user?.profile?.role === "admin" || isPrincipalAdmin(user);
