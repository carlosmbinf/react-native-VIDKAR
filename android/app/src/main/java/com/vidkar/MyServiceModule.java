package com.vidkar;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class MyServiceModule extends ReactContextBaseJavaModule {

    private static ReactApplicationContext reactContext;

    public MyServiceModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "MyServiceModule";
    }

    @ReactMethod
    public void startService() {
        Intent intent = new Intent(reactContext, MyTrackingService.class);
        reactContext.startService(intent);
    }

    @ReactMethod
    public void setMeteorUserId(String userId) {
        SharedPreferences prefs = reactContext
                .getSharedPreferences("vidkar_prefs", Context.MODE_PRIVATE);

        prefs.edit()
                .putString("meteorUserId", userId)
                .apply();
    }

    @ReactMethod
    public void stopService() {
        Intent intent = new Intent(reactContext, MyTrackingService.class);
        reactContext.stopService(intent);
    }

    @ReactMethod
    public void isServiceRunning(Promise promise) {
        // versión simple (si quieres más exactitud se hace con ActivityManager)
        promise.resolve(true);
    }
}
