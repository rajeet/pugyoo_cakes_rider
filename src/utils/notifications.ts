import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

// Check if expo-notifications is available (not available in Expo Go)
let notificationsAvailable = true
try {
  // Try to access the module to check if it's available
  if (!Notifications.getPermissionsAsync) {
    notificationsAvailable = false
  }
} catch (error) {
  notificationsAvailable = false
}

// Configure notification handler only if available
if (notificationsAvailable) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    })
  } catch (error) {
    console.warn('Failed to set notification handler:', error)
    notificationsAvailable = false
  }
}

export interface DeviceTokenData {
  token: string
  device_name: string
  device_type: 'ios' | 'android'
}

/**
 * Request notification permissions and get Expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<DeviceTokenData | null> {
  try {
    // Check if notifications module is available (not available in Expo Go)
    if (!notificationsAvailable) {
      console.warn('Push notifications not available in Expo Go. Please use a development build.')
      return null
    }

    // Check if device is physical (not simulator)
    if (!Device.isDevice) {
      console.warn('Must use physical device for Push Notifications')
      return null
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!')
      return null
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined
    if (!projectId) {
      console.warn('expo extra.eas.projectId is not set; cannot get push token')
      return null
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    })

    const token = tokenData.data

    // Get device name
    const deviceName = Device.deviceName || Device.modelName || 'Unknown Device'

    // Get device type
    const deviceType = Platform.OS === 'ios' ? 'ios' : 'android'

    return {
      token,
      device_name: deviceName,
      device_type: deviceType,
    }
  } catch (error) {
    console.error('Error registering for push notifications:', error)
    return null
  }
}

