// Enforces the layering rules statically so a violation fails CI:
//   api -> services -> data -> models   (models are plain data shared by every layer)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : [],
  );
}

function layerOf(file) {
  const rel = path.relative(SRC, file).split(path.sep);
  return rel.length > 1 ? rel[0] : null; // top-level files (config, logger, container, entrypoints) are wiring
}

function importsOf(file) {
  const src = readFileSync(file, 'utf8');
  return [...src.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)].map((m) => m[1]);
}

// Which internal layers / packages each layer may import.
const RULES = {
  api: { layers: ['api', 'models'], forbiddenPackages: ['pg', 'resend'] },
  services: { layers: ['services', 'models'], forbiddenPackages: ['pg', 'express'] },
  data: { layers: ['data', 'models'], forbiddenPackages: ['express', 'resend'] },
  models: { layers: ['models'], forbiddenPackages: ['pg', 'express', 'resend', 'zod'] },
  worker: { layers: ['worker'], forbiddenPackages: ['pg', 'express', 'resend'] },
};

const files = walk(SRC).filter((f) => layerOf(f));

test('every source file belongs to a known layer', () => {
  for (const file of files) assert.ok(RULES[layerOf(file)], `Unknown layer for ${file}`);
});

test('layers only import the layers they are allowed to', () => {
  const violations = [];
  for (const file of files) {
    const layer = layerOf(file);
    for (const spec of importsOf(file)) {
      if (spec.startsWith('.')) {
        const target = path.resolve(path.dirname(file), spec);
        const targetLayer = layerOf(target) ?? 'root';
        if (!RULES[layer].layers.includes(targetLayer)) {
          violations.push(`${path.relative(SRC, file)} (${layer}) imports ${spec} (${targetLayer})`);
        }
      } else if (RULES[layer].forbiddenPackages.includes(spec)) {
        violations.push(`${path.relative(SRC, file)} (${layer}) imports package "${spec}"`);
      }
    }
  }
  assert.deepEqual(violations, []);
});

test('no SQL outside the data layer', () => {
  const sql = /\b(SELECT\s+[\w*]|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/;
  const offenders = walk(SRC)
    .filter((f) => layerOf(f) !== 'data')
    .filter((f) => sql.test(readFileSync(f, 'utf8')));
  assert.deepEqual(offenders.map((f) => path.relative(SRC, f)), []);
});

test('no HTTP concerns outside the api layer', () => {
  const http = /\b(req|res)\.(status|json|send|body|params|query)\b/;
  const offenders = walk(SRC)
    .filter((f) => layerOf(f) && layerOf(f) !== 'api')
    .filter((f) => http.test(readFileSync(f, 'utf8')));
  assert.deepEqual(offenders.map((f) => path.relative(SRC, f)), []);
});
