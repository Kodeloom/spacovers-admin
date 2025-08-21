export default defineNuxtRouteMiddleware(async (to) => {
  const { data: session } = await useFetch('/api/auth/get-session');
  
  if (!session.value?.user) {
    // Not logged in, redirect to login
    return navigateTo('/login');
  }

  const user = session.value.user;
  
  // Check if user has any roles
  if (!user.roles || !Array.isArray(user.roles) || user.roles.length === 0) {
    // User has no roles, redirect to login
    return navigateTo('/login');
  }

  // Check if user has a Warehouse Staff role type
  const hasWarehouseStaffRole = user.roles.some((userRole: any) => {
    const roleName = userRole.role?.name;
    const roleTypeName = userRole.role?.roleType?.name;
    
    // Warehouse staff roles by name (fallback)
    const warehouseRoleNames = ['Cutting', 'Sewing', 'Foam Cutting (Shop)', 'Foam Cutting'];
    // Warehouse staff roles by type (preferred)
    const warehouseRoleTypes = ['Warehouse Staff'];
    
    return (roleName && warehouseRoleNames.includes(roleName)) || 
           (roleTypeName && warehouseRoleTypes.includes(roleTypeName));
  });

  if (!hasWarehouseStaffRole) {
    // User is not warehouse staff, redirect to appropriate admin area
    const hasAdminRole = user.roles.some((userRole: any) => {
      const roleName = userRole.role?.name;
      const roleTypeName = userRole.role?.roleType?.name;
      
      // Admin roles by name (fallback)
      const adminRoleNames = ['Super Admin', 'Admin', 'Manager'];
      // Admin roles by type (preferred)
      const adminRoleTypes = ['Administrator', 'Manager', 'Super Administrator'];
      
      return (roleName && adminRoleNames.includes(roleName)) || 
             (roleTypeName && adminRoleTypes.includes(roleTypeName));
    });
    
    if (hasAdminRole) {
      // Redirect to admin dashboard
      return navigateTo('/admin');
    } else {
      // User has no valid roles, redirect to login
      return navigateTo('/login');
    }
  }

  // User is warehouse staff, allow access to warehouse routes
  // If they're trying to access admin routes, redirect to warehouse
  if (to.path.startsWith('/admin')) {
    return navigateTo('/warehouse/kiosk');
  }
});
