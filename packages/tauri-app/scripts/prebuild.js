#!/usr/bin/env node
const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const root = path.resolve(__dirname, "..")
const workspaceRoot = path.resolve(root, "..", "..")
const serverRoot = path.resolve(root, "..", "server")
const uiRoot = path.resolve(root, "..", "ui")
const uiDist = path.resolve(uiRoot, "src", "renderer", "dist")
const serverDest = path.resolve(root, "src-tauri", "resources", "server")
const uiLoadingDest = path.resolve(root, "src-tauri", "resources", "ui-loading")

const sources = ["dist", "public", "node_modules", "package.json"]

function ensureServerBuild() {
  const distPath = path.join(serverRoot, "dist")
  const publicPath = path.join(serverRoot, "public")
  if (fs.existsSync(distPath) && fs.existsSync(publicPath)) {
    return
  }

  console.log("[prebuild] server build missing; running workspace build...")
  execSync("npm --workspace @neuralnomads/codenomad run build", {
    cwd: workspaceRoot,
    stdio: "inherit",
  })

  if (!fs.existsSync(distPath) || !fs.existsSync(publicPath)) {
    throw new Error("[prebuild] server artifacts still missing after build")
  }
}

function ensureUiBuild() {
  const loadingHtml = path.join(uiDist, "loading.html")
  if (fs.existsSync(loadingHtml)) {
    return
  }

  console.log("[prebuild] ui build missing; running workspace build...")
  execSync("npm --workspace @codenomad/ui run build", {
    cwd: workspaceRoot,
    stdio: "inherit",
  })

  if (!fs.existsSync(loadingHtml)) {
    throw new Error("[prebuild] ui loading assets missing after build")
  }
}

function copyServerArtifacts() {
  fs.rmSync(serverDest, { recursive: true, force: true })
  fs.mkdirSync(serverDest, { recursive: true })

  for (const name of sources) {
    const from = path.join(serverRoot, name)
    const to = path.join(serverDest, name)
    if (!fs.existsSync(from)) {
      console.warn(`[prebuild] skipped missing ${from}`)
      continue
    }
    fs.cpSync(from, to, { recursive: true })
    console.log(`[prebuild] copied ${from} -> ${to}`)
  }
}

function copyUiLoadingAssets() {
  const loadingSource = path.join(uiDist, "loading.html")
  const assetsSource = path.join(uiDist, "assets")

  if (!fs.existsSync(loadingSource)) {
    throw new Error("[prebuild] cannot find built loading.html")
  }

  fs.rmSync(uiLoadingDest, { recursive: true, force: true })
  fs.mkdirSync(uiLoadingDest, { recursive: true })

  fs.copyFileSync(loadingSource, path.join(uiLoadingDest, "loading.html"))
  if (fs.existsSync(assetsSource)) {
    fs.cpSync(assetsSource, path.join(uiLoadingDest, "assets"), { recursive: true })
  }

  console.log(`[prebuild] prepared UI loading assets from ${uiDist}`)
}

ensureServerBuild()
ensureUiBuild()
copyServerArtifacts()
copyUiLoadingAssets()
