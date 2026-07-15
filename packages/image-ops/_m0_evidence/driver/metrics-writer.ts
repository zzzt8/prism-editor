/**
 * M0 Metrics Writer — Atomic metrics.json writer.
 *
 * Reads accumulated scenario results and writes a single metrics.json file.
 * Computes worst-case across all scenarios.
 */

import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

import type {
  M0DiffResult,
  M0MetricsReport,
  M0ScenarioResult,
  M0Thresholds,
  M0WorstCase,
} from '../shared/types';

const SCHEMA_VERSION = '1.0.0';

/**
 * Default thresholds — calibrated to be tightened once real Chromium runs are collected.
 * These are conservative starting values for the M0 measurement pass.
 */
export const M0_THRESHOLDS: M0Thresholds = {
  centerDeltaPx: 4,
  centerDeltaNorm: 0.02,
  boundingBoxDelta: 4,
  alphaMaskIoU: 0.95,
  interiorRgbMae: 5,
  interiorChangedPercent: 5,
  edgeBandRgbMae: 8,
  edgeBandAlphaMae: 5,
};

/**
 * Compute the worst-case scenario across all results.
 */
export function computeWorstCase(scenarios: ReadonlyArray<M0ScenarioResult>): M0WorstCase {
  type MetricField = Exclude<keyof M0DiffResult, 'width' | 'height' | 'outputDimensionsMatch' | 'nonTransparentPixelCount'>;

  const fields: MetricField[] = [
    'centerDeltaPx',
    'centerDeltaNorm',
    'boundingBoxDelta',
    'alphaMaskIoU',
    'interiorRgbMae',
    'interiorChangedPercent',
    'edgeBandRgbMae',
    'edgeBandAlphaMae',
  ];

  // For each field, compute "how close to threshold" ratio. The worst-case is the highest ratio.
  // For alphaMaskIoU (higher is better), use inverse.
  let worstRatio = 0;
  let worst: M0WorstCase = {
    scenario: scenarios[0]?.id ?? 'unknown',
    metric: 'centerDeltaPx',
    value: 0,
    marginToThreshold: 0,
  };

  for (const s of scenarios) {
    for (const field of fields) {
      const value = s.diff[field];
      const threshold = M0_THRESHOLDS[field];
      const ratio = field === 'alphaMaskIoU'
        ? (1 - value) / (1 - threshold)
        : value / threshold;
      if (ratio > worstRatio) {
        worstRatio = ratio;
        worst = {
          scenario: s.id,
          metric: field,
          value,
          marginToThreshold: ratio,
        };
      }
    }
  }

  return worst;
}

/**
 * Hash a file's contents.
 */
export function hashBuffer(buf: Buffer): string {
  return 'sha256:' + createHash('sha256').update(buf).digest('hex');
}

/**
 * Write a single metrics.json that summarizes all scenario results.
 */
export function writeMetricsJson(
  outPath: string,
  scenarios: ReadonlyArray<M0ScenarioResult>,
  thresholds: M0Thresholds = M0_THRESHOLDS,
): void {
  const worst = computeWorstCase(scenarios);
  const report: M0MetricsReport = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    scenarios,
    worstCase: worst,
    thresholds,
  };
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
}
