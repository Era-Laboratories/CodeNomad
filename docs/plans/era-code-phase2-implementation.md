# Era Code Integration - Phase 2: Governance Integration

## Phase 2 Objective

Integrate Era's governance system into the UI, providing visibility into command restrictions and allowing users to configure overrides.

---

## Task 2.1: Governance Parser Service

### Goal
Create a service to parse governance rules from era-code's plugin files.

### File: `packages/server/src/era/governance.ts` (NEW)

```typescript
interface GovernanceRule {
  id: string
  pattern: string
  reason: string
  suggestion?: string
  overridable: boolean
  source: 'hardcoded' | 'default' | 'project' | 'user'
  action: 'allow' | 'deny'
}

interface GovernanceConfig {
  auditMode: boolean
  rules: GovernanceRule[]
  overrides: Record<string, { action: 'allow' | 'deny'; justification?: string }>
}

export class EraGovernanceService {
  parseHardcodedRules(): GovernanceRule[]
  parseDefaultRules(): GovernanceRule[]
  loadProjectConfig(folder: string): GovernanceConfig | null
  getEffectiveRules(folder: string): GovernanceRule[]
  evaluateCommand(command: string, folder: string): GovernanceDecision
}
```

### Implementation Steps
1. Parse HARDCODED_DENIALS from era-governance.ts
2. Parse DEFAULT_DENIALS from era-governance.ts
3. Load .era/governance.yaml from project
4. Merge rules with override priority
5. Provide evaluation function

---

## Task 2.2: Governance API Endpoints

### Goal
Add API endpoints for governance rules and configuration.

### File: `packages/server/src/server/routes/era.ts` (MODIFY)

```typescript
// GET /api/era/governance/rules
// Returns all governance rules with their effective state

// GET /api/era/governance/config?folder=...
// Returns project-specific governance config

// POST /api/era/governance/evaluate
// Evaluates a command against governance rules

// PUT /api/era/governance/override
// Sets a rule override for the project
```

---

## Task 2.3: Governance Store (UI)

### Goal
Create UI store for governance state.

### File: `packages/ui/src/stores/era-governance.ts` (NEW)

```typescript
interface GovernanceState {
  loading: boolean
  error: string | null
  rules: GovernanceRule[]
  overrides: Record<string, RuleOverride>
  auditMode: boolean
}

// Signals
const governanceRules = createSignal<GovernanceRule[]>([])
const governanceOverrides = createSignal<Record<string, RuleOverride>>({})

// Actions
function fetchGovernanceRules(folder?: string): Promise<void>
function setRuleOverride(ruleId: string, override: RuleOverride): Promise<void>
function removeRuleOverride(ruleId: string): Promise<void>

// Derived
const hardcodedRules = createMemo(() => rules filtered by source)
const overridableRules = createMemo(() => rules filtered by overridable)
const activeOverrides = createMemo(() => count of overrides)
```

---

## Task 2.4: Governance Panel Component

### Goal
Create a panel showing governance rules and allowing overrides.

### File: `packages/ui/src/components/governance-panel.tsx` (NEW)

Features:
- List all governance rules grouped by source
- Show rule pattern, reason, suggestion
- Toggle for overridable rules
- Justification input for overrides
- Audit mode toggle

---

## Task 2.5: Governance Status Indicator

### Goal
Add governance status to the bottom status bar.

### File: `packages/ui/src/components/bottom-status-bar.tsx` (MODIFY)

Add:
- Governance icon (shield)
- Active overrides count
- Click to open governance panel

---

## Task 2.6: Blocked Command Feedback

### Goal
Display governance block messages in the chat when commands are denied.

### File: `packages/ui/src/components/governance-block-message.tsx` (NEW)

Features:
- Styled error block for governance denials
- Show rule ID, reason, suggestion
- "Override" button for overridable rules
- Link to governance settings

---

## Task 2.7: Governance Panel CSS

### File: `packages/ui/src/styles/panels/governance.css` (NEW)

---

## Task 2.8: Playwright Tests

### File: `tests/e2e/EC-011-era-governance.spec.ts` (NEW)

Test cases:
- Governance rules API returns valid data
- Governance panel displays rules
- Rule override works
- Blocked command shows feedback

---

## Implementation Order

1. Task 2.1: Governance Parser Service
2. Task 2.2: Governance API Endpoints
3. Task 2.3: Governance Store (UI)
4. Task 2.4: Governance Panel Component
5. Task 2.5: Governance Status Indicator
6. Task 2.6: Blocked Command Feedback
7. Task 2.7: Governance Panel CSS
8. Task 2.8: Playwright Tests

---

## Estimated Effort

| Task | Effort |
|------|--------|
| 2.1 Governance Parser | 2.5 hours |
| 2.2 Governance API | 1.5 hours |
| 2.3 Governance Store | 1 hour |
| 2.4 Governance Panel | 2 hours |
| 2.5 Status Indicator | 0.5 hours |
| 2.6 Block Feedback | 1 hour |
| 2.7 CSS | 0.5 hours |
| 2.8 Playwright Tests | 1 hour |
| **Total** | **~10 hours** |
