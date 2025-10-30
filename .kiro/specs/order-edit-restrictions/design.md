# Design Document - Order Edit Restrictions

## Overview

This design implements a conditional read-only system for product attributes based on verification status, order approval state, and user permissions. The system provides three distinct modes: read-only for verified attributes on approved orders, editable mode with warnings for super admins, and normal edit mode for unverified or unapproved items.

## Architecture

### Component Structure

```
Order Edit Page (pages/admin/orders/edit/[id].vue)
├── Product Attributes Display (read-only)
│   ├── Lock indicator
│   └── Attribute values
├── Product Attributes Editor (editable)
│   ├── Form fields
│   ├── Warning messages
│   └── Super admin override indicators
└── Permission Logic
    ├── User role detection
    ├── Packing slip status check
    └── Read-only evaluation
```

### State Management

The system maintains several reactive states:
- `order` - Current order data including status
- `user` - Current user with role information
- `packingSlipStatus` - Per-item packing slip print status
- `isOverriding` - Super admin override state

## Components and Interfaces

### 1. Order Edit Page Updates

**File:** `pages/admin/orders/edit/[id].vue`

#### New Functions

```typescript
// Enhanced read-only evaluation with super admin override
function isAttributesReadOnly(item: any): boolean {
  const hasVerifiedAttributes = item.productAttributes?.verified
  const isOrderApproved = ['APPROVED', 'ORDER_PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED']
    .includes(order.value?.orderStatus)
  
  // Super admin can always edit (but with warnings)
  if (isSuperAdmin.value) {
    return false
  }
  
  return hasVerifiedAttributes && isOrderApproved
}

// Check if user has super admin privileges
const isSuperAdmin = computed(() => {
  return user.value?.role === 'SUPER_ADMIN'
})

// Check if packing slip has been printed
function hasPackingSlipPrinted(itemId: string): boolean {
  // Implementation to check packing slip status
  return packingSlipStatus.value[itemId]?.printed || false
}

// Determine warning level for super admin edits
function getEditWarningLevel(item: any): 'none' | 'standard' | 'critical' {
  if (!isSuperAdmin.value) return 'none'
  
  const isNormallyReadOnly = item.productAttributes?.verified && 
    ['APPROVED', 'ORDER_PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED']
      .includes(order.value?.orderStatus)
  
  if (!isNormallyReadOnly) return 'none'
  
  return hasPackingSlipPrinted(item.id) ? 'critical' : 'standard'
}
```

#### Template Logic Updates

```vue
<!-- Read-only display for regular users -->
<div v-if="item.isProduct && item.productAttributes && isAttributesReadOnly(item)" 
     class="mt-4 p-4 bg-blue-50 rounded-lg">
  <div class="flex items-center justify-between mb-2">
    <h4 class="text-sm font-medium text-blue-900">Product Attributes</h4>
    <div class="flex items-center text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
      <Icon name="heroicons:lock-closed" class="h-3 w-3 mr-1" />
      <span>Read-only (Verified & Approved)</span>
    </div>
  </div>
  <ProductAttributesDisplay :attributes="item.productAttributes" />
</div>

<!-- Editable mode with warnings -->
<div v-if="item.isProduct && (!item.productAttributes || !isAttributesReadOnly(item))" 
     class="mt-4">
  
  <!-- Super admin override warning -->
  <div v-if="getEditWarningLevel(item) === 'standard'" 
       class="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
    <div class="flex items-center text-orange-800">
      <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 mr-2" />
      <div>
        <p class="font-medium">Super Admin Override</p>
        <p class="text-sm">You are editing verified attributes on an approved order.</p>
      </div>
    </div>
  </div>

  <!-- Critical warning for printed packing slips -->
  <div v-if="getEditWarningLevel(item) === 'critical'" 
       class="mb-3 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
    <div class="flex items-center text-red-800">
      <Icon name="heroicons:exclamation-circle" class="h-6 w-6 mr-3" />
      <div>
        <p class="font-bold">CRITICAL: Packing Slip Already Printed</p>
        <p class="text-sm">Changing attributes may cause production discrepancies.</p>
        <p class="text-sm font-medium">Contact production team before proceeding.</p>
      </div>
    </div>
  </div>

  <ProductAttributesEditor
    :order-item-id="item.id"
    :line-description="item.lineDescription"
    :initial-attributes="item.productAttributes"
    :is-super-admin-override="getEditWarningLevel(item) !== 'none'"
    @attributes-saved="handleAttributesSaved"
  />
</div>
```

### 2. ProductAttributesEditor Enhancements

**File:** `components/ProductAttributesEditor.vue`

#### New Props and Features

```typescript
const props = defineProps<{
  orderItemId: string
  lineDescription?: string
  initialAttributes?: any
  isSuperAdminOverride?: boolean // New prop for override indication
}>()

// Enhanced header display
const headerText = computed(() => {
  if (props.isSuperAdminOverride) {
    return props.initialAttributes ? 'Override Edit Product Attributes' : 'Add Product Attributes'
  }
  return props.initialAttributes ? 'Edit Product Attributes' : 'Add Product Attributes'
})

// Override indicator in template
const showOverrideIndicator = computed(() => {
  return props.isSuperAdminOverride && props.initialAttributes
})
```

#### Template Updates

