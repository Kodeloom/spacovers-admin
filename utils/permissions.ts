/**
 * Permission and role checking utilities
 * Provides functions to check user roles and permissions for the order edit restrictions feature
 */

// Type definitions for user and role structures
export interface UserRole {
  role: {
    name: string;
    roleType?: {
      name: string;
    };
    permissions?: RolePermission[];
  };
}

export interface RolePermission {
  permission: {
    action: string;
    subject: string;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles?: UserRole[];
  role?: string; // Legacy role field
}

/**
 * Check if user has Super Admin role
 * @param user - User object with roles
 * @returns boolean indicating if user is a Super Admin
 */
export function isSuperAdmin(user: User | null | undefined): boolean {
  if (!user) return false;

  // Check the roles array (preferred method)
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles.some((userRole: UserRole) => {
      const roleName = userRole.role?.name;
      const roleTypeName = userRole.role?.roleType?.name;
      
      // Check for Super Admin role name or Super Administrator role type
      return roleName === 'Super Admin' || roleTypeName === 'Super Administrator';
    });
  }

  // Fallback to legacy role field
  if (user.role) {
    return user.role === 'SUPER_ADMIN' || user.role === 'Super Admin';
  }

  return false;
}

/**
 * Check if user has admin privileges (Admin or Super Admin)
 * @param user - User object with roles
 * @returns boolean indicating if user has admin access
 */
export function isAdmin(user: User | null | undefined): boolean {
  if (!user) return false;

  // Super Admin is always an admin
  if (isSuperAdmin(user)) return true;

  // Check the roles array
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles.some((userRole: UserRole) => {
      const roleName = userRole.role?.name;
      const roleTypeName = userRole.role?.roleType?.name;
      
      // Admin roles by name
      const adminRoleNames = ['Admin', 'Manager'];
      // Admin roles by type
      const adminRoleTypes = ['Administrator', 'Manager'];
      
      return (roleName && adminRoleNames.includes(roleName)) || 
             (roleTypeName && adminRoleTypes.includes(roleTypeName));
    });
  }

  // Fallback to legacy role field
  if (user.role) {
    const adminRoles = ['ADMIN', 'Admin', 'MANAGER', 'Manager'];
    return adminRoles.includes(user.role);
  }

  return false;
}

/**
 * Check if user has a specific permission
 * @param user - User object with roles and permissions
 * @param action - Permission action (e.g., 'update', 'override')
 * @param subject - Permission subject (e.g., 'Order', 'ProductAttribute')
 * @returns boolean indicating if user has the permission
 */
export function hasPermission(
  user: User | null | undefined, 
  action: string, 
  subject: string
): boolean {
  if (!user) return false;

  // Super Admin has all permissions
  if (isSuperAdmin(user)) return true;

  // Check specific permissions in roles
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles.some((userRole: UserRole) => {
      if (!userRole.role?.permissions) return false;
      
      return userRole.role.permissions.some((rolePermission: RolePermission) => {
        const perm = rolePermission.permission;
        return perm.action === action && perm.subject === subject;
      });
    });
  }

  return false;
}

/**
 * Check if user can override read-only restrictions
 * This is specifically for the order edit restrictions feature
 * @param user - User object
 * @returns boolean indicating if user can override restrictions
 */
export function canOverrideReadOnly(user: User | null | undefined): boolean {
  if (!user) return false;
  
  // Only Super Admin can override read-only restrictions
  return isSuperAdmin(user);
}

/**
 * Get user's role names as an array
 * @param user - User object
 * @returns Array of role names
 */
export function getUserRoleNames(user: User | null | undefined): string[] {
  if (!user) return [];

  const roleNames: string[] = [];

  // Get roles from roles array
  if (user.roles && Array.isArray(user.roles)) {
    user.roles.forEach((userRole: UserRole) => {
      if (userRole.role?.name) {
        roleNames.push(userRole.role.name);
      }
    });
  }

  // Add legacy role if present and not already included
  if (user.role && !roleNames.includes(user.role)) {
    roleNames.push(user.role);
  }

  return roleNames;
}

/**
 * Get user's highest privilege level
 * @param user - User object
 * @returns string indicating privilege level
 */
export function getUserPrivilegeLevel(user: User | null | undefined): 'super_admin' | 'admin' | 'user' | 'none' {
  if (!user) return 'none';
  
  if (isSuperAdmin(user)) return 'super_admin';
  if (isAdmin(user)) return 'admin';
  
  return 'user';
}

/**
 * Check if user can edit verified product attributes on approved orders
 * This is the core permission check for the order edit restrictions feature
 * @param user - User object
 * @param orderStatus - Current order status
 * @param attributesVerified - Whether product attributes are verified
 * @returns object with permission details
 */
export function canEditProductAttributes(
  user: User | null | undefined,
  orderStatus: string,
  attributesVerified: boolean
): {
  canEdit: boolean;
  isOverride: boolean;
  reason?: string;
} {
  if (!user) {
    return {
      canEdit: false,
      isOverride: false,
      reason: 'User not authenticated'
    };
  }

  // If attributes are not verified or order is not approved, anyone with admin access can edit
  const approvedStatuses = ['APPROVED', 'ORDER_PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED'];
  const isOrderApproved = approvedStatuses.includes(orderStatus);
  
  if (!attributesVerified || !isOrderApproved) {
    return {
      canEdit: isAdmin(user),
      isOverride: false,
      reason: isAdmin(user) ? undefined : 'Admin access required'
    };
  }

  // For verified attributes on approved orders, only Super Admin can edit (as override)
  if (isSuperAdmin(user)) {
    return {
      canEdit: true,
      isOverride: true,
      reason: 'Super Admin override'
    };
  }

  return {
    canEdit: false,
    isOverride: false,
    reason: 'Verified attributes on approved orders can only be edited by Super Admin'
  };
}