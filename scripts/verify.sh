#!/bin/bash
# Timeboxxer Pre-Commit Verification Script
# Run this before every commit to ensure code quality

set -e

echo "🔍 Running Timeboxxer verification checks..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

# 1. Check for files over 300 lines
echo "1. Checking file lengths (max 300 lines)..."
LONG_FILES=$(find src -name "*.ts" -o -name "*.tsx" | xargs wc -l 2>/dev/null | awk '$1 > 300 && !/total/ {print $0}')
if [ -n "$LONG_FILES" ]; then
  echo -e "${RED}FAIL: Files over 300 lines found:${NC}"
  echo "$LONG_FILES"
  FAILED=1
else
  echo -e "${GREEN}PASS${NC}"
fi
echo ""

# 2. Check for Supabase imports outside api/ and lib/
echo "2. Checking Supabase import centralization..."
BAD_IMPORTS=$(grep -rn "from.*supabase" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "src/api/" | grep -v "src/lib/supabase" || true)
if [ -n "$BAD_IMPORTS" ]; then
  echo -e "${RED}FAIL: Supabase imports found outside api/ layer:${NC}"
  echo "$BAD_IMPORTS"
  FAILED=1
else
  echo -e "${GREEN}PASS${NC}"
fi
echo ""

# 3. Check for React imports in services
echo "3. Checking services layer purity (no React)..."
REACT_IN_SERVICES=$(grep -rn "from 'react'" src/services/ --include="*.ts" 2>/dev/null || true)
if [ -n "$REACT_IN_SERVICES" ]; then
  echo -e "${RED}FAIL: React imports found in services/:${NC}"
  echo "$REACT_IN_SERVICES"
  FAILED=1
else
  echo -e "${GREEN}PASS${NC}"
fi
echo ""

# 4. Check for Supabase imports in services
echo "4. Checking services layer purity (no Supabase)..."
SUPA_IN_SERVICES=$(grep -rn "supabase" src/services/ --include="*.ts" 2>/dev/null || true)
if [ -n "$SUPA_IN_SERVICES" ]; then
  echo -e "${RED}FAIL: Supabase references found in services/:${NC}"
  echo "$SUPA_IN_SERVICES"
  FAILED=1
else
  echo -e "${GREEN}PASS${NC}"
fi
echo ""

# 5. TypeScript check (if tsc available)
echo "5. Running TypeScript check..."
if command -v npx &> /dev/null && [ -f "tsconfig.json" ]; then
  if npx tsc --noEmit 2>/dev/null; then
    echo -e "${GREEN}PASS${NC}"
  else
    echo -e "${RED}FAIL: TypeScript errors found${NC}"
    FAILED=1
  fi
else
  echo -e "${YELLOW}SKIP: TypeScript not configured${NC}"
fi
echo ""

# 6. Build check (if package.json exists)
echo "6. Running build..."
if [ -f "package.json" ] && grep -q '"build"' package.json; then
  if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
  else
    echo -e "${RED}FAIL: Build failed${NC}"
    FAILED=1
  fi
else
  echo -e "${YELLOW}SKIP: No build script found${NC}"
fi
echo ""

# Summary
echo "================================"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some checks failed. Please fix before committing.${NC}"
  exit 1
fi
