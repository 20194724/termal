const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");

function storage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

const context = {
  console,
  crypto: require("node:crypto").webcrypto,
  Date,
  Intl,
  Math,
  JSON,
  Object,
  Array,
  String,
  Number,
  Boolean,
  RegExp,
  setTimeout,
  clearTimeout,
  localStorage: storage(),
  sessionStorage: storage(),
  CONFIG: {
    API_URL: "PEGAR_AQUI_URL_DE_GOOGLE_APPS_SCRIPT",
    DEMO_STORAGE_KEY: "termal_phase9_smoke",
    REQUEST_TIMEOUT_MS: 1000
  }
};
context.globalThis = context;
vm.createContext(context);

for (const file of ["utils.js", "demo-data.js", "api.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

(async () => {
  const U = context.TermalUtils;
  const API = context.TermalAPI;
  const initial = await API.request("getAll");
  const initialGonzalo = U.cashBalances(initial.sales, initial.movements)
    .find((item) => item.person === "Gonzalo").balance;

  const reimbursement = await API.request("createCashMovement", {
    movement: {
      persona: "Gonzalo",
      naturaleza: "TERMAL_TO_PERSON",
      amount: 12,
      date: U.today(),
      saleId: initial.sales[0].id,
      concepto: "Reembolso de prueba",
      metodoPago: "Yape",
      note: "Operación 123"
    }
  });
  assert.equal(reimbursement.movement.signedAmount, 12);
  assert.equal(reimbursement.movement.saldoAnterior, initialGonzalo);
  assert.equal(reimbursement.movement.saldoPosterior, U.money(initialGonzalo + 12));
  assert.equal(reimbursement.movement.codigo, initial.sales[0].codigo);
  assert.equal(reimbursement.movement.cliente, initial.sales[0].cliente);
  assert.equal(reimbursement.movement.affectsCash, true);
  assert.equal(reimbursement.movement.schemaVersion, 2);

  const afterReimbursement = await API.request("getAll");
  const updatedGonzalo = U.cashBalances(afterReimbursement.sales, afterReimbursement.movements)
    .find((item) => item.person === "Gonzalo").balance;
  assert.equal(updatedGonzalo, U.money(initialGonzalo + 12));

  const expense = await API.request("createCashMovement", {
    movement: {
      persona: "Alberto",
      naturaleza: "PERSON_EXPENSE",
      amount: 7,
      date: U.today(),
      concepto: "Movilidad"
    }
  });
  assert.equal(expense.movement.signedAmount, -7);
  assert.equal(expense.movement.saldoPosterior, U.money(expense.movement.saldoAnterior - 7));

  await assert.rejects(
    API.request("createCashMovement", {
      movement: {
        persona: "Gonzalo",
        naturaleza: "PERSON_TO_TERMAL",
        amount: 0,
        concepto: "Inválido"
      }
    }),
    (error) => error.code === "VALIDATION_ERROR"
  );

  const next = await API.request("nextCode");
  assert.equal(next.code, "13", "El siguiente pedido de la demo debe ser 13");
  const created = await API.request("createSale", {
    sale: U.calculateSale({
      fecha: U.today(),
      codigo: next.code,
      cliente: "Prueba Fase 9",
      tipoProducto: "Termo 1200 ml",
      colorProducto: "Negro",
      disenoProducto: "One Piece Luffy",
      producto: "OP-L-N-1200",
      cantidad: 1,
      ventaTotal: 119.9,
      adelanto: 19.9,
      cuentaAdelanto: "Gonzalo",
      estadoPedido: "Producción",
      canal: "Instagram",
      active: true
    })
  });
  assert.equal(created.codigo, "13");
  assert.equal(created.porCobrar, 100);

  await assert.rejects(
    API.request("createSale", { sale: created }),
    (error) => error.code === "VALIDATION_ERROR" && error.message.includes("ya existe")
  );

  const updated = await API.request("updateSale", {
    sale: {
      ...created,
      cliente: "Prueba actualizada",
      pagosDetalle: [{
        id: "pago_phase9",
        monto: 50,
        cuenta: "Alberto",
        fecha: U.today()
      }]
    }
  });
  assert.equal(updated.cliente, "Prueba actualizada");
  assert.equal(updated.cobradoTotal, 69.9);
  assert.equal(updated.porCobrar, 50);

  const archived = await API.request("archiveSale", { id: created.id });
  assert.equal(archived.active, false);
  const restored = await API.request("restoreSale", { id: created.id });
  assert.equal(restored.active, true);

  const ready = initial.sales.find((sale) => sale.estadoPedido === "Por despachar");
  const dispatch = await API.request("createDispatch", {
    dispatch: { saleIds: [ready.id], fecha: U.today() }
  });
  assert.equal(dispatch.sales.length, 1);
  assert.equal(dispatch.sales[0].estadoPedido, "Despachado");

  const persisted = await API.request("getAll");
  assert.ok(persisted.sales.some((sale) => sale.id === created.id && sale.cliente === "Prueba actualizada"));
  assert.equal(persisted.movements.length, 2);

  console.log(JSON.stringify({
    movimientosNuevos: 2,
    pedidosProbados: 1,
    despachoProbado: 1,
    saldoGonzaloAntes: initialGonzalo,
    saldoGonzaloDespues: updatedGonzalo,
    resultado: "OK"
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
