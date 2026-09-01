import Meteor, { Mongo } from "@meteorrn/core";

export const Logs = new Meteor.Collection("Logs");
export const Mensajes = new Meteor.Collection("mensajes");
export const PreciosCollection = new Meteor.Collection("precios");
export const PreciosRechargeCollection = new Mongo.Collection(
  "precios_Recharge",
);
export const VentasCollection = new Mongo.Collection("ventas");
export const VentasRechargeCollection = new Mongo.Collection("ventas_Recharge");
export const OrdenesCollection = new Mongo.Collection("ordenes_Recharge");
export const CarritoCollection = new Mongo.Collection("carrito_Recharge");
export const PreciosDolarCollection = new Mongo.Collection("preciosDolar");
export const AsignacionRemesaAdminCollection = new Mongo.Collection(
  "asignacionRemesaAdmins_Recharge",
);
export const ServersCollection = new Mongo.Collection("servers");
export const CallsCollection = new Mongo.Collection("calls");
export const ConfigCollection = new Mongo.Collection("config");
export const VersionsCollection = new Mongo.Collection("versions");
export const TransaccionRecargasCollection = new Mongo.Collection(
  "transaccionRecargas_DTSHOP",
);
export const ProductosRechargeCollection = new Mongo.Collection(
  "productos_Recharge",
);
export const ProductosDescriptionsCollection = new Mongo.Collection(
  "productosDescriptions_Recharge",
);
export const CountriesCollection = new Mongo.Collection("countries_Recharge");
export const ProvidersCollection = new Mongo.Collection("providers_Recharge");
export const RegionsCollection = new Mongo.Collection("regions_Recharge");
export const DTShopProductosCollection = new Mongo.Collection(
  "dtshopProductos_Recharge",
);
export const PelisCollection = new Mongo.Collection("pelisRegister");
export const SeriesCollection = new Mongo.Collection("series");
export const TemporadasCollection = new Mongo.Collection("seriesTemporadas");
export const CapitulosCollection = new Mongo.Collection("seriesCapitulos");
export const CursosCollection = new Mongo.Collection("cursos");
export const LeccionesCursoCollection = new Mongo.Collection("cursos_lecciones");
export const SuscripcionesCursoCollection = new Mongo.Collection(
  "cursos_suscripciones",
);
export const CursosGananciasConfigCollection = new Mongo.Collection(
  "cursos_ganancias_config",
);
export const CursosGananciasAsignacionesCollection = new Mongo.Collection(
  "cursos_ganancias_asignaciones",
);
export const CursosGananciasMovimientosCollection = new Mongo.Collection(
  "cursos_ganancias_movimientos",
);
export const CursosCategoriasCollection = new Mongo.Collection(
  "cursos_categorias",
);
export const EvaluacionesIASesionesCollection = new Mongo.Collection(
  "evaluaciones_ia_sesiones",
);
export const EvaluacionesIAAsignacionesCollection = new Mongo.Collection(
  "evaluaciones_ia_asignaciones",
);
export const EvidenciasVentasEfectivoCollection = new Mongo.Collection(
  "evidenciasVentasEfectivo",
);
export const TiendasComercioCollection = new Mongo.Collection(
  "COMERCIO_tiendas",
);
export const ProductosComercioCollection = new Mongo.Collection(
  "COMERCIO_productos",
);
export const VentasComercioCollection = new Mongo.Collection("COMERCIO_ventas");
export const PedidosAsignadosComercioCollection = new Mongo.Collection(
  "COMERCIO_pedidosAsignados",
);
export const ColaCadetesPorTiendasComercioCollection = new Mongo.Collection(
  "COMERCIO_colacadetesxtiendas",
);
export const Online = new Mongo.Collection("online");
export const PushTokens = new Mongo.Collection("push_tokens");
export const NotificacionUsersConectadosVPNCollection = new Mongo.Collection(
  "notificacionUsersConectadosVPN",
);

export const collections = {
  Logs,
  Mensajes,
  PreciosCollection,
  PreciosRechargeCollection,
  VentasCollection,
  VentasRechargeCollection,
  OrdenesCollection,
  CarritoCollection,
  PreciosDolarCollection,
  AsignacionRemesaAdminCollection,
  ServersCollection,
  CallsCollection,
  ConfigCollection,
  VersionsCollection,
  TransaccionRecargasCollection,
  ProductosRechargeCollection,
  ProductosDescriptionsCollection,
  CountriesCollection,
  ProvidersCollection,
  RegionsCollection,
  DTShopProductosCollection,
  PelisCollection,
  SeriesCollection,
  TemporadasCollection,
  CapitulosCollection,
  CursosCollection,
  LeccionesCursoCollection,
  SuscripcionesCursoCollection,
  CursosGananciasConfigCollection,
  CursosGananciasAsignacionesCollection,
  CursosGananciasMovimientosCollection,
  CursosCategoriasCollection,
  EvaluacionesIASesionesCollection,
  EvaluacionesIAAsignacionesCollection,
  EvidenciasVentasEfectivoCollection,
  TiendasComercioCollection,
  ProductosComercioCollection,
  VentasComercioCollection,
  PedidosAsignadosComercioCollection,
  ColaCadetesPorTiendasComercioCollection,
  Online,
  PushTokens,
  NotificacionUsersConectadosVPNCollection,
};

export default collections;
