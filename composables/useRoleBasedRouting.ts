import { computed } from 'vue';
import { authClient } from '~/lib/auth-client';

export function useRoleBasedRouting() {
  const session = authClient.useSession();

  // Check if user has admin role types
  const isAdmin = computed(() => {
    const user = session.value?.data?.user;
    console.log('useRoleBasedRouting - User:', user);
    console.log('useRoleBasedRouting - User roles:', user?.roles);
    
    if (!user?.roles || !Array.isArray(user.roles)) {
      console.log('useRoleBasedRouting - No roles found, returning false for isAdmin');
      return false;
    }
    
    const hasAdminRole = user.roles.some((userRole: any) => {
      console.log('useRoleBasedRouting - Checking userRole:', userRole);
      console.log('useRoleBasedRouting - Role:', userRole.role);
      console.log('useRoleBasedRouting - RoleType:', userRole.role?.roleType);
      
      // Check both role name and role type (fallback to role name if roleType is not set)
      const roleName = userRole.role?.name;
      const roleTypeName = userRole.role?.roleType?.name;
      
      // Admin roles by name (fallback)
      const adminRoleNames = ['Super Admin', 'Admin', 'Manager'];
      // Admin roles by type (preferred)
      const adminRoleTypes = ['Administrator', 'Manager', 'Super Administrator'];
      
      return (roleName && adminRoleNames.includes(roleName)) || 
             (roleTypeName && adminRoleTypes.includes(roleTypeName));
    });
    
    console.log('useRoleBasedRouting - Has admin role:', hasAdminRole);
    return hasAdminRole;
  });

  // Check if user has warehouse staff role types
  const isWarehouseStaff = computed(() => {
    const user = session.value?.data?.user;
    if (!user?.roles || !Array.isArray(user.roles)) return false;
    
    return user.roles.some((userRole: any) => {
      const roleName = userRole.role?.name;
      const roleTypeName = userRole.role?.roleType?.name;
      
      // Warehouse staff roles by name (fallback)
      const warehouseRoleNames = ['Cutting', 'Sewing', 'Foam Cutting (Shop)', 'Foam Cutting'];
      // Warehouse staff roles by type (preferred)
      const warehouseRoleTypes = ['Warehouse Staff'];
      
      return (roleName && warehouseRoleNames.includes(roleName)) || 
             (roleTypeName && warehouseRoleTypes.includes(roleTypeName));
    });
  });

  // Get the appropriate default route for the user
  const getDefaultRoute = computed(() => {
    if (isAdmin.value) {
      return '/admin';
    } else if (isWarehouseStaff.value) {
      return '/warehouse/kiosk';
    } else {
      return '/login';
    }
  });

  // Get user's assigned stations (for warehouse staff)
  const getUserStations = computed(() => {
    const user = session.value?.data?.user;
    if (!user?.roles || !Array.isArray(user.roles)) return [];
    
    const stations: any[] = [];
    user.roles.forEach((userRole: any) => {
      if (userRole.role?.stations) {
        stations.push(...userRole.role.stations);
      }
    });
    
    return stations;
  });

  // Check if user can access a specific station
  const canAccessStation = (stationName: string) => {
    const userStations = getUserStations.value;
    return userStations.some((station: any) => station.station?.name === stationName);
  };

  return {
    isAdmin,
    isWarehouseStaff,
    getDefaultRoute,
    getUserStations,
    canAccessStation
  };
}
