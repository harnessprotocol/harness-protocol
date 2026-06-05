import { Ajv2020 } from 'ajv/dist/2020.js';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { ErrorObject } from 'ajv';
import type { FormatsPlugin } from 'ajv-formats';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaDir = join(__dirname, '../../../schema/draft');

// ajv-formats is a CJS module. Using createRequire is the canonical NodeNext
// pattern for consuming CJS modules that don't have proper ESM interop types.
const require = createRequire(import.meta.url);
const addFormats = require('ajv-formats') as FormatsPlugin;

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const harnessSchema = JSON.parse(
  readFileSync(join(schemaDir, 'harness.schema.json'), 'utf-8')
);
const pluginSchema = JSON.parse(
  readFileSync(join(schemaDir, 'plugin.schema.json'), 'utf-8')
);
const exchangeSchema = JSON.parse(
  readFileSync(join(schemaDir, 'exchange.schema.json'), 'utf-8')
);
const registrySchema = JSON.parse(
  readFileSync(join(schemaDir, 'registry.schema.json'), 'utf-8')
);

const validateHarnessCompiled = ajv.compile(harnessSchema);
const validatePluginCompiled = ajv.compile(pluginSchema);
const validateExchangeCompiled = ajv.compile(exchangeSchema);
const validateRegistryCompiled = ajv.compile(registrySchema);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateHarness(doc: unknown): ValidationResult {
  const valid = validateHarnessCompiled(doc);
  return {
    valid,
    errors: valid ? [] : (validateHarnessCompiled.errors ?? []).map(
      (e: ErrorObject) => `${e.instancePath} ${e.message}`
    ),
  };
}

export function validatePlugin(doc: unknown): ValidationResult {
  const valid = validatePluginCompiled(doc);
  return {
    valid,
    errors: valid ? [] : (validatePluginCompiled.errors ?? []).map(
      (e: ErrorObject) => `${e.instancePath} ${e.message}`
    ),
  };
}

// Validates an Exchange-layer offer envelope against exchange.schema.json.
// The envelope's wrapped fragment is opaque to this schema — callers that
// need to confirm the fragment is itself well-formed validate it separately
// with validateHarness (the spec requires both checks before apply).
export function validateExchange(doc: unknown): ValidationResult {
  const valid = validateExchangeCompiled(doc);
  return {
    valid,
    errors: valid ? [] : (validateExchangeCompiled.errors ?? []).map(
      (e: ErrorObject) => `${e.instancePath} ${e.message}`
    ),
  };
}

// Validates a Registry-layer document — a transparency-log entry (index or
// delist event) or a registration request/response body — against
// registry.schema.json. The document is valid if it matches exactly one of
// those shapes.
export function validateRegistry(doc: unknown): ValidationResult {
  const valid = validateRegistryCompiled(doc);
  return {
    valid,
    errors: valid ? [] : (validateRegistryCompiled.errors ?? []).map(
      (e: ErrorObject) => `${e.instancePath} ${e.message}`
    ),
  };
}
