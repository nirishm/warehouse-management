# Fix CI pnpm Version Mismatch

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix CI workflow failure caused by conflicting pnpm version specifications.

**Architecture:** Remove hardcoded `version: 9` from `pnpm/action-setup@v4` in CI workflow. The action auto-detects the version from `packageManager` in `package.json` (`pnpm@10.30.3`).

**Tech Stack:** GitHub Actions, pnpm

---

## Chunk 1: Fix pnpm version conflict

### Task 1: Update CI workflow

**Files:**
- Modify: `.github/workflows/ci.yml:15-17, 33-35, 53-55, 73-75`

**Context:** `pnpm/action-setup@v4` errors when both `version:` param and `packageManager` in `package.json` are set. Our `package.json` declares `"packageManager": "pnpm@10.30.3"` but CI hardcodes `version: 9`. Removing the `with: version:` block lets the action read from `package.json` automatically.

- [ ] **Step 1: Remove version param from lint-and-typecheck job (lines 15-17)**

Change:
```yaml
      - uses: pnpm/action-setup@v4
        with:
          version: 9
```
To:
```yaml
      - uses: pnpm/action-setup@v4
```

- [ ] **Step 2: Remove version param from unit-tests job (lines 33-35)**

Same change as Step 1.

- [ ] **Step 3: Remove version param from build job (lines 53-55)**

Same change as Step 1.

- [ ] **Step 4: Remove version param from e2e-tests job (lines 73-75)**

Same change as Step 1.

- [ ] **Step 5: Commit and push**

```bash
git add .github/workflows/ci.yml
git commit -m "fix(ci): remove hardcoded pnpm version to match packageManager in package.json"
git push
```

## Verification

1. After push, monitor CI run: `gh run watch`
2. All 4 jobs should pass the `pnpm/action-setup@v4` step
3. Confirm pnpm 10.30.3 is installed (visible in action logs)
