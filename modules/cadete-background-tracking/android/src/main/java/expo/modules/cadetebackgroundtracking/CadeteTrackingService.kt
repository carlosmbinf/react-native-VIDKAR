package expo.modules.cadetebackgroundtracking

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationAvailability
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class CadeteTrackingService : Service() {
  private lateinit var fusedLocationClient: FusedLocationProviderClient
  private val mainHandler = Handler(Looper.getMainLooper())
  private val networkExecutor = Executors.newSingleThreadExecutor()

  private var lastKnownLocation: android.location.Location? = null
  private var lastSentLocation: android.location.Location? = null
  private var lastSentAt: Long = 0L
  private var trackingActive = false
  private var lastError = ""
  private var locationCallback: LocationCallback? = null
  private var cadeteCheckerStarted = false

  private val locationRequest by lazy {
    LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, CHECK_INTERVAL_MS)
      .setMinUpdateIntervalMillis(FASTEST_INTERVAL_MS)
      .build()
  }

  private val cadeteCheckerRunnable = object : Runnable {
    override fun run() {
      if (!isTrackingEnabled()) {
        shutdownService(clearConfig = true)
        return
      }

      networkExecutor.execute {
        val userId = getStoredUserId()
        if (userId.isNullOrBlank()) {
          shutdownService(clearConfig = true)
          return@execute
        }

        val isCadeteActive = isCadeteModeActive(userId)
        Log.d(TAG, "checker userId=$userId active=$isCadeteActive trackingActive=$trackingActive")

        if (isCadeteActive == null) {
          Log.w(TAG, "No se pudo validar modoCadete. Manteniendo el estado actual del servicio.")
          mainHandler.postDelayed(this, CHECK_INTERVAL_MS)
          return@execute
        }

        if (!isCadeteActive) {
          Log.d(TAG, "modoCadete inactivo. Deteniendo foreground y tracking nativo.")
          shutdownService(clearConfig = true)
          return@execute
        }

        if (!trackingActive) {
          lastError = ""
          ensureForegroundServiceRunning(active = true)
          startLocationUpdates()
        } else {
          ensureForegroundServiceRunning(active = true)
        }

        mainHandler.postDelayed(this, CHECK_INTERVAL_MS)
      }
    }
  }

  override fun onCreate() {
    super.onCreate()
    fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
    createNotificationChannel()
    Log.d(TAG, "onCreate() servicio nativo del cadete inicializado")
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    Log.d(TAG, "onStartCommand(action=${intent?.action}, trackingActive=$trackingActive)")
    Log.d(TAG, "KEY_METEOR_URL=$KEY_METEOR_URL storedMeteorUrl=${getStoredMeteorUrl()}")
    Log.d(TAG, "legacyApiBaseUrl=$LEGACY_API_BASE_URL")

    when (intent?.action) {
      ACTION_STOP -> {
        disableTracking(clearError = true)
        cadeteCheckerStarted = false
        mainHandler.removeCallbacks(cadeteCheckerRunnable)
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        return START_NOT_STICKY
      }
      ACTION_START, ACTION_SYNC, null -> {
        ensureForegroundServiceRunning(active = trackingActive)
        startCadeteChecker()
      }
    }

    return START_STICKY
  }

  override fun onDestroy() {
    stopLocationUpdates()
    mainHandler.removeCallbacks(cadeteCheckerRunnable)
    cadeteCheckerStarted = false
    networkExecutor.shutdown()
    super.onDestroy()
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    super.onTaskRemoved(rootIntent)
    val userId = getStoredUserId()
    if (isTrackingEnabled() && !userId.isNullOrBlank()) {
      start(this, userId, getStoredMeteorUrl())
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun startCadeteChecker() {
    if (cadeteCheckerStarted) {
      return
    }

    cadeteCheckerStarted = true
    mainHandler.removeCallbacks(cadeteCheckerRunnable)
    mainHandler.post(cadeteCheckerRunnable)
  }

  private fun startLocationUpdates() {
    if (trackingActive) {
      return
    }

    val hasFineLocation = ActivityCompat.checkSelfPermission(
      this,
      android.Manifest.permission.ACCESS_FINE_LOCATION,
    ) == PackageManager.PERMISSION_GRANTED

    if (!hasFineLocation) {
      lastError = "No hay permiso de ubicación precisa para iniciar el tracking del cadete."
      Log.w(TAG, lastError)
      writeStatus()
      return
    }

    val callback = object : LocationCallback() {
      override fun onLocationAvailability(locationAvailability: LocationAvailability) {
        if (!locationAvailability.isLocationAvailable) {
          lastError = "El proveedor de ubicación no está disponible en este momento."
          writeStatus()
        }
      }

      override fun onLocationResult(result: LocationResult) {
        val location = result.lastLocation ?: return
        handleLocationSample(location)
      }
    }

    locationCallback = callback
    fusedLocationClient.requestLocationUpdates(
      locationRequest,
      callback,
      Looper.getMainLooper(),
    )
    trackingActive = true
    lastError = ""
    Log.d(TAG, "startLocationUpdates() tracking activado")
    writeStatus()
  }

  private fun stopLocationUpdates() {
    val callback = locationCallback ?: return
    runCatching {
      fusedLocationClient.removeLocationUpdates(callback)
    }
    locationCallback = null
  }

  private fun handleLocationSample(location: android.location.Location) {
    Log.d(
      TAG,
      "location sample lat=${location.latitude} lng=${location.longitude} acc=${if (location.hasAccuracy()) location.accuracy else -1f}",
    )
    lastKnownLocation = location
    writeStatus()
    sendLocation(location)
  }

  private fun isCadeteModeActive(userId: String): Boolean? {
    val apiBaseUrl = LEGACY_API_BASE_URL
    return try {
      val payload = JSONObject().put("userId", userId).toString()
      val connection = (URL("$apiBaseUrl/api/cadete/isActive").openConnection() as HttpURLConnection).apply {
        connectTimeout = NETWORK_TIMEOUT_MS
        readTimeout = NETWORK_TIMEOUT_MS
        doOutput = true
        requestMethod = "POST"
        setRequestProperty("Accept", "application/json")
        setRequestProperty("Content-Type", "application/json")
      }
      connection.outputStream.use { output ->
        output.write(payload.toByteArray(Charsets.UTF_8))
      }

      if (connection.responseCode !in 200..299) {
        lastError = "No se pudo validar modoCadete en backend (${connection.responseCode})."
        Log.w(TAG, lastError)
        writeStatus()
        return null
      }

      val responseText = connection.inputStream.bufferedReader().use { it.readText() }
      val json = JSONObject(responseText)
      json.optBoolean("active", false).also {
        Log.d(TAG, "isCadeteModeActive($userId) -> $it")
      }
    } catch (error: Throwable) {
      lastError = error.message ?: "No se pudo validar modoCadete en backend."
      Log.e(TAG, "Error consultando modoCadete", error)
      writeStatus()
      null
    }
  }

  private fun sendLocation(location: android.location.Location) {
    networkExecutor.execute {
      val userId = getStoredUserId()
      if (userId.isNullOrBlank()) {
        return@execute
      }

      val isCadeteActive = isCadeteModeActive(userId)
      if (isCadeteActive == null) {
        return@execute
      }

      if (!isCadeteActive) {
        Log.d(TAG, "modoCadete inactivo durante sendLocation. Apagando servicio nativo.")
        shutdownService(clearConfig = true)
        return@execute
      }

      val sent = postLocation(location)
      if (sent) {
        lastSentLocation = location
        lastSentAt = System.currentTimeMillis()
        lastError = ""
        Log.d(TAG, "Ubicación enviada correctamente al backend")
        writeStatus()
      }
    }
  }

  private fun postLocation(location: android.location.Location): Boolean {
    val apiBaseUrl = LEGACY_API_BASE_URL
    val payload = JSONObject()
      .put("accuracy", if (location.hasAccuracy()) location.accuracy.toDouble() else JSONObject.NULL)
      .put("lat", location.latitude)
      .put("lng", location.longitude)
      .put("speed", if (location.hasSpeed()) location.speed.toDouble() else JSONObject.NULL)
      .put("timestamp", location.time.takeIf { it > 0 } ?: System.currentTimeMillis())
      .put("userId", getStoredUserId())
      .toString()

    return try {
      val connection = (URL("$apiBaseUrl/api/location").openConnection() as HttpURLConnection).apply {
        connectTimeout = NETWORK_TIMEOUT_MS
        readTimeout = NETWORK_TIMEOUT_MS
        doOutput = true
        requestMethod = "POST"
        setRequestProperty("Accept", "application/json")
        setRequestProperty("Content-Type", "application/json")
      }
      connection.outputStream.use { output ->
        output.write(payload.toByteArray(Charsets.UTF_8))
      }
      val statusCode = connection.responseCode
      if (statusCode !in 200..299) {
        lastError = "No se pudo enviar la ubicación del cadete ($statusCode)."
        Log.w(TAG, lastError)
        writeStatus()
        return false
      }
      true
    } catch (error: Throwable) {
      lastError = error.message ?: "No se pudo enviar la ubicación del cadete."
      Log.e(TAG, "Error enviando ubicación del cadete", error)
      writeStatus()
      false
    }
  }

  private fun disableTracking(clearError: Boolean) {
    stopLocationUpdates()
    trackingActive = false
    if (clearError) {
      lastError = ""
    }
    writeStatus()
  }

  private fun shutdownService(clearConfig: Boolean) {
    mainHandler.post {
      disableTracking(clearError = true)
      if (clearConfig) {
        persistConfig(this, enabled = false, userId = null, meteorUrl = null)
      }
      cadeteCheckerStarted = false
      mainHandler.removeCallbacks(cadeteCheckerRunnable)
      stopForeground(STOP_FOREGROUND_REMOVE)
      stopSelf()
    }
  }

  private fun buildNotification(): Notification {
    return buildNotification(active = trackingActive)
  }

  private fun buildNotification(active: Boolean): Notification {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val pendingIntent = PendingIntent.getActivity(
      this,
      101,
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setContentTitle(if (active) "Modo cadete activo" else "Servicio cadete listo")
      .setContentText(
        if (active) {
          "Seguimiento nativo en segundo plano para entregas activas."
        } else {
          "Esperando confirmación del backend para activar el tracking del cadete."
        },
      )
      .setOngoing(true)
      .setAutoCancel(false)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .setOnlyAlertOnce(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setSilent(true)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setSmallIcon(applicationInfo.icon)
      .setContentIntent(pendingIntent)
      .build()
      .apply {
        flags = flags or Notification.FLAG_ONGOING_EVENT or Notification.FLAG_NO_CLEAR
      }
  }

  private fun ensureForegroundServiceRunning(active: Boolean) {
    ServiceCompat.startForeground(
      this,
      NOTIFICATION_ID,
      buildNotification(active),
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
      } else {
        0
      },
    )
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val manager = getSystemService(NotificationManager::class.java)
    val channel = NotificationChannel(
      NOTIFICATION_CHANNEL_ID,
      "Modo Cadete",
      NotificationManager.IMPORTANCE_LOW,
    ).apply {
      description = "Seguimiento de ubicación del cadete en segundo plano"
      setShowBadge(false)
    }
    manager.createNotificationChannel(channel)
  }

  private fun writeStatus() {
    val editor = prefs.edit()
      .putBoolean(KEY_TRACKING_ACTIVE, trackingActive)
      .putString(KEY_TRACKING_MODE, "native")
      .putString(KEY_LAST_ERROR, lastError)
      .putLong(KEY_LAST_SENT_AT, lastSentAt)

    lastSentLocation?.let { location ->
      editor
        .putLong(KEY_LAST_SENT_LOCATION_TIMESTAMP, location.time.takeIf { it > 0 } ?: lastSentAt)
        .putString(KEY_LAST_SENT_LOCATION_JSON, locationToJson(location).toString())
    } ?: run {
      editor
        .remove(KEY_LAST_SENT_LOCATION_JSON)
        .remove(KEY_LAST_SENT_LOCATION_TIMESTAMP)
    }

    lastKnownLocation?.let { location ->
      editor
        .putLong(KEY_LAST_KNOWN_LOCATION_TIMESTAMP, location.time.takeIf { it > 0 } ?: System.currentTimeMillis())
        .putString(KEY_LAST_KNOWN_LOCATION_JSON, locationToJson(location).toString())
    } ?: run {
      editor
        .remove(KEY_LAST_KNOWN_LOCATION_JSON)
        .remove(KEY_LAST_KNOWN_LOCATION_TIMESTAMP)
    }

    editor.apply()
  }

  private fun isTrackingEnabled(): Boolean = prefs.getBoolean(KEY_ENABLED, false)

  private fun getStoredUserId(): String? = prefs.getString(KEY_USER_ID, null)

  private fun getStoredMeteorUrl(): String? = prefs.getString(KEY_METEOR_URL, null)

  private val prefs: SharedPreferences
    get() = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  companion object {
    private const val ACTION_START = "expo.modules.cadetebackgroundtracking.action.START"
    private const val ACTION_STOP = "expo.modules.cadetebackgroundtracking.action.STOP"
    private const val ACTION_SYNC = "expo.modules.cadetebackgroundtracking.action.SYNC"
    private const val CHECK_INTERVAL_MS = 20000L
    private const val FASTEST_INTERVAL_MS = 15000L
    private const val LEGACY_API_BASE_URL = "https://rx5sl952-3000.brs.devtunnels.ms"
    private const val NETWORK_TIMEOUT_MS = 12000
    private const val NOTIFICATION_CHANNEL_ID = "vidkar_cadete_native_tracking"
    private const val NOTIFICATION_ID = 3017
    private const val PREFS_NAME = "cadete_background_tracking_native"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_LAST_ERROR = "lastError"
    private const val KEY_LAST_KNOWN_LOCATION_JSON = "lastKnownLocationJson"
    private const val KEY_LAST_KNOWN_LOCATION_TIMESTAMP = "lastKnownLocationTimestamp"
    private const val KEY_LAST_SENT_LOCATION_JSON = "lastSentLocationJson"
    private const val KEY_LAST_SENT_LOCATION_TIMESTAMP = "lastSentLocationTimestamp"
    private const val KEY_LAST_SENT_AT = "lastSentAt"
    private const val KEY_METEOR_URL = "meteorUrl"
    private const val KEY_TRACKING_ACTIVE = "trackingActive"
    private const val KEY_TRACKING_MODE = "trackingMode"
    private const val KEY_USER_ID = "userId"
    private const val TAG = "CadeteTrackingService"

    fun start(context: Context, userId: String, meteorUrl: String?) {
      persistConfig(context, enabled = true, userId = userId, meteorUrl = meteorUrl)
      val intent = Intent(context, CadeteTrackingService::class.java).apply {
        action = ACTION_START
      }
      ContextCompat.startForegroundService(context, intent)
    }

    fun stop(context: Context) {
      persistConfig(context, enabled = false, userId = null, meteorUrl = null)
      val intent = Intent(context, CadeteTrackingService::class.java).apply {
        action = ACTION_STOP
      }
      context.startService(intent)
      context.stopService(Intent(context, CadeteTrackingService::class.java))
    }

    fun sync(context: Context, enabled: Boolean, userId: String?, meteorUrl: String?) {
      if (!enabled || userId.isNullOrBlank()) {
        stop(context)
        return
      }

      start(context, userId, meteorUrl)
    }

    fun getStatus(context: Context): Map<String, Any?> {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      return mapOf(
        "lastError" to prefs.getString(KEY_LAST_ERROR, ""),
        "lastKnownLocation" to parseLocationJson(prefs.getString(KEY_LAST_KNOWN_LOCATION_JSON, null)),
        "lastSentAt" to prefs.getLong(KEY_LAST_SENT_AT, 0L),
        "lastSentLocation" to parseLocationJson(prefs.getString(KEY_LAST_SENT_LOCATION_JSON, null)),
        "trackingActive" to prefs.getBoolean(KEY_TRACKING_ACTIVE, false),
        "trackingMode" to prefs.getString(KEY_TRACKING_MODE, "native"),
        "userId" to prefs.getString(KEY_USER_ID, null),
      )
    }

    private fun persistConfig(context: Context, enabled: Boolean, userId: String?, meteorUrl: String?) {
      context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .edit()
        .putBoolean(KEY_ENABLED, enabled)
        .putString(KEY_USER_ID, userId)
        .putString(KEY_METEOR_URL, meteorUrl)
        .apply()
    }

    private fun locationToJson(location: android.location.Location): JSONObject {
      return JSONObject()
        .put("accuracy", if (location.hasAccuracy()) location.accuracy.toDouble() else JSONObject.NULL)
        .put("altitude", if (location.hasAltitude()) location.altitude else JSONObject.NULL)
        .put("heading", if (location.hasBearing()) location.bearing.toDouble() else JSONObject.NULL)
        .put("latitude", location.latitude)
        .put("longitude", location.longitude)
        .put("speed", if (location.hasSpeed()) location.speed.toDouble() else JSONObject.NULL)
        .put("timestamp", location.time.takeIf { it > 0 } ?: System.currentTimeMillis())
    }

    private fun parseLocationJson(rawValue: String?): Map<String, Any?>? {
      if (rawValue.isNullOrBlank()) {
        return null
      }

      return try {
        val json = JSONObject(rawValue)
        mapOf(
          "accuracy" to json.optDoubleOrNull("accuracy"),
          "altitude" to json.optDoubleOrNull("altitude"),
          "heading" to json.optDoubleOrNull("heading"),
          "latitude" to json.optDoubleOrNull("latitude"),
          "longitude" to json.optDoubleOrNull("longitude"),
          "speed" to json.optDoubleOrNull("speed"),
          "timestamp" to json.optLongOrNull("timestamp"),
        )
      } catch (_error: Throwable) {
        null
      }
    }

    private fun JSONObject.optDoubleOrNull(key: String): Double? {
      return if (isNull(key)) null else optDouble(key)
    }

    private fun JSONObject.optLongOrNull(key: String): Long? {
      return if (isNull(key)) null else optLong(key)
    }
  }
}
