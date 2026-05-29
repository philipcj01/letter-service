# ☁️ CloudLetters

> **Open-source letter generation platform** — create, preview, send and archive PDF letters with type-safe dynamic templates. Deploy to AWS in minutes.

---

## ⚡ Quick Start

```bash
pnpm install          # Install dependencies
pnpm dev              # Start frontend → http://localhost:3000
pnpm cdk deploy       # Deploy backend to AWS
```

---

## 🏗️ Architecture

```
┌──────────────┐     ┌─────────────────────┐     ┌──────────────┐
│  Frontend    │────▶│  AWS API Gateway     │────▶│  Lambdas     │
│  (Next.js)   │     │  + Cognito Auth      │     │  (Node.js)   │
└──────────────┘     └─────────────────────┘     └──────────────┘
                                                        │
                                                        ▼
                                                  ┌──────────────┐
                                                  │  DynamoDB    │
                                                  │  S3 + Archive│
                                                  └──────────────┘
```

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 16, Tailwind CSS, shadcn/ui components |
| **Backend** | AWS CDK, Lambda (Node 20), API Gateway |
| **Auth** | Cognito User Pool (email/password, PKCE OAuth2) |
| **PDF Engine** | `@react-pdf/renderer` with type-safe templates |
| **Storage** | DynamoDB (metadata), S3 (PDFs) |
| **Archive** | Pluggable — mock included, swap for any DMS |

---

## 📦 Packages

| Package | Description |
|---------|-------------|
| `packages/frontend` | Next.js UI — template editor, preview, letter management |
| `packages/backend` | CDK stack + Lambda handlers + PDF renderer + templates |
| `packages/shared` | Shared types and Zod schemas |

---

## 🔐 Auth

CloudLetters uses **AWS Cognito** with email/password authentication (OAuth2 PKCE flow).

```bash
# Required env vars (see packages/frontend/.env.example)
NEXT_PUBLIC_COGNITO_DOMAIN=your-domain.auth.eu-west-1.amazoncognito.com
NEXT_PUBLIC_COGNITO_CLIENT_ID=abc123
NEXT_PUBLIC_COGNITO_REDIRECT_URI=http://localhost:3000/auth/callback
```

### Bearer Token (API calls)

```bash
curl -H "Authorization: Bearer <access_token>" \
  https://your-api.execute-api.eu-west-1.amazonaws.com/templates
```

---

## 📝 Template System

Templates support two modes (mutually exclusive):

### 1. Sections (block-based)

Type-safe text with `(ctx) => string` functions — full IDE autocomplete:

```typescript
sections: [
  {
    id: 'greeting',
    type: 'paragraph',
    blocks: [
      { type: 'heading', level: 'h1', text: (ctx) => `Welcome, ${ctx.customerName}!` },
      { type: 'paragraph', text: (ctx) => `Your balance is ${ctx.formatCurrency(ctx.amount)}.` },
      { type: 'paragraph', text: 'Thank you for choosing us.' }, // static string also works
    ],
  },
]
```

### 2. TSX Render (full control)

For complex layouts, use a React component with `@react-pdf/renderer`:

```typescript
render: (input) => <MyCustomLayout data={input} />
```

---

## 🗄️ Archive

The archive system is **pluggable**. A mock implementation is included at:

```
packages/backend/src/clients/archive-client.ts
```

Replace the `ArchiveClient` class with your own integration (S3 Glacier, SharePoint, on-prem DMS, etc.)

---

## 🌐 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/templates` | List all templates |
| GET | `/templates/{id}` | Get template details + schema |
| POST | `/letters/{templateId}` | Create & send letter |
| POST | `/letters/preview` | Preview PDF (returns presigned URL) |
| POST | `/letters/{id}/archive` | Archive letter |
| GET | `/letters/{id}` | Get letter status |

---

## 🛠️ Development

```bash
pnpm install                    # Install all workspace packages
pnpm dev                        # Start Next.js dev server
pnpm build                      # Build all packages
pnpm --filter backend test      # Run backend tests
pnpm cdk synth                  # Synthesize CDK stack
pnpm cdk deploy                 # Deploy to AWS
```

---

## 📁 Project Structure

```
cloudletters/
├── packages/
│   ├── frontend/          # Next.js UI
│   │   ├── src/app/       # Pages (dashboard, templates, letters)
│   │   └── src/lib/       # Auth context, API client
│   ├── backend/
│   │   ├── src/templates/ # Letter template definitions
│   │   ├── src/pdf/       # PDF renderer + components
│   │   ├── src/lambda/    # Lambda handlers
│   │   ├── src/clients/   # Archive client (pluggable)
│   │   └── src/lib/       # CDK stack, utilities
│   └── shared/            # Zod schemas, shared types
├── package.json           # Workspace root
└── pnpm-workspace.yaml
```

---

## License

MIT

