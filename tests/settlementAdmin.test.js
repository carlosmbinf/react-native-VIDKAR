import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSettlementHistoryFilters,
  EMPTY_SETTLEMENT_DESTINATION,
  getRemesaCurrenciesForBalance,
  parseSettlementRemesaOptions,
  validateSettlementDestination,
} from "../services/settlementAdmin.js";

const remesaOptions = {
  currencies: ["CUP", "USD"],
  deliveryMethods: ["EFECTIVO", "TRANSFERENCIA"],
};

test("parses configured remittance currencies and methods without unknown values", () => {
  const options = parseSettlementRemesaOptions([
    { clave: "monedaACobrarEnCuba", valor: '["CUP","USD","CUP","EUR"]' },
    { clave: "metodoPagoEnCuba", valor: '["EFECTIVO","TRANSFERENCIA","PAYPAL"]' },
  ]);

  assert.deepEqual(options, {
    currencies: ["CUP", "USD"],
    deliveryMethods: ["EFECTIVO", "TRANSFERENCIA"],
  });
  assert.throws(
    () => parseSettlementRemesaOptions([{ clave: "monedaACobrarEnCuba", valor: "invalid" }]),
    /formato válido/,
  );
});

test("keeps CUP FONDO remittances in CUP and accepts only a configured delivery method", () => {
  const form = {
    ...EMPTY_SETTLEMENT_DESTINATION,
    method: "REMESA",
    currency: "CUP",
    holderName: "Beneficiario de prueba",
    confirmOwnership: true,
    monedaRecibirEnCuba: "CUP",
    metodoPago: "EFECTIVO",
    direccionCuba: "Direccion de prueba",
  };

  assert.deepEqual(getRemesaCurrenciesForBalance("CUP", remesaOptions), ["CUP"]);
  assert.equal(validateSettlementDestination(form, remesaOptions), "");
  assert.notEqual(
    validateSettlementDestination({ ...form, monedaRecibirEnCuba: "USD" }, remesaOptions),
    "",
  );
});

test("builds global history filters with inclusive valid date bounds", () => {
  const filters = buildSettlementHistoryFilters({
    kind: "REQUESTS",
    domain: "COMERCIO",
    currency: "CUP",
    status: "UNKNOWN",
    paymentType: "PARTIAL",
    paymentMethod: "REMESA",
    from: "2026-05-01",
    to: "2026-05-03",
    search: "  FONDO-ref  ",
  });

  assert.equal(filters.kind, "REQUESTS");
  assert.equal(filters.domain, "COMERCIO");
  assert.equal(filters.paymentMethod, "REMESA");
  assert.equal(filters.search, "FONDO-ref");
  assert.ok(Date.parse(filters.from) < Date.parse(filters.to));
  assert.match(filters.from, /^\d{4}-\d{2}-\d{2}T.*Z$/);
  assert.match(filters.to, /^\d{4}-\d{2}-\d{2}T.*Z$/);
});

test("rejects impossible or reversed history date ranges", () => {
  assert.throws(
    () => buildSettlementHistoryFilters({ from: "2026-02-30", to: "" }),
    /no existe/,
  );
  assert.throws(
    () => buildSettlementHistoryFilters({ from: "2026-05-04", to: "2026-05-03" }),
    /no puede ser posterior/,
  );
});
