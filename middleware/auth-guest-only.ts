import { defineNuxtRouteMiddleware, navigateTo } from '#app';
import { authClient } from '~/lib/auth-client';

export default defineNuxtRouteMiddleware(async (_to, _from) => {
  // Skip middleware on server-side to avoid hydration issues
  if (process.server) {
    return;
  }

  // Check if user is already authenticated
  try {
    const sessionState = authClient.useSession();
    
    // Give some time for session to load on client-side
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // If the user is authenticated (sessionData exists and has a user)
    if (sessionState.value?.data?.user) {
      console.log('User already authenticated, redirecting to dashboard');
      // Redirect them to the dashboard
      return navigateTo('/');
    }
  } catch (error) {
    // If there's an error checking session, allow access to login page
    console.log('Session check error in auth-guest-only middleware:', error);
  }
}); 