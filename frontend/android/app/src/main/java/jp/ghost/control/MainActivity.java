package jp.ghost.control;

import android.os.Bundle;
import android.security.KeyChain;
import android.webkit.ClientCertRequest;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

import jp.ghost.control.location.GhostLocationPlugin;
import jp.ghost.control.location.GhostLocationStore;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GhostLocationPlugin.class);
        super.onCreate(savedInstanceState);
        bridge.getWebView().setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public void onReceivedClientCertRequest(android.webkit.WebView view, ClientCertRequest request) {
                String alias = new GhostLocationStore(MainActivity.this).getCertificateAlias();
                if (alias == null || alias.isEmpty()) {
                    request.ignore();
                    return;
                }
                new Thread(() -> {
                    try {
                        java.security.PrivateKey privateKey = KeyChain.getPrivateKey(MainActivity.this, alias);
                        java.security.cert.X509Certificate[] chain = KeyChain.getCertificateChain(MainActivity.this, alias);
                        runOnUiThread(() -> request.proceed(privateKey, chain));
                    } catch (Exception error) {
                        runOnUiThread(request::ignore);
                    }
                }).start();
            }
        });
    }
}
