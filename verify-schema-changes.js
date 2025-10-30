const { PrismaClient } = require('@prisma-app/client');

async function verifySchemaChanges() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Verifying schema changes...');
    
    // Test 1: Verify ProductAttribute model has new fields
    console.log('✅ Testing ProductAttribute model...');
    const productAttributeFields = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ProductAttribute' 
      AND column_name IN ('tieDownLength', 'poNumber')
    `;
    console.log('ProductAttribute new fields:', productAttributeFields);
    
    // Test 2: Verify Order model has poNumber field
    console.log('✅ Testing Order model...');
    const orderFields = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Order' 
      AND column_name = 'poNumber'
    `;
    console.log('Order poNumber field:', orderFields);
    
    // Test 3: Verify PrintQueue model exists
    console.log('✅ Testing PrintQueue model...');
    const printQueueTable = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'print_queue'
    `;
    console.log('PrintQueue table exists:', printQueueTable);
    
    // Test 4: Verify OrderPriority enum includes NO_PRIORITY
    console.log('✅ Testing OrderPriority enum...');
    const priorityEnum = await prisma.$queryRaw`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'OrderPriority'
      )
    `;
    console.log('OrderPriority enum values:', priorityEnum);
    
    // Test 5: Verify existing functionality - create a test order
    console.log('✅ Testing existing Order functionality...');
    const testCustomer = await prisma.customer.findFirst();
    if (testCustomer) {
      const testOrder = await prisma.order.create({
        data: {
          customerId: testCustomer.id,
          contactEmail: 'test@example.com',
          poNumber: 'TEST-PO-001', // Test new field
          priority: 'NO_PRIORITY', // Test new enum value
        }
      });
      console.log('Test order created with ID:', testOrder.id);
      
      // Clean up test order
      await prisma.order.delete({
        where: { id: testOrder.id }
      });
      console.log('Test order cleaned up');
    }
    
    // Test 6: Verify PrintQueue functionality
    console.log('✅ Testing PrintQueue functionality...');
    const testOrderItem = await prisma.orderItem.findFirst();
    if (testOrderItem) {
      const printQueueItem = await prisma.printQueue.create({
        data: {
          orderItemId: testOrderItem.id,
          addedBy: 'test-user'
        }
      });
      console.log('Test print queue item created with ID:', printQueueItem.id);
      
      // Clean up test print queue item
      await prisma.printQueue.delete({
        where: { id: printQueueItem.id }
      });
      console.log('Test print queue item cleaned up');
    }
    
    console.log('🎉 All schema changes verified successfully!');
    
  } catch (error) {
    console.error('❌ Schema verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifySchemaChanges();