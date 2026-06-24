import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ondavideo.app',
  appName: 'OndaVideo',
  webDir: 'dist',
  // Sin servidor remoto → todo funciona en local
  server: {
    androidScheme: 'https',
  },
  android: {
    buildOptions: {
      releaseType: 'APK'
    }
  },
  plugins: {
    // Filesystem: permite guardar el video en la galería de Android
    Filesystem: {
      androidExternalFilesDir: true
    }
  }
};

export default config;
