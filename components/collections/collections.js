import Meteor, {Mongo, withTracker} from '@meteorrn/core';
import React, {useRef, useEffect, useState} from 'react';

export const Logs = new Meteor.Collection('Logs')
export const Mensajes = new Meteor.Collection('mensajes')
export const Online = new Meteor.Collection('online')
export const RegisterDataUsers = new Meteor.Collection('registerDataUsers')
export const PelisRegister = new Meteor.Collection('pelisRegister');