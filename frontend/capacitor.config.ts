import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.planadvisory.app",
  appName: "Plan Advisor",
  webDir: "out",                  // Next.js static export output folder
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0A0F1E",
      showSpinner: false,
    },
  },
};

export default config;
