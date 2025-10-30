import { defineNuxtRouteMiddleware, navigateTo } from '#app';
import { authClient } from '~/lib/auth-client';

export default defineNuxtRouteMiddleware(async (to, _from) => {
  // Skip middleware on server-side to avoid hydration issues
  if (process.server) {
    return;
  }

  // Check session data
  try {
    const sessionState = authClient.useSession();
    
    // Give some time for session to load on client-side
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // If the user is not authenticated (no sessionData or no user in sessionData)
    if (!sessionState.value?.data?.user) {
      console.log('No user session found, redirecting to login');
      // Redirect to login page with redirect parameter
      if (to.path !== '/login') {
        return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
      }
      return navigateTo('/login');
    }
    
    console.log('User authenticated:', sessionState.value.data.user.email);
  } catch (error) {
    console.log('Session check error in auth-required middleware:', error);
    return navigateTo('/login');
  }
}); 