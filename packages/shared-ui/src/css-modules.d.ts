/**
 * CSS Module type declarations.
 * Enables importing .module.css files in TypeScript.
 */
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}
