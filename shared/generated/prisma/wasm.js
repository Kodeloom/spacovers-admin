
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime,
  createParam,
} = require('./runtime/wasm.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.6.0
 * Query Engine version: f676762280b54cd07c770017ed3711ddde35f37a
 */
Prisma.prismaVersion = {
  client: "6.6.0",
  engine: "f676762280b54cd07c770017ed3711ddde35f37a"
}

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = Extensions.getExtensionContext
Prisma.defineExtension = Extensions.defineExtension

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}





/**
 * Enums
 */
exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  contactNumber: 'contactNumber',
  passwordHash: 'passwordHash',
  emailVerified: 'emailVerified',
  image: 'image',
  status: 'status',
  hourlyRate: 'hourlyRate',
  organizationId: 'organizationId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RoleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PermissionScalarFieldEnum = {
  id: 'id',
  action: 'action',
  subject: 'subject',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserRoleScalarFieldEnum = {
  userId: 'userId',
  roleId: 'roleId',
  assignedAt: 'assignedAt',
  assignedBy: 'assignedBy'
};

exports.Prisma.RolePermissionScalarFieldEnum = {
  roleId: 'roleId',
  permissionId: 'permissionId',
  assignedAt: 'assignedAt'
};

exports.Prisma.CustomerScalarFieldEnum = {
  id: 'id',
  quickbooksCustomerId: 'quickbooksCustomerId',
  name: 'name',
  contactNumber: 'contactNumber',
  email: 'email',
  type: 'type',
  status: 'status',
  shippingAddressLine1: 'shippingAddressLine1',
  shippingAddressLine2: 'shippingAddressLine2',
  shippingCity: 'shippingCity',
  shippingState: 'shippingState',
  shippingZipCode: 'shippingZipCode',
  shippingCountry: 'shippingCountry',
  billingAddressLine1: 'billingAddressLine1',
  billingAddressLine2: 'billingAddressLine2',
  billingCity: 'billingCity',
  billingState: 'billingState',
  billingZipCode: 'billingZipCode',
  billingCountry: 'billingCountry',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ItemScalarFieldEnum = {
  id: 'id',
  quickbooksItemId: 'quickbooksItemId',
  name: 'name',
  imageUrl: 'imageUrl',
  category: 'category',
  wholesalePrice: 'wholesalePrice',
  retailPrice: 'retailPrice',
  cost: 'cost',
  description: 'description',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StationScalarFieldEnum = {
  id: 'id',
  name: 'name',
  barcode: 'barcode',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RoleStationScalarFieldEnum = {
  roleId: 'roleId',
  stationId: 'stationId',
  assignedAt: 'assignedAt'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  quickbooksOrderId: 'quickbooksOrderId',
  customerId: 'customerId',
  salesOrderNumber: 'salesOrderNumber',
  purchaseOrderNumber: 'purchaseOrderNumber',
  contactEmail: 'contactEmail',
  contactPhoneNumber: 'contactPhoneNumber',
  billingAddressLine1: 'billingAddressLine1',
  billingAddressLine2: 'billingAddressLine2',
  billingCity: 'billingCity',
  billingState: 'billingState',
  billingZipCode: 'billingZipCode',
  billingCountry: 'billingCountry',
  shippingAddressLine1: 'shippingAddressLine1',
  shippingAddressLine2: 'shippingAddressLine2',
  shippingCity: 'shippingCity',
  shippingState: 'shippingState',
  shippingZipCode: 'shippingZipCode',
  shippingCountry: 'shippingCountry',
  orderStatus: 'orderStatus',
  barcode: 'barcode',
  approvedAt: 'approvedAt',
  readyToShipAt: 'readyToShipAt',
  shippedAt: 'shippedAt',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  itemId: 'itemId',
  quickbooksOrderLineId: 'quickbooksOrderLineId',
  quantity: 'quantity',
  pricePerItem: 'pricePerItem',
  itemStatus: 'itemStatus',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ItemProcessingLogScalarFieldEnum = {
  id: 'id',
  orderItemId: 'orderItemId',
  stationId: 'stationId',
  userId: 'userId',
  startTime: 'startTime',
  endTime: 'endTime',
  durationInSeconds: 'durationInSeconds',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  action: 'action',
  entityName: 'entityName',
  entityId: 'entityId',
  oldValue: 'oldValue',
  newValue: 'newValue',
  ipAddress: 'ipAddress',
  timestamp: 'timestamp'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  expiresAt: 'expiresAt',
  token: 'token',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  userId: 'userId'
};

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  accountId: 'accountId',
  providerId: 'providerId',
  userId: 'userId',
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  idToken: 'idToken',
  accessTokenExpiresAt: 'accessTokenExpiresAt',
  refreshTokenExpiresAt: 'refreshTokenExpiresAt',
  scope: 'scope',
  password: 'password',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VerificationScalarFieldEnum = {
  id: 'id',
  identifier: 'identifier',
  value: 'value',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.UserStatus = exports.$Enums.UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ARCHIVED: 'ARCHIVED'
};

exports.CustomerType = exports.$Enums.CustomerType = {
  RETAILER: 'RETAILER',
  WHOLESALER: 'WHOLESALER'
};

exports.CustomerStatus = exports.$Enums.CustomerStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ARCHIVED: 'ARCHIVED'
};

exports.ItemStatus = exports.$Enums.ItemStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ARCHIVED: 'ARCHIVED'
};

exports.OrderSystemStatus = exports.$Enums.OrderSystemStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  ORDER_PROCESSING: 'ORDER_PROCESSING',
  READY_TO_SHIP: 'READY_TO_SHIP',
  SHIPPED: 'SHIPPED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.OrderItemProcessingStatus = exports.$Enums.OrderItemProcessingStatus = {
  NOT_STARTED_PRODUCTION: 'NOT_STARTED_PRODUCTION',
  CUTTING: 'CUTTING',
  SEWING: 'SEWING',
  WRAPPING: 'WRAPPING',
  READY: 'READY'
};

exports.Prisma.ModelName = {
  User: 'User',
  Role: 'Role',
  Permission: 'Permission',
  UserRole: 'UserRole',
  RolePermission: 'RolePermission',
  Customer: 'Customer',
  Item: 'Item',
  Station: 'Station',
  RoleStation: 'RoleStation',
  Order: 'Order',
  OrderItem: 'OrderItem',
  ItemProcessingLog: 'ItemProcessingLog',
  AuditLog: 'AuditLog',
  Session: 'Session',
  Account: 'Account',
  Verification: 'Verification'
};
/**
 * Create the Client
 */
const config = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "/Users/rodrigoalvarenga/Documents/projects/spacovers-admin/shared/generated/prisma",
      "fromEnvVar": null
    },
    "config": {
      "moduleFormat": "esm",
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "darwin-arm64",
        "native": true
      },
      {
        "fromEnvVar": null,
        "value": "debian-openssl-3.0.x"
      }
    ],
    "previewFeatures": [
      "driverAdapters"
    ],
    "sourceFilePath": "/Users/rodrigoalvarenga/Documents/projects/spacovers-admin/prisma/schema.prisma",
    "isCustomOutput": true
  },
  "relativeEnvPaths": {
    "rootEnvPath": null,
    "schemaEnvPath": "../../../.env"
  },
  "relativePath": "../../../prisma",
  "clientVersion": "6.6.0",
  "engineVersion": "f676762280b54cd07c770017ed3711ddde35f37a",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "postgresql",
  "postinstall": false,
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "DATABASE_URL",
        "value": null
      }
    }
  },
  "inlineSchema": "//////////////////////////////////////////////////////////////////////////////////////////////\n// DO NOT MODIFY THIS FILE                                                                  //\n// This file is automatically generated by ZenStack CLI and should not be manually updated. //\n//////////////////////////////////////////////////////////////////////////////////////////////\n\ndatasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}\n\ngenerator client {\n  provider        = \"prisma-client-js\"\n  output          = \"../shared/generated/prisma\"\n  previewFeatures = [\"driverAdapters\"]\n  binaryTargets   = [\"native\", \"debian-openssl-3.0.x\"]\n  moduleFormat    = \"esm\"\n}\n\nenum UserStatus {\n  ACTIVE\n  INACTIVE\n  ARCHIVED\n}\n\nenum CustomerType {\n  RETAILER\n  WHOLESALER\n}\n\nenum CustomerStatus {\n  ACTIVE\n  INACTIVE\n  ARCHIVED\n}\n\nenum ItemStatus {\n  ACTIVE\n  INACTIVE\n  ARCHIVED\n}\n\nenum OrderSystemStatus {\n  PENDING\n  APPROVED\n  ORDER_PROCESSING\n  READY_TO_SHIP\n  SHIPPED\n  COMPLETED\n  CANCELLED\n}\n\nenum OrderItemProcessingStatus {\n  NOT_STARTED_PRODUCTION\n  CUTTING\n  SEWING\n  WRAPPING\n  READY\n}\n\nmodel User {\n  id                 String              @id() @default(cuid())\n  name               String\n  email              String              @unique()\n  contactNumber      String?\n  passwordHash       String\n  emailVerified      DateTime?\n  image              String?\n  status             UserStatus          @default(ACTIVE)\n  hourlyRate         Decimal?            @db.Decimal(10, 2)\n  organizationId     String?\n  roles              UserRole[]\n  itemProcessingLogs ItemProcessingLog[]\n  auditLogs          AuditLog[]\n  sessions           Session[]\n  accounts           Account[]\n  createdAt          DateTime            @default(now())\n  updatedAt          DateTime            @updatedAt()\n\n  @@map(\"user\")\n}\n\nmodel Role {\n  id          String           @id() @default(cuid())\n  name        String           @unique()\n  description String?\n  users       UserRole[]\n  permissions RolePermission[]\n  stations    RoleStation[]\n  createdAt   DateTime         @default(now())\n  updatedAt   DateTime         @updatedAt()\n}\n\nmodel Permission {\n  id          String           @id() @default(cuid())\n  action      String\n  subject     String\n  description String?\n  roles       RolePermission[]\n  createdAt   DateTime         @default(now())\n  updatedAt   DateTime         @updatedAt()\n\n  @@unique([action, subject])\n}\n\nmodel UserRole {\n  userId     String\n  roleId     String\n  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n  role       Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)\n  assignedAt DateTime @default(now())\n  assignedBy String?\n\n  @@id([userId, roleId])\n}\n\nmodel RolePermission {\n  roleId       String\n  permissionId String\n  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)\n  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)\n  assignedAt   DateTime   @default(now())\n\n  @@id([roleId, permissionId])\n}\n\nmodel Customer {\n  id                   String         @id() @default(cuid())\n  quickbooksCustomerId String?        @unique()\n  name                 String\n  contactNumber        String?\n  email                String?\n  type                 CustomerType\n  status               CustomerStatus @default(ACTIVE)\n  shippingAddressLine1 String?\n  shippingAddressLine2 String?\n  shippingCity         String?\n  shippingState        String?\n  shippingZipCode      String?\n  shippingCountry      String?\n  billingAddressLine1  String?\n  billingAddressLine2  String?\n  billingCity          String?\n  billingState         String?\n  billingZipCode       String?\n  billingCountry       String?\n  orders               Order[]\n  createdAt            DateTime       @default(now())\n  updatedAt            DateTime       @updatedAt()\n}\n\nmodel Item {\n  id               String      @id() @default(cuid())\n  quickbooksItemId String?     @unique()\n  name             String\n  imageUrl         String?\n  category         String?\n  wholesalePrice   Decimal?    @db.Decimal(10, 2)\n  retailPrice      Decimal?    @db.Decimal(10, 2)\n  cost             Decimal?    @db.Decimal(10, 2)\n  description      String?\n  status           ItemStatus  @default(ACTIVE)\n  orderItems       OrderItem[]\n  createdAt        DateTime    @default(now())\n  updatedAt        DateTime    @updatedAt()\n}\n\nmodel Station {\n  id                 String              @id() @default(cuid())\n  name               String              @unique()\n  barcode            String?             @unique()\n  description        String?\n  roles              RoleStation[]\n  itemProcessingLogs ItemProcessingLog[]\n  createdAt          DateTime            @default(now())\n  updatedAt          DateTime            @updatedAt()\n}\n\nmodel RoleStation {\n  roleId     String\n  stationId  String\n  role       Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)\n  station    Station  @relation(fields: [stationId], references: [id], onDelete: Cascade)\n  assignedAt DateTime @default(now())\n\n  @@id([roleId, stationId])\n}\n\nmodel Order {\n  id                   String            @id() @default(cuid())\n  quickbooksOrderId    String?           @unique()\n  customerId           String\n  customer             Customer          @relation(fields: [customerId], references: [id])\n  salesOrderNumber     String?\n  purchaseOrderNumber  String?\n  contactEmail         String\n  contactPhoneNumber   String?\n  billingAddressLine1  String?\n  billingAddressLine2  String?\n  billingCity          String?\n  billingState         String?\n  billingZipCode       String?\n  billingCountry       String?\n  shippingAddressLine1 String?\n  shippingAddressLine2 String?\n  shippingCity         String?\n  shippingState        String?\n  shippingZipCode      String?\n  shippingCountry      String?\n  orderStatus          OrderSystemStatus @default(PENDING)\n  barcode              String?           @unique()\n  approvedAt           DateTime?\n  readyToShipAt        DateTime?\n  shippedAt            DateTime?\n  notes                String?           @db.Text()\n  orderItems           OrderItem[]\n  createdAt            DateTime          @default(now())\n  updatedAt            DateTime          @updatedAt()\n}\n\nmodel OrderItem {\n  id                    String                    @id() @default(cuid())\n  orderId               String\n  order                 Order                     @relation(fields: [orderId], references: [id], onDelete: Cascade)\n  itemId                String\n  item                  Item                      @relation(fields: [itemId], references: [id])\n  quickbooksOrderLineId String?                   @unique()\n  quantity              Int\n  pricePerItem          Decimal                   @db.Decimal(10, 2)\n  itemStatus            OrderItemProcessingStatus @default(NOT_STARTED_PRODUCTION)\n  notes                 String?                   @db.Text()\n  itemProcessingLogs    ItemProcessingLog[]\n  createdAt             DateTime                  @default(now())\n  updatedAt             DateTime                  @updatedAt()\n}\n\nmodel ItemProcessingLog {\n  id                String    @id() @default(cuid())\n  orderItemId       String\n  orderItem         OrderItem @relation(fields: [orderItemId], references: [id], onDelete: Cascade)\n  stationId         String\n  station           Station   @relation(fields: [stationId], references: [id])\n  userId            String\n  user              User      @relation(fields: [userId], references: [id])\n  startTime         DateTime\n  endTime           DateTime?\n  durationInSeconds Int?\n  notes             String?   @db.Text()\n  createdAt         DateTime  @default(now())\n  updatedAt         DateTime  @updatedAt()\n}\n\nmodel AuditLog {\n  id         String   @id() @default(cuid())\n  userId     String?\n  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)\n  action     String\n  entityName String?\n  entityId   String?\n  oldValue   Json?\n  newValue   Json?\n  ipAddress  String?\n  timestamp  DateTime @default(now())\n\n  @@index([entityName, entityId])\n  @@index([userId])\n  @@index([action])\n}\n\nmodel Session {\n  id        String   @id() @default(cuid())\n  expiresAt DateTime\n  token     String   @unique()\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt()\n  ipAddress String?\n  userAgent String?\n  userId    String\n  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@map(\"session\")\n}\n\nmodel Account {\n  id                    String    @id() @default(cuid())\n  accountId             String\n  providerId            String\n  userId                String\n  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)\n  accessToken           String?   @db.Text()\n  refreshToken          String?   @db.Text()\n  idToken               String?   @db.Text()\n  accessTokenExpiresAt  DateTime?\n  refreshTokenExpiresAt DateTime?\n  scope                 String?\n  password              String?\n  createdAt             DateTime  @default(now())\n  updatedAt             DateTime  @updatedAt()\n\n  @@unique([providerId, accountId])\n  @@map(\"account\")\n}\n\nmodel Verification {\n  id         String   @id() @default(cuid())\n  identifier String\n  value      String   @unique()\n  expiresAt  DateTime\n  createdAt  DateTime @default(now())\n  updatedAt  DateTime @updatedAt()\n\n  @@map(\"verification\")\n}\n",
  "inlineSchemaHash": "8ae14d9a6e868dc268f5e47b52f2e8fe541c910768c7a4a876eabdb67b34118f",
  "copyEngine": true
}
config.dirname = '/'

