import { NativeModules } from 'react-native';

const { MyServiceModule } = NativeModules;

export default {
  start: () => MyServiceModule ? MyServiceModule.startService() : (console.log('MyServiceModule no está disponible')),
  stop: () => MyServiceModule ? MyServiceModule.stopService() : (console.log('MyServiceModule no está disponible')),
//   isRunning: (resolve) => MyServiceModule.isServiceRunning(resolve),
isRunning: () => {
    return new Promise((resolve, reject) => {
        MyServiceModule ? MyServiceModule.isServiceRunning(resolve, reject) : (console.log('MyServiceModule no está disponible'));
    });
},
  setMeteorUserId: (userId) => MyServiceModule.setMeteorUserId(userId),
};
