export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Successfully logged out',
  PROFILE_UPDATED: 'Profile updated successfully',
  ORDER_UPDATED: 'Order updated successfully',
  ORDER_STATUS_UPDATED: 'Order status updated successfully',
  PAYMENT_UPDATED: 'Payment status updated successfully',
  RIDER_ASSIGNED: 'Delivery partner assigned successfully',
  OPERATION_SUCCESS: 'Operation completed successfully',
}

export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid username or password',
  SESSION_EXPIRED: 'Session expired. Please log in again.',
  LOGIN_REQUIRED: 'Please log in to continue',
  UNAUTHORIZED: 'Unauthorized. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'Resource not found.',
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  CONNECTION_ERROR: 'Could not connect to the server. Please try again later.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
  AN_ERROR_OCCURRED: 'An error occurred.',
  ACCESS_DENIED: 'Access Denied',
  OPS_APP_ONLY: 'Only admins and delivery partners can use this app.',
  ADMIN_ONLY: 'Only administrators can perform this action.',
  ORDER_LOAD_FAILED: 'Failed to load orders',
  ORDER_STATUS_UPDATE_FAILED: 'Failed to update order status',
  PAYMENT_UPDATE_FAILED: 'Failed to update payment status',
}

export const getErrorMessage = (key: keyof typeof ERROR_MESSAGES): string =>
  ERROR_MESSAGES[key]
