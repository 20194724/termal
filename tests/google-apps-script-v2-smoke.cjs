const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync("google-apps-script/Code.gs", "utf8");
const context = vm.createContext({
  console,
  Utilities: {
    getUuid() {
      return "uuid_test";
    },
    formatDate(value) {
      return new Date(value).toISOString().slice(0, 10);
    }
  },
  LockService: {
    getScriptLock() {
      return { waitLock() {}, releaseLock() {} };
    }
  },
  PropertiesService: {
    getScriptProperties() {
      return { setProperty() {}, getProperty() { return ""; } };
    }
  }
});
vm.runInContext(source, context);

const frontendContext = vm.createContext({ console, Intl, Date, crypto: {} });
vm.runInContext(fs.readFileSync("utils.js", "utf8"), frontendContext);

function evaluate(expression) {
  return vm.runInContext(expression, context);
}

function calculate(sale) {
  return JSON.parse(evaluate(`JSON.stringify(calculateSale_(${JSON.stringify(sale)}))`));
}

function calculateFrontend(sale) {
  frontendContext.inputSale = sale;
  return JSON.parse(vm.runInContext("JSON.stringify(TermalUtils.calculateSale(inputSale))", frontendContext));
}

const paidSale = calculate({
  id: "sale_paid",
  active: true,
  fecha: "2026-07-30",
  codigo: "101",
  cliente: "Cliente prueba",
  tipoProducto: "Termo 1200 ml",
  colorProducto: "Negro",
  disenoProducto: "One Piece Luffy",
  cantidad: 1,
  ventaTotal: 149.9,
  adelanto: 19.9,
  cuentaAdelanto: "Gonzalo",
  pagosDetalle: [
    { id: "p2", monto: 50, cuenta: "Gonzalo", fecha: "2026-07-30" },
    { id: "p3", monto: 80, cuenta: "DINSIDES", fecha: "2026-07-30" }
  ],
  costoEnvio: 12,
  pagadorLogistica: "Gonzalo"
});

assert.strictEqual(paidSale.pagosDetalle.length, 2, "Debe conservar pagos posteriores ilimitados");
assert.strictEqual(paidSale.saldoCobrado, 130, "Saldo cobrado debe sumar los pagos detallados");
assert.strictEqual(paidSale.cobradoTotal, 149.9, "Cobrado debe incluir adelanto y pagos posteriores");
assert.strictEqual(paidSale.porCobrar, 0, "El pedido debe quedar completamente cobrado");
assert.strictEqual(paidSale.gonzaloDebeDevolver, 57.9, "Caja debe considerar lo cobrado y el envío pagado");

const frontendPaidSale = calculateFrontend({
  id: "sale_paid",
  active: true,
  fecha: "2026-07-30",
  codigo: "101",
  cliente: "Cliente prueba",
  tipoProducto: "Termo 1200 ml",
  colorProducto: "Negro",
  disenoProducto: "One Piece Luffy",
  cantidad: 1,
  ventaTotal: 149.9,
  adelanto: 19.9,
  cuentaAdelanto: "Gonzalo",
  pagosDetalle: [
    { id: "p2", monto: 50, cuenta: "Gonzalo", fecha: "2026-07-30" },
    { id: "p3", monto: 80, cuenta: "DINSIDES", fecha: "2026-07-30" }
  ],
  costoEnvio: 12,
  pagadorLogistica: "Gonzalo"
});
[
  "cobradoTotal", "porCobrar", "costoProduccion", "costoTotal", "utilidad",
  "gonzaloDebeDevolver", "albertoDebeDevolver", "dinsidesDebeDepositar",
  "termalDebePagarDinsides"
].forEach((field) => {
  assert.strictEqual(paidSale[field], frontendPaidSale[field], `Frontend y backend deben coincidir en ${field}`);
});

const expenseOnlySale = calculate({
  id: "sale_expense",
  active: true,
  fecha: "2026-07-30",
  codigo: "102",
  cliente: "Cliente envío",
  tipoProducto: "Termo 890 ml",
  colorProducto: "Crema",
  disenoProducto: "Jujutsu Kaisen Toji",
  cantidad: 1,
  ventaTotal: 89.9,
  adelanto: 0,
  pagosDetalle: [],
  costoEnvio: 12,
  pagadorLogistica: "Gonzalo"
});

