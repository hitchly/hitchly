# Hitchly

Developer Names: Burhanuddin Kharodawala, Sarim Zia, Hamzah Rawasia, Aidan Froggatt, Swesan Pathmanathan

Date of project start: September 6th, 2024

A campus-focused ridesharing application for the McMaster community, built with React Native (Expo) and tRPC.

## Project Structure

The folders and files for this project are as follows:

- `docs` - Documentation for the project
- `refs` - Reference material used for the project, including papers
- `apps/api` - Backend API server (tRPC + Express)
- `apps/mobile` - Mobile application (React Native + Expo)
- `test` - Test cases

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14.0.0 or higher)
- **npm** (v7.0.0 or higher) or **pnpm** (v10.17.1)
- **PostgreSQL** (v15 or higher)
- **Expo CLI** (optional, can use npx)
- **Git**

For mobile development:

- **Expo Go** app on your iOS/Android device (for testing)
- Or **iOS Simulator** (macOS only) / **Android Emulator**

## Environment Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hitchly
```

### 2. Install Dependencies

Install root dependencies:

```bash
npm install
# or
pnpm install
```

Install workspace dependencies:

```bash
cd apps/api && npm install
cd ../mobile && npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=hitchly_db

# API configuration
API_PORT=3000

# Email configuration (for OTP verification)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email@example.com
EMAIL_PASSWORD=your_email_password

# Client origin (for CORS)
CLIENT_ORIGIN=http://localhost:3000
```

### 4. Set Up Database

#### Option A: Using Docker Compose (Recommended)

```bash
# Create Docker network if it doesn't exist
docker network create app_network

# Start PostgreSQL database
docker-compose up -d db
```

#### Option B: Local PostgreSQL

1. Install PostgreSQL locally
2. Create a database:
   ```sql
   CREATE DATABASE hitchly_db;
   ```

### 5. Run Database Migrations

```bash
cd apps/api

# Generate migration files
npm run drizzle:generate

# Apply migrations to database
npm run drizzle:migrate
```

## Running the Application

### Backend API Server

Start the API server:

```bash
cd apps/api
npm run dev
```

The API will be available at `http://localhost:3000` (or your configured `API_PORT`).

**API Endpoints:**

- Health check: `http://localhost:3000/`
- tRPC: `http://localhost:3000/trpc`
- Auth: `http://localhost:3000/api/auth/*`

### Mobile App (Expo)

#### Update API URL

Before running the mobile app, update the API URL in `apps/mobile/lib/trpc.ts`:

```typescript
const getBaseUrl = () => {
  // Replace with your local IP address or use localhost for web
  return "http://YOUR_LOCAL_IP:3000";
  // Example: "http://192.168.1.100:3000"
};
```

**Finding your local IP:**

- **macOS/Linux**: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- **Windows**: `ipconfig` (look for IPv4 Address)

#### Start Expo Development Server

```bash
cd apps/mobile
npm start
# or
npx expo start
```

This will open the Expo DevTools in your browser and display a QR code.

#### Running on Different Platforms

**iOS Simulator** (macOS only):

```bash
npm run ios
# or
npx expo start --ios
```

**Android Emulator**:

```bash
npm run android
# or
npx expo start --android
```

**Web Browser**:

```bash
npm run web
# or
npx expo start --web
```

**Physical Device**:

1. Install **Expo Go** from App Store (iOS) or Google Play Store (Android)
2. Scan the QR code displayed in the terminal or browser
3. The app will load on your device

#### Expo DevTools Options

When Expo starts, you can:

- Press `i` to open iOS simulator
- Press `a` to open Android emulator
- Press `w` to open in web browser
- Press `r` to reload the app
- Press `m` to toggle menu
- Press `j` to open debugger

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run API tests only
cd apps/api && npm test

# Run tests in watch mode
cd apps/api && npm test -- --watch
```

### Type Checking

```bash
# Check all packages
npm run type-check

# Check API only
cd apps/api && npm run type-check

# Check mobile only
cd apps/mobile && npm run type-check
```

### Linting

```bash
# Lint all packages
npm run lint

# Lint API only
cd apps/api && npm run lint

# Lint mobile only
cd apps/mobile && npm run lint
```

### Database Management

**View database schema:**

```bash
cd apps/api
npm run drizzle:studio
```

This opens Drizzle Studio in your browser for visual database management.

## Troubleshooting

### Common Issues

**Port already in use:**

- Change `API_PORT` in `.env` or kill the process using the port

**Database connection errors:**

- Verify PostgreSQL is running
- Check `.env` database credentials
- Ensure database exists: `CREATE DATABASE hitchly_db;`

**Expo connection issues:**

- Ensure mobile device and computer are on the same network
- Check firewall settings
- Try using `tunnel` mode: `npx expo start --tunnel`

**Module not found errors:**

- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Expo cache: `npx expo start --clear`

**TypeScript errors:**

- Run `npm run type-check` to identify issues
- Ensure all dependencies are installed

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [tRPC Documentation](https://trpc.io/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [React Native Documentation](https://reactnative.dev/)
