import { authClient } from '~/lib/auth-client'; // Import our configured authClient
import { navigateTo, useFetch } from '#app'; // Added useFetch here as it was used directly

export default defineNuxtRouteMiddleware(async (to, _from) => {
  // Fetch session data using the pattern from Better-Auth docs for Nuxt middleware
  const { data: sessionData, error: sessionError } = await authClient.useSession(useFetch);

  // Check authentication status
  // isAuthenticated is true if sessionData has a user object.
  const isAuthenticated = !!sessionData.value?.user;
  let userIsAdmin = false;

  if (sessionError.value) {
    // If there was an error fetching the session, treat as unauthenticated or handle error
    console.error('[AuthAdminOnly Middleware] Error fetching session:', sessionError.value);
    // Depending on the error, you might want to redirect to login or an error page
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }

  if (isAuthenticated) {
    // Access user data from the session
    const user = sessionData.value!.user;
    // user.roles is expected to be like: [{ role: { name: 'Admin', roleType: { name: 'Administrator' } } }]
    // Check for admin role types: Administrator, Manager, Super Administrator
    if (user.roles && Array.isArray(user.roles)) {
      userIsAdmin = user.roles.some((userRole: { role?: { name?: string, roleType?: { name?: string } } }) => {
        const roleName = userRole.role?.name;
        const roleTypeName = userRole.role?.roleType?.name;
        
        // Admin roles by name (fallback)
        const adminRoleNames = ['Super Admin', 'Admin', 'Manager'];
        // Admin roles by type (preferred)
        const adminRoleTypes = ['Administrator', 'Manager', 'Super Administrator'];
        
        return (roleName && adminRoleNames.includes(roleName)) || 
               (roleTypeName && adminRoleTypes.includes(roleTypeName));
      });
    } else {
      console.warn('[AuthAdminOnly Middleware] User object in session does not have a correctly structured roles array:', user.roles);
    }
  }

  if (!isAuthenticated) {
    console.log('[AuthAdminOnly Middleware] User not authenticated. Redirecting to /login.');
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }

  if (!userIsAdmin) {
    console.warn('[AuthAdminOnly Middleware] User is authenticated but not an Admin. Redirecting to / (homepage).');
    // Redirect non-admins to the homepage or a dedicated "access denied" page, not back to /login.
    return navigateTo('/'); 
  }

  console.log('[AuthAdminOnly Middleware] User is Admin. Allowing access to:', to.fullPath);
}); 