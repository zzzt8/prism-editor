/**
 * M0 Shared Types — Common types used by both Browser and Node workflows.
 *
 * Constraint: This file must be pure TypeScript / JavaScript with no platform
 * dependencies. Allowed: ImageData, Uint8ClampedArray, primitives.
 * Forbidden: Sharp, fs/path, canvas npm, Node Buffer, DOM, executor implementations.
 */

export interface M0TransformParams {
  readonly translateX: number;
  readonly translateY: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly rotation: number;
  readonly cropX?: number;
  readonly cropY?: number;
  readonly cropWidth?: number;
  readonly cropHeight?: number;
}

export interface M0CompositeParams {
  readonly blendMode: string;
  readonly opacity: number;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly overlayX: number;
  readonly overlayY: number;
}

export interface M0Scenario {
  readonly id: string;
  readonly name: string;
  readonly transformParams: M0TransformParams;
  readonly compositeParams: M0CompositeParams;
}

export interface M0FixtureSpec {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly regions: ReadonlyArray<M0FixtureRegion>;
}

export interface M0FixtureRegion {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface M0BoundingBox {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export interface M0GeometryMetrics {
  readonly normalizedCenterX: number;
  readonly normalizedCenterY: number;
  readonly normalizedWidth: number;
  readonly normalizedHeight: number;
  readonly alphaBoundingBox: M0BoundingBox;
  readonly alphaPixelCount: number;
}

export interface M0DiffResult {
  readonly centerDeltaPx: number;
  readonly centerDeltaNorm: number;
  readonly boundingBoxDelta: number;
  readonly alphaMaskIoU: number;
  readonly interiorRgbMae: number;
  readonly interiorChangedPercent: number;
  readonly edgeBandRgbMae: number;
  readonly edgeBandAlphaMae: number;
  readonly nonTransparentPixelCount: number;
  readonly outputDimensionsMatch: boolean;
  readonly width: number;
  readonly height: number;
}

export interface M0ScenarioResult {
  readonly id: string;
  readonly name: string;
  readonly browser: M0ImageRef;
  readonly node: M0ImageRef;
  readonly diff: M0DiffResult;
  readonly hashes: M0ScenarioHashes;
}

export interface M0ImageRef {
  readonly width: number;
  readonly height: number;
  readonly nonTransparentPixelCount: number;
  readonly filePath: string;
  readonly fileHash: string;
}

export interface M0ScenarioHashes {
  readonly fixture: string;
  readonly workflow: string;
}

export interface M0Thresholds {
  readonly centerDeltaPx: number;
  readonly centerDeltaNorm: number;
  readonly boundingBoxDelta: number;
  readonly alphaMaskIoU: number;
  readonly interiorRgbMae: number;
  readonly interiorChangedPercent: number;
  readonly edgeBandRgbMae: number;
  readonly edgeBandAlphaMae: number;
}

export interface M0MetricsReport {
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly scenarios: ReadonlyArray<M0ScenarioResult>;
  readonly worstCase: M0WorstCase;
  readonly thresholds: M0Thresholds;
}

export interface M0WorstCase {
  readonly scenario: string;
  readonly metric: keyof M0DiffResult;
  readonly value: number;
  readonly marginToThreshold: number;
}
