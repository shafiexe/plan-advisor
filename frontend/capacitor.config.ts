import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "in.planadvisors.app",
  appName: "PlanAdvisors — Travel Planner",
  // In production the app loads the live website; in local dev it hits the
  // Next.js dev server so native plugins still work during testing.
  server: {
    url: process.env.CAP_SERVER_URL ?? "https://www.planadvisors.in",
    cleartext: false,
  },
  android: {
    buildOptions: {
      keystorePath: "planadvisors.keystore",
      keystoreAlias: "planadvisors",
    },
    // Allow the WebView to use the same cookies/session as the browser.
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    StatusBar: {
      backgroundColor: "#020817",
      style: "DARK",
      overlaysWebView: false,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#020817",
      androidSplashResourceName: "splash",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
