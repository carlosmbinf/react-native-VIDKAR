package com.vidkar;

import com.facebook.react.ReactActivity;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import android.content.Intent;
import android.os.Bundle;
import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;
import javax.annotation.Nullable;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class MainActivity extends ReactActivity {
public  boolean  isOnNewIntent = false;
  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
   @Override
    public  void  onNewIntent(Intent  intent) {
        super.onNewIntent(intent);
        isOnNewIntent = true;
        ForegroundEmitter();
    }
     @Override
    protected  void  onStart() {
        super.onStart();
        if(isOnNewIntent == true){}else {
            ForegroundEmitter();
        }
    }
    public void ForegroundEmitter(){
      String main = getIntent().getStringExtra("mainOnPress");
      String btn = getIntent().getStringExtra("buttonOnPress");
      WritableMap map = Arguments.createMap();
      if(main != null){
        map.putString("main",main);
      }
      if(btn != null){
        map.putString("button",main);
      }
      try {
        getReactInstanceManager().getCurrentReactContext().getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit("notificationClickHandle",map);
      } catch (Exception e) {
        //TODO: handle exception
        // console.log.e("SuperLog","Caught Exception: " + e.getMessage());
      }
    }

  @Override
  protected String getMainComponentName() {
    return "Vidkar";
  }
}
