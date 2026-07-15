/**
 * Minimal RenderRequest fixture for Chromium tests.
 *
 * This fixture provides a valid RenderRequest for testing the Chromium test host.
 */

import type { RenderRequest, DesignState } from '@prism/shared-types';
import { minimalDesignState, createDesignState } from './minimal-design-state';

/**
 * Minimal RenderRequest with requestedOutputSlots.
 */
export const minimalRenderRequest: RenderRequest = {
  designState: minimalDesignState,
  requestedOutputSlots: ['mockup', 'cutting-preview'],
};

/**
 * Helper to create a custom RenderRequest.
 */
export function createRenderRequest(overrides: {
  designState?: DesignState;
  requestedOutputSlots?: string[];
}): RenderRequest {
  return {
    designState: overrides.designState ?? minimalDesignState,
    requestedOutputSlots: overrides.requestedOutputSlots ?? ['mockup', 'cutting-preview'],
  };
}

/**
 * Create a RenderRequest requesting only specific slots.
 */
export function createRenderRequestWithSlots(
  designState: DesignState,
  slots: string[]
): RenderRequest {
  return createRenderRequest({
    designState,
    requestedOutputSlots: slots,
  });
}

/**
 * Create a RenderRequest requesting a single slot.
 */
export function createSingleSlotRenderRequest(
  designState: DesignState,
  slot: string
): RenderRequest {
  return createRenderRequestWithSlots(designState, [slot]);
}
