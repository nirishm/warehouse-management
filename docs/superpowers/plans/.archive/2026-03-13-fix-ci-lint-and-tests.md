# Fix CI Lint & Unit Tests Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the two remaining CI failures: lint (missing ESLint flat config) and unit tests (no test files found).

**Architecture:** Create `eslint.config.mjs` for ESLint 10 flat config, update lint script to use `eslint` CLI directly (Next.js 16 dropped `next lint`), and add `passWithNoTests` to vitest so CI doesn't fail when no unit tests exist yet.

**Tech Stack:** ESLint 10, eslint-config-next 16, Vitest 4, Next.js 16

---

## Chunk 1: Fix both CI issues

### Task 1: Create ESLint flat config

**Files:**
- Create: `eslint.config.mjs`
- Modify: `package.json:9` (lint script)

- [ ] **Step 1: Create `eslint.config.mjs`**

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "v1-archive/**",
  ]),
]);

export default eslintConfig;
```

- [ ] **Step 2: Update lint script in `package.json`**

Change `"lint": "next lint"` → `"lint": "eslint ."`

- [ ] **Step 3: Run lint locally to verify**

Run: `pnpm lint`
Expected: PASS (or lint warnings, but no crash)

- [ ] **Step 4: Commit**

```bash
git add eslint.config.mjs package.json
git commit -m "fix(ci): add ESLint flat config and update lint script for Next.js 16"
```

### Task 2: Fix vitest "no test files" failure

**Files:**
- Modify: `vitest.config.ts:7-11`

- [ ] **Step 1: Add `passWithNoTests: true` to vitest config**

In `vitest.config.ts`, add to the `test` block:

```ts
test: {
  environment: 'node',
  globals: true,
  include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  passWithNoTests: true,
},
```

- [ ] **Step 2: Run tests locally to verify**

Run: `pnpm test --run`
Expected: PASS with "No test files found" (exits 0, not 1)

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "fix(ci): allow vitest to pass with no test files"
```

### Task 3: Push and verify CI

- [ ] **Step 1: Push to main**

```bash
git push
```

- [ ] **Step 2: Watch CI run**

Run: `gh run list --limit 1` then `gh run watch <run-id> --exit-status`
Expected: All 4 jobs pass (Lint & Typecheck, Unit Tests, Build, E2E Tests)

## Verification

1. `pnpm lint` runs without crashing locally
2. `pnpm test --run` exits 0 locally
3. CI pipeline passes all jobs after push
