const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
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
  document: { addEventListener() {} }
};
context.globalThis = context;
vm.createContext(context);

for (const file of ["utils.js", "demo-data.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

let appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const end = appSource.lastIndexOf("})();");
assert.ok(end > 0, "No se pudo preparar app.js para la prueba");
appSource = `${appSource.slice(0, end)}
  globalThis.__phase9 = {
    els,
    state,
    filterSales,
    sortSales,
    mobileSaleCard,
    saleRow,
    renderSalesQuickFilters,
    mobileFlowButton,
    previousStage,
    agreedDeliveryStatus,
    isOverdueSale,
    groupDashboardSales,
    analyticsList,
    insightCard,
    renderCash,
    cashPersonRow,
    cashBreakdownEntries,
    cashSaleEntries,
    cashHistoryEntries,
    openCashDetail,
    openMovement,
    cashCurrentBalance,
    cashMovementEffect,
    defaultMovementConcept,
    signedCurrency,
    renderMovementHistoryBody,
    cashHistoryRow,
    saleFormMarkup,
    openDetail,
    openShipping,
    openDispatchDialog,
    salePaymentTimeline,
    safeHttpUrl
  };
})();`;
vm.runInContext(appSource, context, { filename: "app.js" });

const U = context.TermalUtils;
const test = context.__phase9;
test.state.sales = context.TermalDemo.seed().sales.map(U.calculateSale);

assert.equal(test.state.sales.length, 12, "La demo debe cargar sus 12 pedidos");

const sample = test.state.sales[0];
const card = test.mobileSaleCard(sample);
assert.match(card, new RegExp(sample.cliente), "La tarjeta debe mostrar el cliente");
assert.match(card, new RegExp(sample.producto), "La tarjeta debe mostrar el código del producto");
assert.ok(!card.includes(U.productDescription(sample)), "La tarjeta no debe mostrar el nombre completo del producto");
assert.match(card, /data-sale-action="view"/, "La tarjeta debe abrir el detalle");
assert.match(card, /data-sale-action="menu"/, "La tarjeta debe conservar el menú de acciones");
assert.match(card, /Entrega hoy/, "La tarjeta debe mostrar la fecha acordada");
assert.match(test.mobileFlowButton({ ...sample, estadoPedido: "Producción" }), /data-quick-status="Por despachar"/);
assert.match(test.mobileFlowButton({ ...sample, estadoPedido: "Por despachar" }), /data-single-dispatch/);
assert.match(test.mobileFlowButton({ ...sample, estadoPedido: "Despachado" }), /data-quick-status="Entregado"/);
assert.equal(test.previousStage({ ...sample, estadoPedido: "Por despachar" }), "Producción");
assert.equal(test.previousStage({ ...sample, estadoPedido: "Despachado" }), "Por despachar");
assert.equal(test.previousStage({ ...sample, estadoPedido: "Entregado" }), "Despachado");
assert.equal(test.previousStage({ ...sample, estadoPedido: "Producción" }), "");
assert.ok(!card.includes("order-flow-back"), "La tarjeta no debe mostrar la acción de retroceso");
assert.match(test.saleRow({ ...sample, estadoPedido: "Producción" }), /data-quick-status="Por despachar"/, "La tabla de Pedidos debe conservar la flecha de producción");
assert.equal(test.agreedDeliveryStatus(sample).key, "soon");
assert.equal(test.agreedDeliveryStatus({ fechaAcordadaEntrega: U.today(), estadoPedido: "Entregado" }).key, "delivered");
assert.equal(test.agreedDeliveryStatus({ fechaAcordadaEntrega: "", estadoPedido: "Producción" }).key, "none");
assert.equal(test.isOverdueSale(test.state.sales.find((sale) => sale.codigo === "9")), true);
assert.equal(test.isOverdueSale(test.state.sales.find((sale) => sale.codigo === "7")), false, "Un pedido entregado no debe quedar atrasado");
assert.match(test.saleFormMarkup(sample), /name="fechaAcordadaEntrega"/, "El formulario debe permitir editar la fecha acordada");

assert.equal(U.buildSku("Termo 1200 ml", "Negro", "One Piece Luffy"), "OP-L-N-1200");
assert.equal(U.buildSku("Termo 890 ml", "Crema", "Jujutsu Kaisen Toji"), "JJK-TJ-C-890");
assert.equal(U.buildSku("Termo 1200 ml", "Negro", "Demon Slayer"), "DS-N-1200");

const cost890 = U.calculateSale({
  tipoProducto: "Termo 890 ml", colorProducto: "Crema", disenoProducto: "Jujutsu Kaisen Toji",
  cantidad: 1, ventaTotal: 89.9, costoGrabado: 20, grabadoLaser: false
});
assert.equal(cost890.costoProduccion, 22, "El termo 890 debe sumar S/ 19 + S/ 3 de packaging");

const cost1200Laser = U.calculateSale({
  tipoProducto: "Termo 1200 ml", colorProducto: "Negro", disenoProducto: "One Piece Luffy",
  cantidad: 1, ventaTotal: 119.9, costoGrabado: 20, grabadoLaser: true
});
assert.equal(cost1200Laser.costoProduccion, 48.5, "El termo 1200 tercerizado debe sumar S/ 25.50 + S/ 3 + S/ 20");

const costShaker = U.calculateSale({
  tipoProducto: "Shaker", colorProducto: "Azul", disenoProducto: "Dragon Ball",
  cantidad: 1, ventaTotal: 99.9, grabadoLaser: false
});
assert.equal(costShaker.costoProduccion, 32, "El shaker debe sumar S/ 29 + S/ 3 de packaging");

const doubleQuantity = U.calculateSale({
  tipoProducto: "Termo 1200 ml", colorProducto: "Negro", disenoProducto: "Naruto",
  cantidad: 2, ventaTotal: 239.8, costoGrabado: 20, grabadoLaser: true
});
assert.equal(doubleQuantity.costoProduccion, 97, "La cantidad debe multiplicar producto, packaging y grabado");

const customCost = U.calculateSale({
  tipoProducto: "Termo 1200 ml", colorProducto: "Negro", disenoProducto: "Naruto",
  cantidad: 2, ventaTotal: 239.8, costoPersonalizadoActivo: true, costoProduccionPersonalizado: 40
});
assert.equal(customCost.costoProduccion, 40, "El costo personalizado debe reemplazar el cálculo automático");

const financialExample = U.calculateSale({
  tipoProducto: "Termo 1200 ml", colorProducto: "Negro", disenoProducto: "One Piece Luffy",
  cantidad: 1, ventaTotal: 119.9, adelanto: 19.9, cuentaAdelanto: "Gonzalo",
  costoEnvio: 12, pagadorLogistica: "Gonzalo"
});
assert.equal(financialExample.cobradoTotal, 19.9);
assert.equal(financialExample.porCobrar, 100);
assert.equal(financialExample.gonzaloDebeDevolver, 7.9);

const duplicateValidation = U.validateSale(sample, test.state.sales, "");
assert.ok(duplicateValidation.errors.some((message) => message.includes("ya existe")), "Un código duplicado debe rechazarse");
const overpaidValidation = U.validateSale({
  ...sample, id: "overpaid", codigo: "999", ventaTotal: 100, adelanto: 110
}, test.state.sales, "");
assert.ok(overpaidValidation.warnings.some((message) => message.includes("supera")), "Un cobro mayor a la venta debe advertirse");

const channelAnalytics = test.groupDashboardSales(test.state.sales, "canal").sort((a, b) => b.sales - a.sales);
assert.ok(channelAnalytics.length >= 3, "El Dashboard debe agrupar varios canales");
assert.equal(
  U.money(channelAnalytics.reduce((sum, row) => sum + row.sales, 0)),
  U.money(test.state.sales.reduce((sum, sale) => sum + sale.ventaTotal, 0)),
  "El análisis por canal debe conservar el total vendido"
);
assert.match(test.analyticsList(channelAnalytics, { valueKey: "sales", meta: "orders" }), /analytics-bar/);
assert.match(test.insightCard("Canal principal", channelAnalytics[0].label, "Resumen"), /Canal principal/);

const cashBalances = U.cashBalances(test.state.sales);
assert.deepEqual(Array.from(cashBalances, (item) => item.person), ["Gonzalo", "Alberto", "DINSIDES"]);
assert.equal(
  cashBalances.find((item) => item.person === "DINSIDES").balance,
  U.money(test.state.sales.reduce((sum, sale) => sum + sale.dinsidesDebeDepositar - sale.termalDebePagarDinsides, 0)),
  "DINSIDES debe tener un solo saldo neto"
);
for (const item of cashBalances) {
  const detailTotal = U.money(test.cashBreakdownEntries(item.person, test.state.sales)
    .reduce((sum, entry) => sum + entry.amount, 0));
  assert.equal(detailTotal, item.balance, `El desglose de ${item.person} debe explicar su saldo exacto`);
}
const negativeCashSale = U.calculateSale({
  ...sample,
  id: "negative_cash",
  adelanto: 0,
  saldoCobrado: 0,
  pagosDetalle: [],
  cuentaAdelanto: "",
  cuentaSaldo: "",
  costoEnvio: 12,
  costoRecojo: 0,
  pagadorLogistica: "Gonzalo",
  liquidadoGonzalo: 0
});
assert.equal(U.cashSaleBalance(negativeCashSale, "Gonzalo"), -12, "Un gasto personal debe crear saldo negativo");
assert.match(test.cashPersonRow({ person: "Gonzalo", balance: -12 }, true), /cash-negative/);
const reimbursedCash = U.cashBalances(
  [negativeCashSale],
  [{
    id: "cash_reimbursement",
    persona: "Gonzalo",
    naturaleza: "TERMAL_TO_PERSON",
    amount: 12,
    signedAmount: 12,
    affectsCash: true,
    schemaVersion: 2
  }]
);
assert.equal(reimbursedCash.find((item) => item.person === "Gonzalo").balance, 0, "Un reembolso de Termal debe aumentar el saldo hasta cero");
const personalExpenseCash = U.cashBalances(
  [],
  [{
    id: "cash_expense",
    persona: "Gonzalo",
    naturaleza: "PERSON_EXPENSE",
    amount: 12,
    signedAmount: -12,
    affectsCash: true,
    schemaVersion: 2
  }]
);
assert.equal(personalExpenseCash.find((item) => item.person === "Gonzalo").balance, -12, "Un gasto personal debe disminuir el saldo");
assert.equal(test.cashMovementEffect("PERSON_TO_TERMAL", 20), -20);
assert.equal(test.cashMovementEffect("TERMAL_TO_PERSON", 20), 20);
assert.equal(test.cashMovementEffect("PERSON_EXPENSE", 20), -20);
assert.equal(test.signedCurrency(20).replace(/\s/g, " "), "+S/ 20.00");
assert.equal(test.signedCurrency(-20).replace(/\s/g, " "), "-S/ 20.00");
assert.equal(test.defaultMovementConcept("PERSON_EXPENSE"), "Gasto pagado con dinero personal");
const legacyIgnored = U.cashBalances(
  [negativeCashSale],
  [{ id: "legacy", type: "GONZALO_RETURN", amount: 50 }]
);
assert.equal(legacyIgnored.find((item) => item.person === "Gonzalo").balance, -12, "Un movimiento antiguo no debe contarse dos veces");
test.els.mainContent = { innerHTML: "" };
test.renderCash();
for (const text of ["Saldos por persona", "Termal por recibir", "Termal por reembolsar", "Gonzalo", "Alberto", "DINSIDES"]) {
  assert.ok(test.els.mainContent.innerHTML.includes(text), `Caja debe mostrar ${text}`);
}
test.els.detailTitle = { textContent: "" };
test.els.detailEyebrow = { textContent: "" };
test.els.detailBody = { innerHTML: "", querySelectorAll() { return []; } };
test.els.detailFooter = {
  innerHTML: "",
  querySelector(selector) {
    return selector === "[data-close-detail]" ? { addEventListener() {} } : null;
  }
};
test.els.detailDialog = { showModal() {} };
test.openCashDetail("DINSIDES");
for (const text of ["Saldo actual", "Cómo se forma el saldo", "Cobro recibido", "Envío pagado", "Total"]) {
  assert.ok(test.els.detailBody.innerHTML.includes(text), `El desglose de Caja debe mostrar ${text}`);
}
assert.match(test.els.detailFooter.innerHTML, /Registrar movimiento/, "El detalle de Caja debe permitir registrar un movimiento");

test.els.movementTitle = { textContent: "" };
test.els.movementBody = { innerHTML: "" };
test.els.movementDialog = { open: true, showModal() { this.open = true; } };
test.els.movementForm = { querySelector() { return null; } };
test.openMovement("Gonzalo", "TERMAL_TO_PERSON");
for (const text of [
  "Persona devuelve dinero a Termal",
  "Termal devuelve dinero a la persona",
  "Persona paga un gasto con dinero personal",
  "Pedido relacionado",
  "Cliente",
  "Método de pago",
  "Observación",
  "Saldo anterior",
  "Movimiento",
  "Saldo nuevo"
]) {
  assert.ok(test.els.movementBody.innerHTML.includes(text), `Registrar movimiento debe mostrar ${text}`);
}
assert.match(test.els.movementBody.innerHTML, /value="TERMAL_TO_PERSON" selected/, "El tipo sugerido debe quedar seleccionado");

test.state.movements = [
  {
    id: "history_reimbursement",
    persona: "Gonzalo",
    naturaleza: "TERMAL_TO_PERSON",
    amount: 12,
    signedAmount: 12,
    date: U.today(),
    concepto: "Reembolso de prueba",
    cliente: "María",
    metodoPago: "Yape",
    note: "Operación 123",
    saldoPosterior: 0,
    affectsCash: true,
    schemaVersion: 2
  },
  {
    id: "history_expense",
    persona: "Alberto",
    naturaleza: "PERSON_EXPENSE",
    amount: 8,
    signedAmount: -8,
    date: "2026-07-01",
    concepto: "Movilidad",
    saldoPosterior: -8,
    affectsCash: true,
    schemaVersion: 2
  }
];
test.state.cashHistoryFilters = { person: "", type: "", start: "", end: "" };
test.els.detailBody = { innerHTML: "" };
test.renderMovementHistoryBody();
for (const text of ["Persona", "Tipo", "Desde", "Hasta", "Reembolso de prueba", "Movilidad", "Saldo posterior"]) {
  assert.ok(test.els.detailBody.innerHTML.includes(text), `El historial debe mostrar ${text}`);
}
assert.match(test.els.detailBody.innerHTML, /\+S\/\s12\.00/, "El historial debe mostrar importes positivos con signo");
assert.match(test.els.detailBody.innerHTML, /-S\/\s8\.00/, "El historial debe mostrar importes negativos con signo");
test.state.cashHistoryFilters.person = "Alberto";
test.renderMovementHistoryBody();
assert.ok(test.els.detailBody.innerHTML.includes("Movilidad"), "El filtro por persona debe conservar sus movimientos");
assert.ok(!test.els.detailBody.innerHTML.includes("Reembolso de prueba"), "El filtro por persona debe excluir otros movimientos");
test.state.movements = [];

const multiPaymentSale = U.calculateSale({
  ...sample,
  ventaTotal: 129.9,
  adelanto: 19.9,
  cuentaAdelanto: "Gonzalo",
  saldoCobrado: 100,
  pagosDetalle: [
    { id: "p2", monto: 50, cuenta: "Gonzalo", fecha: sample.fecha },
    { id: "p3", monto: 30, cuenta: "DINSIDES", fecha: sample.fecha },
    { id: "p4", monto: 20, cuenta: "Alberto", fecha: sample.fecha }
  ]
});
const paymentTimeline = test.salePaymentTimeline(multiPaymentSale);
assert.deepEqual(
  Array.from(paymentTimeline, (payment) => payment.label),
  ["Adelanto", "Segundo pago", "Tercer pago", "Cuarto pago"],
  "El detalle debe nombrar cada pago en orden"
);
assert.deepEqual(
  Array.from(paymentTimeline, (payment) => payment.cuenta),
  ["Gonzalo", "Gonzalo", "DINSIDES", "Alberto"],
  "El detalle debe conservar quién recibió cada pago"
);
assert.deepEqual(
  Array.from(test.salePaymentTimeline({ adelanto: 0, pagosDetalle: multiPaymentSale.pagosDetalle }), (payment) => payment.label),
  ["Primer pago", "Segundo pago", "Tercer pago"],
  "Una venta sin adelanto también debe numerar pagos consecutivamente"
);
assert.equal(multiPaymentSale.porCobrar, 10, "Los pagos parciales deben actualizar el saldo");
assert.equal(test.safeHttpUrl("https://maps.google.com/test"), "https://maps.google.com/test");
assert.equal(test.safeHttpUrl("javascript:alert(1)"), "");

const originalSales = test.state.sales;
test.state.sales = [{
  ...multiPaymentSale,
  destinatarioEnvio: "María Fernanda",
  telefonoEnvio: "999999999",
  dniEnvio: "12345678",
  direccionEnvio: "Agencia Shalom de Surco",
  enlaceMaps: "https://maps.google.com/test"
}];
test.state.movements = [];
test.els.detailTitle = { textContent: "" };
test.els.detailBody = { innerHTML: "" };
test.els.detailFooter = {
  innerHTML: "",
  querySelector() { return { addEventListener() {} }; }
};
test.els.detailDialog = { showModal() {} };
test.openDetail(multiPaymentSale.id);
for (const text of [
  "Fecha de venta", "Fecha acordada", "Código de producto", "Notas", "<span>Envío</span>", "<span>Pagos</span>",
  "<span>Costos y utilidad</span>", "<span>Problemas</span>", "Adelanto", "Segundo pago",
  "Tercer pago", "Cuarto pago", "DINSIDES", "Alberto", "Agencia Shalom de Surco", "Abrir enlace"
]) {
  assert.ok(test.els.detailBody.innerHTML.includes(text), `El detalle debe mostrar ${text}`);
}
assert.ok(!test.els.detailBody.innerHTML.includes(U.productDescription(multiPaymentSale)), "El detalle no debe mostrar el nombre largo del producto");
assert.ok(!test.els.detailBody.innerHTML.includes("Liquidaciones e historial"), "El detalle no debe incluir liquidaciones e historial");
assert.ok(!test.els.detailBody.innerHTML.includes("Gonzalo devuelve"), "El detalle no debe incluir obligaciones de liquidación");
test.els.shippingTitle = { textContent: "" };
test.els.shippingBody = { innerHTML: "" };
test.els.shippingDialog = { showModal() {} };
test.els.shippingForm = { querySelector() { return null; } };
test.openShipping(test.state.sales[0]);
for (const field of ["destinatarioEnvio", "telefonoEnvio", "dniEnvio", "direccionEnvio", "enlaceMaps"]) {
  assert.ok(test.els.shippingBody.innerHTML.includes(`name="${field}"`), `El envío debe incluir ${field}`);
}
test.state.sales = originalSales;

test.els.dispatchBody = { innerHTML: "" };
test.els.dispatchDialog = { showModal() {} };
test.openDispatchDialog();
assert.equal((test.els.dispatchBody.innerHTML.match(/data-dispatch-choice/g) || []).length, 2, "El despacho múltiple debe listar los pedidos por despachar");
assert.match(test.els.dispatchBody.innerHTML, /Selecciona los pedidos que saldrán juntos/);
const readySale = originalSales.find((sale) => sale.estadoPedido === "Por despachar");
test.openDispatchDialog([readySale.id]);
assert.match(test.els.dispatchBody.innerHTML, new RegExp(`name="saleIds" value="${readySale.id}"`));
assert.ok(!test.els.dispatchBody.innerHTML.includes("data-dispatch-choice"), "La flecha individual debe abrir una confirmación de un solo pedido");

test.state.salesQuickFilter = "receivable";
let filtered = test.filterSales();
assert.ok(filtered.length > 0 && filtered.every((sale) => sale.porCobrar > 0), "Por cobrar debe filtrar inmediatamente");

test.state.salesQuickFilter = "production";
filtered = test.filterSales();
assert.ok(filtered.length > 0 && filtered.every((sale) => sale.estadoPedido === "Producción"), "Por producir debe filtrar producción");

test.state.salesQuickFilter = "problems";
filtered = test.filterSales();
assert.ok(filtered.length > 0 && filtered.every((sale) => U.saleProblems(sale).length > 0), "Problemas debe filtrar incidencias");

test.state.salesQuickFilter = "overdue";
filtered = test.filterSales();
assert.equal(filtered.length, 2, "Atrasados debe filtrar únicamente pedidos vencidos no entregados");
assert.ok(filtered.every(test.isOverdueSale));

test.state.salesQuickFilter = "all";
test.state.filters.fechaAcordadaEstado = "Hoy o mañana";
filtered = test.filterSales();
assert.equal(filtered.length, 2, "El filtro detallado debe encontrar entregas de hoy y mañana");
test.state.filters.fechaAcordadaEstado = "";
test.state.filters.search = "maria fernanda";
filtered = test.filterSales();
assert.equal(filtered.length, 1, "La búsqueda por cliente debe funcionar");

test.state.filters.search = sample.producto;
filtered = test.filterSales();
assert.ok(filtered.some((sale) => sale.id === sample.id), "La búsqueda por código de producto debe funcionar");

test.state.filters.search = sample.codigo;
filtered = test.filterSales();
assert.ok(filtered.some((sale) => sale.id === sample.id), "La búsqueda por pedido debe funcionar");

test.state.filters.search = "";
const quickFilters = test.renderSalesQuickFilters();
for (const label of ["Todos", "Por cobrar", "Por producir", "Por despachar", "En ruta", "Entregados", "Problemas", "Atrasados"]) {
  assert.ok(quickFilters.includes(label), `Falta el filtro rápido ${label}`);
}
assert.equal((quickFilters.match(/sales-filter-priority/g) || []).length, 4, "Móvil debe priorizar cuatro tarjetas");
assert.equal((quickFilters.match(/sales-filter-secondary/g) || []).length, 4, "Los otros filtros deben permanecer como secundarios");

const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const currentAppSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.match(css, /@media \(max-width: 820px\)[\s\S]*?\.sales-desktop-view \{ display: none; \}/);
assert.match(css, /@media \(max-width: 820px\)[\s\S]*?\.sales-mobile-view \{[\s\S]*?display: grid;/);
assert.match(css, /@media \(max-width: 560px\)[\s\S]*?\.sales-mobile-view \{ grid-template-columns: 1fr; \}/);
assert.match(css, /@media \(max-width: 820px\)[\s\S]*?grid-template-columns: repeat\(4,minmax\(0,1fr\)\)/);
assert.match(css, /@media \(max-width: 820px\)[\s\S]*?\.sales-filter-secondary \{ display: none; \}/);
assert.match(css, /@media \(max-width: 820px\)[\s\S]*?\.mobile-filter-tools \{[\s\S]*?display: grid;/);
assert.ok(!currentAppSource.includes("sales-command-title"), "Pedidos no debe repetirse dentro del contenido");
assert.ok(currentAppSource.includes("Regresar etapa del pedido"), "Regresar una etapa debe pedir confirmación");
assert.ok(currentAppSource.includes("Avanzar etapa del pedido"), "Avanzar una etapa debe pedir confirmación");
assert.ok(currentAppSource.includes('data-order-action="previous"'), "Regresar etapa debe estar dentro del menú de tres puntos");
assert.match(css, /\.detail-disclosure > summary::after \{[\s\S]*?content: "\+"/);
assert.match(css, /\.detail-disclosure\[open\] > summary::after \{ content: "−"/);
assert.match(css, /\.agreed-date-overdue \{[\s\S]*?var\(--danger\)/);
assert.ok(!html.includes('data-route="operacion"'), "Operación no debe seguir en la navegación");
assert.ok(!currentAppSource.includes("renderOperations"), "La vista duplicada de Operación debe haberse retirado");
assert.ok(currentAppSource.includes("batch-dispatch-list"), "Pedidos debe conservar el despacho múltiple");
assert.ok(currentAppSource.includes("Despachar varios"), "El despacho múltiple debe estar accesible desde Pedidos");
assert.ok(!currentAppSource.includes("dashboard-hero"), "El Dashboard no debe repetir una cabecera grande");
assert.ok(!currentAppSource.includes("priorityItem"), "El Dashboard no debe repetir prioridades operativas");
assert.ok(!currentAppSource.includes("salesChart"), "El Dashboard no debe conservar una gráfica sin lectura útil");
assert.ok(currentAppSource.includes("Ventas por canal"), "El Dashboard debe analizar los canales de venta");
assert.ok(currentAppSource.includes("Utilidad por producto"), "El Dashboard debe analizar rentabilidad por producto");
assert.ok(currentAppSource.includes("Diseños más vendidos"), "El Dashboard debe analizar diseños por unidades");
assert.match(css, /@media \(max-width: 560px\)[\s\S]*?\.dashboard-filterbar \{ grid-template-columns:/);
assert.ok(html.includes('data-route="caja"'), "Caja interna debe estar en la navegación");
assert.ok(!currentAppSource.includes("Liquidaciones pendientes"), "El nombre visible anterior debe retirarse");
assert.ok(currentAppSource.includes("Un solo saldo por persona"), "El Dashboard debe explicar el saldo neto");
assert.ok(currentAppSource.includes("Cómo se forma el saldo"), "Caja debe mostrar un desglose comprensible");
assert.match(css, /@media \(max-width: 820px\)[\s\S]*?\.mobile-nav \{[\s\S]*?repeat\(5,1fr\)/);
assert.ok(currentAppSource.includes('aria-label="Buscar pedido, cliente o código de producto"'), "El buscador debe tener un nombre accesible");
assert.ok(currentAppSource.includes('aria-label="Abrir filtros de pedidos"'), "El botón de filtros debe tener un nombre accesible");

console.log(JSON.stringify({
  pedidos: test.state.sales.length,
  porCobrar: test.state.sales.filter((sale) => sale.porCobrar > 0).length,
  produccion: test.state.sales.filter((sale) => sale.estadoPedido === "Producción").length,
  problemas: test.state.sales.filter((sale) => U.saleProblems(sale).length > 0).length,
  resultado: "OK"
}, null, 2));