```vue
<div class="bg-white border border-gray-200 rounded-lg p-6">
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center">
      <h3 class="text-lg font-medium text-gray-900">{{ headerText }}</h3>
      <div v-if="showOverrideIndicator" 
           class="ml-3 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
        SUPER ADMIN OVERRIDE
      </div>
    </div>
    <!-- Advanced toggle button -->
  </div>
  <!-- Form content -->
</div>
```

### 3. Packing Slip Status Integration

**New Composable:** `composables/usePackingSlipStatus.ts`

```typescript
export const usePackingSlipStatus = () => {
  const packingSlipStatus = ref<Record<string, { printed: boolean, printedAt?: Date }>>({})

  const fetchPackingSlipStatus = async (orderItemIds: string[]) => {
    try {
      const { data } = await $fetch('/api/admin/packing-slips/status', {
        method: 'POST',
        body: { orderItemIds }
      })
      
      packingSlipStatus.value = data.reduce((acc, item) => {
        acc[item.orderItemId] = {
          printed: item.printed,
          printedAt: item.printedAt ? new Date(item.printedAt) : undefined
        }
        return acc
      }, {})
    } catch (error) {
      console.error('Failed to fetch packing slip status:', error)
    }
  }

  const hasPackingSlipPrinted = (itemId: string): boolean => {
    return packingSlipStatus.value[itemId]?.printed || false
  }

  return {
    packingSlipStatus: readonly(packingSlipStatus),
    fetchPackingSlipStatus,
    hasPackingSlipPrinted
  }
}
```

## Data Models

### User Role Enhancement

```typescript
// Extend existing user type
interface User {
  id: string
  email: string
  role: 'ADMIN' | 'SUPER_ADMIN' | 'USER' // Enhanced with SUPER_ADMIN
  // ... other properties
}
```

### Packing Slip Status Model

```typescript
interface PackingSlipStatus {
  orderItemId: string
  printed: boolean
  printedAt?: Date
  printedBy?: string
}
```

### Audit Log Model

```typescript
interface AttributeEditAudit {
  id: string
  orderItemId: string
  userId: string
  action: 'SUPER_ADMIN_OVERRIDE'
  previousAttributes: any
  newAttributes: any
  reason?: string
  timestamp: Date
  packingSlipWasPrinted: boolean
}
```

## Error Handling

### Permission Validation

```typescript
// Client-side validation
function validateEditPermission(item: any): { allowed: boolean, reason?: string } {
  if (!item.productAttributes?.verified) {
    return { allowed: true }
  }
  
  const isApproved = ['APPROVED', 'ORDER_PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED']
    .includes(order.value?.orderStatus)
  
  if (!isApproved) {
    return { allowed: true }
  }
  
  if (isSuperAdmin.value) {
    return { allowed: true }
  }
  
  return { 
    allowed: false, 
    reason: 'Verified attributes on approved orders can only be edited by super admins' 
  }
}
```

### API Error Handling

```typescript
// Enhanced save function with permission check
async function saveAttributes() {
  const validation = validateEditPermission(currentItem.value)
  if (!validation.allowed) {
    error.value = validation.reason
    return
  }
  
  try {
    loading.value = true
    
    const payload = {
      ...formData.value,
      isSuperAdminOverride: props.isSuperAdminOverride,
      packingSlipPrinted: hasPackingSlipPrinted(props.orderItemId)
    }
    
    await $fetch(`/api/admin/order-items/${props.orderItemId}/attributes`, {
      method: 'PUT',
      body: payload
    })
    
    success.value = true
    emit('attributes-saved')
  } catch (err) {
    error.value = 'Failed to save attributes'
  } finally {
    loading.value = false
  }
}
```

## Testing Strategy

### Unit Tests

1. **Permission Logic Tests**
   - Test `isAttributesReadOnly()` with various user roles and order states
   - Test `getEditWarningLevel()` with different scenarios
   - Test super admin override detection

2. **Component Behavior Tests**
   - Test ProductAttributesEditor with different prop combinations
   - Test warning message display logic
   - Test form initialization with existing attributes

3. **Composable Tests**
   - Test `usePackingSlipStatus` data fetching and caching
   - Test permission validation functions

### Integration Tests

1. **End-to-End Workflow Tests**
   - Test complete order approval → attribute lock workflow
   - Test super admin override with warnings
   - Test packing slip integration

2. **API Integration Tests**
   - Test attribute saving with permission validation
   - Test audit logging for super admin overrides
   - Test packing slip status API

### User Acceptance Tests

1. **Regular Admin Workflow**
   - Verify attributes become read-only after approval
   - Verify clear messaging about restrictions

2. **Super Admin Workflow**
   - Verify override capabilities work correctly
   - Verify appropriate warnings are displayed
   - Verify critical warnings for printed packing slips

## Security Considerations

### Permission Enforcement

- **Client-side validation** for immediate user feedback
- **Server-side validation** for security enforcement
- **Role-based access control** with proper privilege checking
- **Audit logging** for all super admin overrides

### Data Integrity

- **Immutable verified attributes** for regular users
- **Change tracking** for super admin modifications
- **Packing slip correlation** to prevent production conflicts
- **Rollback capabilities** for critical errors

## Performance Considerations

### Lazy Loading

- Load packing slip status only when needed
- Cache user permissions for session duration
- Minimize API calls for status checks

### Optimization

- Use computed properties for reactive permission checks
- Implement efficient change detection for audit logging
- Optimize database queries for packing slip status