/**
 * M0 Shared Module — Public index for both Browser (ES module imports) and Node.
 *
 * Browser side: loaded by browser-runtime-host.html via <script type="module">.
 * Node side: imported by m0-driver.ts via direct ES import.
 */

export * from './types';
export { M0_SCENARIOS, getScenarioById } from './scenarios';
export {
  buildLShapedBase,
  buildUserImage,
  buildFixtureImageData,
  getLShapedBaseSpec,
  getUserImageSpec,
  getBaseBackgroundRgb,
  getUserBaseRgb,
  getFixtureConstants,
} from './fixtures';
export { fixtureHash, workflowHash, scenarioHash } from './workflow-hash';
