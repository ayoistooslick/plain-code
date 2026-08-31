# Email Notification Service — PlainScript Template

A complete, publish-ready email notification service written 100% in PlainScript. Features SMTP transport, HTML/text templates, queue system with retry logic, attachment support, and a CLI for test emails.

## Layout

```
templates/email-service/
├── package.json          # npm package; main → dist/email.js
└── src/
    ├── index.pln         # public entry point: re-exports all APIs
    ├── email.pln         # core email sending functions
    ├── templates.pln     # HTML/text template renderers
    ├── queue.pln         # queue system with retry logic
    ├── attachments.pln   # attachment handling
    └── cli.pln           # CLI for sending test emails
```

## Quick Start

```bash
# Install the PlainScript compiler
npm install --save-dev plainscript-lang

# Build src/ → dist/
plainscript build

# Run the service (starts queue processor)
node dist/email.js

# Or run directly with plainscript (dev mode)
plainscript run src/email.pln
```

## Configuration

Create a `.env` file or set these environment variables:

```bash
# Required SMTP settings
SMTP_HOST=smtp.gmail.com        # SMTP server hostname
SMTP_PORT=587                   # SMTP server port
SMTP_USER=your-email@gmail.com  # SMTP username
SMTP_PASS=your-app-password     # SMTP password (app-specific password for Gmail)
EMAIL_FROM=noreply@example.com  # From address for outgoing emails
```

### Gmail Setup

For Gmail, you need an **App Password** (not your regular password):

1. Enable 2-Factor Authentication on your Google Account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate a new app password for "Mail"
4. Use that 16-character password as `SMTP_PASS`

### Other Providers

| Provider | Host | Port |
|----------|------|------|
| Gmail | smtp.gmail.com | 587 |
| Outlook/Hotmail | smtp-mail.outlook.com | 587 |
| Yahoo | smtp.mail.yahoo.com | 587 |
| SendGrid | smtp.sendgrid.net | 587 |
| Mailgun | smtp.mailgun.org | 587 |
| Amazon SES | email-smtp.region.amazonaws.com | 587 |

## Usage Examples

### Send Welcome Email

```javascript
const { sendWelcomeEmail } = require('@plainscript/email-service');

await sendWelcomeEmail('user@example.com', 'John Doe');
```

### Send Password Reset Email

```javascript
const { sendPasswordResetEmail } = require('@plainscript/email-service');

await sendPasswordResetEmail(
    'user@example.com',
    'John Doe',
    'reset-token-abc123',
    'https://yourapp.com/reset?token=reset-token-abc123'
);
```

### Send Newsletter

```javascript
const { sendNewsletterEmail } = require('@plainscript/email-service');

await sendNewsletterEmail(
    'subscriber@example.com',
    'John Doe',
    'Monthly Newsletter - August 2026',
    '<h1>Latest Updates</h1><p>Check out our new features...</p>',
    'Latest Updates\n\nCheck out our new features...'
);
```

### Send Custom Email

```javascript
const { sendCustomEmail } = require('@plainscript/email-service');

await sendCustomEmail(
    'user@example.com',
    'Custom Subject',
    '<p>Custom HTML content</p>',
    'Custom text content'
);
```

### Send Email with Attachment

```javascript
const { sendEmailWithAttachment, createAttachment } = require('@plainscript/email-service');

const attachment = createAttachment('./report.pdf', 'Monthly-Report.pdf');

await sendEmailWithAttachment(
    'user@example.com',
    'Your Monthly Report',
    '<p>Please find the attached report.</p>',
    'Please find the attached report.',
    './report.pdf',
    'Monthly-Report.pdf'
);
```

### Queue Emails for Background Processing

```javascript
const { queueEmail, startQueueProcessor, getQueueStats } = require('@plainscript/email-service');

// Start the queue processor (runs every 5 minutes via cron)
startQueueProcessor();

// Queue an email for later delivery
const jobId = queueEmail({
    to: 'user@example.com',
    subject: 'Queued Email',
    html: '<p>This was queued!</p>',
    text: 'This was queued!'
});

// Check queue stats
const stats = getQueueStats();
console.log(stats); // { pending: 1, processing: 0, completed: 0, failed: 0, total: 1 }
```

### Use Templates Directly

```javascript
const { renderWelcomeHtml, renderWelcomeText } = require('@plainscript/email-service');

const html = renderWelcomeHtml('John Doe');
const text = renderWelcomeText('John Doe');
// Use with your own mailer...
```

## CLI for Test Emails

```bash
# Send a test email
plainscript run src/cli.pln --send --to=you@example.com

# Send welcome email template
plainscript run src/cli.pln --send --to=you@example.com --type=welcome

# Send password reset template
plainscript run src/cli.pln --send --to=you@example.com --type=reset

# Send newsletter template
plainscript run src/cli.pln --send --to=you@example.com --type=newsletter --subject="Custom Subject"

# Show help
plainscript run src/cli.pln
```

## API Reference

### Core Functions

| Function | Description |
|----------|-------------|
| `sendWelcomeEmail(toEmail, userName)` | Sends welcome email with HTML & text |
| `sendPasswordResetEmail(toEmail, userName, resetToken, resetUrl)` | Sends password reset email |
| `sendNewsletterEmail(toEmail, userName, subject, htmlContent, textContent)` | Sends newsletter |
| `sendCustomEmail(toEmail, subject, htmlContent, textContent)` | Sends custom email |
| `sendEmailWithAttachment(toEmail, subject, htmlContent, textContent, attachmentPath, attachmentName)` | Sends email with file attachment |
| `sendTestEmail(toEmail)` | Sends test email |

### Queue Functions

| Function | Description |
|----------|-------------|
| `queueEmail(jobData)` | Adds email to queue, returns job ID |
| `processEmailQueue()` | Processes pending queue items |
| `startQueueProcessor()` | Starts cron job (every 5 min) |
| `getQueueStats()` | Returns queue statistics |
| `clearCompletedJobs()` | Removes completed jobs from queue |
| `retryFailedJobs()` | Resets failed jobs for retry |

### Template Functions

| Function | Description |
|----------|-------------|
| `renderWelcomeHtml(userName)` | Returns welcome HTML |
| `renderWelcomeText(userName)` | Returns welcome text |
| `renderPasswordResetHtml(userName, resetToken, resetUrl)` | Returns reset HTML |
| `renderPasswordResetText(userName, resetToken, resetUrl)` | Returns reset text |
| `renderNewsletterHtml(userName, subject, htmlContent)` | Returns newsletter HTML |
| `renderNewsletterText(userName, subject, textContent)` | Returns newsletter text |
| `renderTestHtml()` | Returns test HTML |
| `renderTestText()` | Returns test text |

### Attachment Functions

| Function | Description |
|----------|-------------|
| `createAttachment(filePath, fileName)` | Creates attachment from file path |
| `createAttachmentFromBase64(base64, fileName, contentType)` | Creates attachment from base64 |
| `createAttachmentFromBuffer(buffer, fileName, contentType)` | Creates attachment from buffer |
| `guessContentType(fileName)` | Guesses MIME type from extension |
| `validateAttachment(attachment)` | Validates attachment object |

## Retry Logic

The queue system implements **exponential backoff**:

- Attempt 1: immediate
- Attempt 2: 60 seconds (1² × 60)
- Attempt 3: 240 seconds (2² × 60)
- Max 3 attempts by default

Failed jobs are marked as `failed` and can be retried with `retryFailedJobs()`.

## Publishing to npm

```bash
# Build the package
npm run build

# Test locally
npm pack

# Publish
npm publish --access public
```

## License

MIT