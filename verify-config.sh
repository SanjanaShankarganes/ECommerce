#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Configuration Verification Script${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Function to check if a value exists in a file
check_config() {
    local file=$1
    local expected=$2
    local description=$3
    
    if [ -f "$file" ]; then
        if grep -q "$expected" "$file"; then
            echo -e "${GREEN}✅ $description${NC}"
            return 0
        else
            echo -e "${RED}❌ $description${NC}"
            echo -e "${YELLOW}   Expected: $expected${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ File not found: $file${NC}"
        return 1
    fi
}

echo -e "${YELLOW}Checking Frontend Configuration...${NC}"
check_config "Frontend/.env" "VITE_API_URL" "Frontend .env uses VITE_ prefix"
check_config "Frontend/.env" "5000" "Frontend .env points to port 5000"
check_config "Frontend/src/utils/api.tsx" "VITE_API_URL" "Frontend api.tsx uses VITE_API_URL"
check_config "Frontend/src/utils/api.tsx" "localhost:5000" "Frontend api.tsx fallback to port 5000"

echo -e "\n${YELLOW}Checking Backend Configuration...${NC}"
check_config "Backend/.env" "PORT=5000" "Backend .env sets PORT=5000"
check_config "Backend/.env" "CORS_ORIGIN=\*" "Backend .env has CORS_ORIGIN=*"
check_config "Backend/index.js" "PORT || 5000" "Backend index.js defaults to port 5000"
check_config "Backend/index.js" "Access-Control-Allow-Origin" "Backend has manual CORS headers"
check_config "Backend/index.js" "OPTIONS" "Backend handles OPTIONS requests"

echo -e "\n${YELLOW}Checking Docker Configuration...${NC}"
check_config "Dockerfile" "EXPOSE 5000" "Dockerfile exposes port 5000"
check_config "Dockerfile" "CMD.*start.sh" "Dockerfile uses start.sh"

echo -e "\n${BLUE}========================================${NC}"
echo -e "${YELLOW}Checking File Existence...${NC}"

files=(
    "Backend/.env"
    "Frontend/.env"
    "Frontend/.env.production.local"
    "Backend/index.js"
    "Frontend/src/utils/api.tsx"
    "Dockerfile"
    "start.sh"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file exists${NC}"
    else
        echo -e "${RED}❌ $file missing${NC}"
    fi
done

echo -e "\n${BLUE}========================================${NC}"
echo -e "${YELLOW}Current Configuration Values:${NC}\n"

echo -e "${BLUE}Frontend .env:${NC}"
cat Frontend/.env 2>/dev/null || echo -e "${RED}File not found${NC}"

echo -e "\n${BLUE}Backend .env:${NC}"
cat Backend/.env 2>/dev/null || echo -e "${RED}File not found${NC}"

echo -e "\n${BLUE}Frontend .env.production.local:${NC}"
cat Frontend/.env.production.local 2>/dev/null || echo -e "${YELLOW}File not found (optional)${NC}"

echo -e "\n${BLUE}========================================${NC}"
echo -e "${YELLOW}Port Configuration Summary:${NC}\n"

echo -e "Backend default port:  $(grep -o 'PORT || [0-9]*' Backend/index.js 2>/dev/null | cut -d' ' -f3 || echo 'NOT FOUND')"
echo -e "Backend .env port:     $(grep '^PORT=' Backend/.env 2>/dev/null | cut -d'=' -f2 || echo 'NOT SET')"
echo -e "Docker exposed port:   $(grep 'EXPOSE' Dockerfile 2>/dev/null | awk '{print $2}' | head -1 || echo 'NOT FOUND')"
echo -e "Frontend API URL:      $(grep 'VITE_API_URL' Frontend/.env 2>/dev/null | cut -d'=' -f2 || echo 'NOT SET')"

echo -e "\n${BLUE}========================================${NC}"
echo -e "${YELLOW}CORS Configuration:${NC}\n"

echo -e "Backend CORS_ORIGIN:   $(grep '^CORS_ORIGIN=' Backend/.env 2>/dev/null | cut -d'=' -f2 || echo 'NOT SET')"
echo -e "Manual CORS headers:   $(grep -c 'Access-Control-Allow' Backend/index.js 2>/dev/null || echo '0') header lines found"
echo -e "OPTIONS handling:      $(grep -c "method === 'OPTIONS'" Backend/index.js 2>/dev/null || echo 'NOT FOUND') handler(s) found"

echo -e "\n${BLUE}========================================${NC}"
echo -e "${YELLOW}Quick Test Commands:${NC}\n"

echo -e "Test backend locally:"
echo -e "${GREEN}  cd Backend && npm start${NC}\n"

echo -e "Test frontend locally:"
echo -e "${GREEN}  cd Frontend && npm run dev${NC}\n"

echo -e "Build Docker image:"
echo -e "${GREEN}  docker build -t catalogue-app .${NC}\n"

echo -e "Run Docker container:"
echo -e "${GREEN}  docker run -p 5000:5000 -e NODE_ENV=production catalogue-app${NC}\n"

echo -e "Test health endpoint:"
echo -e "${GREEN}  curl http://localhost:5000/health${NC}\n"

echo -e "Test API endpoint:"
echo -e "${GREEN}  curl http://localhost:5000/api/ctable${NC}\n"

echo -e "Test CORS headers:"
echo -e "${GREEN}  curl -I -X OPTIONS http://localhost:5000/api/ctable \\${NC}"
echo -e "${GREEN}    -H 'Origin: http://localhost:5173' \\${NC}"
echo -e "${GREEN}    -H 'Access-Control-Request-Method: GET'${NC}\n"

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Verification Complete!${NC}"
echo -e "${BLUE}========================================${NC}\n"

