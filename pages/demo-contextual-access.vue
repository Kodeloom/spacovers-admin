<template>
  <div class="container mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Relationship-Based Access Control Demo</h1>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Current User Context -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Current User Context</h2>
        <div class="space-y-3">
          <div>
            <span class="font-medium">Role:</span>
            <span class="ml-2">{{ mockUser.role }}</span>
          </div>
          <div>
            <span class="font-medium">Assigned Stations:</span>
            <span class="ml-2">{{ mockUser.stations.join(', ') }}</span>
          </div>
          <div>
            <span class="font-medium">Permissions:</span>
            <ul class="ml-6 mt-1">
              <li v-for="perm in mockUser.permissions" :key="perm" class="text-sm">{{ perm }}</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Access Examples -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">What This User Can Access</h2>
        <div class="space-y-4">
          
          <div class="border-l-4 border-green-500 pl-4">
            <h3 class="font-medium text-green-700">✅ Can Read</h3>
            <ul class="text-sm text-gray-600 mt-1">
              <li>• Orders with items at Cutting station</li>
              <li>• Customers who have orders at Cutting station</li>
              <li>• Items in orders they've worked on</li>
              <li>• Other users at Cutting station</li>
              <li>• Their own user profile</li>
            </ul>
          </div>

          <div class="border-l-4 border-red-500 pl-4">
            <h3 class="font-medium text-red-700">❌ Cannot Read</h3>
            <ul class="text-sm text-gray-600 mt-1">
              <li>• All customers (only contextual ones)</li>
              <li>• All items (only related ones)</li>
              <li>• Orders at other stations only</li>
              <li>• Admin-only data</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Generated Filters -->
      <div class="bg-white rounded-lg shadow p-6 lg:col-span-2">
        <h2 class="text-xl font-semibold mb-4">Generated Prisma Filters</h2>
        <p class="text-gray-600 mb-4">These are the actual Prisma `where` clauses that would be generated for this user:</p>
        
        <div class="space-y-4">
          <div>
            <h3 class="font-medium mb-2">Customer Filter:</h3>
            <pre class="bg-gray-100 p-3 rounded text-sm overflow-x-auto"><code>{{ customerFilter }}</code></pre>
          </div>
          
          <div>
            <h3 class="font-medium mb-2">Item Filter:</h3>
            <pre class="bg-gray-100 p-3 rounded text-sm overflow-x-auto"><code>{{ itemFilter }}</code></pre>
          </div>
          
          <div>
            <h3 class="font-medium mb-2">Order Filter:</h3>
            <pre class="bg-gray-100 p-3 rounded text-sm overflow-x-auto"><code>{{ orderFilter }}</code></pre>
          </div>
        </div>
      </div>

      <!-- Implementation Notes -->
      <div class="bg-blue-50 rounded-lg p-6 lg:col-span-2">
        <h2 class="text-xl font-semibold mb-4 text-blue-800">Implementation Strategy</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          
          <div>
            <h3 class="font-medium mb-2 text-blue-700">ZenStack Policies (Simple)</h3>
            <pre class="bg-white p-3 rounded border text-xs overflow-x-auto"><code>// Keep policies simple
@@allow('read', auth() != null && 
  auth().roles?[role.permissions?[
    permission.action == "read" && 
    permission.subject == "Customer"
  ]]
)</code></pre>
          </div>

          <div>
            <h3 class="font-medium mb-2 text-blue-700">Application Logic (Complex)</h3>
            <pre class="bg-white p-3 rounded border text-xs overflow-x-auto"><code>// Handle relationships in app
const { getCustomerFilter } = useContextualAccess()
const customers = useCustomers({ 
  where: getCustomerFilter() 
})</code></pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Mock user for demonstration
const mockUser = ref({
  id: 'user-123',
  name: 'John Doe',
  role: 'Warehouse Staff',
  stations: ['Cutting'],
  permissions: [
    'read Order',
    'update OrderItem', 
    'create ItemProcessingLog'
  ]
})

// Example of generated filters based on user context
const customerFilter = ref(`{
  orders: {
    some: {
      items: {
        some: {
          processingLogs: {
            some: {
              stationId: { in: ["cutting-station-id"] }
            }
          }
        }
      }
    }
  }
}`)

const itemFilter = ref(`{
  OR: [
    {
      orderItems: {
        some: {
          processingLogs: {
            some: {
              stationId: { in: ["cutting-station-id"] }
            }
          }
        }
      }
    },
    {
      orderItems: {
        some: {
          processingLogs: {
            some: {
              userId: { equals: "user-123" }
            }
          }
        }
      }
    }
  ]
}`)

const orderFilter = ref(`{
  items: {
    some: {
      processingLogs: {
        some: {
          stationId: { in: ["cutting-station-id"] }
        }
      }
    }
  }
}`)

definePageMeta({
  title: 'Contextual Access Demo'
})
</script> 