/**
 * Composable for user permissions and role checking
 * Provides reactive access to user role information and permission checking functions
 */

import { computed, type ComputedRef } from 'vue';
import { authClient } from '~/lib/auth-client';
import { 
  isSuperAdmin, 
  isAdmin, 
  hasPermission, 
  canOverrideReadOnly,
  getUserRoleNames,
  getUserPrivilegeLevel,
  canEditProductAttributes,
  type User 
} from '~/utils/permissions';

export interface UseUserPermissionsReturn {
  // Reactive user data
  user: ComputedRef<User | null>;
  isAuthenticated: ComputedRef<boolean>;
  
  // Role checks
  isSuperAdmin: ComputedRef<boolean>;
  isAdmin: ComputedRef<boolean>;
  canOverrideReadOnly: ComputedRef<boolean>;
  
  // User info
  userRoleNames: ComputedRef<string[]>;
  privilegeLevel: ComputedRef<'super_admin' | 'admin' | 'user' | 'none'>;
  
  // Permission checking functions
  hasPermission: (action: string, subject: string) => boolean;
  canEditProductAttributes: (orderStatus: string, attributesVerified: boolean) => {
    canEdit: boolean;
    isOverride: boolean;
    reason?: string;
  };
}

/**
 * Composable for user permissions and role checking
 * @returns Object with reactive user data and permission checking functions
 */
export function useUserPermissions(): UseUserPermissionsReturn {
  // Get session data from auth client
  const sessionState = authClient.useSession();
  
  // Reactive user data
  const user = computed<User | null>(() => {
    return sessionState.value?.data?.user || null;
  });
  
  const isAuthenticated = computed(() => {
    return !!user.value;
  });
  
  // Reactive role checks
  const isSuperAdminComputed = computed(() => {
    return isSuperAdmin(user.value);
  });
  
  const isAdminComputed = computed(() => {
    return isAdmin(user.value);
  });
  
  const canOverrideReadOnlyComputed = computed(() => {
    return canOverrideReadOnly(user.value);
  });
  
  // User information
  const userRoleNames = computed(() => {
    return getUserRoleNames(user.value);
  });
  
  const privilegeLevel = computed(() => {
    return getUserPrivilegeLevel(user.value);
  });
  
  // Permission checking functions
  const hasPermissionFn = (action: string, subject: string): boolean => {
    return hasPermission(user.value, action, subject);
  };
  
  const canEditProductAttributesFn = (orderStatus: string, attributesVerified: boolean) => {
    return canEditProductAttributes(user.value, orderStatus, attributesVerified);
  };
  
  return {
    // Reactive data
    user,
    isAuthenticated,
    
    // Role checks
    isSuperAdmin: isSuperAdminComputed,
    isAdmin: isAdminComputed,
    canOverrideReadOnly: canOverrideReadOnlyComputed,
    
    // User info
    userRoleNames,
    privilegeLevel,
    
    // Functions
    hasPermission: hasPermissionFn,
    canEditProductAttributes: canEditProductAttributesFn
  };
}