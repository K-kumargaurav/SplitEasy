package com.spliteasy.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Intercept UPI / payment deep links so the WebView passes them
        // to the Android intent system instead of trying to load them as URLs
        getBridge().getWebView().setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (isPaymentUrl(url)) {
                    openPaymentApp(url);
                    return true;
                }
                return super.shouldOverrideUrlLoading(view, request);
            }
        });
    }

    private boolean isPaymentUrl(String url) {
        return url.startsWith("upi://")
            || url.startsWith("intent://")
            || url.startsWith("tez://")
            || url.startsWith("phonepe://")
            || url.startsWith("paytmmp://")
            || url.startsWith("bhim://");
    }

    private void openPaymentApp(String url) {
        try {
            Intent intent = url.startsWith("intent://")
                ? Intent.parseUri(url, Intent.URI_INTENT_SCHEME)
                : new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            startActivity(intent);
        } catch (ActivityNotFoundException e) {
            // UPI app not installed — do nothing, user will see no change
        } catch (Exception e) {
            // Malformed URI — ignore
        }
    }
}
