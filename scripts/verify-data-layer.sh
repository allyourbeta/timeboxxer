#!/bin/bash

# =============================================================================
# TIMEBOXXER DATA LAYER VERIFICATION SCRIPT
# Run this after any code changes to catch common bugs
# Usage: ./scripts/verify-data-layer.sh
# =============================================================================

set -e

echo "🔍 Timeboxxer Data Layer Verification"
echo "======================================"
echo ""

ERRORS=0

# -----------------------------------------------------------------------------
# CHECK 1: No Z suffix in timestamp creation (TIMESTAMPTZ vs TIMESTAMP bug)
# -----------------------------------------------------------------------------
echo "1️⃣  Checking for 'Z' suffix in timestamps..."

Z_MATCHES=$(grep -rn "\.000Z\|:00Z\|:00\.000Z" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | grep -v ".d.ts" || true)

if [ -n "$Z_MATCHES" ]; then
  echo "   ❌ FAIL: Found 'Z' suffix in timestamps (should use TIMESTAMP without timezone)"
  echo "$Z_MATCHES" | while read line; do echo "      $line"; done
  ERRORS=$((ERRORS + 1))
else
  echo "   ✅ PASS: No 'Z' suffix found"
fi

echo ""

# -----------------------------------------------------------------------------
# CHECK 2: No references to old api/tasks/ folder structure
# -----------------------------------------------------------------------------
echo "2️⃣  Checking for old api/tasks/ imports..."

OLD_IMPORTS=$(grep -rn "from '@/api/tasks/" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules || true)

if [ -n "$OLD_IMPORTS" ]; then
  echo "   ❌ FAIL: Found imports from old @/api/tasks/ structure"
  echo "$OLD_IMPORTS" | while read line; do echo "      $line"; done
  ERRORS=$((ERRORS + 1))
else
  echo "   ✅ PASS: No old api/tasks/ imports"
fi

echo ""

# -----------------------------------------------------------------------------
# CHECK 3: No references to 'purgatory' (removed system)
# -----------------------------------------------------------------------------
echo "3️⃣  Checking for 'purgatory' references..."

PURGATORY=$(grep -rn "purgatory" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | grep -v "// purgatory" || true)

if [ -n "$PURGATORY" ]; then
  echo "   ❌ FAIL: Found references to 'purgatory' (should be removed)"
  echo "$PURGATORY" | while read line; do echo "      $line"; done
  ERRORS=$((ERRORS + 1))
else
  echo "   ✅ PASS: No purgatory references"
fi

echo ""

# -----------------------------------------------------------------------------
# CHECK 4: No toISOString() for dates (UTC bug source)
# -----------------------------------------------------------------------------
echo "4️⃣  Checking for toISOString() date usage..."

ISO_STRING=$(grep -rn "toISOString()" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | grep -v "updated_at" | grep -v "completed_at" || true)

if [ -n "$ISO_STRING" ]; then
  echo "   ⚠️  WARNING: Found toISOString() usage (OK for updated_at/completed_at, check others)"
  echo "$ISO_STRING" | while read line; do echo "      $line"; done
else
  echo "   ✅ PASS: No suspicious toISOString() usage"
fi

echo ""

# -----------------------------------------------------------------------------
# CHECK 5: createLocalTimestamp is used (not manual string building)
# -----------------------------------------------------------------------------
echo "5️⃣  Checking that createLocalTimestamp is imported where needed..."

# Files that schedule tasks should import createLocalTimestamp
SCHEDULE_FILES=$(grep -l "scheduleTask\|scheduled_at" src/hooks/*.ts src/components/**/*.tsx 2>/dev/null || true)

for file in $SCHEDULE_FILES; do
  if [ -f "$file" ]; then
    if grep -q "scheduled_at\s*=\s*\`" "$file" 2>/dev/null; then
      if ! grep -q "createLocalTimestamp" "$file" 2>/dev/null; then
        echo "   ❌ FAIL: $file builds scheduled_at manually without createLocalTimestamp"
        ERRORS=$((ERRORS + 1))
      fi
    fi
  fi
done

if [ $ERRORS -eq 0 ]; then
  echo "   ✅ PASS: createLocalTimestamp usage looks correct"
fi

echo ""

# -----------------------------------------------------------------------------
# CHECK 6: Type imports are present
# -----------------------------------------------------------------------------
echo "6️⃣  Checking for missing type imports..."

# Check if files using Task type have it imported
TASK_USAGE=$(grep -l ": Task\|Task\[\]\|Task |" src/hooks/*.ts src/state/*.ts 2>/dev/null || true)

for file in $TASK_USAGE; do
  if [ -f "$file" ]; then
    if ! grep -q "import.*Task.*from" "$file" 2>/dev/null; then
      echo "   ❌ FAIL: $file uses Task type but doesn't import it"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

if [ $ERRORS -eq 0 ]; then
  echo "   ✅ PASS: Type imports look correct"
fi

echo ""

# -----------------------------------------------------------------------------
# CHECK 7: No duplicate imports
# -----------------------------------------------------------------------------
echo "7️⃣  Checking for duplicate imports..."

for file in src/hooks/*.ts src/state/*.ts src/api/*.ts; do
  if [ -f "$file" ]; then
    DUPES=$(grep "^import" "$file" 2>/dev/null | sort | uniq -d || true)
    if [ -n "$DUPES" ]; then
      echo "   ❌ FAIL: $file has duplicate imports"
      echo "$DUPES" | while read line; do echo "      $line"; done
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

echo "   ✅ PASS: No duplicate imports found"

echo ""

# -----------------------------------------------------------------------------
# CHECK 8: Build check
# -----------------------------------------------------------------------------
echo "8️⃣  Running TypeScript build check..."

if npm run build > /tmp/build-output.txt 2>&1; then
  echo "   ✅ PASS: Build successful"
else
  echo "   ❌ FAIL: Build failed"
  tail -20 /tmp/build-output.txt | while read line; do echo "      $line"; done
  ERRORS=$((ERRORS + 1))
fi

echo ""

# -----------------------------------------------------------------------------
# SUMMARY
# -----------------------------------------------------------------------------
echo "======================================"
if [ $ERRORS -eq 0 ]; then
  echo "✅ ALL CHECKS PASSED"
  exit 0
else
  echo "❌ $ERRORS CHECK(S) FAILED"
  echo ""
  echo "Fix the issues above and run this script again."
  exit 1
fi
