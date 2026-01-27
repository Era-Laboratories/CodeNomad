/**
 * UI Actions Store
 *
 * Global store for triggering UI actions from anywhere in the app.
 * Used for cross-component communication without prop drilling.
 */

import { createSignal } from "solid-js"

// Model selector action
const [modelSelectorRequested, setModelSelectorRequested] = createSignal(false)
const [continueAfterModelSwitch, setContinueAfterModelSwitch] = createSignal(false)

/**
 * Request to open the model selector.
 * @param continueSession - If true, will send "continue" message after model switch
 */
export function requestModelSelector(continueSession = false) {
  console.log("[ui-actions] requestModelSelector called with continueSession:", continueSession)
  setContinueAfterModelSwitch(continueSession)
  setModelSelectorRequested(true)
  console.log("[ui-actions] modelSelectorRequested is now:", modelSelectorRequested())
}

/**
 * Acknowledge the model selector request (call when opening the modal)
 */
export function acknowledgeModelSelectorRequest() {
  const shouldContinue = continueAfterModelSwitch()
  setModelSelectorRequested(false)
  return shouldContinue
}

/**
 * Get the model selector requested signal accessor for direct use in effects
 */
export const modelSelectorRequestedSignal = modelSelectorRequested

/**
 * Check if model selector was requested
 */
export function isModelSelectorRequested() {
  return modelSelectorRequested()
}

/**
 * Check if we should continue session after model switch
 */
export function shouldContinueAfterSwitch() {
  return continueAfterModelSwitch()
}

/**
 * Clear the continue flag after handling
 */
export function clearContinueFlag() {
  setContinueAfterModelSwitch(false)
}

// Instance info modal action
const [instanceInfoRequested, setInstanceInfoRequested] = createSignal(false)

/**
 * Request to open the instance info modal.
 * Works independently of backend status - uses cached instance data.
 */
export function requestInstanceInfo() {
  console.log("[ui-actions] requestInstanceInfo called")
  setInstanceInfoRequested(true)
  console.log("[ui-actions] instanceInfoRequested is now:", instanceInfoRequested())
}

/**
 * Acknowledge the instance info request (call when opening the modal)
 */
export function acknowledgeInstanceInfoRequest() {
  setInstanceInfoRequested(false)
}

/**
 * Get the instance info requested signal accessor for direct use in effects
 */
export const instanceInfoRequestedSignal = instanceInfoRequested

/**
 * Check if instance info modal was requested
 */
export function isInstanceInfoRequested() {
  return instanceInfoRequested()
}
