import { defineNuxtRouteMiddleware, navigateTo, useFetch  } from '#app';
import { authClient } from '~/lib/auth-client';

export default defineNuxtRouteMiddleware(async (_to, _from) => {
  // Fetch session data using the pattern from Better-Auth docs for Nuxt middleware
  const { data: sessionData } = await authClient.useSession(useFetch);

  // If the user is authenticated (sessionData exists and has a user)
  if (sessionData.value?.user) {
    // Redirect them to the home page or another appropriate page
    return navigateTo('/');
  }
}); 