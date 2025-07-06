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
