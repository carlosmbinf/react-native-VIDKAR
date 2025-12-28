import { NativeModules } from 'react-native';

const { MyServiceModule } = NativeModules;

export default {
  start: () => MyServiceModule.startService(),
  stop: () => MyServiceModule.stopService(),
//   isRunning: (resolve) => MyServiceModule.isServiceRunning(resolve),
isRunning: () => {
    return new Promise((resolve, reject) => {
        MyServiceModule.isServiceRunning(resolve, reject);
    });
},
  setMeteorUserId: (userId) => MyServiceModule.setMeteorUserId(userId),
};
