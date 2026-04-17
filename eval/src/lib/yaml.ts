import { parse } from 'yaml';

/**
 * Parse a YAML string into an object.
 *
 * Note: The spec requires version: "1" (string), not version: 1 (integer).
 * YAML naturally parses bare `1` as a number. This wrapper does NOT coerce
 * integers to strings — that would mask invalid documents. The schema validator
 * catches integer versions and rejects them.
 */
export function parseYaml(input: string): unknown {
  return parse(input);
}

/**
 * Parse a YAML string into a HarnessDocument (unvalidated).
 * Call validateHarness() from schema.ts after parsing to validate.
 */
export function parseHarnessYaml(input: string): unknown {
  return parseYaml(input);
}