assert.strictEqual(
  expenseOnlySale.gonzaloDebeDevolver,
  -12,
  "Un envío pagado personalmente debe producir un saldo negativo"
);

const roundTrip = JSON.parse(evaluate(`(() => {
  const sale = ${JSON.stringify(paidSale)};
  const row = objectToRow_(sale, SALES_HEADERS);
  return JSON.stringify(rowToObject_(row, SALES_HEADERS));
})()`));
assert.strictEqual(roundTrip.pagosDetalle.length, 2, "Google Sheets debe conservar el JSON de pagos");

const afterReimbursement = evaluate(`cashBalanceForPerson_(
  [${JSON.stringify(expenseOnlySale)}],
  [{
    persona: "Gonzalo",
    naturaleza: "TERMAL_TO_PERSON",
    amount: 12,
    signedAmount: 12,
    affectsCash: true,
    schemaVersion: 2
  }],
  "Gonzalo"
)`);
assert.strictEqual(afterReimbursement, 0, "El reembolso de Termal debe llevar el saldo negativo a cero");

const legacyIgnored = evaluate(`cashBalanceForPerson_(
  [${JSON.stringify(expenseOnlySale)}],
  [{ type: "GONZALO_RETURN", amount: 12 }],
  "Gonzalo"
)`);
assert.strictEqual(legacyIgnored, -12, "Los movimientos históricos no deben contarse dos veces");

assert.ok(source.includes('case "createCashMovement"'), "La API real debe exponer createCashMovement");
assert.ok(source.includes("function prepararActualizacionV2()"), "Debe existir una migración v2 sin rotar la clave");
assert.ok(source.includes("isCurrentSchemaPrefix"), "La migración debe ser aditiva para el esquema vigente");

const headerCounts = JSON.parse(evaluate(`JSON.stringify({
  sales: SALES_HEADERS.length,
  movements: MOVEMENT_HEADERS.length,
  payment: SALES_HEADERS.some(function (item) { return item[0] === "pagosDetalle"; }),
  agreedDate: SALES_HEADERS.some(function (item) { return item[0] === "fechaAcordadaEntrega"; }),
  signedAmount: MOVEMENT_HEADERS.some(function (item) { return item[0] === "signedAmount"; })
})`));
assert.strictEqual(headerCounts.payment, true);
assert.strictEqual(headerCounts.agreedDate, true);
assert.strictEqual(headerCounts.signedAmount, true);

const salesMigration = JSON.parse(evaluate(`(() => {
  const legacyHeaders = SALES_HEADERS.slice(0, SALES_HEADERS.length - 7).map(function (item) { return item[1]; });
  const writes = [];
  let cleared = false;
  const range = function (row, column, rows, columns) {
    const api = {
      getDisplayValues: function () { return [legacyHeaders]; },
      setValues: function (values) { writes.push({ row, column, rows, columns, values }); return api; },
      setFontWeight: function () { return api; },
      setBackground: function () { return api; },
      setFontColor: function () { return api; },
      setWrap: function () { return api; },
      setNumberFormat: function () { return api; },
      createFilter: function () { return api; }
    };
    return api;
  };
  const sheet = {
    getMaxColumns: function () { return 100; },
    getMaxRows: function () { return 10; },
    getLastRow: function () { return 2; },
    getLastColumn: function () { return legacyHeaders.length; },
    getRange: range,
    getFilter: function () { return null; },
    setFrozenRows: function () {},
    setRowHeight: function () {},
    clear: function () { cleared = true; }
  };
  ensureSalesSheet_({ getSheetByName: function () { return sheet; } });
  return JSON.stringify({ cleared, writes });
})()`));
assert.strictEqual(salesMigration.cleared, false, "La actualización v2 no debe limpiar la hoja Ventas");
assert.strictEqual(salesMigration.writes[0].column, headerCounts.sales - 6, "Debe empezar a escribir tras el último encabezado antiguo");
assert.strictEqual(salesMigration.writes[0].values[0].length, 7, "Debe agregar solo las siete columnas nuevas");

