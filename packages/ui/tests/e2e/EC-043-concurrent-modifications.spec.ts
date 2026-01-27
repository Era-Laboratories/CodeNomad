import { test, expect } from "@playwright/test"

test.describe("EC-043: Concurrent File Modifications", () => {
  const API_BASE = "http://localhost:9898"

  // Helper to create a unique test folder for each test
  const createTestFolder = () => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    return `/tmp/codenomad-test-concurrent-${uniqueId}`
  }

  const setupTestFolder = async (testFolder: string) => {
    const fs = await import("fs")
    const path = await import("path")
    const eraDir = path.join(testFolder, ".era", "memory")
    fs.mkdirSync(eraDir, { recursive: true })
    fs.writeFileSync(
      path.join(eraDir, "directives.md"),
      "# Test Directives\n\n- Initial directive\n",
      "utf-8"
    )
  }

  const cleanupTestFolder = async (testFolder: string) => {
    const fs = await import("fs")
    try {
      fs.rmSync(testFolder, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  }

  test("should detect concurrent modification conflict", async ({ request }) => {
    const testFolder = createTestFolder()
    await setupTestFolder(testFolder)

    try {
      // Session 1 reads the directives
      const read1 = await request.get(
        `${API_BASE}/api/era/directives?folder=${encodeURIComponent(testFolder)}&type=project&sessionId=session-1`
      )
      expect(read1.ok()).toBeTruthy()
      const data1 = await read1.json()
      expect(data1.success).toBe(true)
      expect(data1.hash).toBeTruthy()
      const originalHash = data1.hash

      console.log("Session 1 read - hash:", originalHash)

      // Session 2 modifies the file
      const write2 = await request.put(`${API_BASE}/api/era/directives`, {
        data: {
          folder: testFolder,
          type: "project",
          content: "# Test Directives\n\n- Modified by session 2\n",
          sessionId: "session-2",
        },
      })
      expect(write2.ok()).toBeTruthy()
      const writeData2 = await write2.json()
      expect(writeData2.success).toBe(true)
      expect(writeData2.hash).toBeTruthy()
      expect(writeData2.hash).not.toBe(originalHash)

      console.log("Session 2 wrote - new hash:", writeData2.hash)

      // Session 1 tries to write with stale hash
      const write1 = await request.put(`${API_BASE}/api/era/directives`, {
        data: {
          folder: testFolder,
          type: "project",
          content: "# Test Directives\n\n- Modified by session 1\n",
          sessionId: "session-1",
          expectedHash: originalHash, // Stale hash
        },
      })

      // Should get 409 Conflict
      expect(write1.status()).toBe(409)
      const conflictData = await write1.json()
      expect(conflictData.success).toBe(false)
      expect(conflictData.error).toContain("modified")
      expect(conflictData.conflictInfo).toBeTruthy()
      expect(conflictData.conflictInfo.currentHash).toBe(writeData2.hash)
      expect(conflictData.conflictInfo.lastModifiedBy).toBe("session-2")

      console.log("Session 1 conflict detected:", conflictData)
    } finally {
      await cleanupTestFolder(testFolder)
    }
  })

  test("should allow write when hash matches", async ({ request }) => {
    const testFolder = createTestFolder()
    await setupTestFolder(testFolder)

    try {
      // Read current state
      const read1 = await request.get(
        `${API_BASE}/api/era/directives?folder=${encodeURIComponent(testFolder)}&type=project&sessionId=session-1`
      )
      expect(read1.ok()).toBeTruthy()
      const data1 = await read1.json()
      const currentHash = data1.hash

      console.log("Read current hash:", currentHash)

      // Write with correct hash
      const write1 = await request.put(`${API_BASE}/api/era/directives`, {
        data: {
          folder: testFolder,
          type: "project",
          content: "# Test Directives\n\n- Updated successfully\n",
          sessionId: "session-1",
          expectedHash: currentHash,
        },
      })

      expect(write1.ok()).toBeTruthy()
      const writeData = await write1.json()
      expect(writeData.success).toBe(true)
      expect(writeData.hash).toBeTruthy()
      expect(writeData.hash).not.toBe(currentHash) // Hash changed

      console.log("Write succeeded, new hash:", writeData.hash)

      // Verify content
      const read2 = await request.get(
        `${API_BASE}/api/era/directives?folder=${encodeURIComponent(testFolder)}&type=project&sessionId=session-1`
      )
      const data2 = await read2.json()
      expect(data2.content).toContain("Updated successfully")
    } finally {
      await cleanupTestFolder(testFolder)
    }
  })

  test("should allow write without hash (backwards compatibility)", async ({ request }) => {
    const testFolder = createTestFolder()
    await setupTestFolder(testFolder)

    try {
      // Write without expectedHash
      const write1 = await request.put(`${API_BASE}/api/era/directives`, {
        data: {
          folder: testFolder,
          type: "project",
          content: "# Test Directives\n\n- Written without hash check\n",
          sessionId: "session-1",
          // No expectedHash
        },
      })

      expect(write1.ok()).toBeTruthy()
      const writeData = await write1.json()
      expect(writeData.success).toBe(true)
      expect(writeData.hash).toBeTruthy()

      console.log("Write without hash check succeeded:", writeData.hash)
    } finally {
      await cleanupTestFolder(testFolder)
    }
  })

  test("should serialize concurrent writes via locking", async ({ request }) => {
    const testFolder = createTestFolder()
    await setupTestFolder(testFolder)

    try {
      const results: { order: number; hash: string }[] = []

      // Fire multiple writes in parallel
      const writes = Array.from({ length: 5 }, (_, i) =>
        request
          .put(`${API_BASE}/api/era/directives`, {
            data: {
              folder: testFolder,
              type: "project",
              content: `# Test Directives\n\n- Write ${i + 1}\n`,
              sessionId: `session-${i + 1}`,
              // No expectedHash, so no conflict check
            },
          })
          .then(async (res) => {
            const data = await res.json()
            results.push({ order: i + 1, hash: data.hash })
            return data
          })
      )

      const allResults = await Promise.all(writes)

      // All writes should succeed (serialized by locking)
      for (const result of allResults) {
        expect(result.success).toBe(true)
      }

      console.log("All concurrent writes succeeded:", results)

      // Final content should be one of the writes (last one wins)
      const finalRead = await request.get(
        `${API_BASE}/api/era/directives?folder=${encodeURIComponent(testFolder)}&type=project&sessionId=verify`
      )
      const finalData = await finalRead.json()
      expect(finalData.content).toContain("Write")

      console.log("Final content:", finalData.content.substring(0, 100))
    } finally {
      await cleanupTestFolder(testFolder)
    }
  })

  test("should track hashes for governance files", async ({ request }) => {
    const testFolder = createTestFolder()
    const fs = await import("fs")
    const path = await import("path")

    // Create governance directory
    const govDir = path.join(testFolder, ".era")
    fs.mkdirSync(govDir, { recursive: true })
    fs.writeFileSync(path.join(govDir, "governance.local.yaml"), "rules: []\n", "utf-8")

    try {
      // Read governance file
      const read1 = await request.get(
        `${API_BASE}/api/era/governance/yaml?folder=${encodeURIComponent(testFolder)}&file=local&sessionId=session-1`
      )
      expect(read1.ok()).toBeTruthy()
      const data1 = await read1.json()
      expect(data1.success).toBe(true)
      expect(data1.hash).toBeTruthy()

      console.log("Governance read hash:", data1.hash)

      // Write with correct hash
      const write1 = await request.put(`${API_BASE}/api/era/governance/yaml`, {
        data: {
          folder: testFolder,
          file: "local",
          content: "rules:\n  - test: rule\n",
          sessionId: "session-1",
          expectedHash: data1.hash,
        },
      })

      expect(write1.ok()).toBeTruthy()
      const writeData = await write1.json()
      expect(writeData.success).toBe(true)
      expect(writeData.hash).toBeTruthy()

      console.log("Governance write hash:", writeData.hash)
    } finally {
      await cleanupTestFolder(testFolder)
    }
  })

  test("should track hashes for MCP config files", async ({ request }) => {
    const testFolder = createTestFolder()
    const fs = await import("fs")
    const path = await import("path")

    // Create MCP config
    const eraDir = path.join(testFolder, ".era")
    fs.mkdirSync(eraDir, { recursive: true })
    fs.writeFileSync(path.join(eraDir, "mcp.json"), '{"servers":{},"overrides":{}}', "utf-8")

    try {
      // Read MCP config
      const read1 = await request.get(
        `${API_BASE}/api/era/project/mcp?folder=${encodeURIComponent(testFolder)}&sessionId=session-1`
      )
      expect(read1.ok()).toBeTruthy()
      const data1 = await read1.json()
      expect(data1.success).toBe(true)
      expect(data1.hash).toBeTruthy()

      console.log("MCP config read hash:", data1.hash)

      // Write with correct hash
      const write1 = await request.put(`${API_BASE}/api/era/project/mcp`, {
        data: {
          folder: testFolder,
          servers: { test: { command: "test" } },
          overrides: {},
          sessionId: "session-1",
          expectedHash: data1.hash,
        },
      })

      expect(write1.ok()).toBeTruthy()
      const writeData = await write1.json()
      expect(writeData.success).toBe(true)
      expect(writeData.hash).toBeTruthy()

      console.log("MCP config write hash:", writeData.hash)
    } finally {
      await cleanupTestFolder(testFolder)
    }
  })
})
