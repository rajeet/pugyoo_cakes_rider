import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  Linking,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useRoute } from '@react-navigation/native'
import { useAuthStore } from '../store/authStore'
import { opsService, getErrorMessage } from '../services/api'
import { showError, showSuccess } from '../utils/toast'
import { SUCCESS_MESSAGES } from '../utils/messages'
import type { DeliveryPartner, OpsOrder } from '../types'
import {
  colors,
  statusColor,
  formatLabel,
  adminStatusOptions,
  riderStatusOptions,
} from '../theme'

const STATUS_FILTERS = [
  'all',
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
]

const PAYMENT_FILTERS = ['all', 'pending', 'paid', 'failed', 'refunded']

const statusFilterLabel = (status: string) => {
  if (status === 'all') return 'All statuses'
  if (status === 'out_for_delivery') return 'Out for delivery'
  return formatLabel(status)
}

const paymentFilterLabel = (pay: string) =>
  pay === 'all' ? 'All payments' : formatLabel(pay)

const ADMIN_PAYMENT_OPTIONS = ['success', 'failed', 'cancelled', 'refunded', 'pending']
const RIDER_PAYMENT_OPTIONS = ['success', 'failed', 'pending']

function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText = 'Confirm'
) {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmText, style: 'default', onPress: onConfirm },
  ])
}

function Badge({ label, tone }: { label: string; tone?: string }) {
  const bg = tone || colors.muted
  return (
    <View style={[styles.badge, { backgroundColor: `${bg}18`, borderColor: `${bg}44` }]}>
      <View style={[styles.badgeDot, { backgroundColor: bg }]} />
      <Text style={[styles.badgeText, { color: bg }]} numberOfLines={1}>
        {formatLabel(label)}
      </Text>
    </View>
  )
}

