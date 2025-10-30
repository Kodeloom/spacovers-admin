const { PrismaClient } = require('@prisma-app/client');

async function checkCurrentSchema() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking current database schema...');
    
    // Check if ProductAttribute table exists and its columns
    console.log('\n📋 ProductAttribute table:');
    try {
      const productAttributeColumns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'ProductAttribute'
        ORDER BY ordinal_position
      `;
      console.log('Columns:', productAttributeColumns);
      
      // Check specifically for new fields
      const hasNewFields = productAttributeColumns.some(col => 
        col.column_name === 'tieDownLength' || col.column_name === 'poNumber'
      );
      console.log('Has new fields (tieDownLength, poNumber):', hasNewFields);
    } catch (error) {
      console.log('ProductAttribute table not found or error:', error.message);
    }
    
    // Check if Order table has poNumber
    console.log('\n📋 Order table:');
    try {
      const orderColumns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'Order'
        AND column_name = 'poNumber'
      `;
      console.log('poNumber field:', orderColumns);
    } catch (error) {
      console.log('Order table poNumber check error:', error.message);
    }
    
    // Check if PrintQueue table exists
    console.log('\n📋 PrintQueue table:');
    try {
      const printQueueExists = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'print_queue'
      `;
      console.log('PrintQueue table exists:', printQueueExists.length > 0);
      
      if (printQueueExists.length > 0) {
        const printQueueColumns = await prisma.$queryRaw`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = 'print_queue'
          ORDER BY ordinal_position
        `;
        console.log('PrintQueue columns:', printQueueColumns);
      }
    } catch (error) {
      console.log('PrintQueue table check error:', error.message);
    }
    
    // Check OrderPriority enum
    console.log('\n📋 OrderPriority enum:');
    try {
      const priorityEnum = await prisma.$queryRaw`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (
          SELECT oid 
          FROM pg_type 
          WHERE typname = 'OrderPriority'
        )
        ORDER BY enumsortorder
      `;
      console.log('Current enum values:', priorityEnum.map(e => e.enumlabel));
      
      const hasNoPriority = priorityEnum.some(e => e.enumlabel === 'NO_PRIORITY');
      console.log('Has NO_PRIORITY:', hasNoPriority);
    } catch (error) {
      console.log('OrderPriority enum check error:', error.message);
    }
    
    // Check OrderItem relation to PrintQueue
    console.log('\n📋 OrderItem PrintQueue relation:');
    try {
      const orderItemColumns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'OrderItem'
        ORDER BY ordinal_position
      `;
      console.log('OrderItem has', orderItemColumns.length, 'columns');
    } catch (error) {
      console.log('OrderItem check error:', error.message);
    }
    
    console.log('\n✅ Schema check completed!');
    
  } catch (error) {
    console.error('❌ Schema check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentSchema();