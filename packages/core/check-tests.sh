#!/bin/bash

# Test Verification Script for Core Package
# This script checks if the test environment is properly configured

echo "=========================================="
echo "Core Package Test Environment Check"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo "1. Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "   ${GREEN}✓${NC} Node.js installed: $NODE_VERSION"
else
    echo -e "   ${RED}✗${NC} Node.js not found"
    echo -e "   ${YELLOW}Please install Node.js: brew install node${NC}"
    exit 1
fi

# Check npm
echo ""
echo "2. Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "   ${GREEN}✓${NC} npm installed: $NPM_VERSION"
else
    echo -e "   ${RED}✗${NC} npm not found"
    exit 1
fi

# Check pnpm
echo ""
echo "3. Checking pnpm..."
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    echo -e "   ${GREEN}✓${NC} pnpm installed: $PNPM_VERSION"
else
    echo -e "   ${RED}✗${NC} pnpm not found"
    echo -e "   ${YELLOW}Installing pnpm globally...${NC}"
    npm install -g pnpm
    if [ $? -eq 0 ]; then
        echo -e "   ${GREEN}✓${NC} pnpm installed successfully"
    else
        echo -e "   ${RED}✗${NC} Failed to install pnpm"
        exit 1
    fi
fi

# Check dependencies
echo ""
echo "4. Checking dependencies..."
if [ -d "node_modules" ]; then
    echo -e "   ${GREEN}✓${NC} Dependencies installed"
else
    echo -e "   ${YELLOW}⚠${NC} Dependencies not found"
    echo -e "   ${YELLOW}Running pnpm install...${NC}"
    pnpm install
    if [ $? -eq 0 ]; then
        echo -e "   ${GREEN}✓${NC} Dependencies installed"
    else
        echo -e "   ${RED}✗${NC} Failed to install dependencies"
        exit 1
    fi
fi

# Check TypeScript
echo ""
echo "5. Checking TypeScript configuration..."
if [ -f "tsconfig.json" ]; then
    echo -e "   ${GREEN}✓${NC} tsconfig.json found"
else
    echo -e "   ${RED}✗${NC} tsconfig.json not found"
    exit 1
fi

# Check Vitest config
echo ""
echo "6. Checking Vitest configuration..."
if [ -f "vitest.config.ts" ]; then
    echo -e "   ${GREEN}✓${NC} vitest.config.ts found"
else
    echo -e "   ${RED}✗${NC} vitest.config.ts not found"
    exit 1
fi

# Count test files
echo ""
echo "7. Checking test files..."
TEST_COUNT=$(find src -name "*.test.ts" | wc -l | tr -d ' ')
if [ $TEST_COUNT -gt 0 ]; then
    echo -e "   ${GREEN}✓${NC} Found $TEST_COUNT test files"
    echo ""
    echo "   Test files:"
    find src -name "*.test.ts" | sort | while read file; do
        echo "     - $file"
    done
else
    echo -e "   ${RED}✗${NC} No test files found"
    exit 1
fi

# Summary
echo ""
echo "=========================================="
echo -e "${GREEN}✓ All checks passed!${NC}"
echo "=========================================="
echo ""
echo "You can now run tests with:"
echo ""
echo -e "${YELLOW}pnpm test${NC}           - Run all tests"
echo -e "${YELLOW}pnpm test:watch${NC}     - Run tests in watch mode"
echo -e "${YELLOW}pnpm test:coverage${NC}  - Run tests with coverage"
echo ""
echo "From project root, use:"
echo -e "${YELLOW}pnpm --filter @cataclym-web/core test${NC}"
echo ""
