(function () {
  "use strict";
  const U = globalThis.TermalUtils;
  const D = globalThis.TermalDemo;
  const B = globalThis.TermalBusiness || {
    calculateB2B: (value) => value, calculatePurchase: (value) => value, calculateMarketing: (value) => value,
    validateB2B: () => [], validatePurchase: () => [], validateMarketing: () => [], arrayValue: (value) => Array.isArray(value) ? value : []
  };
  const API_PLACEHOLDER = "PEGAR_AQUI_URL_DE_GOOGLE_APPS_SCRIPT";

  function isConfigured() {
    const forcedDemo = globalThis.URLSearchParams
      ? new globalThis.URLSearchParams(globalThis.location?.search || "").get("demo") === "1"
      : false;
    return !forcedDemo && Boolean(CONFIG.API_URL && !CONFIG.API_URL.includes(API_PLACEHOLDER));
  }

  function readDemo() {
    try {
      const saved = localStorage.getItem(CONFIG.DEMO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.b2b = parsed.b2b || [];
        parsed.purchases = parsed.purchases || [];
        parsed.marketing = parsed.marketing || [];
        if (parsed.lists) {
          parsed.lists.modalidadesPago = [...D.lists.modalidadesPago];
          parsed.lists.problemas = [...new Set([...D.lists.problemas, ...(parsed.lists.problemas || [])])];
        }
        return parsed;
      }
    } catch (_) { /* Se regenera abajo. */ }
    const seeded = D.seed();
    seeded.b2b = seeded.b2b || [];
    seeded.purchases = seeded.purchases || [];
    seeded.marketing = seeded.marketing || [];
    localStorage.setItem(CONFIG.DEMO_STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  function writeDemo(data) {
    data.updatedAt = new Date().toISOString();
    localStorage.setItem(CONFIG.DEMO_STORAGE_KEY, JSON.stringify(data));
  }

  function getAccessKey() {
    return sessionStorage.getItem("termal_access_key") || "";
  }

  function setAccessKey(value) {
    if (value) sessionStorage.setItem("termal_access_key", value);
    else sessionStorage.removeItem("termal_access_key");
  }

  async function request(action, payload = {}) {
    if (!isConfigured()) return demoRequest(action, payload);
    if (!navigator.onLine) {
      throw userError("OFFLINE", "No tienes conexión a internet. Reconéctate antes de guardar.");
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, payload, accessKey: getAccessKey() }),
        signal: controller.signal,
        redirect: "follow"
      });
      if (!response.ok) throw userError("HTTP_ERROR", `Google respondió con el error ${response.status}.`);
      const text = await response.text();
      let result;
      try { result = JSON.parse(text); } catch (_) {
        throw userError("INVALID_RESPONSE", "Google Apps Script devolvió una respuesta inválida. Revisa la implementación.");
      }
      if (!result.ok) throw userError(result.code || "API_ERROR", result.message || "No se pudo completar la operación.");
      return result.data;
    } catch (error) {
      if (error.name === "AbortError") {
        throw userError("TIMEOUT", "La conexión tardó demasiado. Revisa tu internet e inténtalo otra vez.");
      }
      if (error.code) throw error;
      throw userError(
        "CONNECTION_ERROR",
        "No se pudo conectar con Google Sheets. Revisa que la URL de Google Apps Script esté bien pegada en config.js y que la implementación permita el acceso."
      );
    } finally {
      clearTimeout(timer);
    }
  }

  function userError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  async function demoRequest(action, payload) {
    await new Promise((resolve) => setTimeout(resolve, action === "getAll" ? 180 : 100));
    const db = readDemo();
    if (action === "ping") return { mode: "demo", spreadsheet: "Datos de demostración" };
    if (action === "getAll") return {
      sales: db.sales.map(U.calculateSale),
      movements: db.movements || [],
      b2b: (db.b2b || []).map(B.calculateB2B),
      purchases: (db.purchases || []).map(B.calculatePurchase),
      marketing: (db.marketing || []).map(B.calculateMarketing),
      lists: db.lists,
      updatedAt: db.updatedAt
    };
    if (action === "getSale") {
      const sale = db.sales.find((item) => item.id === payload.id);
      if (!sale) throw userError("NOT_FOUND", "No encontramos esa venta.");
      return U.calculateSale(sale);
    }
    if (action === "nextCode") {
      const max = db.sales.reduce((value, item) => {
        const match = String(item.codigo).match(/(\d+)$/);
        return Math.max(value, match ? Number(match[1]) : 0);
      }, 0);
      return { code: String(max + 1) };
    }
    if (action === "createSale") {
      const validation = U.validateSale(payload.sale, db.sales);
      if (validation.errors.length) throw userError("VALIDATION_ERROR", validation.errors.join(" "));
      const sale = U.calculateSale({
        ...payload.sale,
        id: U.uid("sale"),
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      db.sales.unshift(sale);
      rememberDemoColor(db, sale);
      writeDemo(db);
      return sale;
    }
    if (action === "updateSale") {
      const index = db.sales.findIndex((item) => item.id === payload.sale.id);
      if (index < 0) throw userError("NOT_FOUND", "No encontramos esa venta.");
      const validation = U.validateSale(payload.sale, db.sales, payload.sale.id);
      if (validation.errors.length) throw userError("VALIDATION_ERROR", validation.errors.join(" "));
      db.sales[index] = U.calculateSale({
        ...db.sales[index],
        ...payload.sale,
        updatedAt: new Date().toISOString()
      });
      rememberDemoColor(db, db.sales[index]);
      writeDemo(db);
      return db.sales[index];
    }
    if (action === "archiveSale" || action === "restoreSale") {
      const sale = db.sales.find((item) => item.id === payload.id);
      if (!sale) throw userError("NOT_FOUND", "No encontramos esa venta.");
      sale.active = action === "restoreSale";
      sale.deletedAt = sale.active ? "" : new Date().toISOString();
      sale.updatedAt = new Date().toISOString();
      writeDemo(db);
      return U.calculateSale(sale);
    }
    if (action === "createMovement") {
      const movement = applyMovement(db, payload.movement);
      writeDemo(db);
      return { movement, sales: db.sales.map(U.calculateSale) };
    }
    if (action === "createCashMovement") {
      const movement = applyCashMovement(db, payload.movement);
      writeDemo(db);
      return { movement, sales: db.sales.map(U.calculateSale) };
    }
    if (action === "createDispatch") {
      const ids = payload.dispatch.saleIds || [];
      const found = db.sales.filter((sale) => ids.includes(sale.id) && sale.active !== false);
      if (!found.length) throw userError("VALIDATION_ERROR", "Selecciona por lo menos un pedido.");
      const batchId = U.uid("salida");
      found.forEach((sale) => {
        sale.fechaDespacho = payload.dispatch.fecha;
        sale.estadoPedido = "Despachado";
        sale.batchSalidaId = batchId;
        sale.updatedAt = new Date().toISOString();
        Object.assign(sale, U.calculateSale(sale));
      });
      writeDemo(db);
      return { batchId, sales: found };
    }
    if (action === "saveB2B") {
      const record = B.calculateB2B(payload.record || {});
      const errors = B.validateB2B(record);
      if (errors.length) throw userError("VALIDATION_ERROR", errors.join(" "));
      applyDemoAttachment(record, "b2b", payload.attachment);
      saveDemoRecord(db, "b2b", record, "B2B");
      rememberDemoCategory(db, "b2b", "");
      writeDemo(db);
      return B.calculateB2B(record);
    }
    if (action === "savePurchase") {
      const record = B.calculatePurchase(payload.record || {});
      const errors = B.validatePurchase(record);
      if (errors.length) throw userError("VALIDATION_ERROR", errors.join(" "));
      applyDemoAttachment(record, "purchase", payload.attachment);
      saveDemoRecord(db, "purchases", record, "COMP");
      rememberDemoCategory(db, "purchase", record.categoria);
      writeDemo(db);
      return B.calculatePurchase(record);
    }
    if (action === "saveMarketing") {
      const record = B.calculateMarketing(payload.record || {});
      const errors = B.validateMarketing(record);
      if (errors.length) throw userError("VALIDATION_ERROR", errors.join(" "));
      saveDemoRecord(db, "marketing", record, "MKT");
      rememberDemoCategory(db, "marketing", record.categoria);
      writeDemo(db);
      return B.calculateMarketing(record);
    }
    if (action === "addBusinessPayment") {
      const collection = payload.type === "purchase" ? "purchases" : "b2b";
      const calculator = collection === "purchases" ? B.calculatePurchase : B.calculateB2B;
      const record = (db[collection] || []).find((item) => item.id === payload.id && item.active !== false);
      if (!record) throw userError("NOT_FOUND", "No encontramos el registro.");
      record.pagos = B.arrayValue(record.pagos);
      record.pagos.push({ ...payload.payment, id: U.uid("pago") });
      const calculated = calculator(record);
      const errors = collection === "purchases" ? B.validatePurchase(calculated) : B.validateB2B(calculated);
      if (errors.length) throw userError("VALIDATION_ERROR", errors.join(" "));
      Object.assign(record, calculated, { updatedAt: new Date().toISOString() });
      writeDemo(db);
      return calculator(record);
    }
    if (action === "archiveBusinessRecord") {
      const collection = { b2b: "b2b", purchase: "purchases", marketing: "marketing" }[payload.type];
      const record = collection && (db[collection] || []).find((item) => item.id === payload.id);
      if (!record) throw userError("NOT_FOUND", "No encontramos el registro.");
      record.active = false;
      record.updatedAt = new Date().toISOString();
      writeDemo(db);
      return record;
    }
    if (action === "resetDemo") {
      const seeded = D.seed();
      writeDemo(seeded);
      return seeded;
    }
    throw userError("UNKNOWN_ACTION", "Esta acción no existe.");
  }

  function applyMovement(db, raw) {
    const amount = U.money(raw.amount);
    if (amount <= 0) throw userError("VALIDATION_ERROR", "El monto debe ser mayor que cero.");
    const definitions = {
      GONZALO_RETURN: ["gonzaloDebeDevolver", "liquidadoGonzalo"],
      ALBERTO_RETURN: ["albertoDebeDevolver", "liquidadoAlberto"],
      DINSIDES_DEPOSIT: ["dinsidesDebeDepositar", "liquidadoDinsides"],
      TERMAL_PAY_DINSIDES: ["termalDebePagarDinsides", "pagadoADinsides"]
    };
    const definition = definitions[raw.type];
    if (!definition) throw userError("VALIDATION_ERROR", "Selecciona un tipo de movimiento válido.");
    let remainder = amount;
    const allocations = [];
    db.sales
      .filter((sale) => sale.active !== false)
      .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
      .forEach((sale) => {
        if (remainder <= 0) return;
        const calculated = U.calculateSale(sale);
        const pending = U.number(calculated[definition[0]]);
        if (pending <= 0) return;
        const applied = U.money(Math.min(pending, remainder));
        sale[definition[1]] = U.money(U.number(sale[definition[1]]) + applied);
        Object.assign(sale, U.calculateSale(sale));
        remainder = U.money(remainder - applied);
        allocations.push({ saleId: sale.id, codigo: sale.codigo, amount: applied });
      });
    if (remainder > 0) {
      throw userError("AMOUNT_EXCEEDS_PENDING", `El monto supera lo pendiente por ${U.currency(remainder)}.`);
    }
    const movement = {
      id: U.uid("mov"), type: raw.type, amount, date: raw.date || U.today(),
      note: String(raw.note || "").trim(), allocations, createdAt: new Date().toISOString()
    };
    db.movements.unshift(movement);
    return movement;
  }

  function applyCashMovement(db, raw) {
    if (!Array.isArray(db.movements)) db.movements = [];
    const amount = U.money(raw.amount);
    const persona = U.cashMovementPerson({ persona: raw.persona });
    const validTypes = ["PERSON_TO_TERMAL", "TERMAL_TO_PERSON", "PERSON_EXPENSE"];
    if (!persona) throw userError("VALIDATION_ERROR", "Selecciona una persona válida.");
    if (!validTypes.includes(raw.naturaleza)) throw userError("VALIDATION_ERROR", "Selecciona un tipo de movimiento válido.");
    if (amount <= 0) throw userError("VALIDATION_ERROR", "El monto debe ser mayor que cero.");
    if (!String(raw.concepto || "").trim()) throw userError("VALIDATION_ERROR", "Ingresa el concepto del movimiento.");

    const sale = raw.saleId
      ? db.sales.find((item) => item.id === raw.saleId && item.active !== false)
      : null;
    if (raw.saleId && !sale) throw userError("NOT_FOUND", "No encontramos el pedido relacionado.");

    const previous = U.cashBalances(db.sales.map(U.calculateSale), db.movements || [])
      .find((item) => item.person === persona)?.balance || 0;
    const signedAmount = raw.naturaleza === "TERMAL_TO_PERSON" ? amount : -amount;
    const movement = {
      id: U.uid("mov"),
      type: raw.naturaleza,
      naturaleza: raw.naturaleza,
      persona,
      amount,
      signedAmount,
      date: raw.date || U.today(),
      concepto: String(raw.concepto || "").trim(),
      saleId: sale?.id || "",
      codigo: sale?.codigo || "",
      cliente: String(raw.cliente || sale?.cliente || "").trim(),
      metodoPago: String(raw.metodoPago || "").trim(),
      note: String(raw.note || "").trim(),
      saldoAnterior: U.money(previous),
      saldoPosterior: U.money(previous + signedAmount),
      affectsCash: true,
      schemaVersion: 2,
      allocations: sale ? [{ saleId: sale.id, codigo: sale.codigo, amount }] : [],
      createdAt: new Date().toISOString()
    };
    db.movements.unshift(movement);
    return movement;
  }

  function rememberDemoColor(db, sale) {
    if (!sale.tipoProducto || !sale.colorProducto) return;
    if (!db.lists.coloresPorProducto) db.lists.coloresPorProducto = {};
    const colors = db.lists.coloresPorProducto[sale.tipoProducto] || [];
    if (!colors.includes(sale.colorProducto)) colors.push(sale.colorProducto);
    db.lists.coloresPorProducto[sale.tipoProducto] = colors;
    const type = (db.lists.tiposProductos || []).find((item) => item.nombre === sale.tipoProducto);
    if (type) type.colores = colors;
    if (!db.lists.problemas) db.lists.problemas = ["NO"];
    U.saleProblems(sale).forEach((problem) => {
      if (problem.tipo && !db.lists.problemas.some((value) => U.normalizeText(value) === U.normalizeText(problem.tipo))) {
        db.lists.problemas.push(problem.tipo);
      }
    });
  }

  function saveDemoRecord(db, collection, record, prefix) {
    if (!Array.isArray(db[collection])) db[collection] = [];
    const now = new Date().toISOString();
    const index = db[collection].findIndex((item) => item.id === record.id);
    if (index >= 0) {
      db[collection][index] = { ...db[collection][index], ...record, updatedAt: now };
      Object.assign(record, db[collection][index]);
      return;
    }
    const max = db[collection].reduce((value, item) => {
      const match = String(item.codigo || "").match(/(\d+)$/);
      return Math.max(value, match ? Number(match[1]) : 0);
    }, 0);
    Object.assign(record, {
      id: U.uid(collection),
      codigo: record.codigo || `${prefix}-${String(max + 1).padStart(3, "0")}`,
      active: true,
      createdAt: now,
      updatedAt: now
    });
    db[collection].unshift(record);
  }

  function rememberDemoCategory(db, type, value) {
    if (!value) return;
    const key = type === "marketing" ? "categoriasMarketing" : "categoriasCompras";
    db.lists[key] = db.lists[key] || [];
    if (!db.lists[key].some((item) => U.normalizeText(item) === U.normalizeText(value))) db.lists[key].push(value);
  }

  function applyDemoAttachment(record, type, attachment) {
    if (!attachment?.base64) return;
    const url = `data:application/pdf;base64,${attachment.base64}`;
    if (type === "b2b") {
      record.cotizacionNombre = attachment.name;
      record.cotizacionUrl = url;
    } else {
      record.facturaNombre = attachment.name;
      record.facturaUrl = url;
    }
  }

  globalThis.TermalAPI = {
    isConfigured, request, getAccessKey, setAccessKey,
    resetDemo: () => request("resetDemo")
  };
})();
