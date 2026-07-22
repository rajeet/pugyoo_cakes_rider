// Load .env file for local development
require('dotenv').config()

module.exports = {
  expo: {
    owner: 'rajeetmangrati',
    name: process.env.APP_NAME ? `${process.env.APP_NAME} Ops` : 'Pugyoo Cakes Ops',
    slug: 'cake-project-mobile-ops',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#E91E63',
    },
    assetBundlePatterns: ['**/*'],
    plugins: [
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#E91E63',
          sounds: [],
        },
      ],
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.cakeproject.mobile.ops',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'This app needs access to your location for delivery operations.',
        NSUserNotificationsUsageDescription:
          'This app needs notifications for order updates.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#E91E63',
      },
      package: 'com.cakeproject.mobile.ops',
      permissions: [
        'INTERNET',
        'ACCESS_NETWORK_STATE',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'RECEIVE_BOOT_COMPLETED',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    scheme: 'cake-delivery-ops',
    extra: {
      apiBaseUrl: process.env.API_BASE_URL || 'http://127.0.0.1:8001/api',
      appName: process.env.APP_NAME || 'Pugyoo Cakes',
      environment: process.env.NODE_ENV || 'development',
      eas: {
        // Replace with a new EAS projectId before production builds
        projectId: '00000000-0000-0000-0000-000000000000',
      },
      posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY || '',
      posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
    },
  },
}