export default function OrdersScreen() {
  const route = useRoute()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.user_type === 'superadmin'

  const [orders, setOrders] = useState<OpsOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedPayment, setSelectedPayment] = useState('all')
  const [showStatusFilter, setShowStatusFilter] = useState(false)
  const [showPaymentFilter, setShowPaymentFilter] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OpsOrder | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showMoreActions, setShowMoreActions] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [statusNotes, setStatusNotes] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('success')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  const [partners, setPartners] = useState<DeliveryPartner[]>([])
  const [editNotes, setEditNotes] = useState('')
  const [editCharge, setEditCharge] = useState('')
  const [editDiscount, setEditDiscount] = useState('')
  const [editBirthday, setEditBirthday] = useState('')
  const [editItems, setEditItems] = useState<
    Array<{ id: number; quantity: number; name: string; markedDelete?: boolean }>
  >([])

  const fetchOrders = async () => {
    try {
      const params: {
        status?: string
        payment_status?: string
        search?: string
      } = {}
      if (selectedStatus !== 'all') params.status = selectedStatus
      if (selectedPayment !== 'all') params.payment_status = selectedPayment
      const q = search.trim()
      if (q) params.search = q
      const data = await opsService.getOrders(params)
      setOrders(data)
    } catch (err) {
      showError(getErrorMessage(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => fetchOrders(), search ? 300 : 0)
    return () => clearTimeout(t)
  }, [selectedStatus, selectedPayment, search])

  useEffect(() => {
    const params = route.params as { orderId?: number; status?: string } | undefined
    if (params?.status && params.status !== selectedStatus) {
      setSelectedStatus(params.status)
    }
    if (params?.orderId) {
      opsService
        .getOrderById(params.orderId)
        .then((order) => {
          setSelectedOrder(order)
          setShowDetail(true)
        })
        .catch(() => undefined)
    }
  }, [route.params])

  const statusOptions = useMemo(() => {
    if (!selectedOrder) return []
    return isAdmin
      ? adminStatusOptions(selectedOrder.status)
      : riderStatusOptions(selectedOrder.status)
  }, [selectedOrder, isAdmin])

  /** Delivered + paid orders: hide Payment, Status, and More */
  const isOrderFinalized =
    selectedOrder?.status === 'delivered' &&
    ['paid', 'success'].includes(selectedOrder?.payment_status || '')

  const canUpdateStatus = Boolean(
    selectedOrder && !isOrderFinalized && statusOptions.length > 0
  )
  const canUpdatePayment = Boolean(selectedOrder && !isOrderFinalized)
  const canShowMore = Boolean(isAdmin && selectedOrder && !isOrderFinalized)
  const showActionBar = canUpdatePayment || canUpdateStatus || canShowMore

  const openDetail = async (order: OpsOrder) => {
    try {
      const full = await opsService.getOrderById(order.id)
      setSelectedOrder(full)
      setShowDetail(true)
    } catch (err) {
      showError(getErrorMessage(err))
    }
  }

  const applyStatusUpdate = async (statusValue: string, notes?: string) => {
    if (!selectedOrder || isOrderFinalized) return
    setUpdating(true)
    try {
      const updated = await opsService.updateOrderStatus(
        selectedOrder.id,
        statusValue,
        notes
      )
      setSelectedOrder(updated)
      setShowStatusModal(false)
      setStatusNotes('')
      showSuccess(SUCCESS_MESSAGES.ORDER_STATUS_UPDATED)
      fetchOrders()
    } catch (err) {
      showError(getErrorMessage(err))
    } finally {
      setUpdating(false)
    }
  }

  const handleStatusUpdate = () => {
    if (!selectedOrder || !newStatus || isOrderFinalized) return
    confirmAction(
      'Confirm status change',
      `Change order #${selectedOrder.order_number} from "${formatLabel(selectedOrder.status)}" to "${formatLabel(newStatus)}"?`,
      () => applyStatusUpdate(newStatus, statusNotes)
    )
  }

  const handlePaymentUpdate = () => {
    if (!selectedOrder || !paymentStatus || isOrderFinalized) return
    const label = paymentStatus === 'success' ? 'Paid' : formatLabel(paymentStatus)
    confirmAction(
      'Confirm payment update',
      `Set payment for order #${selectedOrder.order_number} to "${label}"?`,
      async () => {
        setUpdating(true)
        try {
          const payload: { status: string; notes?: string; amount_collected?: string } = {
            status: paymentStatus,
            notes: paymentNotes,
          }
          if (!isAdmin && paymentStatus === 'success') {
            payload.amount_collected = String(selectedOrder.total_amount)
          }
          const updated = await opsService.updatePayment(selectedOrder.id, payload)
          setSelectedOrder(updated)
          setShowPaymentModal(false)
          setPaymentNotes('')
          showSuccess(SUCCESS_MESSAGES.PAYMENT_UPDATED)
          fetchOrders()
        } catch (err) {
          showError(getErrorMessage(err))
        } finally {
          setUpdating(false)
        }
      }
    )
  }

  const openEdit = () => {
    if (!selectedOrder) return
    setShowMoreActions(false)
    setEditNotes(selectedOrder.special_instructions || '')
    setEditCharge(String(selectedOrder.delivery_charge || '0'))
    setEditDiscount(String(selectedOrder.discount_amount || '0'))
    setEditBirthday(selectedOrder.birthday_message || '')
    setEditItems(
      (selectedOrder.items || []).map((item) => ({
        id: item.id,
        quantity: item.quantity,
        name: item.product?.name || `Item ${item.id}`,
      }))
    )
    setShowEditModal(true)
  }

  const handleEditSave = () => {
    if (!selectedOrder) return
    confirmAction(
      'Confirm order edit',
      `Save changes to order #${selectedOrder.order_number}?`,
      async () => {
        setUpdating(true)
        try {
          const items = editItems.map((item) =>
            item.markedDelete
              ? { id: item.id, _action: 'delete' as const }
              : { id: item.id, _action: 'update' as const, quantity: item.quantity }
          )
          const updated = await opsService.editOrder(selectedOrder.id, {
            special_instructions: editNotes,
            delivery_charge: editCharge,
            discount_amount: editDiscount,
            birthday_message: editBirthday,
            items,
          })
          setSelectedOrder(updated)
          setShowEditModal(false)
          showSuccess(SUCCESS_MESSAGES.ORDER_UPDATED)
          fetchOrders()
        } catch (err) {
          showError(getErrorMessage(err))
        } finally {
          setUpdating(false)
        }
      },
      'Save'
    )
  }

  const openAssign = async () => {
    setShowMoreActions(false)
    try {
      const list = await opsService.getDeliveryPartners()
      setPartners(list)
      setShowAssignModal(true)
    } catch (err) {
      showError(getErrorMessage(err))
    }
  }

  const handleAssign = (partnerId: number | null) => {
    if (!selectedOrder) return
    const partner = partners.find((p) => p.id === partnerId)
    const who = partner
      ? `${partner.first_name} ${partner.last_name}`.trim() || partner.email
      : 'no rider'
    confirmAction(
      'Confirm rider assignment',
      partnerId == null
        ? `Unassign rider from order #${selectedOrder.order_number}?`
        : `Assign ${who} to order #${selectedOrder.order_number}?`,
      async () => {
        setUpdating(true)
        try {
          const updated = await opsService.assignRider(selectedOrder.id, partnerId)
          setSelectedOrder(updated)
          setShowAssignModal(false)
          showSuccess(SUCCESS_MESSAGES.RIDER_ASSIGNED)
          fetchOrders()
        } catch (err) {
          showError(getErrorMessage(err))
        } finally {
          setUpdating(false)
        }
      }
    )
  }

  const customerName = (order: OpsOrder) => {
    if (!order.customer) return 'Customer'
    const name = `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
    return name || order.customer.email || 'Customer'
  }

  const openDeliveryInMaps = async () => {
    const addr = selectedOrder?.delivery_address_info
    if (!addr) return

    const lat = addr.latitude ? Number(addr.latitude) : NaN
    const lng = addr.longitude ? Number(addr.longitude) : NaN
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng)
    const label = encodeURIComponent(
      [addr.full_name, addr.address_details].filter(Boolean).join(', ') || 'Delivery location'
    )

    let url: string
    if (hasCoords) {
      url =
        Platform.OS === 'ios'
          ? `http://maps.apple.com/?ll=${lat},${lng}&q=${label}`
          : `geo:${lat},${lng}?q=${lat},${lng}(${label})`
    } else if (addr.address_details) {
      const query = encodeURIComponent(addr.address_details)
      url =
        Platform.OS === 'ios'
          ? `http://maps.apple.com/?q=${query}`
          : `geo:0,0?q=${query}`
    } else {
      showError('No location available for this order')
      return
    }

    try {
      const canOpen = await Linking.canOpenURL(url)
      if (canOpen) {
        await Linking.openURL(url)
        return
      }
      // Fallback to Google Maps web
      const webUrl = hasCoords
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr.address_details)}`
      await Linking.openURL(webUrl)
    } catch {
      showError('Could not open maps')
    }
  }

  const renderOrder = ({ item }: { item: OpsOrder }) => (
    <TouchableOpacity style={styles.card} onPress={() => openDetail(item)} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <Text style={styles.orderNumber}>#{item.order_number}</Text>
        <Text style={styles.amount}>Rs. {item.total_amount}</Text>
      </View>
      <Text style={styles.customer} numberOfLines={1}>
        {customerName(item)}
        {item.bakery?.name ? `  ·  ${item.bakery.name}` : ''}
      </Text>
      <View style={styles.badgeRow}>
        <Badge label={item.status} tone={statusColor[item.status]} />
        <Badge label={item.payment_status} tone={statusColor[item.payment_status]} />
      </View>
      {(item.delivery_date || item.delivery_time) && (
        <Text style={styles.metaLine}>
          {item.delivery_date || ''}
          {item.delivery_time ? ` · ${item.delivery_time}` : ''}
        </Text>
      )}
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <Text style={styles.subtitle}>
          {isAdmin ? 'All bakery orders' : 'Your assigned deliveries'}
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={20} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search order #, customer, bakery"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {search.length > 0 ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={18} color={colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setShowStatusFilter(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.dropdownLabel} numberOfLines={1}>
            {statusFilterLabel(selectedStatus)}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={22} color={colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setShowPaymentFilter(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.dropdownLabel} numberOfLines={1}>
            {paymentFilterLabel(selectedPayment)}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={22} color={colors.muted} />
        </TouchableOpacity>
      </View>

      <Modal visible={showStatusFilter} transparent animationType="fade">
        <Pressable style={styles.sheetOverlay} onPress={() => setShowStatusFilter(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Filter by status</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {STATUS_FILTERS.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.option, selectedStatus === status && styles.optionActive]}
                  onPress={() => {
                    setSelectedStatus(status)
                    setShowStatusFilter(false)
                  }}
                >
                  <Text style={styles.optionText}>{statusFilterLabel(status)}</Text>
                  {selectedStatus === status ? (
                    <MaterialIcons name="check" size={20} color={colors.accent} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showPaymentFilter} transparent animationType="fade">
        <Pressable style={styles.sheetOverlay} onPress={() => setShowPaymentFilter(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Filter by payment</Text>
            {PAYMENT_FILTERS.map((pay) => (
              <TouchableOpacity
                key={pay}
                style={[styles.option, selectedPayment === pay && styles.optionActive]}
                onPress={() => {
                  setSelectedPayment(pay)
                  setShowPaymentFilter(false)
                }}
              >
                <Text style={styles.optionText}>{paymentFilterLabel(pay)}</Text>
                {selectedPayment === pay ? (
                  <MaterialIcons name="check" size={20} color={colors.accent} />
                ) : null}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={colors.accent} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.accent}
              onRefresh={() => {
                setRefreshing(true)
                fetchOrders()
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="inbox" size={40} color={colors.border} />
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.emptySub}>Try another search or filter</Text>
            </View>
          }
        />
      )}

      {/* Detail */}
      <Modal visible={showDetail} animationType="slide" onRequestClose={() => setShowDetail(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>Order</Text>
              <Text style={styles.modalTitle}>#{selectedOrder?.order_number}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowDetail(false)}>
              <MaterialIcons name="close" size={22} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            {selectedOrder ? (
              <>
                <View style={styles.summaryStrip}>
                  <Badge label={selectedOrder.status} tone={statusColor[selectedOrder.status]} />
                  <Badge
                    label={selectedOrder.payment_status}
                    tone={statusColor[selectedOrder.payment_status]}
                  />
                  {selectedOrder.payment_method ? (
                    <Text style={styles.methodTag}>{selectedOrder.payment_method.toUpperCase()}</Text>
                  ) : null}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Customer</Text>
                  <Text style={styles.sectionValue}>{customerName(selectedOrder)}</Text>
                  {selectedOrder.customer?.email ? (
                    <Text style={styles.sectionMuted}>{selectedOrder.customer.email}</Text>
                  ) : null}
                </View>

                {selectedOrder.delivery_address_info ? (
                  <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>Deliver to</Text>
                      <TouchableOpacity
                        style={styles.mapBtn}
                        onPress={openDeliveryInMaps}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Open location in maps"
                      >
                        <MaterialCommunityIcons name="google-maps" size={30} color="#EA4335" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.sectionValue}>
                      {selectedOrder.delivery_address_info.full_name}
                    </Text>
                    <Text style={styles.sectionMuted}>
                      {selectedOrder.delivery_address_info.phone_number}
                    </Text>
                    <Text style={styles.sectionMuted}>
                      {selectedOrder.delivery_address_info.address_details}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Items</Text>
                  {(selectedOrder.items || []).map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>
                          {item.quantity}× {item.product?.name}
                        </Text>
                        {item.size ? (
                          <Text style={styles.sectionMuted}>{item.size}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.itemPrice}>Rs. {item.total_price}</Text>
                    </View>
                  ))}
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>Rs. {selectedOrder.total_amount}</Text>
                  </View>
                </View>

                {selectedOrder.special_instructions ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Instructions</Text>
                    <Text style={styles.sectionValue}>{selectedOrder.special_instructions}</Text>
                  </View>
                ) : null}

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Assigned rider</Text>
                  {selectedOrder.delivery_partner ? (
                    <>
                      <Text style={styles.sectionValue}>
                        {[
                          selectedOrder.delivery_partner.first_name,
                          selectedOrder.delivery_partner.last_name,
                        ]
                          .filter(Boolean)
                          .join(' ') || selectedOrder.delivery_partner.email}
                      </Text>
                      {selectedOrder.delivery_partner.phone_number ? (
                        <Text style={styles.sectionMuted}>
                          {selectedOrder.delivery_partner.phone_number}
                        </Text>
                      ) : null}
                      {selectedOrder.delivery_partner.email ? (
                        <Text style={styles.sectionMuted}>
                          {selectedOrder.delivery_partner.email}
                        </Text>
                      ) : null}
                    </>
                  ) : (
                    <Text style={styles.sectionMuted}>Not assigned</Text>
                  )}
                </View>

                {isOrderFinalized ? (
                  <View style={[styles.section, { backgroundColor: colors.accentSoft }]}>
                    <Text style={styles.sectionValue}>
                      This order is delivered and paid. Status and payment can no longer be
                      changed.
                    </Text>
                  </View>
                ) : !isAdmin &&
                  !['ready', 'out_for_delivery'].includes(selectedOrder.status) ? (
                  <View style={[styles.section, { backgroundColor: colors.accentSoft }]}>
                    <Text style={styles.sectionValue}>
                      Status updates unlock when this order is ready for delivery.
                    </Text>
                  </View>
                ) : null}

                <View style={{ height: showActionBar ? 120 : 24 }} />
              </>
            ) : null}
          </ScrollView>

          {showActionBar ? (
            <View style={styles.actionBar}>
              <View style={styles.secondaryRow}>
                {canUpdatePayment ? (
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => {
                      setPaymentStatus('success')
                      setShowPaymentModal(true)
                    }}
                  >
                    <MaterialIcons name="payments" size={18} color={colors.accentText} />
                    <Text style={styles.secondaryBtnText}>Payment</Text>
                  </TouchableOpacity>
                ) : null}

                {canUpdateStatus ? (
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => {
                      setNewStatus(statusOptions[0])
                      setShowStatusModal(true)
                    }}
                  >
                    <MaterialIcons name="sync" size={18} color={colors.accentText} />
                    <Text style={styles.secondaryBtnText}>Status</Text>
                  </TouchableOpacity>
                ) : null}

                {canShowMore ? (
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => setShowMoreActions(true)}
                  >
                    <MaterialIcons name="more-horiz" size={18} color={colors.accentText} />
                    <Text style={styles.secondaryBtnText}>More</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* More actions (admin) */}
      <Modal visible={showMoreActions} transparent animationType="fade">
        <Pressable style={styles.sheetOverlay} onPress={() => setShowMoreActions(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>More actions</Text>
            <TouchableOpacity style={styles.sheetRow} onPress={openEdit}>
              <MaterialIcons name="edit" size={22} color={colors.ink} />
              <Text style={styles.sheetRowText}>Edit order</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetRow} onPress={openAssign}>
              <MaterialIcons name="delivery-dining" size={22} color={colors.ink} />
              <Text style={styles.sheetRowText}>Assign rider</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetRow, { marginTop: 8 }]}
              onPress={() => setShowMoreActions(false)}
            >
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Status modal */}
      <Modal visible={showStatusModal} transparent animationType="fade">
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Change status</Text>
            {statusOptions.map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.option, newStatus === status && styles.optionActive]}
                onPress={() => setNewStatus(status)}
              >
                <Text style={styles.optionText}>{formatLabel(status)}</Text>
                {newStatus === status ? (
                  <MaterialIcons name="check" size={20} color={colors.accent} />
                ) : null}
              </TouchableOpacity>
            ))}
            <TextInput
              style={styles.notes}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.muted}
              value={statusNotes}
              onChangeText={setStatusNotes}
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirm}
                onPress={handleStatusUpdate}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment modal */}
      <Modal visible={showPaymentModal} transparent animationType="fade">
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Update payment</Text>
            {(isAdmin ? ADMIN_PAYMENT_OPTIONS : RIDER_PAYMENT_OPTIONS).map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.option, paymentStatus === status && styles.optionActive]}
                onPress={() => setPaymentStatus(status)}
              >
                <Text style={styles.optionText}>
                  {status === 'success' ? 'Paid' : formatLabel(status)}
                </Text>
                {paymentStatus === status ? (
                  <MaterialIcons name="check" size={20} color={colors.accent} />
                ) : null}
              </TouchableOpacity>
            ))}
            <TextInput
              style={styles.notes}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.muted}
              value={paymentNotes}
              onChangeText={setPaymentNotes}
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirm}
                onPress={handlePaymentUpdate}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit modal */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { maxHeight: '90%' }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Edit order</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Items</Text>
              {editItems.map((item) => (
                <View key={item.id} style={styles.editItemRow}>
                  <Text
                    style={[styles.editItemName, item.markedDelete && styles.deletedItem]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  {!item.markedDelete ? (
                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        onPress={() =>
                          setEditItems((prev) =>
                            prev.map((row) =>
                              row.id === item.id
                                ? { ...row, quantity: Math.max(1, row.quantity - 1) }
                                : row
                            )
                          )
                        }
                      >
                        <MaterialIcons name="remove-circle-outline" size={22} color={colors.accent} />
                      </TouchableOpacity>
                      <Text style={styles.qty}>{item.quantity}</Text>
                      <TouchableOpacity
                        onPress={() =>
                          setEditItems((prev) =>
                            prev.map((row) =>
                              row.id === item.id ? { ...row, quantity: row.quantity + 1 } : row
                            )
                          )
                        }
                      >
                        <MaterialIcons name="add-circle-outline" size={22} color={colors.accent} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          setEditItems((prev) =>
                            prev.map((row) =>
                              row.id === item.id ? { ...row, markedDelete: true } : row
                            )
                          )
                        }
                      >
                        <MaterialIcons name="delete-outline" size={22} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() =>
                        setEditItems((prev) =>
                          prev.map((row) =>
                            row.id === item.id ? { ...row, markedDelete: false } : row
                          )
                        )
                      }
                    >
                      <Text style={styles.undo}>Undo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <Text style={styles.fieldLabel}>Birthday message</Text>
              <TextInput
                style={styles.notes}
                value={editBirthday}
                onChangeText={setEditBirthday}
                placeholderTextColor={colors.muted}
              />
              <Text style={styles.fieldLabel}>Special instructions</Text>
              <TextInput
                style={styles.notes}
                value={editNotes}
                onChangeText={setEditNotes}
                multiline
                placeholderTextColor={colors.muted}
              />
              <Text style={styles.fieldLabel}>Delivery charge</Text>
              <TextInput
                style={styles.notes}
                value={editCharge}
                onChangeText={setEditCharge}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.muted}
              />
              <Text style={styles.fieldLabel}>Discount</Text>
              <TextInput
                style={styles.notes}
                value={editDiscount}
                onChangeText={setEditDiscount}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.muted}
              />
            </ScrollView>
            <View style={styles.sheetActions}>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirm} onPress={handleEditSave} disabled={updating}>
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign */}
      <Modal visible={showAssignModal} transparent animationType="fade">
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Assign rider</Text>
            <TouchableOpacity style={styles.option} onPress={() => handleAssign(null)}>
              <Text style={styles.optionText}>Unassign</Text>
            </TouchableOpacity>
            {partners.map((p) => (
              <TouchableOpacity key={p.id} style={styles.option} onPress={() => handleAssign(p.id)}>
                <Text style={styles.optionText}>
                  {p.first_name} {p.last_name}
                </Text>
                <Text style={styles.sectionMuted}>{p.email}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowAssignModal(false)} style={{ marginTop: 12 }}>
              <Text style={styles.cancel}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 2 },
  searchWrap: {
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 2 },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  dropdown: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  dropdownLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  filterBlock: {
    marginTop: 4,
    marginBottom: 2,
  },
  filterLabel: {
    marginLeft: 20,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  filterScroll: {
    height: 40,
    flexGrow: 0,
  },
  filters: {
    paddingHorizontal: 16,
    alignItems: 'center',
    height: 40,
  },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipActivePay: {
    backgroundColor: colors.accentDark,
    borderColor: colors.accentDark,
  },
  chipText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  chipTextActive: { color: '#fff' },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNumber: { fontSize: 16, fontWeight: '800', color: colors.ink },
  amount: { fontSize: 16, fontWeight: '700', color: colors.accentText },
  customer: { color: colors.muted, marginTop: 6, fontSize: 14 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  metaLine: { marginTop: 10, fontSize: 12, color: colors.muted },
  empty: { alignItems: 'center', marginTop: 64, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  emptySub: { fontSize: 13, color: colors.muted },
  modalSafe: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: colors.ink, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: { padding: 20 },
  summaryStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  methodTag: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.muted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderRadius: 999,
    overflow: 'hidden',
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  mapBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEECEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionValue: { fontSize: 15, color: colors.ink, lineHeight: 22, fontWeight: '600' },
  sectionMuted: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 20 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg,
  },
  itemName: { fontSize: 15, color: colors.ink, fontWeight: '600' },
  itemPrice: { fontWeight: '700', color: colors.ink },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: colors.muted },
  totalValue: { fontSize: 20, fontWeight: '800', color: colors.ink },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  secondaryRow: { flexDirection: 'row', gap: 8 },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    paddingVertical: 14,
  },
  secondaryBtnText: { color: colors.accentText, fontWeight: '700', fontSize: 13 },
  sheetOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 10,
    maxHeight: '85%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: 12 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg,
  },
  sheetRowText: { fontSize: 16, fontWeight: '600', color: colors.ink },
  option: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionActive: {
    backgroundColor: colors.accentSoft,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  optionText: { fontSize: 15, color: colors.ink, fontWeight: '600' },
  notes: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    color: colors.ink,
    backgroundColor: colors.bg,
  },
  fieldLabel: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg,
  },
  editItemName: { flex: 1, color: colors.ink, fontWeight: '600', paddingRight: 8 },
  deletedItem: { textDecorationLine: 'line-through', color: colors.muted },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qty: { minWidth: 20, textAlign: 'center', fontWeight: '800', color: colors.ink },
  undo: { color: colors.accent, fontWeight: '700' },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  cancel: { color: colors.muted, fontSize: 15, fontWeight: '700' },
  confirm: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
    minWidth: 96,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '800' },
})
