const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({
  console,
  crypto: { randomUUID: () => "test-uuid" },
  globalThis: null,
  Intl,
  Date,
  URLSearchParams
});
context.globalThis = context;
vm.runInContext(fs.readFileSync(path.join(root, "utils.js"), "utf8"), context, { filename: "utils.js" });
vm.runInContext(fs.readFileSync(path.join(root, "business.js"), "utf8"), context, { filename: "business.js" });

const B = context.TermalBusiness;

const b2b = B.calculateB2B({
  id: "b2b-1",
  codigo: "B2B-001",
  fecha: "2026-05-14",
  fechaEntregaAcordada: "2026-05-21",
  empresa: "SERVICIOS INEFABLES SAC",
  aplicaIgv: true,
  items: [
    { id: "i1", descripcion: "Termo crema", cantidad: 9, precioUnitario: 75, costoTermoUnitario: 19, costoGrabadoUnitario: 20, costoCajaUnitario: 2.2 },
    { id: "i2", descripcion: "Termo negro", cantidad: 33, precioUnitario: 50, costoTermoUnitario: 19, costoGrabadoUnitario: 8, costoCajaUnitario: 2.2 }
  ],
  gastoAdminVentas: 100,
  gastoLogistico: 30,
  pagos: [{ id: "p1", fecha: "2026-05-14", monto: 1000, cuenta: "Gonzalo" }]
});

assert.equal(b2b.cantidadTotal, 42);
assert.equal(b2b.ventaSinIgv, 2325);
assert.equal(b2b.igv, 418.5);
assert.equal(b2b.ventaTotal, 2743.5);
assert.equal(b2b.costoProductos, 1334.4);
assert.equal(b2b.costoTotal, 1464.4);
assert.equal(b2b.utilidad, 860.6);
assert.equal(b2b.cobrado, 1000);
assert.equal(b2b.porCobrar, 1743.5);
const warningDelivery = B.b2bDeliveryStatus({ fechaEntregaAcordada: "2026-05-21" }, "2026-05-14");
assert.equal(warningDelivery.key, "warning");
assert.equal(warningDelivery.label, "Faltan 7 días");
assert.equal(warningDelivery.days, 7);
assert.equal(B.b2bDeliveryStatus({ fechaEntregaAcordada: "2026-05-21" }, "2026-05-18").key, "danger");
assert.equal(B.b2bDeliveryStatus({ fechaEntregaAcordada: "2026-05-21", fechaEntregaReal: "2026-05-20" }, "2026-05-18").key, "delivered");

const purchase = B.calculatePurchase({
  id: "purchase-1", fecha: "2026-05-15", categoria: "Termos", producto: "Termos 890 ml",
  proveedor: "ZOEFER", cantidad: 36, costoUnitario: 19, incluyeIgv: true,
  pagos: [{ id: "pp1", fecha: "2026-05-15", monto: 300, cuenta: "Alberto" }]
});
assert.equal(purchase.costoTotal, 684);
assert.equal(purchase.pagado, 300);
assert.equal(purchase.porPagar, 384);
assert.equal(purchase.valorSinIgv, 579.66);
assert.equal(purchase.igv, 104.34);

const marketing = B.calculateMarketing({
  id: "marketing-1", fecha: "2026-04-09", categoria: "Meta ads", dolares: 7.18,
  tipoCambio: 3.46, soles: 999, detalle: "Campaña", pagadoPor: "Gonzalo"
});
assert.equal(marketing.soles, 24.84, "El tipo de cambio manual debe definir el gasto en soles");

const cash = B.cashMovements([b2b], [purchase], [marketing]);
assert.equal(cash.find((item) => item.id.startsWith("b2b_pago")).signedAmount, 1000);
assert.equal(cash.find((item) => item.id.startsWith("compra_pago")).signedAmount, -300);
assert.equal(cash.find((item) => item.id.startsWith("marketing_")).signedAmount, -24.84);

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const backend = fs.readFileSync(path.join(root, "google-apps-script", "Code.gs"), "utf8");
assert.match(html, /data-route="empresas"/);
assert.match(html, /data-route="compras"/);
assert.match(html, /data-route="marketing"/);
assert.ok(!app.includes('value="Ambos"'));
assert.ok(!app.includes("Parchado"));
assert.ok(!app.includes('name="cincuentaPorCiento"'));
assert.match(app, /data-business-mix-chart/);
assert.match(app, /business-delivery-warning/);
assert.match(backend, /function prepararActualizacionV3\(\)/);
assert.match(backend, /case "saveB2B"/);
assert.match(backend, /case "savePurchase"/);
assert.match(backend, /case "saveMarketing"/);

console.log(JSON.stringify({
  b2bVenta: b2b.ventaTotal,
  b2bUtilidad: b2b.utilidad,
  compraPendiente: purchase.porPagar,
  marketingSoles: marketing.soles,
  resultado: "OK"
}, null, 2));