config.runtimeDataModel = JSON.parse("{\"models\":{\"User\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"contactNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"passwordHash\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"emailVerified\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"image\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"enum\",\"type\":\"UserStatus\"},{\"name\":\"hourlyRate\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"organizationId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"roles\",\"kind\":\"object\",\"type\":\"UserRole\",\"relationName\":\"UserToUserRole\"},{\"name\":\"itemProcessingLogs\",\"kind\":\"object\",\"type\":\"ItemProcessingLog\",\"relationName\":\"ItemProcessingLogToUser\"},{\"name\":\"auditLogs\",\"kind\":\"object\",\"type\":\"AuditLog\",\"relationName\":\"AuditLogToUser\"},{\"name\":\"sessions\",\"kind\":\"object\",\"type\":\"Session\",\"relationName\":\"SessionToUser\"},{\"name\":\"accounts\",\"kind\":\"object\",\"type\":\"Account\",\"relationName\":\"AccountToUser\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":\"user\"},\"Role\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"UserRole\",\"relationName\":\"RoleToUserRole\"},{\"name\":\"permissions\",\"kind\":\"object\",\"type\":\"RolePermission\",\"relationName\":\"RoleToRolePermission\"},{\"name\":\"stations\",\"kind\":\"object\",\"type\":\"RoleStation\",\"relationName\":\"RoleToRoleStation\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Permission\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"action\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subject\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"roles\",\"kind\":\"object\",\"type\":\"RolePermission\",\"relationName\":\"PermissionToRolePermission\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"UserRole\":{\"fields\":[{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"roleId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"UserToUserRole\"},{\"name\":\"role\",\"kind\":\"object\",\"type\":\"Role\",\"relationName\":\"RoleToUserRole\"},{\"name\":\"assignedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"assignedBy\",\"kind\":\"scalar\",\"type\":\"String\"}],\"dbName\":null},\"RolePermission\":{\"fields\":[{\"name\":\"roleId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"permissionId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"role\",\"kind\":\"object\",\"type\":\"Role\",\"relationName\":\"RoleToRolePermission\"},{\"name\":\"permission\",\"kind\":\"object\",\"type\":\"Permission\",\"relationName\":\"PermissionToRolePermission\"},{\"name\":\"assignedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Customer\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"quickbooksCustomerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"contactNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"type\",\"kind\":\"enum\",\"type\":\"CustomerType\"},{\"name\":\"status\",\"kind\":\"enum\",\"type\":\"CustomerStatus\"},{\"name\":\"shippingAddressLine1\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"shippingAddressLine2\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"shippingCity\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"shippingState\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"shippingZipCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"shippingCountry\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"billingAddressLine1\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"billingAddressLine2\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"billingCity\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"billingState\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"billingZipCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"billingCountry\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orders\",\"kind\":\"object\",\"type\":\"Order\",\"relationName\":\"CustomerToOrder\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Item\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"quickbooksItemId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"imageUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"wholesalePrice\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"retailPrice\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"cost\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"enum\",\"type\":\"ItemStatus\"},{\"name\":\"orderItems\",\"kind\":\"object\",\"type\":\"OrderItem\",\"relationName\":\"ItemToOrderItem\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Station\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"barcode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"roles\",\"kind\":\"object\",\"type\":\"RoleStation\",\"relationName\":\"RoleStationToStation\"},{\"name\":\"itemProcessingLogs\",\"kind\":\"object\",\"type\":\"ItemProcessingLog\",\"relationName\":\"ItemProcessingLogToStation\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"RoleStation\":{\"fields\":[{\"name\":\"roleId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"stationId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"role\",\"kind\":\"object\",\"type\":\"Role\",\"relationName\":\"RoleToRoleStation\"},{\"name\":\"station\",\"kind\":\"object\",\"type\":\"Station\",\"relationName\":\"RoleStationToStation\"},{\"name\":\"assignedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Order\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"quickbooksOrderId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customer\",\"kind\":\"object\",\"type\":\"Customer\",\"relationName\":\"CustomerToOrder\"},{\"name\":\"salesOrderNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"purchaseOrderNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"contactEmail\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"contactPhoneNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"billingAddressLine1\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"billingAddressLine2\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"billingCity\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"billingState\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"billingZipCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"billingCountry\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"shippingAddressLine1\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"shippingAddressLine2\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"shippingCity\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"shippingState\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"shippingZipCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"shippingCountry\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orderStatus\",\"kind\":\"enum\",\"type\":\"OrderSystemStatus\"},{\"name\":\"barcode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"approvedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"readyToShipAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"shippedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orderItems\",\"kind\":\"object\",\"type\":\"OrderItem\",\"relationName\":\"OrderToOrderItem\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"OrderItem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orderId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"order\",\"kind\":\"object\",\"type\":\"Order\",\"relationName\":\"OrderToOrderItem\"},{\"name\":\"itemId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"item\",\"kind\":\"object\",\"type\":\"Item\",\"relationName\":\"ItemToOrderItem\"},{\"name\":\"quickbooksOrderLineId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"quantity\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"pricePerItem\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"itemStatus\",\"kind\":\"enum\",\"type\":\"OrderItemProcessingStatus\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"itemProcessingLogs\",\"kind\":\"object\",\"type\":\"ItemProcessingLog\",\"relationName\":\"ItemProcessingLogToOrderItem\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"ItemProcessingLog\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orderItemId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orderItem\",\"kind\":\"object\",\"type\":\"OrderItem\",\"relationName\":\"ItemProcessingLogToOrderItem\"},{\"name\":\"stationId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"station\",\"kind\":\"object\",\"type\":\"Station\",\"relationName\":\"ItemProcessingLogToStation\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"ItemProcessingLogToUser\"},{\"name\":\"startTime\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"endTime\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"durationInSeconds\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"AuditLog\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"AuditLogToUser\"},{\"name\":\"action\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"entityName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"entityId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"oldValue\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"newValue\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"ipAddress\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"timestamp\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Session\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"expiresAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"token\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"ipAddress\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userAgent\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"SessionToUser\"}],\"dbName\":\"session\"},\"Account\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"accountId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"providerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"AccountToUser\"},{\"name\":\"accessToken\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"refreshToken\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"idToken\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"accessTokenExpiresAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"refreshTokenExpiresAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"scope\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"password\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":\"account\"},\"Verification\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"identifier\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"value\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"expiresAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":\"verification\"}},\"enums\":{},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = {
  getRuntime: async () => require('./query_engine_bg.js'),
  getQueryEngineWasmModule: async () => {
    const loader = (await import('#wasm-engine-loader')).default
    const engine = (await loader).default
    return engine
  }
}
config.compilerWasm = undefined

config.injectableEdgeEnv = () => ({
  parsed: {
    DATABASE_URL: typeof globalThis !== 'undefined' && globalThis['DATABASE_URL'] || typeof process !== 'undefined' && process.env && process.env.DATABASE_URL || undefined
  }
})

if (typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined) {
  Debug.enable(typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined)
}

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

