package jp.ghost.control.location;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.security.KeyChain;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "GhostLocation")
public class GhostLocationPlugin extends Plugin {
    @PluginMethod
    public void configure(PluginCall call) {
        String deviceId = call.getString("deviceId", "");
        String token = call.getString("token", "");
        String baseUrl = call.getString("baseUrl", "https://ghost-control.duckdns.org");
        GhostLocationStore store = new GhostLocationStore(getContext());
        store.setDeviceId(deviceId);
        store.setToken(token);
        store.setBaseUrl(baseUrl);
        JSObject result = new JSObject();
        result.put("ok", true);
        call.resolve(result);
    }

    @PluginMethod
    public void chooseClientCertificate(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is not available");
            return;
        }
        saveCall(call);
        KeyChain.choosePrivateKeyAlias(
            activity,
            alias -> activity.runOnUiThread(() -> {
                PluginCall saved = getSavedCall();
                if (saved == null) return;
                if (alias == null || alias.isEmpty()) {
                    saved.reject("Client certificate was not selected");
                    releaseCall(saved);
                    return;
                }
                new GhostLocationStore(getContext()).setCertificateAlias(alias);
                JSObject result = new JSObject();
                result.put("certificateAlias", alias);
                saved.resolve(result);
                releaseCall(saved);
            }),
            null,
            null,
            "ghost-control.duckdns.org",
            443,
            null
        );
    }

    @PluginMethod
    public void start(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, LocationForegroundService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
        JSObject result = statusObject(context);
        result.put("running", true);
        call.resolve(result);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Context context = getContext();
        context.stopService(new Intent(context, LocationForegroundService.class));
        GhostLocationStore store = new GhostLocationStore(context);
        store.setRunning(false);
        JSObject result = statusObject(context);
        call.resolve(result);
    }

    @PluginMethod
    public void status(PluginCall call) {
        call.resolve(statusObject(getContext()));
    }

    private JSObject statusObject(Context context) {
        GhostLocationStore store = new GhostLocationStore(context);
        JSObject result = new JSObject();
        result.put("running", store.isRunning());
        result.put("certificateAlias", store.getCertificateAlias());
        result.put("lastSentAt", store.getLastSentAt());
        result.put("lastError", store.getLastError());
        return result;
    }
}
