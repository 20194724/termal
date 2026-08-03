(function () {
  "use strict";

  const U = globalThis.TermalUtils;
  const BUSINESS_ACCOUNTS = ["Termal", "Gonzalo", "Alberto"];
  const DEFAULT_MARKETING_CATEGORIES = [
    "Meta ads", "Shopify", "Sesion fotos/videos", "Canje", "Dominio y web", "Diseno y contenido", "Otros"
  ];
  const DEFAULT_PURCHASE_CATEGORIES = [
    "Termos", "Cajas", "Stickers", "Grabado laser", "Grabado UV", "Materiales", "Maquinaria y activos", "Otros"
  ];

  function bool(value) {
    return value === true || String(value).toLowerCase() === "true" || String(value).toLowerCase() === "si";
  }

  function cleanText(value) {
    return String(value || "").trim();
  }

  function arrayValue(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function normalizeAccount(value) {
    const normalized = U.normalizeText(value);
    if (normalized === "mancomunada" || normalized === "mancomunado" || normalized === "ambos") return "Termal";
    if (normalized === "gonzalo") return "Gonzalo";
    if (normalized === "alberto") return "Alberto";
    return "Termal";
  }

  function normalizePayment(raw, fallbackDate) {
    return {
      id: cleanText(raw?.id) || U.uid("pago"),
      fecha: U.dateInput(raw?.fecha) || fallbackDate || U.today(),
      monto: U.money(raw?.monto),
      cuenta: normalizeAccount(raw?.cuenta || raw?.pagadoPor),
      metodo: cleanText(raw?.metodo),
      nota: cleanText(raw?.nota)
    };
  }

  function calculateB2B(raw = {}) {
    const items = arrayValue(raw.items).map((item) => {
      const cantidad = Math.max(0, U.number(item.cantidad));
      const precioUnitario = U.money(item.precioUnitario);
      const costoTermoUnitario = U.money(item.costoTermoUnitario);
      const costoGrabadoUnitario = U.money(item.costoGrabadoUnitario);
      const costoCajaUnitario = U.money(item.costoCajaUnitario);
      const costoUnitario = U.money(costoTermoUnitario + costoGrabadoUnitario + costoCajaUnitario);
      return {
        id: cleanText(item.id) || U.uid("item"),
        descripcion: cleanText(item.descripcion),
        cantidad,
        precioUnitario,
        costoTermoUnitario,
        costoGrabadoUnitario,
        costoCajaUnitario,
        costoUnitario,
        venta: U.money(cantidad * precioUnitario),
        costo: U.money(cantidad * costoUnitario),
        utilidad: U.money(cantidad * (precioUnitario - costoUnitario))
      };
    });
    const fecha = U.dateInput(raw.fecha) || U.today();
    const pagos = arrayValue(raw.pagos).map((payment) => normalizePayment(payment, fecha)).filter((payment) => payment.monto > 0);
    const ventaSinIgv = U.money(items.reduce((sum, item) => sum + item.venta, 0));
    const aplicaIgv = bool(raw.aplicaIgv);
    const igv = aplicaIgv ? U.money(ventaSinIgv * 0.18) : 0;
    const ventaTotal = U.money(ventaSinIgv + igv);
    const costoTermos = U.money(items.reduce((sum, item) => sum + item.cantidad * item.costoTermoUnitario, 0));
    const costoGrabados = U.money(items.reduce((sum, item) => sum + item.cantidad * item.costoGrabadoUnitario, 0));
    const costoCajas = U.money(items.reduce((sum, item) => sum + item.cantidad * item.costoCajaUnitario, 0));
    const costoProductos = U.money(costoTermos + costoGrabados + costoCajas);
    const gastoAdminVentas = U.money(raw.gastoAdminVentas);
    const gastoLogistico = U.money(raw.gastoLogistico);
    const otrosCostos = U.money(raw.otrosCostos);
    const costoTotal = U.money(costoProductos + gastoAdminVentas + gastoLogistico + otrosCostos);
    const utilidad = U.money(ventaSinIgv - costoTotal);
    const cobrado = U.money(pagos.reduce((sum, payment) => sum + payment.monto, 0));
    return {
      ...raw,
      id: cleanText(raw.id),
      active: raw.active !== false,
      codigo: cleanText(raw.codigo),
      fecha,
      fechaEntregaAcordada: U.dateInput(raw.fechaEntregaAcordada),
      fechaEntregaReal: U.dateInput(raw.fechaEntregaReal),
      empresa: cleanText(raw.empresa),
      ruc: cleanText(raw.ruc),
      contacto: cleanText(raw.contacto),
      items,
      pagos,
      aplicaIgv,
      facturaEmitida: bool(raw.facturaEmitida),
      ventaSinIgv,
      igv,
      ventaTotal,
      costoTermos,
      costoGrabados,
      costoCajas,
      costoProductos,
      gastoAdminVentas,
      gastoLogistico,
      otrosCostos,
      costoTotal,
      utilidad,
      margen: ventaSinIgv ? U.money(utilidad / ventaSinIgv * 100) : 0,
      cantidadTotal: items.reduce((sum, item) => sum + item.cantidad, 0),
      cobrado,
      porCobrar: U.money(Math.max(0, ventaTotal - cobrado)),
      cotizacionNombre: cleanText(raw.cotizacionNombre),
      cotizacionUrl: cleanText(raw.cotizacionUrl),
      cotizacionFileId: cleanText(raw.cotizacionFileId),
      notas: cleanText(raw.notas)
    };
  }

  function calculatePurchase(raw = {}) {
    const fecha = U.dateInput(raw.fecha) || U.today();
    const cantidad = Math.max(0, U.number(raw.cantidad));
    const costoUnitario = U.money(raw.costoUnitario);
    const costoTotal = U.money(cantidad * costoUnitario);
    const pagos = arrayValue(raw.pagos).map((payment) => normalizePayment(payment, fecha)).filter((payment) => payment.monto > 0);
    const pagado = U.money(pagos.reduce((sum, payment) => sum + payment.monto, 0));
    const incluyeIgv = bool(raw.incluyeIgv);
    const valorSinIgv = incluyeIgv ? U.money(costoTotal / 1.18) : costoTotal;
    return {
      ...raw,
      id: cleanText(raw.id),
      active: raw.active !== false,
      fecha,
      categoria: cleanText(raw.categoria),
      producto: cleanText(raw.producto),
      proveedor: cleanText(raw.proveedor),
      detalle: cleanText(raw.detalle),
      cantidad,
      costoUnitario,
      costoTotal,
      pagos,
      pagado,
      porPagar: U.money(Math.max(0, costoTotal - pagado)),
      incluyeIgv,
      valorSinIgv,
      igv: incluyeIgv ? U.money(costoTotal - valorSinIgv) : 0,
      facturaNombre: cleanText(raw.facturaNombre),
      facturaUrl: cleanText(raw.facturaUrl),
      facturaFileId: cleanText(raw.facturaFileId),
      notas: cleanText(raw.notas)
    };
  }

  function calculateMarketing(raw = {}) {
    const dolares = U.money(raw.dolares);
    const tipoCambio = U.number(raw.tipoCambio);
    const soles = dolares > 0 ? U.money(dolares * tipoCambio) : U.money(raw.soles);
    return {
      ...raw,
      id: cleanText(raw.id),
      active: raw.active !== false,
      fecha: U.dateInput(raw.fecha) || U.today(),
      categoria: cleanText(raw.categoria),
      detalle: cleanText(raw.detalle),
      soles,
      dolares,
      tipoCambio: dolares > 0 ? tipoCambio : 0,
      pagadoPor: normalizeAccount(raw.pagadoPor),
      notas: cleanText(raw.notas)
    };
  }

  function b2bDeliveryStatus(record = {}, referenceDate = U.today()) {
    const agreedDate = U.dateInput(record.fechaEntregaAcordada);
    const deliveredDate = U.dateInput(record.fechaEntregaReal);
    if (deliveredDate) {
      return { key: "delivered", label: "Entregado", days: null, date: agreedDate, deliveredDate };
    }
    if (!agreedDate) {
      return { key: "none", label: "Sin fecha", days: null, date: "", deliveredDate: "" };
    }
    const reference = new Date(`${U.dateInput(referenceDate) || U.today()}T12:00:00-05:00`);
    const delivery = new Date(`${agreedDate}T12:00:00-05:00`);
    const days = Math.round((delivery - reference) / 86400000);
    if (days < 0) {
      const late = Math.abs(days);
      return { key: "danger", label: `Atrasado ${late} día${late === 1 ? "" : "s"}`, days, date: agreedDate, deliveredDate: "" };
    }
    if (days === 0) return { key: "danger", label: "Entrega hoy", days, date: agreedDate, deliveredDate: "" };
    const label = days === 1 ? "Falta 1 día" : `Faltan ${days} días`;
    if (days <= 3) return { key: "danger", label, days, date: agreedDate, deliveredDate: "" };
    if (days <= 7) return { key: "warning", label, days, date: agreedDate, deliveredDate: "" };
    return { key: "scheduled", label, days, date: agreedDate, deliveredDate: "" };
  }

  function validateB2B(record) {
    const errors = [];
    if (!record.fecha) errors.push("Selecciona la fecha de inicio.");
    if (!record.empresa) errors.push("Ingresa la empresa.");
    if (!record.fechaEntregaAcordada) errors.push("Ingresa la fecha de entrega acordada.");
    if (!record.items.length) errors.push("Agrega al menos un producto.");
    record.items.forEach((item, index) => {
      if (!item.descripcion) errors.push(`Completa la descripcion del producto ${index + 1}.`);
      if (item.cantidad <= 0) errors.push(`La cantidad del producto ${index + 1} debe ser mayor que cero.`);
    });
    if (record.cobrado > record.ventaTotal + 0.009) errors.push("Los pagos superan la venta total.");
    return errors;
  }

  function validatePurchase(record) {
    const errors = [];
    if (!record.fecha) errors.push("Selecciona la fecha.");
    if (!record.categoria) errors.push("Ingresa la categoria.");
    if (!record.producto) errors.push("Ingresa el producto.");
    if (!record.proveedor) errors.push("Ingresa el proveedor.");
    if (record.cantidad <= 0) errors.push("La cantidad debe ser mayor que cero.");
    if (record.costoUnitario < 0) errors.push("El costo unitario no puede ser negativo.");
    if (record.pagado > record.costoTotal + 0.009) errors.push("Los pagos superan el costo total.");
    return errors;
  }

  function validateMarketing(record) {
    const errors = [];
    if (!record.fecha) errors.push("Selecciona la fecha.");
    if (!record.categoria) errors.push("Ingresa la categoria.");
    if (!record.detalle) errors.push("Ingresa el detalle.");
    if (record.dolares > 0 && record.tipoCambio <= 0) errors.push("Ingresa el tipo de cambio usado por el banco.");
    if (record.soles <= 0) errors.push("El gasto debe ser mayor que cero.");
    return errors;
  }

  function cashMovements(b2bRecords = [], purchases = [], marketing = []) {
    const result = [];
    b2bRecords.map(calculateB2B).forEach((record) => {
      record.pagos.forEach((payment) => {
        if (payment.cuenta === "Termal") return;
        result.push(syntheticMovement({
          id: `b2b_pago_${record.id}_${payment.id}`,
          persona: payment.cuenta,
          amount: payment.monto,
          signedAmount: payment.monto,
          date: payment.fecha,
          concepto: "Cobro B2B recibido",
          codigo: record.codigo,
          cliente: record.empresa,
          note: payment.nota || payment.metodo,
          sourceType: "b2b",
          sourceId: record.id
        }));
      });
    });
    purchases.map(calculatePurchase).forEach((record) => {
      record.pagos.forEach((payment) => {
        if (payment.cuenta === "Termal") return;
        result.push(syntheticMovement({
          id: `compra_pago_${record.id}_${payment.id}`,
          persona: payment.cuenta,
          amount: payment.monto,
          signedAmount: -payment.monto,
          date: payment.fecha,
          concepto: "Compra pagada con dinero personal",
          codigo: "",
          cliente: record.proveedor,
          note: [record.producto, payment.nota].filter(Boolean).join(" - "),
          sourceType: "purchase",
          sourceId: record.id
        }));
      });
    });
    marketing.map(calculateMarketing).forEach((record) => {
      if (record.pagadoPor === "Termal") return;
      result.push(syntheticMovement({
        id: `marketing_${record.id}`,
        persona: record.pagadoPor,
        amount: record.soles,
        signedAmount: -record.soles,
        date: record.fecha,
        concepto: "Marketing pagado con dinero personal",
        codigo: "",
        cliente: record.categoria,
        note: record.detalle,
        sourceType: "marketing",
        sourceId: record.id
      }));
    });
    return result;
  }

  function syntheticMovement(data) {
    return {
      ...data,
      type: data.signedAmount >= 0 ? "BUSINESS_COLLECTION" : "PERSON_EXPENSE",
      naturaleza: data.signedAmount >= 0 ? "BUSINESS_COLLECTION" : "PERSON_EXPENSE",
      affectsCash: true,
      schemaVersion: 2,
      allocations: [],
      createdAt: `${data.date || U.today()}T12:00:00.000Z`,
      isDerived: true
    };
  }

  globalThis.TermalBusiness = {
    BUSINESS_ACCOUNTS,
    DEFAULT_MARKETING_CATEGORIES,
    DEFAULT_PURCHASE_CATEGORIES,
    bool,
    arrayValue,
    normalizeAccount,
    calculateB2B,
    calculatePurchase,
    calculateMarketing,
    b2bDeliveryStatus,
    validateB2B,
    validatePurchase,
    validateMarketing,
    cashMovements
  };
})();
