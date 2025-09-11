-- Performance Optimization Migration
-- Add database indexes for frequently queried fields in metrics calculations

-- Orders table indexes for dashboard and metrics queries
CREATE INDEX IF NOT EXISTS "idx_orders_created_at" ON "orders" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_orders_order_status" ON "orders" ("order_status");
CREATE INDEX IF NOT EXISTS "idx_orders_customer_id" ON "orders" ("customer_id");
CREATE INDEX IF NOT EXISTS "idx_orders_priority" ON "orders" ("priority");
CREATE INDEX IF NOT EXISTS "idx_orders_ready_to_ship_at" ON "orders" ("ready_to_ship_at");
CREATE INDEX IF NOT EXISTS "idx_orders_status_created" ON "orders" ("order_status", "created_at");

-- OrderItem table indexes for production metrics
CREATE INDEX IF NOT EXISTS "idx_order_items_item_status" ON "order_items" ("item_status");
CREATE INDEX IF NOT EXISTS "idx_order_items_order_id" ON "order_items" ("order_id");
CREATE INDEX IF NOT EXISTS "idx_order_items_created_at" ON "order_items" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_order_items_status_order" ON "order_items" ("item_status", "order_id");

-- ItemProcessingLog table indexes for productivity metrics
CREATE INDEX IF NOT EXISTS "idx_item_processing_logs_start_time" ON "item_processing_logs" ("start_time");
CREATE INDEX IF NOT EXISTS "idx_item_processing_logs_end_time" ON "item_processing_logs" ("end_time");
CREATE INDEX IF NOT EXISTS "idx_item_processing_logs_user_id" ON "item_processing_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_item_processing_logs_station_id" ON "item_processing_logs" ("station_id");
CREATE INDEX IF NOT EXISTS "idx_item_processing_logs_duration" ON "item_processing_logs" ("duration_in_seconds");
CREATE INDEX IF NOT EXISTS "idx_item_processing_logs_user_start" ON "item_processing_logs" ("user_id", "start_time");
CREATE INDEX IF NOT EXISTS "idx_item_processing_logs_station_start" ON "item_processing_logs" ("station_id", "start_time");

-- OrderStatusLog table indexes for audit and tracking
CREATE INDEX IF NOT EXISTS "idx_order_status_logs_timestamp" ON "order_status_logs" ("timestamp");
CREATE INDEX IF NOT EXISTS "idx_order_status_logs_to_status" ON "order_status_logs" ("to_status");
CREATE INDEX IF NOT EXISTS "idx_order_status_logs_order_timestamp" ON "order_status_logs" ("order_id", "timestamp");

-- ItemStatusLog table indexes for item tracking
CREATE INDEX IF NOT EXISTS "idx_item_status_logs_timestamp" ON "item_status_logs" ("timestamp");
CREATE INDEX IF NOT EXISTS "idx_item_status_logs_to_status" ON "item_status_logs" ("to_status");
CREATE INDEX IF NOT EXISTS "idx_item_status_logs_item_timestamp" ON "item_status_logs" ("order_item_id", "timestamp");

-- Customer table indexes for filtering
CREATE INDEX IF NOT EXISTS "idx_customers_type" ON "customers" ("type");
CREATE INDEX IF NOT EXISTS "idx_customers_status" ON "customers" ("status");

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS "idx_orders_complex_metrics" ON "orders" ("order_status", "created_at", "total_amount");
CREATE INDEX IF NOT EXISTS "idx_processing_logs_metrics" ON "item_processing_logs" ("start_time", "end_time", "duration_in_seconds") WHERE "end_time" IS NOT NULL;

-- Partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS "idx_orders_active_status" ON "orders" ("created_at", "total_amount") WHERE "order_status" NOT IN ('CANCELLED', 'ARCHIVED');
CREATE INDEX IF NOT EXISTS "idx_processing_logs_completed" ON "item_processing_logs" ("user_id", "station_id", "duration_in_seconds") WHERE "end_time" IS NOT NULL AND "duration_in_seconds" > 0;