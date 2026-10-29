import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDeliverySnapshot, commerceCartIds, createDeliveryAddressClient, initialDeliverySelection, normalizeDeliveryLocation } from '../services/commerceDeliveryAddresses.js';

const address = { id: 'fixture-home', label: 'Casa', street: 'Calle de prueba', houseNumber: '', latitude: 0, longitude: 0, isDefault: true };
const rows = [{ _id: 'cart-a', type: 'COMERCIO', coordenadas: { latitude: 1, longitude: 2 }, nombreCalle: 'Otra calle', numeroCasa: '3' }, { _id: 'cart-b', type: 'RECARGA' }];

function fixture() {
  const calls = [];
  let userId = 'account-a';
  let respond = (_method, _args) => ({ success: true, address, itemsUpdated: 1, addresses: [address] });
  const client = createDeliveryAddressClient({ getUserId: () => userId, call(method, ...args) {
    const callback = args.pop();
    calls.push({ method, args });
    queueMicrotask(() => { try { callback(null, respond(method, args)); } catch (error) { callback(error); } });
  } });
  return { calls, client, setUser(value) { userId = value; }, setResponse(handler) { respond = handler; } };
}

test('acepta coordenadas cero y rechaza puntos ausentes, fuera de rango o no finitos', () => {
  assert.deepEqual(normalizeDeliveryLocation(address), { latitude: 0, longitude: 0 });
  for (const point of [null, {}, { latitude: null, longitude: 0 }, { latitude: '', longitude: 0 }, { latitude: false, longitude: 0 }, { latitude: NaN, longitude: 0 }, { latitude: 91, longitude: 0 }, { latitude: 0, longitude: -181 }]) assert.equal(normalizeDeliveryLocation(point), null);
});

test('la entrega actual del carrito tiene prioridad; sin ella preselecciona la dirección predeterminada', () => {
  assert.deepEqual(initialDeliverySelection(rows, [address]), { point: { latitude: 1, longitude: 2 }, street: 'Otra calle', houseNumber: '3', addressId: '' });
  assert.deepEqual(initialDeliverySelection([], [address], { latitude: 5, longitude: 5 }), { point: { latitude: 0, longitude: 0 }, street: address.street, houseNumber: '', addressId: address.id });
  assert.deepEqual(initialDeliverySelection([], [], { latitude: 5, longitude: 5 }), { point: { latitude: 5, longitude: 5 }, street: '', houseNumber: '', addressId: '' });
  const existing = [{ _id: 'cart-c', type: 'COMERCIO', coordenadas: { latitude: 0, longitude: 0 }, nombreCalle: address.street, numeroCasa: '' }];
  assert.equal(initialDeliverySelection(existing, [address]).addressId, address.id);
});

test('usa el snapshot confirmado para envío y pago sin modificar otros servicios ni filtrar otra cuenta', () => {
  const snapshot = { userId: 'account-a', cartIds: commerceCartIds(rows), point: { latitude: 0, longitude: 0 }, street: address.street, houseNumber: '' };
  const applied = applyDeliverySnapshot(rows, snapshot, 'account-a');
  assert.equal(applied[0].nombreCalle, address.street);
  assert.deepEqual(applied[0].coordenadas, { latitude: 0, longitude: 0 });
  assert.strictEqual(applied[1], rows[1]);
  assert.equal(rows[0].nombreCalle, 'Otra calle');
  assert.strictEqual(applyDeliverySnapshot(rows, snapshot, 'account-b'), rows);
  const changedCart = [...rows, { _id: 'new-commerce-item', type: 'COMERCIO' }];
  assert.strictEqual(applyDeliverySnapshot(changedCart, snapshot, 'account-a'), changedCart);
});

test('listar, guardar, aplicar y administrar usan los métodos compartidos y la sesión sin enviar un dueño', async () => {
  const f = fixture();
  assert.deepEqual((await f.client.list('account-a')).addresses, [address]);
  await f.client.save('account-a', address);
  await f.client.use('account-a', address.id);
  await f.client.setDefault('account-a', address.id);
  await f.client.remove('account-a', address.id);
  assert.deepEqual(f.calls, [
    { method: 'comercio.deliveryAddresses.list', args: [] },
    { method: 'comercio.deliveryAddresses.save', args: [address] },
    { method: 'comercio.deliveryAddresses.use', args: [address.id] },
    { method: 'comercio.deliveryAddresses.setDefault', args: [address.id] },
    { method: 'comercio.deliveryAddresses.remove', args: [address.id] },
  ]);
});

test('rechaza operaciones y respuestas atrasadas si cambia la cuenta', async () => {
  const f = fixture();
  await assert.rejects(f.client.list('account-b'), { code: 'delivery-address-session-changed' });
  assert.equal(f.calls.length, 0);
  const response = f.client.list('account-a');
  f.setUser('account-b');
  await assert.rejects(response, { code: 'delivery-address-session-changed' });
});

test('un fallo de servidor o una respuesta incompleta impide dar por aplicada la dirección', async () => {
  const f = fixture();
  f.setResponse(() => { throw new Error('Sin conexión de prueba'); });
  await assert.rejects(f.client.save('account-a', address), /Sin conexión/);
  f.setResponse(() => ({}));
  await assert.rejects(f.client.list('account-a'), /cargar/);
  await assert.rejects(f.client.use('account-a', address.id), /confirmar/);
  f.setResponse(() => ({ success: true, address, itemsUpdated: 0 }));
  await assert.rejects(f.client.use('account-a', address.id), /aplicar/);
});

test('la dirección de un solo uso conserva el contrato anterior y no la guarda sin autorización', async () => {
  const f = fixture();
  f.setResponse(() => ({ success: true, itemsActualizados: 2, coordenadas: { latitude: 0, longitude: 0 }, nombreCalle: address.street, numeroCasa: '' }));
  assert.deepEqual(await f.client.applyNew('account-a', address), { point: { latitude: 0, longitude: 0 }, street: address.street, houseNumber: '' });
  assert.deepEqual(f.calls, [{ method: 'carrito.actualizarUbicacion', args: ['account-a', { latitude: 0, longitude: 0, nombreCalle: address.street, numeroCasa: '' }] }]);
  f.setResponse(() => ({ success: false }));
  await assert.rejects(f.client.applyNew('account-a', address), /aplicar/);
});

test('una llamada sin respuesta termina con error recuperable', async () => {
  const client = createDeliveryAddressClient({ getUserId: () => 'account-a', call() {}, timeoutMs: 10 });
  await assert.rejects(client.list('account-a'), /conexión/);
});
