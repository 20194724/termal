(function () {
  "use strict";
  const U = globalThis.TermalUtils;
  const D = globalThis.TermalDemo;
  const API_PLACEHOLDER = "PEGAR_AQUI_URL_DE_GOOGLE_APPS_SCRIPT";

  function isConfigured() {
    return Boolean(CONFIG.API_URL && !CONFIG.API_URL.includes(API_PLACEHOLDER));
  }

  function readDemo() {
    try {
      const saved = localStorage.getItem(CONFIG.DEMO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lists) {
          parsed.lists.modalidadesPago = [...D.lists.modalidadesPago];
          parsed.lists.problemas = [...new Set([...D.lists.problemas, ...(parsed.lists.problemas || [])])];
        }
        return parsed;
      }
    } catch (_) { /* Se regenera abajo. */ }
    const seeded = D.seed();
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

  globalThis.TermalAPI = {
    isConfigured, request, getAccessKey, setAccessKey,
    resetDemo: () => request("resetDemo")
  };
})();
