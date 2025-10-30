/**
 * Type definitions for the permission system
 */

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

export type PrivilegeLevel = 'super_admin' | 'admin' | 'user' | 'none';

export interface PermissionCheckResult {
  canEdit: boolean;
  isOverride: boolean;
  reason?: string;
}

export type WarningLevel = 'none' | 'standard' | 'critical';