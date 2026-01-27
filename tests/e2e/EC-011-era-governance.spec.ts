import { test, expect } from "@playwright/test"

const API_BASE = "http://localhost:9898"

test.describe("EC-011: Era Governance API", () => {
  test("governance rules API returns valid response", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/era/governance/rules`)

    expect(response.ok()).toBeTruthy()

    const data = await response.json()

    // Should have rules array
    expect(data).toHaveProperty("rules")
    expect(Array.isArray(data.rules)).toBe(true)

    // Should have at least some rules
    expect(data.rules.length).toBeGreaterThan(0)

    // Rules should have expected structure
    const firstRule = data.rules[0]
    expect(firstRule).toHaveProperty("id")
    expect(firstRule).toHaveProperty("pattern")
    expect(firstRule).toHaveProperty("reason")
    expect(firstRule).toHaveProperty("overridable")
    expect(firstRule).toHaveProperty("source")
    expect(firstRule).toHaveProperty("action")

    // Source should be one of the expected values
    expect(["hardcoded", "default", "project", "user"]).toContain(firstRule.source)

    // Action should be allow or deny
    expect(["allow", "deny"]).toContain(firstRule.action)
  })

  test("governance summary API returns valid response", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/era/governance/summary`)

    expect(response.ok()).toBeTruthy()

    const data = await response.json()

    // Should have expected summary fields
    expect(data).toHaveProperty("totalRules")
    expect(data).toHaveProperty("hardcodedRules")
    expect(data).toHaveProperty("defaultRules")
    expect(data).toHaveProperty("customRules")
    expect(data).toHaveProperty("activeOverrides")
    expect(data).toHaveProperty("auditMode")

    // Values should be numbers
    expect(typeof data.totalRules).toBe("number")
    expect(typeof data.hardcodedRules).toBe("number")
    expect(typeof data.defaultRules).toBe("number")

    // totalRules should equal sum of hardcoded + default + custom
    expect(data.totalRules).toBe(data.hardcodedRules + data.defaultRules + data.customRules)

    // auditMode should be boolean
    expect(typeof data.auditMode).toBe("boolean")
  })

  test("governance evaluate API blocks sudo commands", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/era/governance/evaluate`, {
      data: {
        command: "sudo rm -rf /",
      },
    })

    expect(response.ok()).toBeTruthy()

    const data = await response.json()

    expect(data).toHaveProperty("decision")
    expect(data.decision.allowed).toBe(false)
    expect(data.decision.rule).toBe("sudo")
    expect(data.decision.overridable).toBe(false)
    expect(data.decision.reason).toContain("Privilege escalation")
  })

  test("governance evaluate API blocks kubectl apply by default", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/era/governance/evaluate`, {
      data: {
        command: "kubectl apply -f deployment.yaml",
      },
    })

    expect(response.ok()).toBeTruthy()

    const data = await response.json()

    expect(data).toHaveProperty("decision")
    expect(data.decision.allowed).toBe(false)
    expect(data.decision.rule).toBe("kubectl-apply")
    expect(data.decision.overridable).toBe(true)
    expect(data.decision.suggestion).toBeDefined()
  })

  test("governance evaluate API allows safe commands", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/era/governance/evaluate`, {
      data: {
        command: "ls -la",
      },
    })

    expect(response.ok()).toBeTruthy()

    const data = await response.json()

    expect(data).toHaveProperty("decision")
    expect(data.decision.allowed).toBe(true)
  })

  test("governance rules include hardcoded safety rules", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/era/governance/rules`)
    const data = await response.json()

    // Find hardcoded rules
    const hardcodedRules = data.rules.filter((r: any) => r.source === "hardcoded")

    // Should have some hardcoded rules
    expect(hardcodedRules.length).toBeGreaterThan(0)

    // All hardcoded rules should not be overridable
    for (const rule of hardcodedRules) {
      expect(rule.overridable).toBe(false)
    }

    // Should include critical safety rules
    const sudoRule = hardcodedRules.find((r: any) => r.id === "sudo")
    expect(sudoRule).toBeDefined()
    expect(sudoRule.action).toBe("deny")

    const rmRootRule = hardcodedRules.find((r: any) => r.id === "rm-root")
    expect(rmRootRule).toBeDefined()

    const shutdownRule = hardcodedRules.find((r: any) => r.id === "shutdown")
    expect(shutdownRule).toBeDefined()
  })

  test("governance rules include default overridable rules", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/era/governance/rules`)
    const data = await response.json()

    // Find default rules
    const defaultRules = data.rules.filter((r: any) => r.source === "default")

    // Should have some default rules
    expect(defaultRules.length).toBeGreaterThan(0)

    // All default rules should be overridable
    for (const rule of defaultRules) {
      expect(rule.overridable).toBe(true)
    }

    // Should include kubectl-apply rule
    const kubectlApplyRule = defaultRules.find((r: any) => r.id === "kubectl-apply")
    expect(kubectlApplyRule).toBeDefined()
    expect(kubectlApplyRule.suggestion).toBeDefined()

    // Should include git-force-push rule
    const gitForcePushRule = defaultRules.find((r: any) => r.id === "git-force-push")
    expect(gitForcePushRule).toBeDefined()
  })

  test("governance evaluate requires command parameter", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/era/governance/evaluate`, {
      data: {},
    })

    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data).toHaveProperty("error")
    expect(data.error).toBe("command is required")
  })

  test("governance rules with folder parameter returns project-specific rules", async ({ request }) => {
    const testFolder = encodeURIComponent("/Users/alexanderollman/CodeNomad")
    const response = await request.get(
      `${API_BASE}/api/era/governance/rules?folder=${testFolder}`
    )

    expect(response.ok()).toBeTruthy()

    const data = await response.json()

    // Should still have rules (at minimum hardcoded and default)
    expect(data.rules.length).toBeGreaterThan(0)
  })

  test("governance evaluate blocks dangerous rm commands", async ({ request }) => {
    // Test rm -rf /
    const response1 = await request.post(`${API_BASE}/api/era/governance/evaluate`, {
      data: { command: "rm -rf /" },
    })
    const data1 = await response1.json()
    expect(data1.decision.allowed).toBe(false)
    expect(data1.decision.rule).toBe("rm-root")

    // Test rm -rf /*
    const response2 = await request.post(`${API_BASE}/api/era/governance/evaluate`, {
      data: { command: "rm -rf /*" },
    })
    const data2 = await response2.json()
    expect(data2.decision.allowed).toBe(false)
    expect(data2.decision.rule).toBe("rm-star")
  })

  test("governance evaluate blocks system control commands", async ({ request }) => {
    const commands = ["shutdown -h now", "reboot", "poweroff", "halt"]

    for (const cmd of commands) {
      const response = await request.post(`${API_BASE}/api/era/governance/evaluate`, {
        data: { command: cmd },
      })
      const data = await response.json()
      expect(data.decision.allowed).toBe(false)
      expect(data.decision.rule).toBe("shutdown")
    }
  })

  test("governance evaluate blocks secret extraction commands", async ({ request }) => {
    // Test gcloud secrets
    const response1 = await request.post(`${API_BASE}/api/era/governance/evaluate`, {
      data: { command: "gcloud secrets versions access latest --secret=my-secret" },
    })
    const data1 = await response1.json()
    expect(data1.decision.allowed).toBe(false)
    expect(data1.decision.rule).toBe("gcloud-secrets")

    // Test kubectl get secrets with output
    const response2 = await request.post(`${API_BASE}/api/era/governance/evaluate`, {
      data: { command: "kubectl get secrets my-secret -o json" },
    })
    const data2 = await response2.json()
    expect(data2.decision.allowed).toBe(false)
    expect(data2.decision.rule).toBe("kubectl-secrets-output")
  })
})
