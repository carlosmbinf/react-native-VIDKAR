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
export const EvidenciasVentasEfectivoCollection = new Mongo.Collection(
  "evidenciasVentasEfectivo",
);
export const TiendasComercioCollection = new Mongo.Collection(
  "COMERCIO_tiendas",
);
export const ProductosComercioCollection = new Mongo.Collection(
  "COMERCIO_productos",
);
export const Online = new Mongo.Collection("conexiones");
export const PushTokens = new Mongo.Collection("push_tokens");

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
  EvidenciasVentasEfectivoCollection,
  TiendasComercioCollection,
  ProductosComercioCollection,
  Online,
  PushTokens,
};

export default collections;
