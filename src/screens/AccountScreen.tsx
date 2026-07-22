import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons } from '@expo/vector-icons'
import { useAuthStore } from '../store/authStore'
import { authService } from '../services/api'
import { colors } from '../theme'

export default function AccountScreen() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [loading, setLoading] = useState(false)

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setLoading(true)
          try {
            await authService.logout()
          } finally {
            logout()
            setLoading(false)
          }
        },
      },
    ])
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Account</Text>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={36} color={colors.accent} />
          </View>
          <Text style={styles.name}>
            {[user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.role}>
              {user?.user_type === 'superadmin' ? 'Administrator' : 'Delivery partner'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logout} onPress={handleLogout} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="logout" size={20} color="#fff" />
              <Text style={styles.logoutText}>Sign out</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  name: { fontSize: 20, fontWeight: '800', color: colors.ink },
  email: { fontSize: 14, color: colors.muted, marginTop: 4 },
  rolePill: {
    marginTop: 14,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  role: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accentText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logout: {
    marginTop: 28,
    backgroundColor: colors.ink,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: { color: '#fff', fontWeight: '800', fontSize: 15 },
})
