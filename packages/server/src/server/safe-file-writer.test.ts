/**
 * Test script for Safe File Writer infrastructure
 * Run with: npx tsx src/server/safe-file-writer.test.ts
 */

import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import { safeWriteFile, safeReadFile, checkFileModified, contentHashTracker, fileLockManager } from "./safe-file-writer.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const testDir = path.join(__dirname, "../../test-temp")
const testFile = path.join(testDir, "test-concurrent.txt")

async function runTests() {
  console.log("=== Safe File Writer Tests ===\n")

  // Setup
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true })
  }

  // Clean up any existing test file
  if (fs.existsSync(testFile)) {
    fs.unlinkSync(testFile)
  }

  // Clear any cached state
  contentHashTracker.clearAll()

  let passed = 0
  let failed = 0

  // Test 1: Basic write and read
  console.log("Test 1: Basic write and read")
  try {
    const writeResult = await safeWriteFile(testFile, "Hello, World!", {
      sessionId: "session-1",
    })

    if (!writeResult.success) {
      throw new Error(`Write failed: ${writeResult.error}`)
    }

    const readResult = await safeReadFile(testFile, { sessionId: "session-1" })

    if (!readResult.success) {
      throw new Error(`Read failed: ${readResult.error}`)
    }

    if (readResult.content !== "Hello, World!") {
      throw new Error(`Content mismatch: ${readResult.content}`)
    }

    if (readResult.hash !== writeResult.newHash) {
      throw new Error(`Hash mismatch: ${readResult.hash} !== ${writeResult.newHash}`)
    }

    console.log("  ✓ Write and read successful")
    console.log(`  ✓ Content hash: ${readResult.hash}`)
    passed++
  } catch (error) {
    console.log(`  ✗ Failed: ${error}`)
    failed++
  }

  // Test 2: Conflict detection - should fail when hash doesn't match
  console.log("\nTest 2: Conflict detection (fail-fast)")
  try {
    // First, get current hash
    const readResult = await safeReadFile(testFile, { sessionId: "session-1" })
    const originalHash = readResult.hash

    // Now another session writes
    await safeWriteFile(testFile, "Modified by session 2!", {
      sessionId: "session-2",
    })

    // Original session tries to write with stale hash
    const conflictResult = await safeWriteFile(testFile, "Back to session 1", {
      sessionId: "session-1",
      expectedHash: originalHash,
      resolution: "fail-fast",
    })

    if (conflictResult.success) {
      throw new Error("Expected conflict but write succeeded!")
    }

    if (!conflictResult.conflictInfo) {
      throw new Error("Expected conflictInfo in result")
    }

    console.log("  ✓ Conflict correctly detected")
    console.log(`  ✓ Expected hash: ${originalHash}`)
    console.log(`  ✓ Current hash: ${conflictResult.conflictInfo.currentHash}`)
    console.log(`  ✓ Last modified by: ${conflictResult.conflictInfo.lastModifiedBy}`)
    passed++
  } catch (error) {
    console.log(`  ✗ Failed: ${error}`)
    failed++
  }

  // Test 3: Last-write-wins resolution
  console.log("\nTest 3: Last-write-wins resolution")
  try {
    const readResult = await safeReadFile(testFile, { sessionId: "session-1" })
    const oldHash = readResult.hash

    // Another session modifies
    await safeWriteFile(testFile, "Session 3 was here", {
      sessionId: "session-3",
    })

    // Original session writes with last-write-wins
    const lwwResult = await safeWriteFile(testFile, "Session 1 wins!", {
      sessionId: "session-1",
      expectedHash: oldHash, // Stale hash
      resolution: "last-write-wins",
    })

    if (!lwwResult.success) {
      throw new Error(`Last-write-wins failed: ${lwwResult.error}`)
    }

    const verifyRead = await safeReadFile(testFile, { sessionId: "verify" })
    if (verifyRead.content !== "Session 1 wins!") {
      throw new Error(`Content not updated: ${verifyRead.content}`)
    }

    console.log("  ✓ Last-write-wins allowed stale write")
    console.log(`  ✓ New content: ${verifyRead.content}`)
    passed++
  } catch (error) {
    console.log(`  ✗ Failed: ${error}`)
    failed++
  }

  // Test 4: Concurrent lock acquisition
  console.log("\nTest 4: Concurrent lock acquisition (serialization)")
  try {
    const results: string[] = []
    const startTime = Date.now()

    // Start two concurrent writes
    const write1 = safeWriteFile(testFile, "Write 1", {
      sessionId: "concurrent-1",
    }).then((r) => {
      results.push(`Write 1 at ${Date.now() - startTime}ms`)
      return r
    })

    const write2 = safeWriteFile(testFile, "Write 2", {
      sessionId: "concurrent-2",
    }).then((r) => {
      results.push(`Write 2 at ${Date.now() - startTime}ms`)
      return r
    })

    const [result1, result2] = await Promise.all([write1, write2])

    if (!result1.success || !result2.success) {
      throw new Error("One of the writes failed")
    }

    console.log("  ✓ Both writes completed successfully (serialized)")
    console.log(`  ✓ ${results.join(", ")}`)
    passed++
  } catch (error) {
    console.log(`  ✗ Failed: ${error}`)
    failed++
  }

  // Test 5: Lock timeout
  console.log("\nTest 5: Lock timeout")
  try {
    // Acquire a lock and hold it
    const lock = await fileLockManager.acquireLock(testFile, "holder", 5000)

    // Try to acquire with short timeout
    try {
      await fileLockManager.acquireLock(testFile, "waiter", 100)
      lock.release()
      throw new Error("Expected timeout but lock was acquired")
    } catch (err) {
      if (err instanceof Error && err.message.includes("timeout")) {
        console.log("  ✓ Lock timeout correctly triggered")
        console.log(`  ✓ Error: ${err.message.substring(0, 60)}...`)
        passed++
      } else {
        throw err
      }
    } finally {
      lock.release()
    }
  } catch (error) {
    console.log(`  ✗ Failed: ${error}`)
    failed++
  }

  // Test 6: Check file modified
  console.log("\nTest 6: Check file modified")
  try {
    const read1 = await safeReadFile(testFile, { sessionId: "check-1" })
    const hash1 = read1.hash

    // Modify externally
    fs.writeFileSync(testFile, "External modification")
    contentHashTracker.invalidate(testFile) // Invalidate cache

    const conflictInfo = checkFileModified(testFile, hash1)

    if (!conflictInfo.hasConflict) {
      throw new Error("Expected conflict but none detected")
    }

    console.log("  ✓ External modification detected")
    console.log(`  ✓ Expected: ${hash1}, Current: ${conflictInfo.currentHash}`)
    passed++
  } catch (error) {
    console.log(`  ✗ Failed: ${error}`)
    failed++
  }

  // Test 7: Hash tracker stats
  console.log("\nTest 7: Hash tracker stats")
  try {
    const stats = contentHashTracker.getStats()
    const files = contentHashTracker.getTrackedFiles()

    console.log(`  ✓ Tracked files: ${stats.trackedFiles}`)
    console.log(`  ✓ Oldest entry: ${stats.oldestEntry ? new Date(stats.oldestEntry).toISOString() : "none"}`)
    console.log(`  ✓ File paths: ${files.slice(0, 3).join(", ")}${files.length > 3 ? "..." : ""}`)
    passed++
  } catch (error) {
    console.log(`  ✗ Failed: ${error}`)
    failed++
  }

  // Cleanup
  console.log("\n=== Cleanup ===")
  if (fs.existsSync(testFile)) {
    fs.unlinkSync(testFile)
    console.log("  ✓ Test file removed")
  }
  if (fs.existsSync(testDir)) {
    fs.rmdirSync(testDir)
    console.log("  ✓ Test directory removed")
  }

  // Summary
  console.log("\n=== Summary ===")
  console.log(`  Passed: ${passed}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  Total:  ${passed + failed}`)

  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch((err) => {
  console.error("Test runner error:", err)
  process.exit(1)
})
