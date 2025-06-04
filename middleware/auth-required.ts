import { defineNuxtRouteMiddleware, navigateTo, useFetch } from '#app';
import { authClient } from '~/lib/auth-client';

export default defineNuxtRouteMiddleware(async (to, _from) => {
  // Fetch session data
  const { data: sessionData } = await authClient.useSession(useFetch);

  // If the user is not authenticated (no sessionData or no user in sessionData after awaiting useSession)
  if (!sessionData.value?.user) {
    // Redirect to login page
    // Consider storing the intended path if you want to redirect back after login:
    // if (to.path !== '/login') {
    //   return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
    // }
    return navigateTo('/login');
  }

  // Optional: Role-based access control can be added here in the future
}); 