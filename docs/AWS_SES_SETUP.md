# AWS SES Email Configuration

This application uses AWS Simple Email Service (SES) for sending automated email notifications to customers.

## Required Environment Variables

Add the following environment variables to your `.env` file:

```bash
# AWS SES Configuration
AWS_REGION="us-east-1"                    # Your AWS region (e.g., us-east-1, us-west-2, eu-west-1)
AWS_ACCESS_KEY_ID="your-access-key-id"    # AWS IAM user access key with SES permissions
AWS_SECRET_ACCESS_KEY="your-secret-key"   # AWS IAM user secret access key

# Email Settings
EMAIL_FROM="noreply@yourdomain.com"       # Verified sender email address in SES
```

## AWS SES Setup Steps

### 1. Create an AWS Account
- Sign up for AWS if you don't have an account
- Navigate to the AWS SES console

### 2. Verify Your Domain/Email
- In SES console, go to "Verified identities"
- Add and verify your sending domain or email address
- Follow the verification process (DNS records for domain, or email confirmation)

### 3. Create IAM User for SES
- Go to AWS IAM console
- Create a new user with programmatic access
- Attach the following policy (or use `AmazonSESFullAccess` for simpler setup):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ses:SendEmail",
                "ses:SendRawEmail"
            ],
            "Resource": "*"
        }
    ]
}
```

### 4. Get AWS Credentials
- Copy the Access Key ID and Secret Access Key
- Add them to your environment variables

### 5. Request Production Access (if needed)
- New AWS accounts start in SES "Sandbox" mode
- In Sandbox, you can only send to verified email addresses
- Request production access to send to any email address
- This usually takes 24-48 hours for approval

## Email Notifications

The application automatically sends emails for:

- **Order Status Updates**: When orders change status (APPROVED, ORDER_PROCESSING, READY_TO_SHIP, etc.)
- **Item Ready Notifications**: When individual items complete production

## Development Mode

In development (`NODE_ENV=development`), emails are logged to console instead of being sent, unless AWS credentials are provided.

## Testing

To test email functionality:

1. Set up AWS SES in sandbox mode
2. Verify your test email address in SES
3. Configure environment variables
4. Create a test order and process it through the warehouse workflow

## Troubleshooting

### Common Issues:

1. **"Email address not verified"**
   - Verify your sender email/domain in SES console
   - If in sandbox mode, verify recipient emails too

2. **"Access Denied"**
   - Check IAM user permissions
   - Ensure SES permissions are attached

3. **"Invalid credentials"**
   - Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
   - Ensure credentials are for the correct AWS account

4. **Region mismatch**
   - Ensure AWS_REGION matches where you set up SES
   - Verify your domain/email in the same region

## Cost Considerations

AWS SES pricing (as of 2024):
- First 62,000 emails per month: $0 (if sent from EC2)
- Additional emails: $0.10 per 1,000 emails
- Very cost-effective for most warehouse operations

## Security Best Practices

1. Use IAM user with minimal required permissions (only SES actions)
2. Rotate access keys regularly
3. Never commit credentials to version control
4. Use AWS IAM roles if running on EC2/ECS/Lambda
5. Monitor SES usage and set up billing alerts 