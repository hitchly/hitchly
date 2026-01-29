#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$PROJECT_ROOT/apps/api"
MOBILE_DIR="$PROJECT_ROOT/apps/mobile"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    
    # Kill background processes
    if [ ! -z "$API_PID" ]; then
        echo -e "${YELLOW}Stopping API server (PID: $API_PID)...${NC}"
        kill $API_PID 2>/dev/null
    fi
    
    # Stop Docker containers
    echo -e "${YELLOW}Stopping Docker containers...${NC}"
    cd "$PROJECT_ROOT"
    docker-compose down
    
    echo -e "${GREEN}Cleanup complete!${NC}"
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup SIGINT SIGTERM

# Step 1: Create Docker network if it doesn't exist
echo -e "${GREEN}Step 1: Checking Docker network...${NC}"
if ! docker network inspect app_network >/dev/null 2>&1; then
    echo -e "${YELLOW}Creating Docker network 'app_network'...${NC}"
    docker network create app_network
else
    echo -e "${GREEN}Docker network 'app_network' already exists${NC}"
fi

# Step 2: Start Docker Compose (database)
echo -e "\n${GREEN}Step 2: Starting Docker database...${NC}"
cd "$PROJECT_ROOT"
docker-compose up -d db

# Wait for database to be ready
echo -e "${YELLOW}Waiting for database to be ready...${NC}"
sleep 3

# Step 3: Start Backend API
echo -e "\n${GREEN}Step 3: Starting Backend API...${NC}"
cd "$API_DIR"
pnpm dev > /tmp/hitchly-api.log 2>&1 &
API_PID=$!
echo -e "${GREEN}API server started (PID: $API_PID)${NC}"
echo -e "${YELLOW}API logs: tail -f /tmp/hitchly-api.log${NC}"

# Wait a bit for API to start
sleep 2

# Step 4: Start Expo
echo -e "\n${GREEN}Step 4: Starting Expo (tunnel mode)...${NC}"
cd "$MOBILE_DIR"
echo -e "${YELLOW}Expo will start in tunnel mode. Press Ctrl+C to stop all services.${NC}\n"

# Start Expo in foreground with tunnel mode (so user can interact with it)
pnpm start --tunnel

# If Expo exits, cleanup
cleanup
