import { defineNuxtRouteMiddleware, navigateTo } from '#app';
import { authClient } from '~/lib/auth-client';

export default defineNuxtRouteMiddleware(async (_to, _from) => {
  // Check if user is already authenticated
  try {
    const sessionState = authClient.useSession();
    
    // If the user is authenticated (sessionData exists and has a user)
    if (sessionState.value?.data?.user) {
      // Redirect them to the home page or another appropriate page
      return navigateTo('/');
    }
  } catch (error) {
    // If there's an error checking session, allow access to login page
    console.log('Session check error in auth-guest-only middleware:', error);
  }
}); 