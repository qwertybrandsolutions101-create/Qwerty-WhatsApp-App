import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import WebView, { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const ORIGIN = 'https://qwertybrandsolutions.com';
const LOGIN_URL = `${ORIGIN}/dashboard/?console=1&source=qwerty-whatsapp-app`;
const MESSENGER_URL = `${ORIGIN}/dashboard/messenger/?account=india&source=qwerty-whatsapp-app`;

type ShellMessage = { type?: 'auth-required' | 'messenger-ready' };

export default function App() {
  const browser = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [shellReady, setShellReady] = useState(false);

  const sessionBootstrap = useMemo(
    () => `
      (function () {
        if (window.__qwertyWhatsAppAppBootstrap) return true;
        window.__qwertyWhatsAppAppBootstrap = true;
        var messengerUrl = ${JSON.stringify(MESSENGER_URL)};
        var send = function (type) {
          try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: type })); } catch (_) {}
        };
        if (location.pathname.indexOf('/dashboard/messenger/') === 0) {
          send('messenger-ready');
          return true;
        }
        var checking = false;
        var checkSession = async function () {
          if (checking || location.pathname.indexOf('/dashboard/messenger/') === 0) return;
          checking = true;
          try {
            var response = await fetch('/dashboard/auth.php?action=session', {
              credentials: 'same-origin',
              cache: 'no-store'
            });
            var data = response.ok ? await response.json() : {};
            if (data && data.authenticated === true) {
              location.replace(messengerUrl);
              return;
            }
            send('auth-required');
          } catch (_) {
            send('auth-required');
          } finally {
            checking = false;
          }
        };
        checkSession();
        window.__qwertyWhatsAppSessionTimer = setInterval(checkSession, 900);
        true;
      })();
    `,
    [],
  );

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) return false;
      browser.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      browser.current?.injectJavaScript(
        "window.dispatchEvent(new CustomEvent('fresh-live-refresh')); true;",
      );
    });
    return () => subscription.remove();
  }, []);

  const retry = useCallback(() => {
    setLoadError(false);
    setShellReady(false);
    setReloadKey(value => value + 1);
  }, []);

  const handleRequest = useCallback((request: { url: string }) => {
    if (/^(tel:|mailto:|whatsapp:|geo:)/i.test(request.url)) {
      Linking.openURL(request.url).catch(() => undefined);
      return false;
    }
    if (
      /^https?:\/\//i.test(request.url) &&
      !/^https:\/\/(?:www\.)?qwertybrandsolutions\.com(?:\/|$)/i.test(request.url)
    ) {
      Linking.openURL(request.url).catch(() => undefined);
      return false;
    }
    return true;
  }, []);

  const handleNavigation = useCallback((state: WebViewNavigation) => {
    setCanGoBack(state.canGoBack);
    setLoadError(false);
    if (state.url.includes('/dashboard/messenger/')) setShellReady(true);
  }, []);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as ShellMessage;
      if (message.type === 'auth-required' || message.type === 'messenger-ready') {
        setShellReady(true);
      }
    } catch {
      // Ignore messages not owned by the native shell.
    }
  }, []);

  return (
    <SafeAreaProvider style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f7f5" translucent={false} />
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <WebView
          key={reloadKey}
          ref={browser}
          source={{ uri: LOGIN_URL }}
          style={styles.webview}
          cacheEnabled
          cacheMode="LOAD_DEFAULT"
          pullToRefreshEnabled
          originWhitelist={['https://qwertybrandsolutions.com']}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          javaScriptCanOpenWindowsAutomatically={false}
          setSupportMultipleWindows={false}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          geolocationEnabled
          allowsBackForwardNavigationGestures
          injectedJavaScript={sessionBootstrap}
          onMessage={handleMessage}
          onNavigationStateChange={handleNavigation}
          onShouldStartLoadWithRequest={handleRequest}
          onLoadEnd={() => setShellReady(true)}
          onError={() => setLoadError(true)}
          onHttpError={event => {
            if (event.nativeEvent.statusCode >= 500) setLoadError(true);
          }}
          renderError={() => <View style={styles.root} />}
        />

        {!shellReady && !loadError && (
          <View style={styles.splash} pointerEvents="none">
            <View style={styles.mark}>
              <Text style={styles.markLetter}>Q</Text>
              <Text style={styles.markPhone}>☎</Text>
            </View>
            <Text style={styles.splashTitle}>Qwerty WhatsApp</Text>
            <Text style={styles.splashText}>Connecting to your live workspace…</Text>
          </View>
        )}

        {loadError && (
          <View style={styles.errorPanel}>
            <Text style={styles.errorTitle}>WhatsApp workspace could not load</Text>
            <Text style={styles.errorText}>Check your internet connection and try again.</Text>
            <Pressable accessibilityRole="button" style={styles.retryButton} onPress={retry}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f7f5' },
  webview: { flex: 1, backgroundColor: '#f4f7f5' },
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#075e3c',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  mark: {
    width: 104,
    height: 104,
    borderRadius: 30,
    backgroundColor: '#18c76f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  markLetter: { color: '#fff', fontSize: 72, fontWeight: '800', lineHeight: 82 },
  markPhone: { position: 'absolute', color: '#075e3c', fontSize: 24, fontWeight: '800' },
  splashTitle: { color: '#fff', fontSize: 25, fontWeight: '800', textAlign: 'center' },
  splashText: { color: '#cef3df', fontSize: 14, textAlign: 'center', marginTop: 9 },
  errorPanel: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f4f7f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  errorTitle: { color: '#10261d', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  errorText: { color: '#5d7269', fontSize: 15, textAlign: 'center', marginTop: 12 },
  retryButton: {
    backgroundColor: '#128c5b',
    borderRadius: 999,
    marginTop: 28,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
