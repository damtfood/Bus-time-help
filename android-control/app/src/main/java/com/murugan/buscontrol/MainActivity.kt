package com.murugan.buscontrol

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

/** Admin-only wrapper: opens <SITE_URL>/control inside the app. Login = admin email + password (same as the website). */
class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private lateinit var swipe: SwipeRefreshLayout
    private val home get() = BuildConfig.SITE_URL.trimEnd('/')

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this).apply { setBackgroundColor(Color.parseColor("#050C0F")) }
        swipe = SwipeRefreshLayout(this).apply {
            addView(web); setColorSchemeColors(Color.parseColor("#E3A92B"))
            setProgressBackgroundColorSchemeColor(Color.parseColor("#0B1B20"))
            setOnRefreshListener { web.reload() }
        }
        setContentView(swipe)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true            // Supabase keeps the login session here
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            allowFileAccess = false; allowContentAccess = false
        }
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(v: WebView, r: WebResourceRequest): Boolean {
                val u = r.url
                if (u.scheme == "https" && u.host == Uri.parse(home).host) return false   // stay inside the app
                runCatching { startActivity(Intent(Intent.ACTION_VIEW, u)) }               // tel:, wa.me, maps... open outside
                return true
            }
            override fun onPageFinished(v: WebView, url: String) { swipe.isRefreshing = false }
            override fun onReceivedError(v: WebView, r: WebResourceRequest, e: android.webkit.WebResourceError) {
                if (r.isForMainFrame) v.loadData(
                    "<body style='background:#050C0F;color:#EAF2F1;font-family:sans-serif;text-align:center;padding:60px 20px'>" +
                    "<h2 style='color:#E3A92B'>No internet</h2><p>Pull down to retry.</p></body>", "text/html", "utf-8")
                swipe.isRefreshing = false
            }
        }
        web.webChromeClient = WebChromeClient()

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { if (web.canGoBack()) web.goBack() else finish() }
        })
        if (savedInstanceState == null) web.loadUrl("$home/control") else web.restoreState(savedInstanceState)
    }
    override fun onSaveInstanceState(o: Bundle) { super.onSaveInstanceState(o); web.saveState(o) }
    override fun onDestroy() { swipe.removeAllViews(); web.destroy(); super.onDestroy() }
}
