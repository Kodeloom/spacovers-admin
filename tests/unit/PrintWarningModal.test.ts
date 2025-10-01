import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PrintWarningModal from '~/components/admin/PrintWarningModal.vue'
import type { PrintWarningState } from '~/composables/usePrintWarnings'

// Mock the AppWarningModal component
vi.mock('~/components/AppWarningModal.vue', () => ({
  default: {
    name: 'AppWarningModal',
    template: `
      <div data-testid="app-warning-modal">
        <div data-testid="modal-title">{{ title }}</div>
        <div data-testid="modal-message">{{ message }}</div>
        <button data-testid="confirm-btn" @click="$emit('confirmed')">{{ confirmButtonText }}</button>
        <button data-testid="cancel-btn" @click="$emit('closed')">{{ cancelButtonText }}</button>
        <slot />
      </div>
    `,
    props: ['isOpen', 'title', 'message', 'confirmButtonText', 'cancelButtonText', 'confirmationPhrase', 'isLoading'],
    emits: ['confirmed', 'closed']
  }
}))

// Mock Icon component
vi.mock('#components', () => ({
  Icon: {
    name: 'Icon',
    template: '<span data-testid="icon" :class="name"></span>',
    props: ['name']
  }
}))

describe('PrintWarningModal', () => {
  const createWrapper = (props: any = {}) => {
    const defaultProps = {
      warningState: {
        showFirstWarning: false,
        showSecondWarning: false,
        isProcessing: false,
        labelCount: 0
      } as PrintWarningState,
      paperWasteInfo: {
        wastedLabels: 2,
        wastePercentage: 50,
        usedLabels: 2,
        totalLabels: 4
      },
      currentWarningMessages: {
        first: {
          title: 'Test First Warning',
          message: 'First warning message',
          confirmText: 'Continue'
        },
        second: {
          title: 'Test Second Warning',
          message: 'Second warning message',
          confirmText: 'Print Now',
          confirmationPhrase: 'PRINT'
        }
      }
    }

    return mount(PrintWarningModal, {
      props: { ...defaultProps, ...props }
    })
  }

  it('should render first warning modal when showFirstWarning is true', () => {
    const wrapper = createWrapper({
      warningState: {
        showFirstWarning: true,
        showSecondWarning: false,
        isProcessing: false,
        labelCount: 2
      }
    })

    const modals = wrapper.findAll('[data-testid="app-warning-modal"]')
    expect(modals).toHaveLength(2) // Both modals are rendered, but only first is open
    
    // Check that first modal has correct props
    const firstModal = modals[0]
    expect(firstModal.props('isOpen')).toBe(true)
    expect(firstModal.props('title')).toBe('Test First Warning')
  })

  it('should render second warning modal when showSecondWarning is true', () => {
    const wrapper = createWrapper({
      warningState: {
        showFirstWarning: false,
        showSecondWarning: true,
        isProcessing: false,
        labelCount: 2
      }
    })

    const modals = wrapper.findAll('[data-testid="app-warning-modal"]')
    const secondModal = modals[1]
    expect(secondModal.props('isOpen')).toBe(true)
    expect(secondModal.props('title')).toBe('Test Second Warning')
    expect(secondModal.props('confirmationPhrase')).toBe('PRINT')
  })

  it('should display paper waste visualization correctly', () => {
    const wrapper = createWrapper({
      warningState: {
        showFirstWarning: true,
        showSecondWarning: false,
        isProcessing: false,
        labelCount: 2
      }
    })

    // Check that paper usage preview shows correct number of used/wasted labels
    const labelDivs = wrapper.findAll('.grid > div')
    expect(labelDivs).toHaveLength(4) // 4 label positions

    // First 2 should be used (green), last 2 should be wasted (red)
    expect(labelDivs[0].classes()).toContain('bg-green-100')
    expect(labelDivs[1].classes()).toContain('bg-green-100')
    expect(labelDivs[2].classes()).toContain('bg-red-100')
    expect(labelDivs[3].classes()).toContain('bg-red-100')
  })

  it('should emit firstWarningConfirm when first modal is confirmed', async () => {
    const wrapper = createWrapper({
      warningState: {
        showFirstWarning: true,
        showSecondWarning: false,
        isProcessing: false,
        labelCount: 2
      }
    })

    const firstModal = wrapper.findAll('[data-testid="app-warning-modal"]')[0]
    await firstModal.vm.$emit('confirmed')

    expect(wrapper.emitted('firstWarningConfirm')).toHaveLength(1)
  })

  it('should emit secondWarningConfirm when second modal is confirmed', async () => {
    const wrapper = createWrapper({
      warningState: {
        showFirstWarning: false,
        showSecondWarning: true,
        isProcessing: false,
        labelCount: 2
      }
    })

    const secondModal = wrapper.findAll('[data-testid="app-warning-modal"]')[1]
    await secondModal.vm.$emit('confirmed')

    expect(wrapper.emitted('secondWarningConfirm')).toHaveLength(1)
  })

  it('should emit cancel when modal is closed', async () => {
    const wrapper = createWrapper({
      warningState: {
        showFirstWarning: true,
        showSecondWarning: false,
        isProcessing: false,
        labelCount: 2
      }
    })

    const firstModal = wrapper.findAll('[data-testid="app-warning-modal"]')[0]
    await firstModal.vm.$emit('closed')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('should show loading state in second modal when processing', () => {
    const wrapper = createWrapper({
      warningState: {
        showFirstWarning: false,
        showSecondWarning: true,
        isProcessing: true,
        labelCount: 2
      }
    })

    const secondModal = wrapper.findAll('[data-testid="app-warning-modal"]')[1]
    expect(secondModal.props('isLoading')).toBe(true)
  })

  it('should display correct paper waste statistics', () => {
    const wrapper = createWrapper({
      warningState: {
        showFirstWarning: false,
        showSecondWarning: true,
        isProcessing: false,
        labelCount: 1
      },
      paperWasteInfo: {
        wastedLabels: 3,
        wastePercentage: 75,
        usedLabels: 1,
        totalLabels: 4
      }
    })

    const text = wrapper.text()
    expect(text).toContain('Labels to print: 1')
    expect(text).toContain('Labels wasted: 3')
    expect(text).toContain('Paper efficiency: 25%')
  })

  it('should show alternative suggestion in second warning', () => {
    const wrapper = createWrapper({
      warningState: {
        showFirstWarning: false,
        showSecondWarning: true,
        isProcessing: false,
        labelCount: 1
      },
      paperWasteInfo: {
        wastedLabels: 3,
        wastePercentage: 75,
        usedLabels: 1,
        totalLabels: 4
      }
    })

    const text = wrapper.text()
    expect(text).toContain('Cancel now and add 3 more labels')
  })
})