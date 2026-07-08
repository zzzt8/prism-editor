/**
 * Platform type definitions for cross-platform node execution.
 */

/**
 * Supported execution platforms for node definitions.
 * - 'browser': Client-side execution using Canvas 2D API
 * - 'nodejs': Server-side execution using sharp
 * - 'both': Works on both platforms
 */
export type Platform = 'browser' | 'nodejs' | 'both';

/**
 * NodeDefinition extension for platform support.
 * Re-exported from shared-types for convenience within core package.
 */
export type { NodeDefinition } from '@prism/shared-types';
