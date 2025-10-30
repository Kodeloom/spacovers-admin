/**
 * Unit tests for permission utilities
 */

import { describe, it, expect } from 'vitest';
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

describe('Permission Utilities', () => {
  const mockSuperAdminUser: User = {
    id: '1',
    email: 'superadmin@test.com',
    name: 'Super Admin User',
    roles: [{
      role: {
        name: 'Super Admin',
        roleType: {
          name: 'Super Administrator'
        },
        permissions: [
          { permission: { action: 'override', subject: 'Order' } },
          { permission: { action: 'override', subject: 'ProductAttribute' } }
        ]
      }
    }]
  };

  const mockAdminUser: User = {
    id: '2',
    email: 'admin@test.com',
    name: 'Admin User',
    roles: [{
      role: {
        name: 'Admin',
        roleType: {
          name: 'Administrator'
        },
        permissions: [
          { permission: { action: 'update', subject: 'Order' } },
          { permission: { action: 'read', subject: 'ProductAttribute' } }
        ]
      }
    }]
  };

  const mockRegularUser: User = {
    id: '3',
    email: 'user@test.com',
    name: 'Regular User',
    roles: [{
      role: {
        name: 'User',
        roleType: {
          name: 'Employee'
        }
      }
    }]
  };

  describe('isSuperAdmin', () => {
    it('should return true for Super Admin user', () => {
      expect(isSuperAdmin(mockSuperAdminUser)).toBe(true);
    });

    it('should return false for regular admin user', () => {
      expect(isSuperAdmin(mockAdminUser)).toBe(false);
    });

    it('should return false for regular user', () => {
      expect(isSuperAdmin(mockRegularUser)).toBe(false);
    });

    it('should return false for null user', () => {
      expect(isSuperAdmin(null)).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true for Super Admin user', () => {
      expect(isAdmin(mockSuperAdminUser)).toBe(true);
    });

    it('should return true for Admin user', () => {
      expect(isAdmin(mockAdminUser)).toBe(true);
    });

    it('should return false for regular user', () => {
      expect(isAdmin(mockRegularUser)).toBe(false);
    });

    it('should return false for null user', () => {
      expect(isAdmin(null)).toBe(false);
    });
  });

  describe('canOverrideReadOnly', () => {
    it('should return true for Super Admin user', () => {
      expect(canOverrideReadOnly(mockSuperAdminUser)).toBe(true);
    });

    it('should return false for regular admin user', () => {
      expect(canOverrideReadOnly(mockAdminUser)).toBe(false);
    });

    it('should return false for regular user', () => {
      expect(canOverrideReadOnly(mockRegularUser)).toBe(false);
    });
  });

  describe('getUserPrivilegeLevel', () => {
    it('should return super_admin for Super Admin user', () => {
      expect(getUserPrivilegeLevel(mockSuperAdminUser)).toBe('super_admin');
    });

    it('should return admin for Admin user', () => {
      expect(getUserPrivilegeLevel(mockAdminUser)).toBe('admin');
    });

    it('should return user for regular user', () => {
      expect(getUserPrivilegeLevel(mockRegularUser)).toBe('user');
    });

    it('should return none for null user', () => {
      expect(getUserPrivilegeLevel(null)).toBe('none');
    });
  });

  describe('canEditProductAttributes', () => {
    it('should allow Super Admin to edit verified attributes on approved orders as override', () => {
      const result = canEditProductAttributes(mockSuperAdminUser, 'APPROVED', true);
      expect(result.canEdit).toBe(true);
      expect(result.isOverride).toBe(true);
      expect(result.reason).toBe('Super Admin override');
    });

    it('should not allow regular admin to edit verified attributes on approved orders', () => {
      const result = canEditProductAttributes(mockAdminUser, 'APPROVED', true);
      expect(result.canEdit).toBe(false);
      expect(result.isOverride).toBe(false);
      expect(result.reason).toContain('Super Admin');
    });

    it('should allow admin to edit unverified attributes', () => {
      const result = canEditProductAttributes(mockAdminUser, 'APPROVED', false);
      expect(result.canEdit).toBe(true);
      expect(result.isOverride).toBe(false);
    });

    it('should allow admin to edit attributes on pending orders', () => {
      const result = canEditProductAttributes(mockAdminUser, 'PENDING', true);
      expect(result.canEdit).toBe(true);
      expect(result.isOverride).toBe(false);
    });
  });

  describe('getUserRoleNames', () => {
    it('should return role names for user with roles', () => {
      const roleNames = getUserRoleNames(mockSuperAdminUser);
      expect(roleNames).toContain('Super Admin');
    });

    it('should return empty array for null user', () => {
      const roleNames = getUserRoleNames(null);
      expect(roleNames).toEqual([]);
    });
  });
});