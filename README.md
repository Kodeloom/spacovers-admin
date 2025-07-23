# Spacovers Warehouse Administrator

A comprehensive warehouse management system built with Nuxt.js, featuring order processing, item tracking, barcode scanning, and automated customer notifications.

## Features

- 👥 **User & Role Management**: Complete RBAC system with customizable permissions
- 📦 **Order Processing**: Full order lifecycle from creation to shipping
- 🏭 **Warehouse Tracking**: Barcode-driven workflow through production stations
- 📊 **Analytics & Reporting**: Employee productivity and order lead time insights
- 📧 **Email Notifications**: Automated customer updates via AWS SES
- 📋 **Audit Logging**: Complete activity tracking and compliance
- 🔗 **QuickBooks Integration**: Optional sync with QuickBooks Online (future enhancement)

## Tech Stack

- **Frontend/Backend**: Nuxt.js 3+ (Vue.js, TypeScript)
- **UI Framework**: Tailwind CSS, Headless UI
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Better-Auth
- **Access Control**: ZenStack (Prisma enhancement)
- **Email Service**: AWS SES with Nodemailer
- **Data Fetching**: TanStack Query (Vue Query)

## Setup

### 1. Install Dependencies

```bash
# npm (recommended)
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

### 2. Environment Configuration

Create a `.env` file in the root directory with the following variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/spacovers_admin"

# Authentication
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="http://localhost:3000"

# AWS SES for Email Notifications
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
EMAIL_FROM="noreply@yourdomain.com"

# Development
NODE_ENV="development"
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed database with initial data
npx prisma db seed
```

### 4. AWS SES Configuration

For email notifications to work, you'll need to configure AWS SES. See [`docs/AWS_SES_SETUP.md`](docs/AWS_SES_SETUP.md) for detailed setup instructions.

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Warehouse Workflow

### Order Processing Flow

1. **Order Creation**: Create orders manually via `/admin/orders/add` or sync from QuickBooks
2. **Order Approval**: Admin reviews and approves pending orders (generates barcode)
3. **Production**: Warehouse staff scan orders and process items through stations:
   - Cutting Station
   - Sewing Station  
   - Foam Cutting Station
4. **Completion**: Items marked as "Ready" when complete
5. **Shipping**: Order marked "Ready to Ship" when all items complete
6. **Notifications**: Customers receive automatic email updates

### Warehouse Scanning Interface

Access the scanning interface at `/warehouse/scan`:

1. **Scan Order Barcode**: Retrieve order details and items
2. **Select Item**: Choose which item to work on
3. **Scan Station Barcode**: Validate station and start work
4. **Process Item**: Item status automatically updates
5. **Move to Next Station**: Repeat process for next production stage

### Admin Features

- **User Management**: Create users, assign roles and permissions
- **Station Management**: Configure production stations and role assignments
- **Order Management**: View, create, edit, and track orders
- **Reports**: Employee productivity and order lead time analytics
- **Audit Logs**: Complete activity history and compliance tracking

### Email Notifications

Customers automatically receive emails when:
- Order status changes (Approved, In Production, Ready to Ship)
- Individual items complete production stages
- Orders are ready for pickup/shipping

## Project Structure

```
spacovers-admin/
├── components/          # Reusable Vue components
├── pages/              # Nuxt.js pages and routes
│   ├── admin/         # Admin dashboard pages
│   └── warehouse/     # Warehouse scanning interface
├── server/            # Backend API and utilities
│   ├── api/          # API endpoints
│   ├── lib/          # Server utilities
│   └── utils/        # Email service and helpers
├── lib/hooks/         # ZenStack generated hooks
├── prisma/           # Database schema and migrations
└── docs/             # Documentation
