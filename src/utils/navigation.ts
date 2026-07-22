/**
 * Navigation utility for accessing navigation ref outside React components
 * Used by API interceptors to navigate when authentication fails
 */

import type { NavigationContainerRef } from '@react-navigation/native'
import type { RootStackParamList } from '../navigation/AppNavigator'

let navigationRef: NavigationContainerRef<RootStackParamList> | null = null

export const setNavigationRef = (ref: NavigationContainerRef<RootStackParamList> | null) => {
  navigationRef = ref
}

export const navigateToLogin = (returnTo?: string, returnParams?: any) => {
  if (navigationRef?.isReady()) {
    navigationRef.navigate('Login', { returnTo, returnParams })
  }
}

export const getNavigationRef = () => navigationRef
