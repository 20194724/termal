(function () {
  "use strict";

  const PEN = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2
  });

  const DATE = new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Lima"
  });

  function number(value) {
    const parsed = Number(String(value ?? "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function money(value) {
    return Math.round((number(value) + Number.EPSILON) * 100) / 100;
  }

  function currency(value) {
    return PEN.format(number(value)).replace("PEN", "S/");
  }

  function dateInput(value) {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  }

  function formatDate(value) {
    if (!value) return "—";
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
      ? new Date(`${value}T12:00:00-05:00`)
      : new Date(value);
    return Number.isNaN(normalized.getTime()) ? "—" : DATE.format(normalized);
  }

  function today() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  }

  function uid(prefix = "id") {
    if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function daysSince(value) {
    const start = new Date(`${dateInput(value)}T12:00:00-05:00`);
    const end = new Date(`${today()}T12:00:00-05:00`);
    return Number.isNaN(start.getTime()) ? 0 : Math.max(0, Math.floor((end - start) / 86400000));
  }

  function productBaseCost(type) {
    const normalized = normalizeText(type);
    if (normalized.includes("1200")) return 25.5;
    if (normalized.includes("890")) return 19;
    if (normalized.includes("shaker")) return 29;
    return 0;
  }

  function productSizeCode(type) {
    const normalized = normalizeText(type);
    if (normalized.includes("1200")) return "1200";
    if (normalized.includes("890")) return "890";
    if (normalized.includes("shaker")) return "SH";
    return shortCode(type, 3);
  }

  function colorCode(color) {
    const codes = { negro: "N", crema: "C", blanco: "B", azul: "A" };
    return codes[normalizeText(color)] || shortCode(color, 2);
  }

  function designCode(design) {
    const codes = {
      "one piece luffy": "OP-L",
      "one piece zoro": "OP-Z",
      "one piece nakamas": "OP-NK",
      "jujutsu kaisen legacy": "JJK-L",
      "jujutsu kaisen toji": "JJK-TJ",
      "demon slayer": "DS",
      "naruto": "NAR",
      "chainsawman": "CSM",
      "bleach": "BL",
      "dragon ball": "DB",
      "black clover": "BC",
      "personalizado": "PERS"
    };
    return codes[normalizeText(design)] || shortCode(design, 6);
  }

  function shortCode(value, maxLength) {
    return normalizeText(value)
      .replace(/[^a-z0-9 ]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, maxLength) || "OTR";
  }

  function buildSku(type, color, design) {
    if (!type || !color || !design) return "";
    return `${designCode(design)}-${colorCode(color)}-${productSizeCode(type)}`;
  }

  function productDescription(sale) {
    const parts = [sale.tipoProducto, sale.colorProducto, sale.disenoProducto].filter(Boolean);
    return parts.length ? parts.join(" · ") : (sale.producto || "Producto sin detalle");
  }

  function saleProblems(input) {
    const sale = input || {};
    let details = sale.problemasDetalle;
    if (typeof details === "string") {
      try { details = JSON.parse(details); } catch (_) { details = []; }
    }
    if (!Array.isArray(details)) details = [];
    const cleaned = details.map((problem, index) => ({
      id: String(problem?.id || `problema_${index + 1}`),
      tipo: String(problem?.tipo || "").trim(),
      costo: money(problem?.costo),
      nota: String(problem?.nota || "").trim()
    })).filter((problem) => problem.tipo || problem.nota || problem.costo > 0);
    const legacyType = String(sale.tipoProblema || "").trim();
    if (!cleaned.length && normalizeText(legacyType) !== "no" &&
      (legacyType || number(sale.costoProblema) > 0 || String(sale.descripcionProblema || "").trim())) {
      cleaned.push({
        id: "problema_legacy",
        tipo: legacyType || "Otro problema",
        costo: money(sale.costoProblema),
        nota: String(sale.descripcionProblema || "").trim()
      });
    }
    return cleaned;
  }

  function salePayments(input) {
    const sale = input || {};
    let details = sale.pagosDetalle;
    if (typeof details === "string") {
      try { details = JSON.parse(details); } catch (_) { details = []; }
    }
    if (!Array.isArray(details)) return [];
    return details.map((payment, index) => ({
      id: String(payment?.id || `pago_${index + 1}`),
      monto: money(payment?.monto),
      cuenta: String(payment?.cuenta || "").trim(),
      fecha: dateInput(payment?.fecha) || today()
    })).filter((payment) => payment.monto > 0);
  }

  function cashSaleBalance(input, person) {
    const sale = input || {};
    const normalized = normalizeText(person);
    if (normalized === "gonzalo") return money(sale.gonzaloDebeDevolver);
    if (normalized === "alberto") return money(sale.albertoDebeDevolver);
    if (normalized === "dinsides") {
      return money(number(sale.dinsidesDebeDepositar) - number(sale.termalDebePagarDinsides));
    }
    return 0;
  }

  function cashBalances(sales = []) {
    return ["Gonzalo", "Alberto", "DINSIDES"].map((person) => ({
      person,
      balance: money(sales.reduce((sum, sale) => sum + cashSaleBalance(sale, person), 0))
    }));
  }

  function calculateSale(input) {
    const sale = { ...input };
    const fields = [
      "cantidad", "ventaTotal", "adelanto", "saldoCobrado", "comisionTarjeta",
      "costoTermo", "costoGrabado", "costoPackaging", "costoProduccionPersonalizado",
      "costoEnvio", "costoRecojo", "otrosCostos",
      "costoProblema", "liquidadoGonzalo", "liquidadoAlberto",
      "liquidadoDinsides", "pagadoADinsides"
    ];
    fields.forEach((key) => { sale[key] = money(sale[key]); });
    sale.cantidad = Math.max(1, Math.round(number(sale.cantidad) || 1));
    sale.grabadoLaser = sale.grabadoLaser === true || String(sale.grabadoLaser).toLowerCase() === "true";
    sale.costoPersonalizadoActivo = sale.costoPersonalizadoActivo === true ||
      String(sale.costoPersonalizadoActivo).toLowerCase() === "true";

    if (sale.tipoProducto) {
      sale.costoTermo = productBaseCost(sale.tipoProducto);
      sale.costoPackaging = 3;
      sale.costoGrabado = sale.grabadoLaser ? money(sale.costoGrabado) : 0;
      sale.sku = buildSku(sale.tipoProducto, sale.colorProducto, sale.disenoProducto);
      sale.producto = sale.sku || sale.producto;
    }
    sale.costoProduccion = sale.costoPersonalizadoActivo
      ? sale.costoProduccionPersonalizado
      : money((sale.costoTermo + sale.costoPackaging + sale.costoGrabado) * sale.cantidad);
    sale.problemasDetalle = saleProblems(sale);
    sale.tieneProblemas = sale.problemasDetalle.length > 0;
    sale.costoProblema = money(sale.problemasDetalle.reduce((sum, problem) => sum + problem.costo, 0));
    sale.tipoProblema = sale.tieneProblemas
      ? sale.problemasDetalle.map((problem) => problem.tipo || "Otro problema").join(" · ")
      : "NO";
    sale.descripcionProblema = sale.tieneProblemas
      ? sale.problemasDetalle.map((problem) => problem.nota || problem.tipo).filter(Boolean).join(" | ")
      : "";
    sale.pagosDetalle = salePayments(sale);
    if (sale.pagosDetalle.length) {
      sale.saldoCobrado = money(sale.pagosDetalle.reduce((sum, payment) => sum + payment.monto, 0));
    }

    const isShopify = normalizeText(sale.modalidadPago).includes("shopify");
    if (!sale.comisionManual) {
      const rate = isShopify
        ? (normalizeText(sale.paisCompra).includes("internacional") ? 0.052 : 0.038)
        : 0;
      sale.comisionTarjeta = money(sale.ventaTotal * rate);
    }

    sale.cobradoTotal = money(sale.adelanto + sale.saldoCobrado);
    sale.porCobrar = money(Math.max(0, sale.ventaTotal - sale.cobradoTotal));
    sale.costoTotal = money(
      sale.costoProduccion + sale.costoEnvio + sale.costoRecojo +
      sale.otrosCostos + sale.costoProblema + sale.comisionTarjeta
    );
    sale.utilidad = money(sale.ventaTotal - sale.costoTotal);
    sale.estadoCobro = sale.porCobrar <= 0
      ? "Cobrado"
      : sale.cobradoTotal > 0 ? "Parcial" : "Pendiente";

    const accountAdvance = normalizeText(sale.cuentaAdelanto);
    const accountBalance = normalizeText(sale.cuentaSaldo);
    const receivedBalanceBy = (account) => sale.pagosDetalle.length
      ? sale.pagosDetalle.reduce((sum, payment) =>
          sum + (normalizeText(payment.cuenta) === account ? payment.monto : 0), 0)
      : (accountBalance === account ? sale.saldoCobrado : 0);
    const logisticsPayer = normalizeText(sale.pagadorLogistica);
    const logisticsCosts = money(sale.costoEnvio + sale.costoRecojo);
    const receivedGonzalo =
      (accountAdvance === "gonzalo" ? sale.adelanto : 0) +
      receivedBalanceBy("gonzalo");
    const receivedAlberto =
      (accountAdvance === "alberto" ? sale.adelanto : 0) +
      receivedBalanceBy("alberto");
    const collectedDinsides =
      (accountAdvance === "dinsides" ? sale.adelanto : 0) +
      receivedBalanceBy("dinsides");
    const deductedByDinsides = logisticsPayer === "dinsides" ? logisticsCosts : 0;

    sale.gonzaloDebeDevolver = money(
      receivedGonzalo - (logisticsPayer === "gonzalo" ? logisticsCosts : 0) - sale.liquidadoGonzalo
    );
    sale.albertoDebeDevolver = money(
      receivedAlberto - (logisticsPayer === "alberto" ? logisticsCosts : 0) - sale.liquidadoAlberto
    );
    sale.dinsidesDebeDepositar = money(Math.max(
      0,
      collectedDinsides - deductedByDinsides - sale.liquidadoDinsides
    ));
    sale.termalDebePagarDinsides = money(Math.max(
      0,
      deductedByDinsides - collectedDinsides - sale.pagadoADinsides
    ));
    const pending = Math.abs(sale.gonzaloDebeDevolver) + Math.abs(sale.albertoDebeDevolver) +
      sale.dinsidesDebeDepositar + sale.termalDebePagarDinsides;
    sale.estadoLiquidacion = pending < 0.01 ? "Liquidado" :
      (sale.liquidadoGonzalo + sale.liquidadoAlberto + sale.liquidadoDinsides + sale.pagadoADinsides > 0
        ? "Parcial" : "Pendiente");
    return sale;
  }

  function validateSale(sale, existingSales = [], currentId = "") {
    const errors = [];
    const warnings = [];
    if (!String(sale.fecha || "").trim()) errors.push("Selecciona la fecha.");
    if (!String(sale.codigo || "").trim()) errors.push("Ingresa o genera el código.");
    if (!String(sale.cliente || "").trim()) errors.push("Ingresa el nombre del cliente.");
    if (!String(sale.tipoProducto || "").trim()) errors.push("Selecciona el tipo de producto.");
    if (!String(sale.colorProducto || "").trim()) errors.push("Selecciona o escribe el color.");
    if (!String(sale.disenoProducto || "").trim()) errors.push("Selecciona el diseño.");
    if (!String(sale.producto || "").trim()) errors.push("Selecciona o escribe el producto.");
    if (sale.tieneProblemas && !saleProblems(sale).length) {
      errors.push("Completa al menos un problema o desmarca la casilla Problema.");
    }
    if (number(sale.ventaTotal) < 0) errors.push("La venta no puede ser negativa.");
    if (number(sale.adelanto) < 0 || number(sale.saldoCobrado) < 0) {
      errors.push("Los montos cobrados no pueden ser negativos.");
    }
    const duplicate = existingSales.find((item) =>
      item.id !== currentId &&
      item.active !== false &&
      normalizeText(item.codigo) === normalizeText(sale.codigo)
    );
    if (duplicate) errors.push(`El código ${sale.codigo} ya existe.`);
    const calculated = calculateSale(sale);
    if (calculated.cobradoTotal > calculated.ventaTotal) {
      warnings.push("El monto cobrado supera la venta total.");
    }
    if (calculated.costoProduccion === 0) {
      warnings.push("El costo de producción está en cero; revisa el producto o el costo personalizado.");
    }
    return { errors, warnings, calculated };
  }

  function periodRange(period, custom = {}) {
    const end = new Date(`${today()}T12:00:00-05:00`);
    const start = new Date(end);
    if (period === "today") {
      return { start: today(), end: today() };
    }
    if (period === "week") {
      const mondayOffset = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - mondayOffset);
    } else if (period === "month") {
      start.setDate(1);
    } else if (period === "custom") {
      return { start: custom.start || "", end: custom.end || "" };
    }
    return { start: dateInput(start), end: dateInput(end) };
  }

  function inRange(value, range) {
    const date = dateInput(value);
    return (!range.start || date >= range.start) && (!range.end || date <= range.end);
  }

  function download(filename, content, type = "text/plain;charset=utf-8") {
    const blob = new Blob(["\ufeff", content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  globalThis.TermalUtils = {
    number, money, currency, dateInput, formatDate, today, uid, escapeHtml,
    normalizeText, daysSince, productBaseCost, buildSku, productDescription,
    saleProblems, salePayments, cashSaleBalance, cashBalances, calculateSale, validateSale,
    periodRange, inRange, download
  };
})();
