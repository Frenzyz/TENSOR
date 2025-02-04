import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tensor.app',
  appName: 'Tensor',
  webDir: 'dist',
  server: {
    cleartext: true,
    hostname: 'localhost',
    iosScheme: 'ionic'
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: true,
    scrollEnabled: true,
    backgroundColor: '#ffffff',
    limitsNavigationsToAppBoundDomains: true
  }
};

export default config;
