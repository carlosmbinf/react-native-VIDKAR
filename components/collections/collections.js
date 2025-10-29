import Meteor, {Mongo, withTracker} from '@meteorrn/core';

export const Logs = new Meteor.Collection('Logs')
export const Mensajes = new Meteor.Collection('mensajes')
export const Online = new Meteor.Collection('online')
export const RegisterDataUsers = new Meteor.Collection('registerDataUsers')
export const PelisRegister = new Meteor.Collection('pelisRegister');
export const PreciosCollection = new Meteor.Collection('precios');
export const VentasCollection = new Mongo.Collection('ventas');
export const ServersCollection = new Mongo.Collection("servers");
export const CallsCollection = new Mongo.Collection("calls");
export const SignalsCollection = new Mongo.Collection("signals");



///////////////////////////////////NUEVOS PARA RECARGAS//////////////
export const LogsRechargeCollection = new Mongo.Collection("Logs_Recharge");
export const PreciosRechargeCollection = new Mongo.Collection("precios_Recharge");
export const VentasRechargeCollection = new Mongo.Collection("ventas_Recharge");
export const OrdenesCollection = new Mongo.Collection("ordenes_Recharge");
export const CarritoCollection = new Mongo.Collection("carrito_Recharge");
export const PreciosDolarCollection = new Mongo.Collection("preciosDolar");
export const AsignacionRemesaAdminCollection = new Mongo.Collection("asignacionRemesaAdmins_Recharge");
export const ConfigCollection = new Mongo.Collection("config");

export const TransaccionRecargasCollection = new Mongo.Collection("transaccionRecargas_DTSHOP");

export const ProductosCollection = new Mongo.Collection("productos_Recharge");
export const ProductosDescriptionsCollection = new Mongo.Collection("productosDescriptions_Recharge");
export const CountriesCollection = new Mongo.Collection("countries_Recharge");
export const ProvidersCollection = new Mongo.Collection("providers_Recharge");
export const RegionsCollection = new Mongo.Collection("regions_Recharge");

/////////////////////DTSHOP////////////////////////////////////
export const DTShopProductosCollection = new Mongo.Collection("dtshopProductos_Recharge");
export const EvidenciasVentasEfectivoCollection = new Mongo.Collection("evidenciasVentasEfectivo");
////////////////////////////////////////////////////////////////////

export const PushTokens = new Mongo.Collection('push_tokens'); // { userId, token, platform, deviceId?, createdAt, updatedAt }

