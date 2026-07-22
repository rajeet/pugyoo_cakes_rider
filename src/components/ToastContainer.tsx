import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, Platform } from 'react-native'
import { toastManager, type Toast } from '../utils/toast'
import { MaterialIcons } from '@expo/vector-icons'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const TOAST_WIDTH = SCREEN_WIDTH - 40

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const unsubscribe = toastManager.subscribe(setToasts)
    return unsubscribe
  }, [])

  if (toasts.length === 0) return null

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </View>
  )
}

interface ToastItemProps {
  toast: Toast
}

const ToastItem: React.FC<ToastItemProps> = ({ toast }) => {
  const slideAnim = React.useRef(new Animated.Value(-120)).current
  const opacityAnim = React.useRef(new Animated.Value(0)).current
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current

  useEffect(() => {
    // Enhanced slide down animation with scale
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start()
  }, [slideAnim, opacityAnim, scaleAnim])

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      toastManager.remove(toast.id)
    })
  }

  const getToastConfig = () => {
    switch (toast.type) {
      case 'success':
        return {
          backgroundColor: '#10B981',
          iconBg: 'rgba(255, 255, 255, 0.2)',
          borderColor: '#059669',
          icon: 'check-circle' as const,
        }
      case 'error':
        return {
          backgroundColor: '#EF4444',
          iconBg: 'rgba(255, 255, 255, 0.2)',
          borderColor: '#DC2626',
          icon: 'error' as const,
        }
      case 'warning':
        return {
          backgroundColor: '#F59E0B',
          iconBg: 'rgba(255, 255, 255, 0.2)',
          borderColor: '#D97706',
          icon: 'warning' as const,
        }
      default:
        return {
          backgroundColor: '#3B82F6',
          iconBg: 'rgba(255, 255, 255, 0.2)',
          borderColor: '#2563EB',
          icon: 'info' as const,
        }
    }
  }

  const config = getToastConfig()

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: config.backgroundColor,
          borderLeftColor: config.borderColor,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
          <MaterialIcons name={config.icon} size={22} color="#FFFFFF" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.message} numberOfLines={3}>
            {toast.message}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="close" size={18} color="rgba(255, 255, 255, 0.8)" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  toast: {
    width: TOAST_WIDTH,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingVertical: 14,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export default ToastContainer