const movementsMigration = JSON.parse(evaluate(`(() => {
  const legacyHeaders = MOVEMENT_HEADERS.slice(0, 7).map(function (item) { return item[1]; });
  const writes = [];
  const range = function (row, column, rows, columns) {
    const api = {
      getDisplayValues: function () { return [legacyHeaders]; },
      setValues: function (values) { writes.push({ row, column, rows, columns, values }); return api; },
      setFontWeight: function () { return api; },
      setBackground: function () { return api; },
      setFontColor: function () { return api; }
    };
    return api;
  };
  const sheet = {
    getMaxColumns: function () { return 30; },
    getLastRow: function () { return 2; },
    getLastColumn: function () { return legacyHeaders.length; },
    getRange: range,
    setFrozenRows: function () {}
  };
  ensureMovementsSheet_({ getSheetByName: function () { return sheet; } });
  return JSON.stringify({ writes });
})()`));
assert.strictEqual(movementsMigration.writes[0].column, 8, "Las columnas nuevas de Caja deben añadirse al final");
assert.strictEqual(movementsMigration.writes[0].values[0].length, 12, "Debe agregar doce columnas de Caja");

class FakeSheet {
  constructor(rows) {
    this.rows = rows;
  }

  getLastRow() {
    return this.rows.length;
  }

  getRange(row, column, rowCount, columnCount) {
    return {
      getValues: () => Array.from({ length: rowCount }, (_, rowOffset) =>
        Array.from({ length: columnCount }, (_, columnOffset) =>
          this.rows[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? ""
        )
      ),
      setValues: (values) => {
        values.forEach((valuesRow, rowOffset) => {
          const targetRow = row - 1 + rowOffset;
          if (!this.rows[targetRow]) this.rows[targetRow] = [];
          valuesRow.forEach((value, columnOffset) => {
            this.rows[targetRow][column - 1 + columnOffset] = value;
          });
        });
      }
    };
  }

  appendRow(row) {
    this.rows.push([...row]);
  }
}

const salesHeaderLabels = JSON.parse(evaluate("JSON.stringify(SALES_HEADERS.map(function (item) { return item[1]; }))"));
const movementHeaderLabels = JSON.parse(evaluate("JSON.stringify(MOVEMENT_HEADERS.map(function (item) { return item[1]; }))"));
context.inputSaleForRow = expenseOnlySale;
const expenseOnlyRow = JSON.parse(evaluate("JSON.stringify(objectToRow_(inputSaleForRow, SALES_HEADERS))"));
const salesSheet = new FakeSheet([salesHeaderLabels, expenseOnlyRow]);
const movementsSheet = new FakeSheet([movementHeaderLabels]);
context.fakeSpreadsheet = {
  getSheetByName(name) {
    if (name === "Ventas") return salesSheet;
    if (name === "Movimientos") return movementsSheet;
    throw new Error(`Hoja inesperada: ${name}`);
  }
};
evaluate("getSpreadsheet_ = function () { return fakeSpreadsheet; }");
context.cashMovementPayload = {
  persona: "Gonzalo",
  naturaleza: "TERMAL_TO_PERSON",
  amount: 12,
  date: "2026-07-30",
  concepto: "Reembolso de envío",
  saleId: "sale_expense",
  metodoPago: "Yape",
  note: "Prueba de integración"
};
const createdCashMovement = JSON.parse(evaluate(
  'JSON.stringify(routeAction_("createCashMovement", { movement: cashMovementPayload }))'
));
assert.strictEqual(createdCashMovement.movement.saldoAnterior, -12, "La acción real debe leer el saldo anterior");
assert.strictEqual(createdCashMovement.movement.saldoPosterior, 0, "La acción real debe guardar el saldo posterior");
assert.strictEqual(movementsSheet.rows.length, 2, "La acción real debe agregar una fila a Movimientos");
assert.strictEqual(movementsSheet.rows[1].length, headerCounts.movements, "La fila debe usar el esquema v2 completo");

console.log(JSON.stringify({
  salesHeaders: headerCounts.sales,
  movementHeaders: headerCounts.movements,
  payments: paidSale.pagosDetalle.length,
  negativeBalance: expenseOnlySale.gonzaloDebeDevolver,
  result: "OK"
}, null, 2));
