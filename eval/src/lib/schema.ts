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

const validateHarnessCompiled = ajv.compile(harnessSchema);
const validatePluginCompiled = ajv.compile(pluginSchema);

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
