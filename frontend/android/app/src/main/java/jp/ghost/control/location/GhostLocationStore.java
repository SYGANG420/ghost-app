package jp.ghost.control.location;

import android.content.Context;
import android.content.SharedPreferences;

public class GhostLocationStore {
    private static final String PREFS = "ghost_location";
    private static final String DEVICE_ID = "device_id";
    private static final String TOKEN = "token";
    private static final String BASE_URL = "base_url";
    private static final String CERT_ALIAS = "cert_alias";
    private static final String RUNNING = "running";
    private static final String LAST_SENT_AT = "last_sent_at";
    private static final String LAST_ERROR = "last_error";

    private final SharedPreferences prefs;

    public GhostLocationStore(Context context) {
        this.prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public String getDeviceId() {
        return prefs.getString(DEVICE_ID, "");
    }

    public void setDeviceId(String value) {
        prefs.edit().putString(DEVICE_ID, value == null ? "" : value).apply();
    }

    public String getToken() {
        return prefs.getString(TOKEN, "");
    }

    public void setToken(String value) {
        prefs.edit().putString(TOKEN, value == null ? "" : value).apply();
    }

    public String getBaseUrl() {
        return prefs.getString(BASE_URL, "https://ghost-control.duckdns.org");
    }

    public void setBaseUrl(String value) {
        prefs.edit().putString(BASE_URL, value == null || value.isEmpty() ? "https://ghost-control.duckdns.org" : value).apply();
    }

    public String getCertificateAlias() {
        return prefs.getString(CERT_ALIAS, "");
    }

    public void setCertificateAlias(String value) {
        prefs.edit().putString(CERT_ALIAS, value == null ? "" : value).apply();
    }

    public boolean isRunning() {
        return prefs.getBoolean(RUNNING, false);
    }

    public void setRunning(boolean value) {
        prefs.edit().putBoolean(RUNNING, value).apply();
    }

    public String getLastSentAt() {
        return prefs.getString(LAST_SENT_AT, "");
    }

    public void setLastSentAt(String value) {
        prefs.edit().putString(LAST_SENT_AT, value == null ? "" : value).apply();
    }

    public String getLastError() {
        return prefs.getString(LAST_ERROR, "");
    }

    public void setLastError(String value) {
        prefs.edit().putString(LAST_ERROR, value == null ? "" : value).apply();
    }
}
