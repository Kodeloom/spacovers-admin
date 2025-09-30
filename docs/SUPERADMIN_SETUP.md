# Superadmin Setup Guide

This guide provides multiple safe and easy ways to create the first superadmin user, especially after database migrations, resets, or in emergency situations.

## 🚀 Quick Start (Recommended)

### Method 1: Interactive Setup
```bash
npm run create-superadmin -- --interactive
```

This will prompt you for:
- Admin email address
- Admin name
- Whether to reset password if user exists

### Method 2: Command Line
```bash
npm run create-superadmin -- --email admin@company.com --name "Admin User"
```

### Method 3: Environment Variable
```bash
SEED_ADMIN_EMAIL=admin@company.com npm run create-superadmin
```

## 🆘 Emergency Recovery

If your database is completely empty or corrupted:

```bash
npm run emergency-recovery -- --confirm
```

This will recreate:
- ✅ Essential production stations
- ✅ Core Spacover items  
- ✅ Role types and permissions
- ✅ Superadmin user account

## 🔧 Available Commands

### Create Superadmin User
```bash
# Interactive mode
npm run create-superadmin -- --interactive

# With specific email and name
npm run create-superadmin -- --email admin@company.com --name "Admin User"

# Reset existing user's password setup
npm run create-superadmin -- --reset-password admin@company.com

# Reset existing user during creation
npm run create-superadmin -- --email admin@company.com --reset
```

### Emergency Recovery
```bash
# Check what would be done (dry run)
npm run emergency-recovery

# Actually perform recovery
npm run emergency-recovery -- --confirm
```

### Database Seeding (Traditional)
```bash
# Run full database seed
npm run db:seed

# With custom admin email
SEED_ADMIN_EMAIL=admin@company.com npm run db:seed
```

## 🌐 Web-Based Setup

After creating a superadmin user, you can set their password via the web interface:

1. Navigate to `/admin-setup` in your browser
2. Enter the admin email address
3. Set a secure password
4. Complete the setup

The setup page includes:
- ✅ Password strength indicator
- ✅ Password confirmation
- ✅ Form validation
- ✅ Error handling

## 🔐 Password Setup Process

All methods create users with a placeholder password that must be set through one of these ways:

### Option 1: Web Interface (Recommended)
1. Go to `/admin-setup`
2. Enter email and new password
3. Complete setup

### Option 2: API Endpoint
```bash
curl -X POST http://localhost:3000/api/admin-setup/set-password \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"your-secure-password"}'
```

### Option 3: Reset Password Setup
```bash
npm run create-superadmin -- --reset-password admin@company.com
```

## 📋 What Gets Created

### User Account
- ✅ User record with specified email and name
- ✅ Credential account for login
- ✅ Super Admin role assignment
- ✅ All system permissions

### Roles and Permissions
- ✅ Super Admin role (full access)
- ✅ Admin role (broad access)
- ✅ Manager role (oversight access)
- ✅ Customer Service role (customer-facing)
- ✅ Warehouse Staff role (production)

### Role Types
- ✅ Administrator
- ✅ Manager  
- ✅ Customer Service
- ✅ Warehouse Staff
- ✅ Office Employee

### Essential Data (Emergency Recovery Only)
- ✅ Production stations (Cutting, Sewing, Foam Cutting, Packaging)
- ✅ Core Spacover items (Retail/Wholesale, CA/Out-of-State)
- ✅ Complete permission system

## 🛡️ Security Features

### Password Requirements
- ✅ Minimum 8 characters
- ✅ Strength validation
- ✅ Secure hashing via Better-Auth
- ✅ Placeholder system prevents unauthorized access

### Access Control
- ✅ Super Admin gets all permissions
- ✅ Role-based permission system
- ✅ Station-based access for warehouse staff
- ✅ Audit logging for all changes

## 🔍 Troubleshooting

### "User already exists" Error
```bash
# Reset the user's password setup
npm run create-superadmin -- --reset-password admin@company.com

# Or force reset during creation
npm run create-superadmin -- --email admin@company.com --reset
```

### "Database connection failed" Error
1. Check your `DATABASE_URL` environment variable
2. Ensure PostgreSQL is running
3. Verify database exists and is accessible

### "Permission denied" Error
1. Ensure you have database write permissions
2. Check if migrations have been run: `npx prisma migrate deploy`
3. Try emergency recovery: `npm run emergency-recovery -- --confirm`

### Empty Database After Migration
```bash
# Full recovery with all essential data
npm run emergency-recovery -- --confirm

# Or just create superadmin
npm run create-superadmin -- --interactive
```

## 📚 Advanced Usage

### Custom Environment Variables
```bash
# Set default admin email
export SEED_ADMIN_EMAIL=admin@company.com

# Then run any command
npm run create-superadmin
```

### Scripted Setup
```bash
#!/bin/bash
# setup-admin.sh

echo "Setting up superadmin user..."
npm run create-superadmin -- --email "$1" --name "$2"

echo "Admin user created. Set password at: http://localhost:3000/admin-setup?email=$1"
```

### Docker/Production Setup
```dockerfile
# In your Dockerfile or docker-compose
RUN npm run create-superadmin -- --email admin@company.com --name "Production Admin"
```

## 🔄 Migration Recovery Workflow

When you lose all data due to migrations:

1. **Immediate Recovery**
   ```bash
   npm run emergency-recovery -- --confirm
   ```

2. **Set Admin Password**
   - Go to `/admin-setup`
   - Enter admin email and password

3. **Verify Setup**
   - Login with admin credentials
   - Check that all roles and permissions exist
   - Verify production stations are available

4. **Optional: Re-run Full Seed**
   ```bash
   npm run db:seed
   ```

## 💡 Best Practices

### For Development
- Use `npm run create-superadmin -- --interactive` for flexibility
- Set `SEED_ADMIN_EMAIL` in your `.env` file
- Use the web interface for password setup

### For Production
- Use environment variables for email configuration
- Always use strong passwords (12+ characters)
- Consider using `emergency-recovery` for clean deployments
- Document your admin credentials securely

### For CI/CD
```yaml
# Example GitHub Actions step
- name: Setup Admin User
  run: |
    npm run create-superadmin -- --email ${{ secrets.ADMIN_EMAIL }} --name "Production Admin"
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## 🆘 Emergency Contacts

If you're completely locked out:

1. **Database Access**: Use emergency recovery script
2. **Password Reset**: Use the reset-password command
3. **Complete Loss**: Use emergency recovery with --confirm
4. **Still Stuck**: Check the application logs and database connectivity

Remember: These tools are designed to be safe and can be run multiple times without causing issues!