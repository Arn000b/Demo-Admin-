# Infrastructure

This folder contains adapters and integrations with external services.

## Structure

```
infra/
├── cache/        # Redis / in-memory cache adapters
├── storage/      # File storage (S3, R2, local)
├── mail/         # Email service adapters (Resend, Nodemailer)
└── queue/        # Background job queues (BullMQ, etc.)
```

Add concrete implementations here as the app grows. Keep business logic in `features/`.
