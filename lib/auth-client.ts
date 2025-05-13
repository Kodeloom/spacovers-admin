import { createAuthClient } from "better-auth/vue"; // For Nuxt 3 (Vue 3)
import { customSessionClient } from "better-auth/client/plugins"; // Using the documented client plugin path
import type { auth as ServerAuthType } from "~/server/lib/auth"; // Import type of server auth

const client = createAuthClient({
  plugins: [
    customSessionClient<typeof ServerAuthType>() // Use the client plugin with server auth type
  ]
});

// Export the typed client instance directly.
// Components will import this and call client.useSession(), client.signIn(), etc.
export const authClient = client;

// Re-export the parts you use, now typed according to the custom session
export const { session, status, signIn, signOut, signUp, useSession } = authClient;

// Optional: Export specific methods for easier import in components/pages
// export const { signIn, signUp, signOut, useSession, getSession } = authClient; 