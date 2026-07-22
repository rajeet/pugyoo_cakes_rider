import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import Constants from 'expo-constants'
import { useAuthStore } from '../store/authStore'
import { opsService } from '../services/api'
import type { DashboardSummary } from '../types'
import type { OpsTabParamList } from '../navigation/AppNavigator'
import { colors, statusColor, formatLabel } from '../theme'

const APP_NAME = Constants.expoConfig?.extra?.appName || 'Pugyoo Cakes'

type Nav = BottomTabNavigationProp<OpsTabParamList>

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.user_type === 'superadmin'
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setError(null)
      const data = await opsService.getDashboard()
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      load()
    }, [])
  )

  const statusCount = (status: string) =>
    summary?.orders_by_status?.find((s) => s.status === status)?.count || 0

  const tiles = isAdmin
    ? [
        { key: 'pending', label: 'Pending', count: statusCount('pending') },
        { key: 'preparing', label: 'Preparing', count: statusCount('preparing') },
        { key: 'ready', label: 'Ready', count: statusCount('ready') },
        { key: 'out_for_delivery', label: 'Out', count: statusCount('out_for_delivery') },
        { key: 'delivered', label: 'Delivered', count: statusCount('delivered') },
        { key: 'unpaid', label: 'Unpaid', count: summary?.unpaid_count || 0 },
      ]
    : [
        {
          key: 'assigned',
          label: 'Assigned',
          count: summary?.currently_assigned ?? summary?.total_assigned ?? 0,
          statusFilter: undefined as string | undefined,
        },
        {
          key: 'delivered',
          label: 'Total delivered',
          count: summary?.total_delivered ?? statusCount('delivered'),
          statusFilter: 'delivered',
        },
        {
          key: 'ready',
          label: 'Ready',
          count: summary?.today?.ready ?? statusCount('ready'),
          statusFilter: 'ready',
        },
        {
          key: 'out_for_delivery',
          label: 'Out for delivery',
          count: summary?.today?.out_for_delivery ?? statusCount('out_for_delivery'),
          statusFilter: 'out_for_delivery',
        },
        {
          key: 'delivered_today',
          label: 'Delivered today',
          count: summary?.today?.delivered || 0,
          statusFilter: 'delivered',
        },
        {
          key: 'unpaid',
          label: 'Unpaid COD',
          count: summary?.unpaid_cod_count || 0,
          statusFilter: undefined,
        },
      ]

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.accent}
            onRefresh={() => {
              setRefreshing(true)
              load()
            }}
          />
        }
      >
        <Text style={styles.brand}>{APP_NAME}</Text>
        <Text style={styles.hello}>Hello{user?.first_name ? `, ${user.first_name}` : ''}</Text>
        <Text style={styles.role}>{isAdmin ? 'Administrator' : 'Delivery partner'}</Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <>
            {isAdmin ? (
              <View style={styles.heroCard}>
                <Text style={styles.heroLabel}>Today's orders</Text>
                <Text style={styles.heroValue}>{summary?.today?.count ?? 0}</Text>
                {summary?.today?.revenue != null ? (
                  <Text style={styles.heroSub}>
                    Revenue Rs. {Number(summary.today.revenue).toFixed(0)}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.riderStatsRow}>
                <TouchableOpacity
                  style={[styles.riderStatCard, styles.riderStatPrimary]}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Orders', {})}
                >
                  <MaterialIcons name="assignment" size={22} color="#fff" />
                  <Text style={styles.riderStatValue}>
                    {summary?.currently_assigned ?? summary?.total_assigned ?? 0}
                  </Text>
                  <Text style={styles.riderStatLabel}>Assigned orders</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.riderStatCard, styles.riderStatSecondary]}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Orders', { status: 'delivered' })}
                >
                  <MaterialIcons name="check-circle" size={22} color={colors.accent} />
                  <Text style={[styles.riderStatValue, { color: colors.ink }]}>
                    {summary?.total_delivered ?? statusCount('delivered')}
                  </Text>
                  <Text style={[styles.riderStatLabel, { color: colors.muted }]}>
                    Total deliveries
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {!isAdmin && summary?.earnings ? (
              <Text style={styles.earningsHint}>
                Pending earnings Rs. {Number(summary.earnings.pending).toFixed(0)}
              </Text>
            ) : null}

            <Text style={styles.section}>At a glance</Text>
            <View style={styles.grid}>
              {tiles.map((tile: any) => (
                <TouchableOpacity
                  key={tile.key}
                  style={styles.tile}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate(
                      'Orders',
                      tile.key === 'unpaid' || tile.key === 'assigned'
                        ? {}
                        : { status: tile.statusFilter || tile.key }
                    )
                  }
                >
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          statusColor[tile.key === 'delivered_today' ? 'delivered' : tile.key] ||
                          colors.accent,
                      },
                    ]}
                  />
                  <Text style={styles.tileCount}>{tile.count}</Text>
                  <Text style={styles.tileLabel}>{formatLabel(tile.label)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.allOrders}
              onPress={() => navigation.navigate('Orders', {})}
              activeOpacity={0.9}
            >
              <MaterialIcons name="receipt-long" size={20} color="#fff" />
              <Text style={styles.allOrdersText}>View all orders</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  brand: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  hello: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 6,
    letterSpacing: -0.5,
  },
  role: { fontSize: 14, color: colors.muted, marginBottom: 22 },
  error: { color: colors.danger, marginTop: 20 },
  heroCard: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    padding: 22,
    marginBottom: 24,
  },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
  heroValue: { color: '#fff', fontSize: 44, fontWeight: '800', marginTop: 4 },
  heroSub: { color: 'rgba(255,255,255,0.9)', marginTop: 6, fontWeight: '500' },
  riderStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  riderStatCard: {
    flex: 1,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  riderStatPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  riderStatSecondary: {
    backgroundColor: colors.surface,
  },
  riderStatValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    marginTop: 10,
  },
  riderStatLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  earningsHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 20,
  },
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.muted,
    marginBottom: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 10 },
  tileCount: { fontSize: 26, fontWeight: '800', color: colors.ink },
  tileLabel: { fontSize: 13, color: colors.muted, marginTop: 2, fontWeight: '600' },
  allOrders: {
    marginTop: 28,
    backgroundColor: colors.ink,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  allOrdersText: { color: '#fff', fontWeight: '800', fontSize: 15 },
})
