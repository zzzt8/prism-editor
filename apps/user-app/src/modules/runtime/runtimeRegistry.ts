// runtimeRegistry - assembles and initializes the node execution registry
//
// Responsibilities:
//   - Initialize globalRegistry with built-in nodes
//   - Assemble the registry before any workflow execution
//   - Provide a single entry point for registry setup
//
// Note: globalRegistry.initialize() is called in main.tsx at app startup.
// This module provides the assembly logic for future extension (e.g., C7 security boundary).

import { globalRegistry } from '@prism/core';

let initialized = false;

export function assembleRegistry(): void {
  if (initialized) {
    return;
  }
  globalRegistry.initialize();
  initialized = true;
}

export function isRegistryReady(): boolean {
  return initialized;
}