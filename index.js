/**
 * @format
 */

import {Alert, AppRegistry, Platform} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import AndroidForegroundService from './NotificacionAndroidForeground';

AppRegistry.registerComponent(appName, () => App);

console.log('Platform.OS', Platform.OS);
if (Platform.OS === 'ios') {
  // Código específico para iOS
} else if (Platform.OS === 'android') {
  AndroidForegroundService()
}
