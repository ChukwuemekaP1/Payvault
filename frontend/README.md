# PayVault Frontend

Modern React-based banking interface built with TypeScript and Tailwind CSS.

## Requirements

- Node.js 20+
- npm or yarn

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env:
# VITE_API_URL=http://localhost:8000

# Start development server
npm run dev
```

Frontend runs on http://localhost:5174

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8000` |

## Project Structure

```
src/
├── components/
│   ├── common/          # Reusable components
│   │   ├── ErrorBoundary.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── TransactionItem.tsx
│   │   └── WalletCard.tsx
│   ├── layout/          # Layout components
│   │   ├── AuthProvider.tsx
│   │   ├── NavBar.tsx
│   │   └── ProtectedRoute.tsx
│   └── ui/              # shadcn/ui components
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       └── ...
├── hooks/               # Custom React hooks
│   ├── useBalance.ts
│   └── useTransactions.ts
├── lib/                 # Utilities
│   ├── api.ts          # API client
│   ├── queryClient.ts  # React Query setup
│   └── utils.ts        # Helper functions
├── pages/              # Page components
│   ├── auth/           # Auth pages
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   └── ...
│   ├── admin/          # Admin pages
│   │   ├── AdminLogin.tsx
│   │   └── AdminDashboard.tsx
│   ├── Dashboard.tsx
│   ├── Transfer.tsx
│   └── ...
├── store/              # Zustand stores
│   └── authStore.ts
├── types/              # TypeScript types
│   └── index.ts
├── App.tsx             # Root component
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## Available Scripts

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Format code
npm run format
```

## Key Features

### Authentication Flow
- JWT token management
- Automatic token refresh
- Protected routes
- Role-based access (admin/user)

### State Management
- **Zustand**: Auth state
- **React Query**: Server state (balance, transactions)
- Local state: Component-specific data

### API Integration
- Axios instance with interceptors
- Automatic retry on 401 (token refresh)
- Error handling utilities
- Type-safe API calls

### UI Components
- Built with shadcn/ui
- Fully customizable
- Accessible (ARIA labels)
- Mobile-responsive

## Styling

Built with Tailwind CSS + custom design system:

### Colors
- Primary: `#FF5C2B` (Orange)
- Background: `#0d0d0f` (Dark)
- Surface: `#1a1a1f` (Card bg)
- Success: `#00C97A` (Green)
- Error: `#FF3B3B` (Red)

### Typography
- Headings: Instrument Serif
- Body: Syne
- Code/Mono: JetBrains Mono

## Building for Production

```bash
# Create optimized build
npm run build

# Output in dist/
# Deploy to any static hosting (Vercel, Netlify, etc.)
```

### Environment-specific Builds

```bash
# Production
VITE_API_URL=https://api.payvault.com npm run build

# Staging
VITE_API_URL=https://staging-api.payvault.com npm run build
```

## Testing

```bash
# Run tests (when implemented)
npm test

# Run with coverage
npm run test:coverage
```

## Code Quality

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix

# Format code
npm run format
```

## Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts to connect GitHub repo
```

### Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

### Manual Deployment
```bash
# Build
npm run build

# Upload dist/ folder to hosting
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit PR

## License

MIT License
