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

        <!-- Error Message -->
        <div v-if="errorMessage" class="p-3 bg-red-50 border border-red-200 rounded-md">
          <div class="flex items-center">
            <Icon name="heroicons:exclamation-circle" class="h-5 w-5 text-red-400 mr-2" />
            <p class="text-sm text-red-800">{{ errorMessage }}</p>
          </div>
        </div>

        <!-- Success Message -->
        <div v-if="successMessage" class="p-3 bg-green-50 border border-green-200 rounded-md">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <Icon name="heroicons:check-circle" class="h-5 w-5 text-green-400 mr-2" />
              <p class="text-sm text-green-800">{{ successMessage }}</p>
            </div>
            <button 
              v-if="showRefreshOption"
              @click="() => window.location.reload()"
              class="ml-3 text-sm font-medium text-green-700 hover:text-green-600 underline"
            >
              Refresh Page
            </button>
          </div>
        </div>

        <div>
          <button
            type="submit"
            :disabled="loading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading" class="absolute left-0 inset-y-0 flex items-center pl-3">
              <Icon name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
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
import { ref, nextTick } from 'vue';
import { authClient } from '~/lib/auth-client';
import { useRouter, useRoute } from 'vue-router';
import { useRoleBasedRouting } from '~/composables/useRoleBasedRouting';

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
  statusCode?: number;
}

definePageMeta({
  middleware: ['auth-guest-only'],
  layout: false
});

const email = ref('admin@example.com');
const password = ref('');
const errorMessage = ref('');
const successMessage = ref('');
const loading = ref(false);
const showRefreshOption = ref(false);
const router = useRouter();
const route = useRoute();

// Get session state for reactive updates
const sessionState = authClient.useSession();

const handleLogin = async () => {
  errorMessage.value = '';
  successMessage.value = '';
  loading.value = true;
  
  try {
    // Attempt to sign in
    const response = await authClient.signIn.email({
      email: email.value,
      password: password.value,
    });

    console.log('Login response:', response);

    // Show success message
    successMessage.value = 'Login successful! Redirecting...';

    // Wait for session to be properly established
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 200));
      await nextTick();
      
      // Check if session is established
      if (sessionState.value?.data?.user) {
        console.log('Session established:', sessionState.value.data.user);
        break;
      }
      
      attempts++;
      console.log(`Waiting for session... attempt ${attempts}/${maxAttempts}`);
    }

    if (!sessionState.value?.data?.user) {
      // Show refresh option instead of throwing error
      showRefreshOption.value = true;
      successMessage.value = 'Login successful! If you are not redirected automatically, please refresh the page.';
      return;
    }

    // Wait a bit more to ensure everything is ready
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      // Check for a redirect query parameter
      const redirectPath = route.query.redirect as string | undefined;
      if (redirectPath) {
        console.log('Redirecting to:', redirectPath);
        await navigateTo(redirectPath);
      } else {
        // Use role-based routing to determine where to send the user
        const { getDefaultRoute } = useRoleBasedRouting();
        const defaultRoute = getDefaultRoute.value;
        console.log('Redirecting to default route:', defaultRoute);
        await navigateTo(defaultRoute);
      }
    } catch (navError) {
      console.error('Navigation error:', navError);
      showRefreshOption.value = true;
      successMessage.value = 'Login successful! Please refresh the page to continue.';
    }

  } catch (e: unknown) {
    const error = e as AuthError;
    console.error('Login error:', error);
    
    // Clear success message on error
    successMessage.value = '';
    
    // Provide specific error messages based on error type
    if (error?.statusCode === 401) {
      errorMessage.value = 'Invalid email or password. Please check your credentials and try again.';
    } else if (error?.statusCode === 404) {
      errorMessage.value = 'User not found. Please check your email address.';
    } else if (error?.statusCode === 429) {
      errorMessage.value = 'Too many login attempts. Please wait a moment and try again.';
    } else if (error?.data?.message) {
      errorMessage.value = error.data.message;
    } else if (error?.response?._data?.message) {
      errorMessage.value = error.response._data.message;
    } else if (error instanceof Error && error.message) {
      errorMessage.value = error.message;
    } else {
      errorMessage.value = 'Login failed. Please check your credentials and try again.';
    }
  } finally {
    loading.value = false;
  }
};
</script> 