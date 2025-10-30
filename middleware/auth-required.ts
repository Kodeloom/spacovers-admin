import { defineNuxtRouteMiddleware, navigateTo } from '#app';
import { authClient } from '~/lib/auth-client';

export default defineNuxtRouteMiddleware(async (to, _from) => {
  // Check session data
  try {
    const sessionState = authClient.useSession();
    
    // If the user is not authenticated (no sessionData or no user in sessionData)
    if (!sessionState.value?.data?.user) {
      // Redirect to login page with redirect parameter
      if (to.path !== '/login') {
        return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
      }
      return navigateTo('/login');
    }
  } catch (error) {
    console.log('Session check error in auth-required middleware:', error);
    return navigateTo('/login');
  }

  // Optional: Role-based access control can be added here in the future
}); 