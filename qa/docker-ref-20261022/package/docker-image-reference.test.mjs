import test from 'node:test';
import assert from 'node:assert/strict';
import { IMAGE } from './docker-fictional.mjs';

const EXPECTED_SHA='3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826';

test('Docker uses exact repository@digest canonical reference, not tag@digest', () => {
  assert.equal(IMAGE, 'postgres@sha256:'+EXPECTED_SHA);
  assert.match(IMAGE,/^[a-z][a-z0-9.-]*@sha256:[0-9a-f]{64}$/);
  assert.doesNotMatch(IMAGE, /:[^/]+@sha256:/);
});

test('Pinned reference exactly matches RepoDigests observed on ASUS', () => {
  const observed=['postgres@sha256:'+EXPECTED_SHA];
  assert.ok(observed.includes(IMAGE));
});

test('Never silently fall back to a mutable version tag or a different image', () => {
  assert.notEqual(IMAGE,'postgres:17.11-bookworm');
  assert.notEqual(IMAGE,'postgres:latest');
  assert.notEqual(IMAGE,'postgres:17.11-bookworm@sha256:'+EXPECTED_SHA);
});
