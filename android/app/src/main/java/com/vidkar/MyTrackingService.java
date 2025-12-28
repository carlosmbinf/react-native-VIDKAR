package com.vidkar;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.*;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.*;

import org.json.JSONObject;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.Executors;

public class MyTrackingService extends Service {

    private static final String TAG = "MyTrackingService";
    private static final String CHANNEL_ID = "vidkar_tracking";

    private static final String BASE_URL = "https://ht7cpzhf-3000.brs.devtunnels.ms";
    private static final String LOCATION_URL = BASE_URL + "/api/location";
    private static final String CADETE_ACTIVE_URL = BASE_URL + "/api/cadete/isActive";

    private static final long CHECK_INTERVAL = 20_000;

    private FusedLocationProviderClient fusedClient;
    private LocationCallback locationCallback;
    private boolean trackingActive = false;

    private Handler handler;
    private Runnable cadeteChecker;

    @Override
    public void onCreate() {
        Log.d("TAG", "onCreate");
        super.onCreate();

        createNotificationChannel();


        fusedClient = LocationServices.getFusedLocationProviderClient(this);

        handler = new Handler(Looper.getMainLooper());
        cadeteChecker = this::checkCadeteMode;

        handler.post(cadeteChecker);
    }

    // ================== CORE LOGIC ==================

    private void checkCadeteMode() {
        Log.d("TAG", "checkCadeteMode");
        Executors.newSingleThreadExecutor().execute(() -> {
            String userId = getMeteorUserId();
            if (userId == null) return;

            boolean active = isCadeteModeActive(userId);
            Log.d("TAG", "isCadeteModeActive: "+ active);
            Log.d("TAG", "trackingActive: "+ trackingActive);

            if (active && !trackingActive) {
                Log.d("TAG", "Iniciando StartForeground ");

                startForeground(1001, buildNotification());
                startLocationUpdates();
            }

            if (!active && trackingActive) {
                Log.d("TAG", "Deteniendo stopForeground ");
                stopForeground(true);
                stopLocationUpdates();
            }

            handler.postDelayed(cadeteChecker, CHECK_INTERVAL);
        });
    }

    // ================== LOCATION ==================

    private void startLocationUpdates() {
        Log.d(TAG, "📍 startLocationUpdates");
        if (trackingActive) return;

        if (ActivityCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        LocationRequest request = LocationRequest.create()
                .setInterval(20_000)
                .setFastestInterval(15_000)
                .setPriority(Priority.PRIORITY_HIGH_ACCURACY);

        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                Location loc = result.getLastLocation();
                if (loc != null) sendLocation(loc);
            }
        };

        fusedClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper());
        trackingActive = true;

        Log.d(TAG, "📍 Tracking ACTIVADO");
    }

    private void stopLocationUpdates() {
        if (!trackingActive) return;

        fusedClient.removeLocationUpdates(locationCallback);
        locationCallback = null;
        trackingActive = false;

        Log.d(TAG, "🛑 Tracking DESACTIVADO");
    }

    // ================== NETWORK ==================

    private boolean isCadeteModeActive(String userId) {
        try {
            HttpURLConnection conn = (HttpURLConnection) new URL(CADETE_ACTIVE_URL).openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");

            JSONObject json = new JSONObject();
            json.put("userId", userId);

            OutputStream os = conn.getOutputStream();
            os.write(json.toString().getBytes());
            os.close();

            if (conn.getResponseCode() != 200) return false;

            BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            String resp = br.readLine();
            br.close();

            return new JSONObject(resp).optBoolean("active", false);

        } catch (Exception e) {
            Log.e(TAG, "Error consultando modoCadete", e);
            return false;
        }
    }

    private void sendLocation(Location loc) {
        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                HttpURLConnection conn = (HttpURLConnection) new URL(LOCATION_URL).openConnection();
                conn.setRequestMethod("POST");
                conn.setDoOutput(true);
                conn.setRequestProperty("Content-Type", "application/json");

                JSONObject json = new JSONObject();
                json.put("userId", getMeteorUserId());
                json.put("lat", loc.getLatitude());
                json.put("lng", loc.getLongitude());
                json.put("accuracy", loc.getAccuracy());
                json.put("speed", loc.getSpeed());
                json.put("timestamp", System.currentTimeMillis());

                OutputStream os = conn.getOutputStream();
                os.write(json.toString().getBytes());
                os.close();

                conn.getResponseCode();
                conn.disconnect();

            } catch (Exception e) {
                Log.e(TAG, "Error enviando ubicación", e);
            }
        });
    }

    // ================== UTILS ==================

    private String getMeteorUserId() {
        return getSharedPreferences("vidkar_prefs", MODE_PRIVATE)
                .getString("meteorUserId", null);
    }

    private Notification buildNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Vidkar activo")
                .setContentText("Servicio de tracking en ejecución")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setOngoing(true)
                .build();
    }

    private void createNotificationChannel() {
        Log.d("TAG", "createNotificationChannel");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "Vidkar Tracking",
                    NotificationManager.IMPORTANCE_LOW
            );
            getSystemService(NotificationManager.class).createNotificationChannel(ch);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(cadeteChecker);
        stopLocationUpdates();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
