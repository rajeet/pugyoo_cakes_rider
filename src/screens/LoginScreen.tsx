import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { authService } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { showError } from '../utils/toast'
import { ERROR_MESSAGES } from '../utils/messages'
import { registerForPushNotificationsAsync } from '../utils/notifications'
import { colors } from '../theme'

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const handleLogin = async () => {
    const newErrors: { email?: string; password?: string } = {}
    if (!email.trim()) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email.trim())) newErrors.email = 'Please enter a valid email'
    if (!password.trim()) newErrors.password = 'Password is required'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})

    try {
      setLoading(true)
      const { user, token, rolePrefix } = await authService.login(email.trim(), password)
      if (user.user_type !== 'superadmin' && user.user_type !== 'delivery_partner') {
        showError(ERROR_MESSAGES.OPS_APP_ONLY)
        return
      }
      login(
        {
          id: String(user.id),
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone || user.phone_number,
          user_type: user.user_type,
        },
        token,
        rolePrefix
      )

      try {
        const deviceData = await registerForPushNotificationsAsync()
        if (deviceData) await authService.registerDeviceToken(deviceData)
      } catch (error) {
        console.error('Failed to register device token:', error)
      }
    } catch (error) {
      if (error instanceof Error && error.message === ERROR_MESSAGES.OPS_APP_ONLY) {
        showError(ERROR_MESSAGES.OPS_APP_ONLY)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.atmosphere} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.kicker}>Pugyoo Ops</Text>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>Admin & delivery partner portal</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
            />
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  atmosphere: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bgWarm,
  },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 88, height: 88, marginBottom: 14 },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 6,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 6 },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  label: { fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.bg,
  },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 12, marginTop: 2 },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 18,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
})
