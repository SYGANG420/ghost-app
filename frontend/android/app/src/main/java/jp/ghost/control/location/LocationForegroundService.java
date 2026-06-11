package jp.ghost.control.location;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.security.KeyChain;
import android.security.KeyChainException;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import java.io.OutputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.time.Instant;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.KeyManager;
import javax.net.ssl.SSLContext;
import javax.net.ssl.X509ExtendedKeyManager;

public class LocationForegroundService extends Service {
    private static final String CHANNEL_ID = "ghost_location";
    private static final int NOTIFICATION_ID = 1984;
    private static final long INTERVAL_MS = 30_000L;
    private FusedLocationProviderClient locationClient;
    private LocationCallback callback;
    private GhostLocationStore store;

    @Override
    public void onCreate() {
        super.onCreate();
        store = new GhostLocationStore(this);
        locationClient = LocationServices.getFusedLocationProviderClient(this);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        store.setRunning(true);
        startForeground(NOTIFICATION_ID, buildNotification("GPS heartbeat active"));
        startLocationUpdates();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (callback != null) {
            locationClient.removeLocationUpdates(callback);
        }
        store.setRunning(false);
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void startLocationUpdates() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
            && ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            store.setLastError("Location permission is not granted");
            return;
        }

        LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, INTERVAL_MS)
            .setMinUpdateIntervalMillis(15_000L)
            .setMaxUpdateDelayMillis(45_000L)
            .build();

        callback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                Location location = result.getLastLocation();
                if (location == null) return;
                new Thread(() -> sendHeartbeat(location)).start();
            }
        };
        locationClient.requestLocationUpdates(request, callback, getMainLooper());
    }

    private void sendHeartbeat(Location location) {
        String deviceId = store.getDeviceId();
        String token = store.getToken();
        String alias = store.getCertificateAlias();
        if (deviceId.isEmpty() || token.isEmpty() || alias.isEmpty()) {
            store.setLastError("Device, token, or certificate is missing");
            return;
        }

        try {
            URL url = new URL(store.getBaseUrl() + "/api/heartbeat");
            HttpsURLConnection connection = (HttpsURLConnection) url.openConnection();
            connection.setSSLSocketFactory(buildSslContext(alias).getSocketFactory());
            connection.setConnectTimeout(10_000);
            connection.setReadTimeout(10_000);
            connection.setRequestMethod("POST");
            connection.setDoOutput(true);
            connection.setRequestProperty("Authorization", "Bearer " + token);
            connection.setRequestProperty("Content-Type", "application/json");
            String body = "{\"device_id\":\"" + escape(deviceId) + "\",\"lat\":" + location.getLatitude()
                + ",\"lon\":" + location.getLongitude()
                + ",\"timestamp\":\"" + Instant.now().toString() + "\"}";
            try (OutputStream output = connection.getOutputStream()) {
                output.write(body.getBytes(StandardCharsets.UTF_8));
            }
            int code = connection.getResponseCode();
            if (code >= 200 && code < 300) {
                store.setLastSentAt(Instant.now().toString());
                store.setLastError("");
            } else {
                store.setLastError("Heartbeat failed: " + code);
            }
            connection.disconnect();
        } catch (Exception error) {
            store.setLastError(error.getClass().getSimpleName() + ": " + error.getMessage());
        }
    }

    private SSLContext buildSslContext(String alias) throws GeneralSecurityException, KeyChainException, InterruptedException {
        PrivateKey privateKey = KeyChain.getPrivateKey(this, alias);
        X509Certificate[] chain = KeyChain.getCertificateChain(this, alias);
        if (privateKey == null || chain == null || chain.length == 0) {
            throw new GeneralSecurityException("Client certificate is unavailable");
        }
        KeyManager keyManager = new GhostKeyManager(alias, privateKey, chain);
        SSLContext context = SSLContext.getInstance("TLS");
        context.init(new KeyManager[] { keyManager }, null, null);
        return context;
    }

    private String escape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Ghost Location", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("GHOST CONTROL location heartbeat");
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.createNotificationChannel(channel);
    }

    private Notification buildNotification(String text) {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("GHOST CONTROL")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .build();
    }

    private static class GhostKeyManager extends X509ExtendedKeyManager {
        private final String alias;
        private final PrivateKey privateKey;
        private final X509Certificate[] chain;

        GhostKeyManager(String alias, PrivateKey privateKey, X509Certificate[] chain) {
            this.alias = alias;
            this.privateKey = privateKey;
            this.chain = chain;
        }

        @Override
        public String[] getClientAliases(String keyType, java.security.Principal[] issuers) {
            return new String[] { alias };
        }

        @Override
        public String chooseClientAlias(String[] keyType, java.security.Principal[] issuers, java.net.Socket socket) {
            return alias;
        }

        @Override
        public String[] getServerAliases(String keyType, java.security.Principal[] issuers) {
            return new String[0];
        }

        @Override
        public String chooseServerAlias(String keyType, java.security.Principal[] issuers, java.net.Socket socket) {
            return null;
        }

        @Override
        public X509Certificate[] getCertificateChain(String alias) {
            return chain;
        }

        @Override
        public PrivateKey getPrivateKey(String alias) {
            return privateKey;
        }
    }
}
