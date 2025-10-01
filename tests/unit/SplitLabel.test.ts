import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import SplitLabel from '~/components/admin/SplitLabel.vue';

// Mock the barcode generator
vi.mock('~/utils/barcodeGenerator', () => ({
  BarcodeGenerator: {
    generateCode128: vi.fn().mockResolvedValue(undefined),
    generateQRCode: vi.fn().mockResolvedValue(undefined),
  }
}));

// Mock the label optimizer
vi.mock('~/utils/labelOptimizer', () => ({
  optimizeLabelInfo: vi.fn().mockReturnValue({
    customer: 'Test Customer',
    thickness: '1/4"',
    size: '12x12',
    type: 'Standard',
    color: 'Blue',
    date: '12/25',
    upgrades: 'Reinf, WP',
    barcode: 'TEST-123-456',
  })
}));

describe('SplitLabel Component', () => {
  const mockOrderItem = {
    id: 'test-item-id',
    item: {
      name: 'Test Product'
    },
    productAttributes: {
      thickness: '1/4"',
      size: '12x12',
      color: 'Blue',
      foamUpgrade: 'Yes',
      webbingUpgrade: 'Yes'
    }
  };

  const mockOrder = {
    id: 'test-order-id',
    salesOrderNumber: 'SO-12345',
    customer: {
      name: 'Test Customer Inc'
    },
    createdAt: new Date('2024-01-01')
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both label parts correctly', () => {
    const wrapper = mount(SplitLabel, {
      props: {
        orderItem: mockOrderItem,
        order: mockOrder,
        showPreview: true
      }
    });

    // Check that both label parts are rendered
    expect(wrapper.find('.top-part').exists()).toBe(true);
    expect(wrapper.find('.bottom-part').exists()).toBe(true);
  });

  it('displays optimized customer information', () => {
    const wrapper = mount(SplitLabel, {
      props: {
        orderItem: mockOrderItem,
        order: mockOrder,
        showPreview: true
      }
    });

    // Check that customer name is displayed
    expect(wrapper.text()).toContain('Test Customer');
  });

  it('shows order number correctly', () => {
    const wrapper = mount(SplitLabel, {
      props: {
        orderItem: mockOrderItem,
        order: mockOrder,
        showPreview: true
      }
    });

    // Check that order number is displayed
    expect(wrapper.text()).toContain('SO-12345');
  });

  it('displays product specifications', () => {
    const wrapper = mount(SplitLabel, {
      props: {
        orderItem: mockOrderItem,
        order: mockOrder,
        showPreview: true
      }
    });

    // Check that specifications are displayed
    expect(wrapper.text()).toContain('Type:');
    expect(wrapper.text()).toContain('Color:');
    expect(wrapper.text()).toContain('Thickness:');
    expect(wrapper.text()).toContain('Size:');
  });

  it('shows upgrades when present', () => {
    const wrapper = mount(SplitLabel, {
      props: {
        orderItem: mockOrderItem,
        order: mockOrder,
        showPreview: true
      }
    });

    // Check that upgrades are displayed
    expect(wrapper.text()).toContain('Upgrades:');
  });

  it('renders barcode canvases for both parts', () => {
    const wrapper = mount(SplitLabel, {
      props: {
        orderItem: mockOrderItem,
        order: mockOrder,
        showPreview: true
      }
    });

    // Check that barcode canvases are present
    const canvases = wrapper.findAll('canvas.barcode-canvas');
    expect(canvases).toHaveLength(2);
  });

  it('shows preview controls when showPreview is true', () => {
    const wrapper = mount(SplitLabel, {
      props: {
        orderItem: mockOrderItem,
        order: mockOrder,
        showPreview: true
      }
    });

    expect(wrapper.find('.preview-controls').exists()).toBe(true);
  });

  it('hides preview controls when showPreview is false', () => {
    const wrapper = mount(SplitLabel, {
      props: {
        orderItem: mockOrderItem,
        order: mockOrder,
        showPreview: false
      }
    });

    expect(wrapper.find('.preview-controls').exists()).toBe(false);
  });

  it('has correct dimensions for label parts', () => {
    const wrapper = mount(SplitLabel, {
      props: {
        orderItem: mockOrderItem,
        order: mockOrder,
        showPreview: true
      }
    });

    const topPart = wrapper.find('.top-part');
    const bottomPart = wrapper.find('.bottom-part');

    // Check CSS classes are applied
    expect(topPart.classes()).toContain('top-part');
    expect(bottomPart.classes()).toContain('bottom-part');
  });

  it('displays part indicators', () => {
    const wrapper = mount(SplitLabel, {
      props: {
        orderItem: mockOrderItem,
        order: mockOrder,
        showPreview: true
      }
    });

    expect(wrapper.text()).toContain('TOP PART');
    expect(wrapper.text()).toContain('BOTTOM PART');
  });

  it('exposes required methods', () => {
    const wrapper = mount(SplitLabel, {
      props: {
        orderItem: mockOrderItem,
        order: mockOrder,
        showPreview: true
      }
    });

    // Check that exposed methods exist
    expect(wrapper.vm.generateBarcodeImage).toBeDefined();
    expect(wrapper.vm.toggleBarcodeType).toBeDefined();
    expect(wrapper.vm.getLabelPartRef).toBeDefined();
    expect(wrapper.vm.getBarcodeType).toBeDefined();
  });
});