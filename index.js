/**
 * @format
 */

import {Alert, AppRegistry, NativeModules, Platform} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import AndroidForegroundService from './NotificacionAndroidForeground';
import Main from './Main';
// import BackgroundTask from './services/SomeTaskName';
import SomeTaskName from './services/SomeTaskName';


try {
  
  
  AppRegistry.registerComponent(appName, () => Main);

  AppRegistry.registerHeadlessTask('MyBackgroundService', () => require('./services/SomeTaskName'));

  console.log("NativeModules", NativeModules);
  AppRegistry.startHeadlessTask(100000,"MyBackgroundService",{});
  

  console.log('Platform.OS', Platform.OS);
  if (Platform.OS === 'ios') {
    // Código específico para iOS
  } else if (Platform.OS === 'android') {
    // AndroidForegroundService()
  }
} catch (error) {
  console.log('error', error);
  
}
