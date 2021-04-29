/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import ReactNativeForegroundService from '@supersami/rn-foreground-service';
import Meteor, {withTracker} from '@meteorrn/core';
ReactNativeForegroundService.register();
AppRegistry.registerComponent(appName, () => App);
Meteor.connect('ws://152.206.119.5:3000/websocket'); // Note the /websocket after your URL



