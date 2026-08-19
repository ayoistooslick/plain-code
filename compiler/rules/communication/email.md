# Email

## Capability

Sending emails using `nodemailer` for transactional email, notifications, and
automated messaging.

## Purpose

Let users send emails in readable Plain for notifications, verification,
alerts, and automated messaging — without a JavaScript Gateway block.

## Supported Plain syntax

### 1. Configure SMTP transport

```plain
remember transport as email transport with
  host is "smtp.example.com"
  port is 587
  secure is false
  auth user is env("SMTP_USER")
  auth pass is env("SMTP_PASS")
done
```

### 2. Send a plain text email

```plain
send email via transport
  to is "user@example.com"
  subject is "Hello from Plain"
  text is "This is a plain text email."
done
```

### 3. Send an HTML email

```plain
send email via transport
  to is "user@example.com"
  subject is "Welcome"
  html is "<h1>Welcome!</h1><p>Your account is ready.</p>"
done
```

### 4. Send to multiple recipients

```plain
send email via transport
  to is "alice@example.com, bob@example.com"
  subject is "Team Update"
  text is "Meeting at 3 PM."
done
```

### 5. Send with attachments

```plain
send email via transport
  to is "user@example.com"
  subject is "Report"
  text is "See attached."
  attachments
    filename is "report.pdf"
    path is "/tmp/report.pdf"
  done
done
```

### 6. Verify transport configuration

```plain
remember transport as email transport with
  host is "smtp.example.com"
  port is 587
  secure is false
  auth user is env("SMTP_USER")
  auth pass is env("SMTP_PASS")
done

remember ok as await verify transport
if ok is true
  show "SMTP transport is ready"
otherwise
  show "SMTP transport configuration is invalid"
done
```

## Semantic meaning

- `remember transport as email transport with ... done` creates a nodemailer
  transport with the specified configuration.
- `send email via transport ... done` sends an email using the configured
  transport.
- `to`, `subject`, `text`, `html` are standard email fields.
- `attachments` is an array of attachment objects with `filename` and `path`.
- `await verify transport` checks whether the SMTP connection can be established.

## JavaScript target

Transport creation:

```js
const nodemailer = require("nodemailer");

const transport = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
```

Sending email:

```js
await transport.sendMail({
  to: "user@example.com",
  subject: "Hello from Plain",
  text: "This is a plain text email.",
});
```

With attachments:

```js
await transport.sendMail({
  to: "user@example.com",
  subject: "Report",
  text: "See attached.",
  attachments: [
    { filename: "report.pdf", path: "/tmp/report.pdf" },
  ],
});
```

Verification:

```js
const ok = await transport.verify();
console.log(ok);
```

## Dependency

- `nodemailer`

## Imports / runtime requirements

- No project imports required by the rule itself.
- `nodemailer` must be installed by the normal dependency system.

## Async behavior

Async. `sendMail` and `verify` return Promises and must be awaited.

## Examples

```plain
remember transport as email transport with
  host is "smtp.gmail.com"
  port is 587
  secure is false
  auth user is env("EMAIL_USER")
  auth pass is env("EMAIL_PASS")
done

send email via transport
  to is "recipient@example.com"
  subject is "Test"
  text is "Hello from Plain!"
done
```

## Invalid forms

- `send email` without `via transport`.
- Missing `to`, `subject`, or `text`/`html` fields.
- `email transport with` without any configuration fields.

## Security considerations

- Never embed SMTP credentials in generated code; use `env()` for secrets.
- Do not send credentials, API keys, or tokens to the provider.
- Treat recipient addresses as configuration, not hardcoded values.

## Expected compiler output

```json
{
  "javascript": "<generated email code>",
  "dependencies": ["nodemailer"],
  "imports": [],
  "async": true
}
```

## Tests

- `tests/ai.test.js` — resolver selects the `email` rule for email sources;
  mocked translation passes validation.
