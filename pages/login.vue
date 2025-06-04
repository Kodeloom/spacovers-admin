<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <input type="hidden" name="remember" value="true" >
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="email-address" class="sr-only">Email address</label>
            <input
              id="email-address"
              v-model="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Email address"
            >
          </div>
          <div>
            <label for="password" class="sr-only">Password</label>
            <input
              id="password"
              v-model="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Password"
            >
          </div>
        </div>

        <div v-if="errorMessage" class="text-red-500 text-sm text-center">
          {{ errorMessage }}
        </div>

        <div>
          <button
            type="submit"
            :disabled="loading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <span v-if="loading" class="absolute left-0 inset-y-0 flex items-center pl-3">
              <!-- Loading icon can go here -->
            </span>
            {{ loading ? 'Signing in...' : 'Sign in' }}
          </button>
        </div>
        <div class="text-sm text-center">
          <NuxtLink to="/setup-admin" class="font-medium text-indigo-600 hover:text-indigo-500">
            Setup Initial Admin Password (First time only)
          </NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { authClient } from '~/lib/auth-client';
import { useRouter, useRoute } from 'vue-router';

interface AuthError {
  data?: {
    message?: string;
  };
  message?: string;
  response?: {
    _data?: {
      message?: string;
    };
  };
}

definePageMeta({
  middleware: ['auth-guest-only'],
  layout: false
});

const email = ref('admin@example.com');
const password = ref('');
const errorMessage = ref('');
const loading = ref(false);
const router = useRouter();
const route = useRoute();

const handleLogin = async () => {
  errorMessage.value = '';
  loading.value = true;
  try {
    // Attempt to sign in
    // If this call is successful (does not throw), login is considered successful by Better Auth.
    await authClient.signIn.email({
      email: email.value,
      password: password.value,
    });

    // If signIn.email did NOT throw, the login was successful from Better Auth's perspective.
    // A session cookie should have been set by Better Auth.
    // Redirect to the main dashboard or intended post-login page (e.g., '/').
    // The middleware on the target route will handle further authorization checks.
    
    // Check for a redirect query parameter
    const redirectPath = route.query.redirect as string | undefined;
    if (redirectPath) {
      router.push(redirectPath);
    } else {
      router.push('/'); 
    }

  } catch (e: unknown) {
    const error = e as AuthError; // Type assertion
    console.error('Login error:', error);
    // Try to extract a meaningful error message
    if (error && error.data && typeof error.data.message === 'string') {
        errorMessage.value = error.data.message;
    } else if (error && error.response && error.response._data && typeof error.response._data.message === 'string') {
        errorMessage.value = error.response._data.message;
    } else if (error instanceof Error && typeof error.message === 'string') { 
        errorMessage.value = error.message;
    } else {
        errorMessage.value = 'Failed to sign in. Please check your credentials or contact support.';
    }
  } finally {
    loading.value = false;
  }
};
</script> 