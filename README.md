# Kids Job App

A family chore and allowance tracking application. Parents can assign weekly chores, post one-off jobs, and manage allowances. Kids can view their chores, claim jobs, and track their earnings.

## Features

**For Parents:**
- Create and manage kids' accounts
- Assign recurring weekly chores (with optional day-of-week scheduling)
- Post one-off jobs for extra earnings (first-come-first-served)
- Approve/reject completed chores and jobs
- Give weekly allowance
- Track balances and record payouts
- Adjust balances manually

**For Kids:**
- View weekly chores and mark them complete
- Browse and claim available jobs
- Track bank balance and transaction history
- See earnings from chores, jobs, and allowance

## Tech Stack

- [TanStack Start](https://tanstack.com/start) - Full-stack React framework
- [TanStack Router](https://tanstack.com/router) - Type-safe routing
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- [SQLite](https://www.sqlite.org/) - Database (via better-sqlite3)
- [Better Auth](https://better-auth.com/) - Authentication
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Shadcn UI](https://ui.shadcn.com/) - UI components

---

## Quick Start (Development)

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and set BETTER_AUTH_SECRET (generate with: npx @better-auth/cli secret)

# Push database schema
npm run db:push

# Start development server
npm run dev
```

Visit http://localhost:3000 to access the app.

---

## Deployment (Docker)

### Prerequisites

- Docker and Docker Compose installed
- A secret key for authentication

### 1. Clone and Configure

```bash
# Clone the repository
git clone <your-repo-url>
cd kids-job-app

# Copy environment template
cp .env.example .env

# Generate a secret key
npx @better-auth/cli secret
# Copy the output and paste it into .env as BETTER_AUTH_SECRET
```

### 2. Configure Environment

Edit `.env`:

```bash
# Port to expose (optional, defaults to 3000)
PORT=3000

# Your app's public URL
BETTER_AUTH_URL=http://your-server-ip:3000

# Secret key (required - paste from step 1)
BETTER_AUTH_SECRET=your-generated-secret-here
```

### 3. Build and Run

```bash
# Build and start the container
docker compose up -d

# View logs
docker compose logs -f

# Stop the container
docker compose down
```

The app will be available at `http://your-server-ip:3000`

### 4. First-Time Setup

1. Visit the app in your browser
2. Click "Sign Up" to create your parent account
3. Go to "Manage Kids" to add your children
4. Go to "Manage Chores" to create weekly chores
5. Kids can access their view at `/kids` (no login required - they just pick their name)

### Data Persistence

The SQLite database is stored in a Docker volume (`kidsjob_data`). Your data persists across container restarts and updates.

To backup your data:
```bash
# Find the volume location
docker volume inspect kidsjob_data

# Or copy the database out of the container
docker cp kidsjob:/app/data/kidsjob.db ./backup.db
```

### Updating

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker compose up -d --build
```

---

## Reverse Proxy (Optional)

If running behind nginx or Traefik, update `BETTER_AUTH_URL` to your domain:

```bash
BETTER_AUTH_URL=https://chores.yourdomain.com
```

Example nginx config:
```nginx
server {
    listen 443 ssl;
    server_name chores.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Development

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run lint         # Lint code
npm run format       # Format code
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio (database GUI)
```

### Project Structure

```
src/
├── components/      # UI components
│   └── ui/          # Shadcn UI components
├── db/
│   └── schema.ts    # Drizzle database schema
├── hooks/           # Custom React hooks
├── lib/             # Utilities and auth config
├── routes/          # TanStack Router pages
│   ├── parent/      # Parent portal routes
│   └── kids/        # Kid portal routes
└── server/          # Server functions (API)
```

---

## License

MIT
