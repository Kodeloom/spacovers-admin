import { authClient } from '~/lib/auth-client';
import { navigateTo, useFetch } from '#app';

export default defineNuxtRouteMiddleware(async (to, _from) => {
  // Fetch session data using the pattern from Better-Auth docs for Nuxt middleware
  const { data: sessionData, error: sessionError } = await authClient.useSession(useFetch);

  // Check authentication status
  const isAuthenticated = !!sessionData.value?.user;
  let hasAccess = false;

  if (sessionError.value) {
    console.error('[AuthOfficeAdmin Middleware] Error fetching session:', sessionError.value);
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }

  if (isAuthenticated) {
    const user = sessionData.value!.user;
    
    // Check for office employee, admin, or super admin roles
    if (user.roles && Array.isArray(user.roles)) {
      hasAccess = user.roles.some((userRole: { role?: { name?: string, roleType?: { name?: string } } }) => {
        const roleName = userRole.role?.name;
        const roleTypeName = userRole.role?.roleType?.name;
        
        // Allowed role names (fallback)
        const allowedRoleNames = ['Super Admin', 'Admin', 'Manager'];
        // Allowed role types (preferred)
        const allowedRoleTypes = ['Administrator', 'Manager', 'Super Administrator', 'Office Employee'];
        
        return (roleName && allowedRoleNames.includes(roleName)) || 
               (roleTypeName && allowedRoleTypes.includes(roleTypeName));
      });
    } else {
      console.warn('[AuthOfficeAdmin Middleware] User object in session does not have a correctly structured roles array:', user.roles);
    }
  }

  if (!isAuthenticated) {
    console.log('[AuthOfficeAdmin Middleware] User not authenticated. Redirecting to /login.');
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }

  if (!hasAccess) {
    console.warn('[AuthOfficeAdmin Middleware] User does not have office/admin access. Redirecting to homepage.');
    return navigateTo('/');
  }

  console.log('[AuthOfficeAdmin Middleware] User has office/admin access. Allowing access to:', to.fullPath);
});