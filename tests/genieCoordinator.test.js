import test from 'node:test';
import assert from 'node:assert/strict';
import { createGenieCoordinator } from '../components/Main/genie/genieCoordinator.js';
import { getGenieCaptureSize } from '../components/Main/genie/genieCapture.js';

test('limits captures and allows new ones once a capture completes', () => {
  const coordinator = createGenieCoordinator();
  assert.equal(coordinator.acquire(), true);
  assert.equal(coordinator.acquire(), true);
  assert.equal(coordinator.acquire(), false);
  coordinator.release();
  assert.equal(coordinator.acquire(), true);
  assert.equal(coordinator.acquire(), false);
});

test('cancels mounted entrances and keeps seen identities across refresh', () => {
  const coordinator = createGenieCoordinator();
  coordinator.seen.add('welcome');
  let canceled = 0;
  const unregister = coordinator.register(() => canceled++);
  coordinator.cancelAll();
  unregister();
  coordinator.cancelAll();
  assert.equal(canceled, 1);
  assert.equal(coordinator.seen.has('welcome'), true);
  assert.equal(createGenieCoordinator().seen.has('welcome'), false);
});

test('keeps iOS ViewShot output to two physical pixels per logical pixel', () => {
  assert.deepEqual(getGenieCaptureSize(402, 533, 'ios', 3), { width: 268, height: 355 });
});

test('keeps Android ViewShot output in bitmap pixels and respects size caps', () => {
  assert.deepEqual(getGenieCaptureSize(402, 533, 'android', 3), { width: 804, height: 1066 });
  assert.deepEqual(getGenieCaptureSize(402, 900, 'android', 3), { width: 643, height: 1440 });
});
