import React from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import Constants from 'expo-constants'
import { PostHogProvider } from 'posthog-react-native'
import AppNavigator from './src/navigation/AppNavigator'
import ToastContainer from './src/components/ToastContainer'
import PostHogAuthSync from './src/components/PostHogAuthSync'
import { posthogMobileOptions, POSTHOG_EU_HOST } from './src/services/analytics'

export default function App() {
  const posthogKey = Constants.expoConfig?.extra?.posthogKey as string | undefined
  const posthogHost = (Constants.expoConfig?.extra?.posthogHost as string | undefined) || POSTHOG_EU_HOST

  const appBody = (
    <>
      <StatusBar style="dark" />
      {posthogKey ? <PostHogAuthSync /> : null}
      <AppNavigator />
      <ToastContainer />
    </>
  )

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {posthogKey ? (
          <PostHogProvider apiKey={posthogKey} options={posthogMobileOptions(posthogHost)}>
            {appBody}
          </PostHogProvider>
        ) : (
          appBody
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

