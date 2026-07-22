import React, { useState, useEffect, useRef } from 'react'
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialIcons } from '@expo/vector-icons'
import * as Notifications from 'expo-notifications'
import { useAuthStore } from '../store/authStore'
import { setNavigationRef } from '../utils/navigation'
import { colors } from '../theme'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import type { NavigationContainerRef } from '@react-navigation/native'

import LoginScreen from '../screens/LoginScreen'
import DashboardScreen from '../screens/DashboardScreen'
import OrdersScreen from '../screens/OrdersScreen'
import AccountScreen from '../screens/AccountScreen'

export type RootStackParamList = {
  OpsTabs: { screen?: keyof OpsTabParamList; params?: any } | undefined
  Login: { returnTo?: string } | undefined
}

export type OpsTabParamList = {
  Dashboard: undefined
  Orders: { orderId?: number; status?: string } | undefined
  Account: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()
const OpsTab = createBottomTabNavigator<OpsTabParamList>()

function TabIcon({
  iconName,
  focused,
  label,
}: {
  iconName: keyof typeof MaterialIcons.glyphMap
  focused: boolean
  label: string
}) {
  return (
    <View style={styles.iconContainer}>
      <MaterialIcons
        name={iconName}
        size={24}
        color={focused ? colors.accent : colors.muted}
      />
      <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

function OpsTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key]
        const label =
          options.tabBarLabel !== undefined
            ? String(options.tabBarLabel)
            : options.title !== undefined
              ? options.title
              : route.name
        const isFocused = state.index === index
        const iconName =
          route.name === 'Dashboard'
            ? 'dashboard'
            : route.name === 'Orders'
              ? 'receipt-long'
              : 'person'

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              })
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name)
              }
            }}
            style={styles.tabItem}
          >
            <TabIcon iconName={iconName as any} focused={isFocused} label={label} />
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function OpsTabs() {
  return (
    <OpsTab.Navigator
      tabBar={(props) => <OpsTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <OpsTab.Screen name="Dashboard" component={DashboardScreen} />
      <OpsTab.Screen name="Orders" component={OrdersScreen} />
      <OpsTab.Screen name="Account" component={AccountScreen} />
    </OpsTab.Navigator>
  )
}

export default function AppNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (ready) setNavigationRef(navigationRef.current)
  }, [ready])

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const orderId = response.notification.request.content.data?.orderId
      if (orderId && navigationRef.current) {
        navigationRef.current.navigate('OpsTabs', {
          screen: 'Orders',
          params: { orderId: Number(orderId) },
        })
      }
    })
    return () => sub.remove()
  }, [])

  const allowed =
    isAuthenticated &&
    (user?.user_type === 'superadmin' || user?.user_type === 'delivery_partner')

  return (
    <NavigationContainer ref={navigationRef} onReady={() => setReady(true)}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {allowed ? (
          <Stack.Screen name="OpsTabs" component={OpsTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: 'center' },
  iconContainer: { alignItems: 'center', gap: 2 },
  label: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  labelActive: { color: colors.accent, fontWeight: '800' },
})
