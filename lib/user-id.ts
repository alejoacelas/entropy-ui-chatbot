const USER_ID_KEY = 'aerin_user_id';

/**
 * Gets or creates a unique user ID stored in localStorage.
 * This ID persists across sessions and is used to associate conversations with users.
 * No server-side authentication is required.
 *
 * @returns User ID string (UUID v4), or empty string if running on server
 */
export function getUserId(): string {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return '';
  }

  // Try to get existing user ID from localStorage
  let userId = localStorage.getItem(USER_ID_KEY);

  if (!userId) {
    // Generate new UUID v4 using native crypto API
    userId = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }

  return userId;
}

/**
 * Clears the user ID from localStorage.
 * This will cause a new ID to be generated on next getUserId() call.
 * Useful for testing or if user wants to reset their identity.
 */
export function clearUserId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_ID_KEY);
  }
}
