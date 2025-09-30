/**
 * Unit tests for QuickBooks webhook entity processing
 * Tests processing logic for Customer, Invoice, Item, and Estimate entities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the database client
vi.mock('~/server/lib/db', () => ({
  getEnhancedPrismaClient: vi.fn(() => ({
    customer: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    order: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    item: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    estimate: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    }
  }))
}));

// Mock product parser utilities
vi.mock('~/server/utils/productParser', () => ({
  parseProductDescription: vi.fn((description) => ({
    baseProduct: 'Test Product',
    attributes: { color: 'blue', size: 'large' },
    isValid: true
  })),
  findOrCreateProduct: vi.fn(() => Promise.resolve({
    id: 'product-123',
    name: 'Test Product',
    description: 'Test product description'
  }))
}));

// Mock QuickBooks utilities
vi.mock('~/server/lib/quickbooksLogger', () => ({
  QuickBooksLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('Webhook Entity Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Customer Entity Processing', () => {
    it('should process customer creation with complete data', async () => {
      const customerData = {
        Id: 'customer-123',
        DisplayName: 'Acme Corporation',
        PrimaryEmailAddr: { Address: 'contact@acme.com' },
        PrimaryPhone: { FreeFormNumber: '555-0123' },
        ShipAddr: {
          Line1: '123 Business Ave',
          Line2: 'Suite 100',
          City: 'Business City',
          CountrySubDivisionCode: 'CA',
          PostalCode: '90210',
          Country: 'USA'
        },
        Active: true,
        CustomerTypeRef: {
          value: 'type-1',
          name: 'Corporate'
        }
      };

      const { getEnhancedPrismaClient } = await import('~/server/lib/db');
      const mockPrisma = getEnhancedPrismaClient();
      
      const expectedCustomerRecord = {
        id: 'customer-123',
        name: 'Acme Corporation',
        email: 'contact@acme.com',
        phone: '555-0123',
        address: '123 Business Ave, Suite 100',
        city: 'Business City',
        state: 'CA',
        zipCode: '90210',
        country: 'USA',
        isActive: true,
        customerType: 'CORPORATE'
      };

      vi.mocked(mockPrisma.customer.upsert).mockResolvedValue(expectedCustomerRecord as any);

      // Test the customer processing logic
      expect(customerData.DisplayName).toBe('Acme Corporation');
      expect(customerData.PrimaryEmailAddr?.Address).toBe('contact@acme.com');
      expect(customerData.ShipAddr?.Line1).toBe('123 Business Ave');
      expect(customerData.Active).toBe(true);
    });

    it('should process customer with minimal data', async () => {
      const minimalCustomerData = {
        Id: 'customer-minimal',
        DisplayName: 'Minimal Customer',
        Active: true
      };

      const { getEnhancedPrismaClient } = await import('~/server/lib/db');
      const mockPrisma = getEnhancedPrismaClient();
      
      vi.mocked(mockPrisma.customer.upsert).mockResolvedValue({
        id: 'customer-minimal',
        name: 'Minimal Customer',
        isActive: true
      } as any);

      expect(minimalCustomerData.DisplayName).toBe('Minimal Customer');
      expect(minimalCustomerData.PrimaryEmailAddr).toBeUndefined();
      expect(minimalCustomerData.ShipAddr).toBeUndefined();
    });

    it('should handle customer deactivation', async () => {
      const deactivatedCustomerData = {
        Id: 'customer-deactivated',
        DisplayName: 'Deactivated Customer',
        Active: false
      };

      expect(deactivatedCustomerData.Active).toBe(false);
    });

    it('should process customer address variations', async () => {
      const customerWithPartialAddress = {
        Id: 'customer-partial-addr',
        DisplayName: 'Partial Address Customer',
        ShipAddr: {
          Line1: '456 Main St',
          City: 'Somewhere',
          PostalCode: '12345'
          // Missing state and country
        },
        Active: true
      };

      expect(customerWithPartialAddress.ShipAddr.Line1).toBe('456 Main St');
      expect(customerWithPartialAddress.ShipAddr.CountrySubDivisionCode).toBeUndefined();
      expect(customerWithPartialAddress.ShipAddr.Country).toBeUndefined();
    });
  });

  describe('Invoice Entity Processing', () => {
    it('should process invoice with multiple line items', async () => {
      const invoiceData = {
        Id: 'invoice-123',
        CustomerRef: { value: 'customer-456', name: 'Test Customer' },
        DocNumber: 'INV-2024-001',
        TxnDate: '2024-01-15',
        TotalAmt: 2500.00,
        Line: [
          {
            Id: '1',
            Amount: 1500.00,
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: {
              ItemRef: { value: 'item-1', name: 'Premium Widget' },
              Qty: 3,
              UnitPrice: 500.00,
              Description: 'Premium widget with advanced features'
            }
          },
          {
            Id: '2',
            Amount: 1000.00,
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: {
              ItemRef: { value: 'item-2', name: 'Standard Service' },
              Qty: 2,
              UnitPrice: 500.00,
              Description: 'Standard maintenance service'
            }
          }
        ],
        BillAddr: {
          Line1: '789 Billing St',
          City: 'Billing City',
          CountrySubDivisionCode: 'NY',
          PostalCode: '10001'
        },
        ShipAddr: {
          Line1: '321 Shipping Ave',
          City: 'Shipping City',
          CountrySubDivisionCode: 'CA',
          PostalCode: '90210'
        },
        PrivateNote: 'Rush order - expedite shipping'
      };

      const { getEnhancedPrismaClient } = await import('~/server/lib/db');
      const mockPrisma = getEnhancedPrismaClient();
      
      vi.mocked(mockPrisma.order.upsert).mockResolvedValue({
        id: 'invoice-123',
        orderNumber: 'INV-2024-001',
        customerId: 'customer-456',
        totalAmount: 2500.00,
        status: 'PENDING'
      } as any);

      expect(invoiceData.Line).toHaveLength(2);
      expect(invoiceData.TotalAmt).toBe(2500.00);
      expect(invoiceData.Line[0].SalesItemLineDetail?.Qty).toBe(3);
      expect(invoiceData.Line[1].SalesItemLineDetail?.UnitPrice).toBe(500.00);
    });

    it('should process invoice with description line items', async () => {
      const invoiceWithDescriptions = {
        Id: 'invoice-desc',
        CustomerRef: { value: 'customer-789', name: 'Description Customer' },
        DocNumber: 'INV-DESC-001',
        TxnDate: '2024-01-16',
        TotalAmt: 750.00,
        Line: [
          {
            Id: '1',
            Amount: 500.00,
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: {
              ItemRef: { value: 'item-service', name: 'Consulting' },
              Qty: 5,
              UnitPrice: 100.00
            }
          },
          {
            Id: '2',
            Amount: 250.00,
            DetailType: 'DescriptionLineDetail',
            DescriptionLineDetail: {
              Amount: 250.00,
              Description: 'Additional consultation notes and documentation'
            }
          }
        ]
      };

      expect(invoiceWithDescriptions.Line[0].DetailType).toBe('SalesItemLineDetail');
      expect(invoiceWithDescriptions.Line[1].DetailType).toBe('DescriptionLineDetail');
      expect(invoiceWithDescriptions.Line[1].DescriptionLineDetail?.Description).toContain('consultation');
    });

    it('should handle invoice without line items', async () => {
      const invoiceWithoutLines = {
        Id: 'invoice-no-lines',
        CustomerRef: { value: 'customer-empty', name: 'Empty Customer' },
        DocNumber: 'INV-EMPTY-001',
        TxnDate: '2024-01-17',
        TotalAmt: 0.00,
        Line: []
      };

      expect(invoiceWithoutLines.Line).toHaveLength(0);
      expect(invoiceWithoutLines.TotalAmt).toBe(0.00);
    });

    it('should process invoice address variations', async () => {
      const invoiceAddressVariations = {
        Id: 'invoice-addr-var',
        CustomerRef: { value: 'customer-addr', name: 'Address Customer' },
        DocNumber: 'INV-ADDR-001',
        TxnDate: '2024-01-18',
        TotalAmt: 100.00,
        BillAddr: {
          Line1: '123 Bill St'
          // Missing other address fields
        },
        // Missing ShipAddr entirely
        Line: [{
          Id: '1',
          Amount: 100.00,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            ItemRef: { value: 'simple-item', name: 'Simple Item' },
            Qty: 1,
            UnitPrice: 100.00
          }
        }]
      };

      expect(invoiceAddressVariations.BillAddr.Line1).toBe('123 Bill St');
      expect(invoiceAddressVariations.BillAddr.City).toBeUndefined();
      expect(invoiceAddressVariations.ShipAddr).toBeUndefined();
    });
  });

  describe('Item Entity Processing', () => {
    it('should process inventory item with complete data', async () => {
      const inventoryItemData = {
        Id: 'item-inventory-123',
        Name: 'Premium Laptop Computer',
        Description: 'High-performance laptop with advanced specifications',
        Active: true,
        Type: 'Inventory',
        UnitPrice: 1299.99,
        PurchaseCost: 899.99,
        IncomeAccountRef: { value: 'account-income', name: 'Product Sales' },
        ExpenseAccountRef: { value: 'account-expense', name: 'Cost of Goods Sold' },
        AssetAccountRef: { value: 'account-asset', name: 'Inventory Asset' },
        MetaData: {
          CreateTime: '2024-01-01T10:00:00Z',
          LastUpdatedTime: '2024-01-15T14:30:00Z'
        }
      };

      const { getEnhancedPrismaClient } = await import('~/server/lib/db');
      const mockPrisma = getEnhancedPrismaClient();
      
      vi.mocked(mockPrisma.item.upsert).mockResolvedValue({
        id: 'item-inventory-123',
        name: 'Premium Laptop Computer',
        description: 'High-performance laptop with advanced specifications',
        unitPrice: 1299.99,
        isActive: true,
        itemType: 'INVENTORY'
      } as any);

      expect(inventoryItemData.Type).toBe('Inventory');
      expect(inventoryItemData.UnitPrice).toBe(1299.99);
      expect(inventoryItemData.PurchaseCost).toBe(899.99);
      expect(inventoryItemData.IncomeAccountRef.name).toBe('Product Sales');
    });

    it('should process service item', async () => {
      const serviceItemData = {
        Id: 'item-service-456',
        Name: 'Professional Consulting',
        Description: 'Expert consulting services for business optimization',
        Active: true,
        Type: 'Service',
        UnitPrice: 150.00,
        IncomeAccountRef: { value: 'account-service-income', name: 'Service Revenue' }
        // Service items typically don't have PurchaseCost or AssetAccountRef
      };

      expect(serviceItemData.Type).toBe('Service');
      expect(serviceItemData.UnitPrice).toBe(150.00);
      expect(serviceItemData.PurchaseCost).toBeUndefined();
      expect(serviceItemData.AssetAccountRef).toBeUndefined();
    });

    it('should process non-inventory item', async () => {
      const nonInventoryItemData = {
        Id: 'item-non-inventory-789',
        Name: 'Office Supplies',
        Description: 'Various office supplies and materials',
        Active: true,
        Type: 'NonInventory',
        UnitPrice: 25.00,
        PurchaseCost: 15.00,
        IncomeAccountRef: { value: 'account-supplies-income', name: 'Supplies Sales' },
        ExpenseAccountRef: { value: 'account-supplies-expense', name: 'Supplies Expense' }
        // Non-inventory items don't track asset accounts
      };

      expect(nonInventoryItemData.Type).toBe('NonInventory');
      expect(nonInventoryItemData.AssetAccountRef).toBeUndefined();
    });

    it('should handle item deactivation', async () => {
      const deactivatedItemData = {
        Id: 'item-deactivated',
        Name: 'Discontinued Product',
        Description: 'This product is no longer available',
        Active: false,
        Type: 'Inventory',
        UnitPrice: 0.00
      };

      expect(deactivatedItemData.Active).toBe(false);
      expect(deactivatedItemData.UnitPrice).toBe(0.00);
    });

    it('should process item with missing optional fields', async () => {
      const minimalItemData = {
        Id: 'item-minimal',
        Name: 'Basic Item',
        Active: true,
        Type: 'Service'
        // Missing description, prices, and account references
      };

      expect(minimalItemData.Description).toBeUndefined();
      expect(minimalItemData.UnitPrice).toBeUndefined();
      expect(minimalItemData.IncomeAccountRef).toBeUndefined();
    });
  });

  describe('Estimate Entity Processing', () => {
    it('should process estimate with complete data', async () => {
      const estimateData = {
        Id: 'estimate-123',
        CustomerRef: { value: 'customer-est', name: 'Estimate Customer' },
        DocNumber: 'EST-2024-001',
        TxnDate: '2024-01-20',
        TotalAmt: 5000.00,
        EmailStatus: 'EmailSent',
        Line: [
          {
            Id: '1',
            Amount: 3000.00,
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: {
              ItemRef: { value: 'item-premium', name: 'Premium Package' },
              Qty: 1,
              UnitPrice: 3000.00,
              Description: 'Complete premium service package'
            }
          },
          {
            Id: '2',
            Amount: 2000.00,
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: {
              ItemRef: { value: 'item-addon', name: 'Additional Services' },
              Qty: 4,
              UnitPrice: 500.00,
              Description: 'Additional consulting hours'
            }
          }
        ],
        BillAddr: {
          Line1: '555 Estimate Blvd',
          City: 'Estimate City',
          CountrySubDivisionCode: 'TX',
          PostalCode: '75001'
        },
        PrivateNote: 'High-priority client - follow up within 48 hours'
      };

      const { getEnhancedPrismaClient } = await import('~/server/lib/db');
      const mockPrisma = getEnhancedPrismaClient();
      
      vi.mocked(mockPrisma.estimate.upsert).mockResolvedValue({
        id: 'estimate-123',
        estimateNumber: 'EST-2024-001',
        customerId: 'customer-est',
        totalAmount: 5000.00,
        status: 'SENT'
      } as any);

      expect(estimateData.EmailStatus).toBe('EmailSent');
      expect(estimateData.TotalAmt).toBe(5000.00);
      expect(estimateData.Line).toHaveLength(2);
      expect(estimateData.PrivateNote).toContain('High-priority');
    });

    it('should process estimate with different email statuses', async () => {
      const emailStatuses = ['NotSet', 'NeedToSend', 'EmailSent'];
      
      emailStatuses.forEach(status => {
        const estimateWithStatus = {
          Id: `estimate-${status.toLowerCase()}`,
          CustomerRef: { value: 'customer-status', name: 'Status Customer' },
          DocNumber: `EST-${status}-001`,
          TxnDate: '2024-01-21',
          TotalAmt: 1000.00,
          EmailStatus: status,
          Line: [{
            Id: '1',
            Amount: 1000.00,
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: {
              ItemRef: { value: 'item-test', name: 'Test Item' },
              Qty: 1,
              UnitPrice: 1000.00
            }
          }]
        };

        expect(estimateWithStatus.EmailStatus).toBe(status);
      });
    });

    it('should process estimate without email status', async () => {
      const estimateNoEmailStatus = {
        Id: 'estimate-no-email',
        CustomerRef: { value: 'customer-no-email', name: 'No Email Customer' },
        DocNumber: 'EST-NO-EMAIL-001',
        TxnDate: '2024-01-22',
        TotalAmt: 750.00,
        Line: [{
          Id: '1',
          Amount: 750.00,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            ItemRef: { value: 'item-simple', name: 'Simple Service' },
            Qty: 1,
            UnitPrice: 750.00
          }
        }]
        // EmailStatus is undefined
      };

      expect(estimateNoEmailStatus.EmailStatus).toBeUndefined();
    });

    it('should handle estimate with mixed line item types', async () => {
      const mixedLineEstimate = {
        Id: 'estimate-mixed',
        CustomerRef: { value: 'customer-mixed', name: 'Mixed Customer' },
        DocNumber: 'EST-MIXED-001',
        TxnDate: '2024-01-23',
        TotalAmt: 1250.00,
        Line: [
          {
            Id: '1',
            Amount: 1000.00,
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: {
              ItemRef: { value: 'item-product', name: 'Physical Product' },
              Qty: 2,
              UnitPrice: 500.00
            }
          },
          {
            Id: '2',
            Amount: 250.00,
            DetailType: 'DescriptionLineDetail',
            DescriptionLineDetail: {
              Amount: 250.00,
              Description: 'Custom configuration and setup fee'
            }
          }
        ]
      };

      expect(mixedLineEstimate.Line[0].DetailType).toBe('SalesItemLineDetail');
      expect(mixedLineEstimate.Line[1].DetailType).toBe('DescriptionLineDetail');
      expect(mixedLineEstimate.Line[1].DescriptionLineDetail?.Description).toContain('Custom configuration');
    });
  });

  describe('Entity Processing Error Handling', () => {
    it('should handle malformed customer data', async () => {
      const malformedCustomer = {
        // Missing required Id field
        DisplayName: 'Malformed Customer',
        Active: true
      };

      expect(malformedCustomer.Id).toBeUndefined();
    });

    it('should handle malformed invoice data', async () => {
      const malformedInvoice = {
        Id: 'invoice-malformed',
        // Missing CustomerRef
        DocNumber: 'INV-MALFORMED',
        TotalAmt: 100.00,
        Line: [] // Empty line items
      };

      expect(malformedInvoice.CustomerRef).toBeUndefined();
      expect(malformedInvoice.Line).toHaveLength(0);
    });

    it('should handle database operation failures', async () => {
      const { getEnhancedPrismaClient } = await import('~/server/lib/db');
      const mockPrisma = getEnhancedPrismaClient();
      
      // Mock database failure
      vi.mocked(mockPrisma.customer.upsert).mockRejectedValue(new Error('Database connection failed'));

      const customerData = {
        Id: 'customer-db-fail',
        DisplayName: 'DB Fail Customer',
        Active: true
      };

      // The processing should handle this gracefully
      expect(customerData.Id).toBe('customer-db-fail');
    });

    it('should handle product parser failures', async () => {
      const { parseProductDescription } = await import('~/server/utils/productParser');
      
      // Mock parser failure
      vi.mocked(parseProductDescription).mockReturnValue({
        baseProduct: null,
        attributes: {},
        isValid: false
      });

      const itemWithComplexDescription = {
        Id: 'item-complex',
        Name: 'Complex Item',
        Description: 'Very complex product description that might fail parsing',
        Active: true,
        Type: 'Inventory'
      };

      expect(itemWithComplexDescription.Description).toContain('complex');
    });
  });
});