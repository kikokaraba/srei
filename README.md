# SRIA - Slovenská Realitná Investičná Aplikácia

Najmodernejšia a najkomplexnejšia realitná investičná aplikácia pre slovenský trh. Enterprise-grade riešenie s AI-powered insights, real-time analýzami a pokročilými investičnými nástrojmi.

## Tech Stack

- **Frontend**: Next.js 15+ (App Router), TypeScript (Strict Mode), Tailwind CSS
- **State Management**: TanStack Query v5 (Server State), Zustand (Client State)
- **Validation**: Zod
- **Backend/ORM**: Prisma ORM with PostgreSQL (PostGIS for geospatial queries)
- **Authentication**: NextAuth v5 (Auth.js) with Passkeys/MFA support
- **Security**: Content Security Policy (CSP), Rate Limiting (Upstash Redis)
- **Performance**: Partial Prerendering (PPR), Edge Runtime

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (with PostGIS extension)
- Upstash Redis account (for rate limiting)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Secret for NextAuth (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Your application URL (e.g., `http://localhost:3000`)
- `UPSTASH_REDIS_REST_URL` - Upstash Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis REST Token

3. Set up the database:
```bash
# Enable PostGIS extension in PostgreSQL
# Run: CREATE EXTENSION IF NOT EXISTS postgis;

# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   └── layout.tsx         # Root layout
├── components/            # React components
│   └── dashboard/         # Dashboard components
├── lib/                   # Utility libraries
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Prisma client
│   ├── rate-limit.ts     # Rate limiting
│   └── validations.ts    # Zod schemas
├── prisma/               # Prisma schema
│   └── schema.prisma     # Database schema
└── middleware.ts         # Next.js middleware
```

## Features

### MVP Features

- ✅ Investor Dashboard with dark FinTech theme
- ✅ Market Analytics API with mock data
- ✅ Security middleware with Zero Trust principles
- ✅ Rate limiting for API protection
- ✅ Responsive sidebar navigation

### Upcoming Features

- Interactive Slovakia Heatmap
- Advanced property filtering
- Property comparison engine
- 10-year ROI projections
- Real-time market data integration

## Database Schema

The schema includes:
- **User & Role**: Admin, Premium Investor, Free User
- **Property**: Comprehensive Slovak market property data
- **MarketAnalytics**: City-level market metrics
- **InvestmentMetrics**: Calculated investment returns

## Security

- Zero Trust middleware with session validation
- Content Security Policy (CSP) headers
- Rate limiting via Upstash Redis
- Input validation with Zod schemas
- Secure authentication with NextAuth v5

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database management
npm run db:generate  # Generate Prisma Client
npm run db:push      # Push schema changes
npm run db:migrate   # Create migration
npm run db:studio    # Open Prisma Studio
```

## License

Private - All rights reserved
