const PRINCIPAL_ADMIN_USERNAME = "carlosmbinf";

export const isMCPAdmin = (user) =>
  user?.profile?.role === "admin"
  || String(user?.username || "").trim().toLowerCase() === PRINCIPAL_ADMIN_USERNAME;
