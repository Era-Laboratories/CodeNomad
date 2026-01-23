import { FastifyInstance } from "fastify"
import type { EraStatusResponse } from "../../api-types"
import type { EraDetectionService } from "../../era/detection"
import type { Logger } from "../../logger"

interface RouteDeps {
  eraDetection: EraDetectionService
  logger: Logger
}

export function registerEraRoutes(app: FastifyInstance, deps: RouteDeps) {
  const { eraDetection, logger } = deps

  /**
   * GET /api/era/status
   * Returns the era-code installation status and project initialization state
   */
  app.get<{
    Querystring: { folder?: string }
  }>("/api/era/status", async (request) => {
    const folder = request.query.folder

    logger.debug({ folder }, "Checking Era status")

    const binaryInfo = eraDetection.detectBinary()
    const assets = eraDetection.listAssets()

    const response: EraStatusResponse = {
      installed: binaryInfo.installed,
      version: binaryInfo.version,
      binaryPath: binaryInfo.path,
      projectInitialized: folder ? eraDetection.isProjectInitialized(folder) : false,
      assetsAvailable: assets !== null,
    }

    // Add asset counts if available
    if (assets) {
      response.assets = {
        agents: assets.agents.length,
        commands: assets.commands.length,
        skills: assets.skills.length,
        plugins: assets.plugins.length,
      }
    }

    // Add project-specific status if folder provided
    if (folder && response.projectInitialized) {
      const projectStatus = eraDetection.getProjectStatus(folder)
      if (projectStatus) {
        response.project = {
          hasConstitution: (projectStatus.directives?.categoryCount ?? 0) > 0,
          hasDirectives: (projectStatus.directives?.directiveCount ?? 0) > 0,
        }
        // Add manifest version info for outdated detection
        if (projectStatus.manifest) {
          response.manifestVersion = projectStatus.manifest.version
          response.latestVersion = projectStatus.manifest.latestVersion
          response.isManifestOutdated = projectStatus.manifest.version !== projectStatus.manifest.latestVersion
        }
      }
    }

    logger.debug(
      {
        installed: response.installed,
        version: response.version,
        projectInitialized: response.projectInitialized,
      },
      "Era status response"
    )

    return response
  })

  /**
   * GET /api/era/assets
   * Returns detailed information about available era assets
   */
  app.get("/api/era/assets", async () => {
    const binaryInfo = eraDetection.detectBinary()

    if (!binaryInfo.installed) {
      return {
        available: false,
        reason: "era-code is not installed",
      }
    }

    const assets = eraDetection.listAssets()

    if (!assets) {
      return {
        available: false,
        reason: "Era assets not found",
      }
    }

    return {
      available: true,
      assetsPath: binaryInfo.assetsPath,
      agents: assets.agents.map((p) => extractAssetName(p, "agent")),
      commands: assets.commands.map((p) => extractAssetName(p, "command")),
      skills: assets.skills.map((p) => extractSkillName(p)),
      plugins: assets.plugins.map((p) => extractAssetName(p, "plugin")),
    }
  })

  /**
   * GET /api/era/upgrade/check
   * Check if an era-code upgrade is available
   */
  app.get("/api/era/upgrade/check", async () => {
    logger.debug("Checking for era-code upgrade")
    return eraDetection.checkUpgrade()
  })

  /**
   * POST /api/era/upgrade
   * Run era-code upgrade
   */
  app.post("/api/era/upgrade", async () => {
    logger.info("Running era-code upgrade via API")
    return eraDetection.runUpgrade()
  })

  /**
   * POST /api/era/project/update
   * Update project manifest to current era-code version (runs era-code init)
   */
  app.post<{
    Body: { folder: string }
  }>("/api/era/project/update", async (request, reply) => {
    const { folder } = request.body ?? {}
    
    if (!folder) {
      reply.code(400)
      return { error: "folder is required" }
    }

    logger.info({ folder }, "Updating era project manifest via API")
    return eraDetection.ensureProjectUpToDate(folder)
  })
}

/**
 * Extract asset name from path
 * e.g., "/path/to/agent/plan.md" -> "plan"
 */
function extractAssetName(assetPath: string, type: string): string {
  const parts = assetPath.split("/")
  const filename = parts[parts.length - 1]
  return filename.replace(/\.(md|ts)$/, "")
}

/**
 * Extract skill name from directory path
 * e.g., "/path/to/skill/docs-generator" -> "docs-generator"
 */
function extractSkillName(skillPath: string): string {
  const parts = skillPath.split("/")
  return parts[parts.length - 1]
}
