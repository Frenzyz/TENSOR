import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tensor.app',
  appName: 'Tensor',
  webDir: 'build',
  server: {
    androidScheme: 'https'
  }
};

export default config;
