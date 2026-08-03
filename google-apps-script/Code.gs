/**
 * ERP MINI TERMAL · Backend para Google Sheets
 *
 * Este archivo se pega completo en Extensiones > Apps Script.
 * No publiques aquí una contraseña. La función prepararInstalacionInicial()
 * crea una clave aleatoria y la guarda en Propiedades del script.
 */

const TERMAL_CONFIG = Object.freeze({
  SPREADSHEET_ID: "USAR_HOJA_VINCULADA",
  SALES_SHEET: "Ventas",
  LISTS_SHEET: "Listas",
  MOVEMENTS_SHEET: "Movimientos",
  B2B_SHEET: "Empresas",
  PURCHASES_SHEET: "Compras",
  MARKETING_SHEET: "Marketing",
  TIMEZONE: "America/Lima",
  CODE_PREFIX: "",
  ACCESS_KEY_PROPERTY: "TERMAL_ACCESS_KEY",
  SPREADSHEET_PROPERTY: "TERMAL_SPREADSHEET_ID",
  LAST_UPDATED_PROPERTY: "TERMAL_LAST_UPDATED"
});

const B2B_HEADERS = [
  ["id", "ID interno"], ["active", "Activo"], ["version", "Versión"], ["createdAt", "Creado"],
  ["updatedAt", "Actualizado"], ["deletedAt", "Eliminado"], ["codigo", "Código B2B"],
  ["fecha", "Fecha de inicio"], ["fechaEntregaAcordada", "Entrega acordada"], ["fechaEntregaReal", "Entrega real"],
  ["empresa", "Empresa"], ["ruc", "RUC"], ["contacto", "Contacto"], ["aplicaIgv", "Aplica IGV"],
  ["facturaEmitida", "Factura emitida"], ["items", "Productos JSON"], ["pagos", "Pagos JSON"],
  ["gastoAdminVentas", "Gasto administración y ventas"], ["gastoLogistico", "Gasto logístico"],
  ["otrosCostos", "Otros costos"], ["ventaSinIgv", "Venta sin IGV"], ["igv", "IGV"],
  ["ventaTotal", "Venta total"], ["costoProductos", "Costo de productos"], ["costoTotal", "Costo total"],
  ["utilidad", "Utilidad"], ["margen", "Margen"], ["cantidadTotal", "Unidades"],
  ["cobrado", "Cobrado"], ["porCobrar", "Por cobrar"], ["cotizacionNombre", "Cotización PDF"],
  ["cotizacionUrl", "Enlace cotización"], ["cotizacionFileId", "ID cotización"], ["notas", "Notas"]
];

const PURCHASE_HEADERS = [
  ["id", "ID interno"], ["active", "Activo"], ["version", "Versión"], ["createdAt", "Creado"],
  ["updatedAt", "Actualizado"], ["deletedAt", "Eliminado"], ["fecha", "Fecha"], ["categoria", "Categoría"],
  ["producto", "Producto"], ["proveedor", "Proveedor"], ["detalle", "Detalle"], ["cantidad", "Cantidad"],
  ["costoUnitario", "Costo unitario"], ["costoTotal", "Costo total"], ["pagos", "Pagos JSON"],
  ["pagado", "Pagado"], ["porPagar", "Por pagar"], ["incluyeIgv", "Costo incluye IGV"],
  ["valorSinIgv", "Valor sin IGV"], ["igv", "IGV"], ["facturaNombre", "Factura PDF"],
  ["facturaUrl", "Enlace factura"], ["facturaFileId", "ID factura"], ["notas", "Notas"]
];

const MARKETING_HEADERS = [
  ["id", "ID interno"], ["active", "Activo"], ["version", "Versión"], ["createdAt", "Creado"],
  ["updatedAt", "Actualizado"], ["deletedAt", "Eliminado"], ["fecha", "Fecha"], ["categoria", "Categoría"],
  ["soles", "Soles"], ["dolares", "Dólares"], ["tipoCambio", "Tipo de cambio"],
  ["detalle", "Detalle"], ["pagadoPor", "Pagado por"]
];

const SALES_HEADERS = [
  ["id", "ID interno"],
  ["active", "Activo"],
  ["version", "Versión"],
  ["createdAt", "Creado"],
  ["updatedAt", "Actualizado"],
  ["deletedAt", "Eliminado"],
  ["fecha", "Fecha"],
  ["codigo", "Código"],
  ["cliente", "Cliente"],
  ["telefono", "Teléfono"],
  ["producto", "Producto"],
  ["sku", "SKU"],
  ["tipoProducto", "Tipo de producto"],
  ["colorProducto", "Color"],
  ["disenoProducto", "Diseño"],
  ["cantidad", "Cantidad"],
  ["ventaTotal", "Venta total"],
  ["canal", "Canal"],
  ["origen", "Origen"],
  ["observaciones", "Observaciones"],
  ["modalidadPago", "Modalidad de pago"],
  ["adelanto", "Adelanto"],
  ["saldoCobrado", "Saldo cobrado"],
  ["cobradoTotal", "Cobrado total"],
  ["porCobrar", "Por cobrar"],
  ["cuentaAdelanto", "Cuenta que recibió el adelanto"],
  ["cuentaSaldo", "Cuenta que recibió el saldo"],
  ["metodoPago", "Método de pago"],
  ["paisCompra", "País de la compra"],
  ["comisionTarjeta", "Comisión de tarjeta"],
  ["comisionManual", "Comisión manual"],
  ["estadoCobro", "Estado del cobro"],
  ["costoTermo", "Costo base del producto"],
  ["costoPackaging", "Costo de packaging"],
  ["grabadoLaser", "Grabado láser tercerizado"],
  ["costoGrabado", "Costo del grabado"],
  ["costoPersonalizadoActivo", "Costo personalizado activo"],
  ["costoProduccionPersonalizado", "Costo de producción personalizado"],
  ["costoProduccion", "Costo de producción"],
  ["costoEnvio", "Costo del envío"],
  ["costoRecojo", "Costo de recojo"],
  ["otrosCostos", "Otros costos"],
  ["costoProblema", "Costo del problema"],
  ["costoTotal", "Costo total"],
  ["utilidad", "Utilidad"],
  ["agencia", "Agencia"],
  ["modalidadLogistica", "Modalidad logística"],
  ["pagadorLogistica", "Quién pagó envío y recojo"],
  ["estadoPedido", "Estado del pedido"],
  ["fechaDespacho", "Fecha de despacho"],
  ["codigoSeguimiento", "Código de seguimiento"],
  ["fechaEntrega", "Fecha de entrega"],
  ["tipoProblema", "Tipo de problema"],
  ["descripcionProblema", "Descripción del problema"],
  ["problemasDetalle", "Problemas detallados"],
  ["liquidadoGonzalo", "Gonzalo ya devolvió"],
  ["liquidadoAlberto", "Alberto ya devolvió"],
  ["liquidadoDinsides", "DINSIDES ya depositó"],
  ["pagadoADinsides", "Termal ya pagó a DINSIDES"],
  ["gonzaloDebeDevolver", "Gonzalo debe devolver"],
  ["albertoDebeDevolver", "Alberto debe devolver"],
  ["dinsidesDebeDepositar", "DINSIDES debe depositar"],
  ["termalDebePagarDinsides", "Termal debe pagar a DINSIDES"],
  ["estadoLiquidacion", "Estado de liquidación"],
  ["batchSalidaId", "ID de salida o recojo"],
  ["fechaAcordadaEntrega", "Fecha acordada de entrega"],
  ["destinatarioEnvio", "Destinatario de envío"],
  ["telefonoEnvio", "Teléfono de envío"],
  ["dniEnvio", "DNI de envío"],
  ["direccionEnvio", "Dirección o sede"],
  ["enlaceMaps", "Enlace de Google Maps"],
  ["pagosDetalle", "Pagos detallados"]
];

const MOVEMENT_HEADERS = [
  ["id", "ID movimiento"],
  ["type", "Tipo"],
  ["amount", "Monto"],
  ["date", "Fecha"],
  ["note", "Observación"],
  ["allocations", "Aplicaciones JSON"],
  ["createdAt", "Creado"],
  ["persona", "Persona"],
  ["naturaleza", "Naturaleza"],
  ["signedAmount", "Monto con signo"],
  ["concepto", "Concepto"],
  ["saleId", "ID pedido relacionado"],
  ["codigo", "Código de pedido"],
  ["cliente", "Cliente"],
  ["metodoPago", "Método de pago"],
  ["saldoAnterior", "Saldo anterior"],
  ["saldoPosterior", "Saldo posterior"],
  ["affectsCash", "Afecta caja"],
  ["schemaVersion", "Versión de esquema"]
];

const DEFAULT_LISTS = {
  estados: ["Producción", "Por despachar", "Despachado", "Entregado", "Cancelado"],
  agencias: ["DINSIDES", "Shalom", "Olva", "Serpost", "Otro"],
  canales: ["Instagram", "TikTok", "Shopify WA", "Shopify WEB", "Recomendación"],
  origenes: ["Orgánico", "Meta Ads", "TikTok Ads"],
  modalidadesPago: ["Contra entrega", "Pago completo", "Izipay (tarjeta)"],
  cuentas: ["Gonzalo", "Alberto", "Mancomunada", "DINSIDES"],
  metodosPago: ["Yape", "Plin", "Transferencia", "Tarjeta", "Efectivo"],
  problemas: ["NO", "Error de producción / grabado", "Cliente no estaba", "Redireccionamiento", "Cambio de producto", "Otro"],
  modalidadesLogisticas: ["Entrega y cobro", "Recojo sin cobro", "Envío a provincia", "Recojo en tienda"],
  pagadoresLogistica: ["Gonzalo", "Alberto", "Mancomunada", "DINSIDES"],
  categoriasCompras: ["Termos", "Cajas", "Stickers", "Grabado láser", "Grabado UV", "Materiales", "Maquinaria y activos", "Otros"],
  categoriasMarketing: ["Meta ads", "Shopify", "Sesión fotos/videos", "Canje", "Dominio y web", "Diseño y contenido", "Otros"],
  tiposProductos: [
    { nombre: "Termo 1200 ml", codigo: "1200", costoBase: 25.5, colores: ["Negro", "Crema", "Blanco"] },
    { nombre: "Termo 890 ml", codigo: "890", costoBase: 19, colores: ["Negro", "Crema", "Blanco"] },
    { nombre: "Shaker", codigo: "SH", costoBase: 29, colores: ["Negro", "Azul"] }
  ],
  disenos: [
    "One Piece Luffy", "One Piece Zoro", "One Piece Nakamas",
    "Jujutsu Kaisen Legacy", "Jujutsu Kaisen Toji", "Demon Slayer",
    "Naruto", "Chainsawman", "Bleach", "Dragon Ball", "Black Clover", "Personalizado"
  ],
  coloresPorProducto: {
    "Termo 1200 ml": ["Negro", "Crema", "Blanco"],
    "Termo 890 ml": ["Negro", "Crema", "Blanco"],
    "Shaker": ["Negro", "Azul"]
  },
  productos: []
};

/**
 * PRIMERA FUNCIÓN QUE DEBES EJECUTAR.
 * Prepara las hojas, crea una clave segura y muestra el resultado en el registro.
 */
function prepararInstalacionInicial() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const spreadsheet = resolveSpreadsheetForSetup_();
    PropertiesService.getScriptProperties().setProperty(
      TERMAL_CONFIG.SPREADSHEET_PROPERTY,
      spreadsheet.getId()
    );
    ensureSalesSheet_(spreadsheet);
    ensureListsSheet_(spreadsheet);
    ensureMovementsSheet_(spreadsheet);
    ensureBusinessSheets_(spreadsheet);
    const properties = PropertiesService.getScriptProperties();
    let accessKey = properties.getProperty(TERMAL_CONFIG.ACCESS_KEY_PROPERTY);
    if (!accessKey) {
      accessKey = generateAccessKey_();
      properties.setProperty(TERMAL_CONFIG.ACCESS_KEY_PROPERTY, accessKey);
    }
    touchUpdated_();
    const result = [
      "✅ ERP MINI TERMAL quedó preparado.",
      "Hoja conectada: " + spreadsheet.getName(),
      "ID de la hoja: " + spreadsheet.getId(),
      "CLAVE DE ACCESO (cópiala ahora): " + accessKey,
      "Guarda esta clave en un lugar privado. La aplicación te la pedirá al entrar."
    ].join("\n");
    console.log(result);
    Logger.log(result);
    return result;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Migración aditiva para la versión 2.
 * Conserva la clave, los pedidos y los movimientos existentes.
 */
function prepararActualizacionV2() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const spreadsheet = getSpreadsheet_();
    ensureSalesSheet_(spreadsheet);
    ensureListsSheet_(spreadsheet);
    ensureMovementsSheet_(spreadsheet);
    touchUpdated_();
    const result = "✅ ERP MINI TERMAL v2 preparado sin cambiar la clave ni borrar datos.";
    console.log(result);
    Logger.log(result);
    return result;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Migración aditiva para la versión 3.
 * Crea las hojas Empresas, Compras y Marketing sin alterar la versión publicada.
 */
function prepararActualizacionV3() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const spreadsheet = getSpreadsheet_();
    ensureSalesSheet_(spreadsheet);
    ensureListsSheet_(spreadsheet);
    ensureMovementsSheet_(spreadsheet);
    ensureBusinessSheets_(spreadsheet);
    touchUpdated_();
    const result = "✅ ERP MINI TERMAL v3 preparado. Se conservaron todos los datos anteriores.";
    console.log(result);
    Logger.log(result);
    return result;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Úsala solo si deseas invalidar la clave anterior.
 */
function generarNuevaClaveDeAcceso() {
  const key = generateAccessKey_();
  PropertiesService.getScriptProperties().setProperty(TERMAL_CONFIG.ACCESS_KEY_PROPERTY, key);
  console.log("NUEVA CLAVE DE ACCESO: " + key);
  Logger.log("NUEVA CLAVE DE ACCESO: " + key);
  return key;
}

/**
 * Comprobación manual desde el editor de Apps Script.
 */
function comprobarConexion() {
  const spreadsheet = getSpreadsheet_();
  const sales = getSalesRecords_(spreadsheet);
  const message = "✅ Conexión correcta con “" + spreadsheet.getName() + "”. Ventas encontradas: " + sales.length;
  console.log(message);
  Logger.log(message);
  return message;
}

function doGet() {
  return jsonResponse_({
    ok: true,
    data: {
      service: "ERP MINI TERMAL",
      status: "online",
      message: "El backend está publicado. Usa la aplicación para acceder a los datos."
    }
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw apiError_("INVALID_REQUEST", "La solicitud llegó vacía.");
    }
    let request;
    try {
      request = JSON.parse(e.postData.contents);
    } catch (parseError) {
      throw apiError_("INVALID_JSON", "La solicitud no tiene un formato válido.");
    }
    validateAccess_(request.accessKey);
    const action = sanitizeText_(request.action, 80);
    const payload = request.payload || {};
    const data = routeAction_(action, payload);
    return jsonResponse_({ ok: true, data: data });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonResponse_({
      ok: false,
      code: error.code || "SERVER_ERROR",
      message: error.publicMessage || "Ocurrió un error al procesar la solicitud. Revisa el registro de Apps Script."
    });
  }
}

function routeAction_(action, payload) {
  switch (action) {
    case "ping": return ping_();
    case "getAll": return getAll_();
    case "getSale": return getSale_(payload.id);
    case "getLists": return readLists_(getSpreadsheet_());
    case "getMetrics": return getMetrics_(payload);
    case "nextCode": return { code: nextCode_(getSalesRecords_(getSpreadsheet_())) };
    case "createSale": return createSale_(payload.sale || {});
    case "updateSale": return updateSale_(payload.sale || {});
    case "archiveSale": return setSaleActive_(payload.id, false);
    case "restoreSale": return setSaleActive_(payload.id, true);
    case "createMovement":
    case "registerSettlement": return createMovement_(payload.movement || payload || {});
    case "createCashMovement": return createCashMovement_(payload.movement || {});
    case "createDispatch": return createDispatch_(payload.dispatch || {});
    case "saveB2B": return saveBusinessRecord_("b2b", payload.record || {}, payload.attachment || null);
    case "savePurchase": return saveBusinessRecord_("purchase", payload.record || {}, payload.attachment || null);
    case "saveMarketing": return saveBusinessRecord_("marketing", payload.record || {}, null);
    case "addBusinessPayment": return addBusinessPayment_(payload.type, payload.id, payload.payment || {});
    case "archiveBusinessRecord": return archiveBusinessRecord_(payload.type, payload.id);
    default: throw apiError_("UNKNOWN_ACTION", "La acción solicitada no existe.");
  }
}

function ping_() {
  const spreadsheet = getSpreadsheet_();
  return { mode: "google-sheets", spreadsheet: spreadsheet.getName() };
}

function getAll_() {
  const spreadsheet = getSpreadsheet_();
  return {
    sales: getSalesRecords_(spreadsheet),
    movements: getMovementRecords_(spreadsheet),
    b2b: getBusinessRecords_(spreadsheet, "b2b"),
    purchases: getBusinessRecords_(spreadsheet, "purchase"),
    marketing: getBusinessRecords_(spreadsheet, "marketing"),
    lists: readLists_(spreadsheet),
    updatedAt: PropertiesService.getScriptProperties().getProperty(TERMAL_CONFIG.LAST_UPDATED_PROPERTY) || new Date().toISOString()
  };
}

function getSale_(id) {
  const result = findSale_(getSpreadsheet_(), id);
  if (!result) throw apiError_("NOT_FOUND", "No encontramos esa venta.");
  return calculateSale_(result.sale);
}

function createSale_(input) {
  return withWriteLock_(function () {
    const spreadsheet = getSpreadsheet_();
    const sheet = spreadsheet.getSheetByName(TERMAL_CONFIG.SALES_SHEET);
    const existing = getSalesRecords_(spreadsheet);
    const now = new Date().toISOString();
    let candidate = sanitizeSale_(input);
    candidate.id = Utilities.getUuid();
    candidate.active = true;
    candidate.version = 1;
    candidate.createdAt = now;
    candidate.updatedAt = now;
    candidate.deletedAt = "";
    candidate.codigo = candidate.codigo || nextCode_(existing);
    validateSale_(candidate, existing, "");
    candidate = calculateSale_(candidate);
    sheet.appendRow(objectToRow_(candidate, SALES_HEADERS));
    rememberColorInLists_(spreadsheet, candidate.tipoProducto, candidate.colorProducto);
    rememberProblemTypesInLists_(spreadsheet, candidate.problemasDetalle);
    touchUpdated_();
    return candidate;
  });
}

function updateSale_(input) {
  return withWriteLock_(function () {
    const spreadsheet = getSpreadsheet_();
    const result = findSale_(spreadsheet, input.id);
    if (!result) throw apiError_("NOT_FOUND", "No encontramos esa venta. Sincroniza e inténtalo otra vez.");
    const incomingVersion = toNumber_(input.version);
    const storedVersion = toNumber_(result.sale.version);
    if (incomingVersion && storedVersion && incomingVersion !== storedVersion) {
      throw apiError_(
        "CONFLICT",
        "Otra persona modificó esta venta. Sincroniza, revisa los cambios y vuelve a editar."
      );
    }
    const protectedFields = {
      id: result.sale.id,
      createdAt: result.sale.createdAt,
      active: result.sale.active,
      deletedAt: result.sale.deletedAt
    };
    let candidate = sanitizeSale_(Object.assign({}, result.sale, input, protectedFields));
    candidate.version = storedVersion + 1;
    candidate.updatedAt = new Date().toISOString();
    validateSale_(candidate, getSalesRecords_(spreadsheet), candidate.id);
    candidate = calculateSale_(candidate);
    result.sheet.getRange(result.row, 1, 1, SALES_HEADERS.length)
      .setValues([objectToRow_(candidate, SALES_HEADERS)]);
    rememberColorInLists_(spreadsheet, candidate.tipoProducto, candidate.colorProducto);
    rememberProblemTypesInLists_(spreadsheet, candidate.problemasDetalle);
    touchUpdated_();
    return candidate;
  });
}

function setSaleActive_(id, active) {
  return withWriteLock_(function () {
    const spreadsheet = getSpreadsheet_();
    const result = findSale_(spreadsheet, id);
    if (!result) throw apiError_("NOT_FOUND", "No encontramos esa venta.");
    let sale = Object.assign({}, result.sale, {
      active: Boolean(active),
      deletedAt: active ? "" : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: toNumber_(result.sale.version) + 1
    });
    sale = calculateSale_(sale);
    result.sheet.getRange(result.row, 1, 1, SALES_HEADERS.length)
      .setValues([objectToRow_(sale, SALES_HEADERS)]);
    touchUpdated_();
    return sale;
  });
}

function createMovement_(input) {
  return withWriteLock_(function () {
    const amount = roundMoney_(input.amount);
    if (amount <= 0) throw apiError_("VALIDATION_ERROR", "El monto debe ser mayor que cero.");
    const definitions = {
      GONZALO_RETURN: ["gonzaloDebeDevolver", "liquidadoGonzalo"],
      ALBERTO_RETURN: ["albertoDebeDevolver", "liquidadoAlberto"],
      DINSIDES_DEPOSIT: ["dinsidesDebeDepositar", "liquidadoDinsides"],
      TERMAL_PAY_DINSIDES: ["termalDebePagarDinsides", "pagadoADinsides"]
    };
    const type = sanitizeText_(input.type, 50);
    const definition = definitions[type];
    if (!definition) throw apiError_("VALIDATION_ERROR", "Selecciona un tipo de movimiento válido.");

    const spreadsheet = getSpreadsheet_();
    const salesSheet = spreadsheet.getSheetByName(TERMAL_CONFIG.SALES_SHEET);
    const records = getSalesRecordsWithRows_(spreadsheet)
      .filter(function (item) { return item.sale.active !== false; })
      .sort(function (a, b) { return String(a.sale.fecha).localeCompare(String(b.sale.fecha)); });
    let remainder = amount;
    const allocations = [];
    const updates = [];
    records.forEach(function (record) {
      if (remainder <= 0) return;
      let sale = calculateSale_(record.sale);
      const pending = toNumber_(sale[definition[0]]);
      if (pending <= 0) return;
      const applied = roundMoney_(Math.min(pending, remainder));
      sale[definition[1]] = roundMoney_(toNumber_(sale[definition[1]]) + applied);
      sale.version = toNumber_(sale.version) + 1;
      sale.updatedAt = new Date().toISOString();
      sale = calculateSale_(sale);
      updates.push({ row: record.row, sale: sale });
      allocations.push({ saleId: sale.id, codigo: sale.codigo, amount: applied });
      remainder = roundMoney_(remainder - applied);
    });
    if (remainder > 0) {
      throw apiError_(
        "AMOUNT_EXCEEDS_PENDING",
        "El monto supera lo pendiente por S/ " + remainder.toFixed(2) + "."
      );
    }
    updates.forEach(function (update) {
      salesSheet.getRange(update.row, 1, 1, SALES_HEADERS.length)
        .setValues([objectToRow_(update.sale, SALES_HEADERS)]);
    });
    const movement = {
      id: Utilities.getUuid(),
      type: type,
      amount: amount,
      date: normalizeDate_(input.date) || today_(),
      note: sanitizeText_(input.note, 500),
      allocations: allocations,
      createdAt: new Date().toISOString()
    };
    const movementsSheet = spreadsheet.getSheetByName(TERMAL_CONFIG.MOVEMENTS_SHEET);
    movementsSheet.appendRow(objectToRow_(
      Object.assign({}, movement, { allocations: JSON.stringify(allocations) }),
      MOVEMENT_HEADERS
    ));
    touchUpdated_();
    return { movement: movement, sales: getSalesRecords_(spreadsheet) };
  });
}

function createCashMovement_(input) {
  return withWriteLock_(function () {
    const amount = roundMoney_(input.amount);
    const persona = cashMovementPerson_(input.persona);
    const naturaleza = sanitizeText_(input.naturaleza, 50);
    const validTypes = ["PERSON_TO_TERMAL", "TERMAL_TO_PERSON", "PERSON_EXPENSE"];
    const concepto = sanitizeText_(input.concepto, 500);

    if (!persona) {
      throw apiError_("VALIDATION_ERROR", "Selecciona una persona válida.");
    }
    if (validTypes.indexOf(naturaleza) < 0) {
      throw apiError_("VALIDATION_ERROR", "Selecciona un tipo de movimiento válido.");
    }
    if (amount <= 0) {
      throw apiError_("VALIDATION_ERROR", "El monto debe ser mayor que cero.");
    }
    if (!concepto) {
      throw apiError_("VALIDATION_ERROR", "Ingresa el concepto del movimiento.");
    }

    const spreadsheet = getSpreadsheet_();
    const sales = getSalesRecords_(spreadsheet);
    const movements = getMovementRecords_(spreadsheet);
    const relatedSale = input.saleId
      ? sales.find(function (sale) {
          return String(sale.id) === String(input.saleId) && sale.active !== false;
        })
      : null;
    if (input.saleId && !relatedSale) {
      throw apiError_("NOT_FOUND", "No encontramos el pedido relacionado.");
    }

    const previous = cashBalanceForPerson_(sales, movements, persona, spreadsheet);
    const signedAmount = naturaleza === "TERMAL_TO_PERSON" ? amount : -amount;
    const movement = {
      id: Utilities.getUuid(),
      type: naturaleza,
      amount: amount,
      date: normalizeDate_(input.date) || today_(),
      note: sanitizeText_(input.note, 1000),
      allocations: relatedSale
        ? [{ saleId: relatedSale.id, codigo: relatedSale.codigo, amount: amount }]
        : [],
      createdAt: new Date().toISOString(),
      persona: persona,
      naturaleza: naturaleza,
      signedAmount: signedAmount,
      concepto: concepto,
      saleId: relatedSale ? relatedSale.id : "",
      codigo: relatedSale ? relatedSale.codigo : "",
      cliente: sanitizeText_(input.cliente || (relatedSale && relatedSale.cliente), 500),
      metodoPago: sanitizeText_(input.metodoPago, 200),
      saldoAnterior: roundMoney_(previous),
      saldoPosterior: roundMoney_(previous + signedAmount),
      affectsCash: true,
      schemaVersion: 2
    };

    const movementsSheet = spreadsheet.getSheetByName(TERMAL_CONFIG.MOVEMENTS_SHEET);
    movementsSheet.appendRow(objectToRow_(movement, MOVEMENT_HEADERS));
    touchUpdated_();
    return { movement: movement, sales: sales };
  });
}

function createDispatch_(input) {
  return withWriteLock_(function () {
    const ids = Array.isArray(input.saleIds) ? input.saleIds.map(String) : [];
    if (!ids.length) throw apiError_("VALIDATION_ERROR", "Selecciona por lo menos un pedido.");
    const spreadsheet = getSpreadsheet_();
    const salesSheet = spreadsheet.getSheetByName(TERMAL_CONFIG.SALES_SHEET);
    const records = getSalesRecordsWithRows_(spreadsheet)
      .filter(function (item) { return ids.indexOf(String(item.sale.id)) >= 0 && item.sale.active !== false; });
    if (records.length !== ids.length) {
      throw apiError_("NOT_FOUND", "Uno de los pedidos ya no está disponible. Sincroniza y vuelve a seleccionarlos.");
    }
    const batchId = Utilities.getUuid();
    const pickupPerSale = roundMoney_(toNumber_(input.costoRecojo) / records.length);
    const updatedSales = records.map(function (record) {
      let sale = Object.assign({}, record.sale, {
        agencia: sanitizeText_(input.agencia, 80),
        fechaDespacho: normalizeDate_(input.fecha) || today_(),
        estadoPedido: "Despachado",
        batchSalidaId: batchId,
        costoRecojo: pickupPerSale,
        pagadorLogistica: sanitizeText_(input.pagadorLogistica, 80) || record.sale.pagadorLogistica,
        version: toNumber_(record.sale.version) + 1,
        updatedAt: new Date().toISOString()
      });
      sale = calculateSale_(sale);
      salesSheet.getRange(record.row, 1, 1, SALES_HEADERS.length)
        .setValues([objectToRow_(sale, SALES_HEADERS)]);
      return sale;
    });
    touchUpdated_();
    return { batchId: batchId, sales: updatedSales };
  });
}

function getMetrics_(payload) {
  const start = normalizeDate_(payload.start);
  const end = normalizeDate_(payload.end);
  const sales = getSalesRecords_(getSpreadsheet_()).filter(function (sale) {
    return sale.active !== false &&
      sale.estadoPedido !== "Cancelado" &&
      (!start || sale.fecha >= start) &&
      (!end || sale.fecha <= end);
  });
  const metrics = sales.reduce(function (acc, sale) {
    acc.ventas += toNumber_(sale.ventaTotal);
    acc.cobrado += toNumber_(sale.cobradoTotal);
    acc.porCobrar += toNumber_(sale.porCobrar);
    acc.costos += toNumber_(sale.costoTotal);
    acc.utilidad += toNumber_(sale.utilidad);
    acc.pedidos += 1;
    acc.unidades += toNumber_(sale.cantidad);
    return acc;
  }, { ventas: 0, cobrado: 0, porCobrar: 0, costos: 0, utilidad: 0, pedidos: 0, unidades: 0 });
  metrics.ticketPromedio = metrics.pedidos ? roundMoney_(metrics.ventas / metrics.pedidos) : 0;
  metrics.margen = metrics.ventas ? roundMoney_(metrics.utilidad / metrics.ventas * 100) : 0;
  return metrics;
}

function getSalesRecords_(spreadsheet) {
  return getSalesRecordsWithRows_(spreadsheet).map(function (record) {
    return calculateSale_(record.sale);
  });
}

function getSalesRecordsWithRows_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(TERMAL_CONFIG.SALES_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, SALES_HEADERS.length).getValues();
  return values
    .map(function (row, index) {
      return { sale: rowToObject_(row, SALES_HEADERS), row: index + 2 };
    })
    .filter(function (record) { return Boolean(record.sale.id); });
}

function getMovementRecords_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(TERMAL_CONFIG.MOVEMENTS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, MOVEMENT_HEADERS.length).getValues()
    .map(function (row) {
      const movement = rowToObject_(row, MOVEMENT_HEADERS);
      try {
        movement.allocations = movement.allocations ? JSON.parse(movement.allocations) : [];
      } catch (error) {
        movement.allocations = [];
      }
      movement.amount = roundMoney_(movement.amount);
      movement.signedAmount = movement.signedAmount === "" || movement.signedAmount === undefined
        ? ""
        : roundMoney_(movement.signedAmount);
      movement.saldoAnterior = movement.saldoAnterior === "" || movement.saldoAnterior === undefined
        ? ""
        : roundMoney_(movement.saldoAnterior);
      movement.saldoPosterior = movement.saldoPosterior === "" || movement.saldoPosterior === undefined
        ? ""
        : roundMoney_(movement.saldoPosterior);
      movement.schemaVersion = toNumber_(movement.schemaVersion);
      movement.affectsCash = movement.affectsCash === true ||
        String(movement.affectsCash).toLowerCase() === "true";
      return movement;
    })
    .filter(function (movement) { return Boolean(movement.id); })
    .reverse();
}

function businessDefinition_(type) {
  const definitions = {
    b2b: { sheetName: TERMAL_CONFIG.B2B_SHEET, headers: B2B_HEADERS, prefix: "B2B" },
    purchase: { sheetName: TERMAL_CONFIG.PURCHASES_SHEET, headers: PURCHASE_HEADERS, prefix: "COMP" },
    marketing: { sheetName: TERMAL_CONFIG.MARKETING_SHEET, headers: MARKETING_HEADERS, prefix: "MKT" }
  };
  const definition = definitions[sanitizeText_(type, 30)];
  if (!definition) throw apiError_("VALIDATION_ERROR", "El tipo de registro no es válido.");
  return definition;
}

function getBusinessRecords_(spreadsheet, type) {
  const definition = businessDefinition_(type);
  const sheet = spreadsheet.getSheetByName(definition.sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, definition.headers.length).getValues()
    .map(function (row) { return parseBusinessRow_(rowToObject_(row, definition.headers), type); })
    .filter(function (record) { return Boolean(record.id); })
    .map(function (record) { return calculateBusinessRecord_(type, record); })
    .reverse();
}

function getBusinessRecordsWithRows_(spreadsheet, type) {
  const definition = businessDefinition_(type);
  const sheet = spreadsheet.getSheetByName(definition.sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, definition.headers.length).getValues()
    .map(function (row, index) {
      return { row: index + 2, record: calculateBusinessRecord_(type, parseBusinessRow_(rowToObject_(row, definition.headers), type)) };
    })
    .filter(function (item) { return Boolean(item.record.id); });
}

function parseBusinessRow_(record, type) {
  ["items", "pagos"].forEach(function (key) {
    if (record[key] === undefined) return;
    if (Array.isArray(record[key])) return;
    try { record[key] = record[key] ? JSON.parse(record[key]) : []; }
    catch (error) { record[key] = []; }
  });
  record.fecha = normalizeDate_(record.fecha);
  if (type === "b2b") {
    record.fechaEntregaAcordada = normalizeDate_(record.fechaEntregaAcordada);
    record.fechaEntregaReal = normalizeDate_(record.fechaEntregaReal);
    record.aplicaIgv = boolean_(record.aplicaIgv);
    record.facturaEmitida = boolean_(record.facturaEmitida);
  }
  if (type === "purchase") record.incluyeIgv = boolean_(record.incluyeIgv);
  return record;
}

function saveBusinessRecord_(type, input, attachment) {
  return withWriteLock_(function () {
    const spreadsheet = getSpreadsheet_();
    ensureBusinessSheets_(spreadsheet);
    const definition = businessDefinition_(type);
    const sheet = spreadsheet.getSheetByName(definition.sheetName);
    const records = getBusinessRecordsWithRows_(spreadsheet, type);
    const existing = input.id ? records.find(function (item) { return String(item.record.id) === String(input.id); }) : null;
    if (input.id && !existing) throw apiError_("NOT_FOUND", "No encontramos el registro. Sincroniza e inténtalo otra vez.");
    const now = new Date().toISOString();
    const protectedFields = existing ? {
      id: existing.record.id, active: existing.record.active, createdAt: existing.record.createdAt,
      deletedAt: existing.record.deletedAt, codigo: existing.record.codigo
    } : {};
    let candidate = calculateBusinessRecord_(type, Object.assign({}, existing ? existing.record : {}, input, protectedFields));
    candidate.id = existing ? existing.record.id : Utilities.getUuid();
    candidate.active = existing ? existing.record.active : true;
    candidate.version = existing ? toNumber_(existing.record.version) + 1 : 1;
    candidate.createdAt = existing ? existing.record.createdAt : now;
    candidate.updatedAt = now;
    candidate.deletedAt = existing ? existing.record.deletedAt : "";
    if (!candidate.codigo && type !== "marketing") candidate.codigo = nextBusinessCode_(records.map(function (item) { return item.record; }), definition.prefix);
    validateBusinessRecord_(type, candidate);
    if (attachment) candidate = applyBusinessAttachment_(candidate, type, attachment);
    candidate = calculateBusinessRecord_(type, candidate);
    const row = objectToRow_(candidate, definition.headers);
    if (existing) sheet.getRange(existing.row, 1, 1, definition.headers.length).setValues([row]);
    else sheet.appendRow(row);
    if (type === "purchase") rememberBusinessCategory_(spreadsheet, "Categoría compra", candidate.categoria);
    if (type === "marketing") rememberBusinessCategory_(spreadsheet, "Categoría marketing", candidate.categoria);
    touchUpdated_();
    return candidate;
  });
}

function addBusinessPayment_(type, id, input) {
  return withWriteLock_(function () {
    if (type !== "b2b" && type !== "purchase") throw apiError_("VALIDATION_ERROR", "Este registro no admite pagos.");
    const spreadsheet = getSpreadsheet_();
    const definition = businessDefinition_(type);
    const found = getBusinessRecordsWithRows_(spreadsheet, type).find(function (item) { return String(item.record.id) === String(id); });
    if (!found || found.record.active === false) throw apiError_("NOT_FOUND", "No encontramos el registro.");
    const payment = sanitizeBusinessPayment_(input, found.record.fecha);
    if (payment.monto <= 0) throw apiError_("VALIDATION_ERROR", "El monto debe ser mayor que cero.");
    let candidate = Object.assign({}, found.record, { pagos: (found.record.pagos || []).concat([payment]) });
    candidate.version = toNumber_(found.record.version) + 1;
    candidate.updatedAt = new Date().toISOString();
    candidate = calculateBusinessRecord_(type, candidate);
    validateBusinessRecord_(type, candidate);
    spreadsheet.getSheetByName(definition.sheetName).getRange(found.row, 1, 1, definition.headers.length)
      .setValues([objectToRow_(candidate, definition.headers)]);
    touchUpdated_();
    return candidate;
  });
}

function archiveBusinessRecord_(type, id) {
  return withWriteLock_(function () {
    const spreadsheet = getSpreadsheet_();
    const definition = businessDefinition_(type);
    const found = getBusinessRecordsWithRows_(spreadsheet, type).find(function (item) { return String(item.record.id) === String(id); });
    if (!found) throw apiError_("NOT_FOUND", "No encontramos el registro.");
    const candidate = Object.assign({}, found.record, {
      active: false, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      version: toNumber_(found.record.version) + 1
    });
    spreadsheet.getSheetByName(definition.sheetName).getRange(found.row, 1, 1, definition.headers.length)
      .setValues([objectToRow_(candidate, definition.headers)]);
    touchUpdated_();
    return candidate;
  });
}

function calculateBusinessRecord_(type, raw) {
  if (type === "b2b") return calculateB2BRecord_(raw);
  if (type === "purchase") return calculatePurchaseRecord_(raw);
  return calculateMarketingRecord_(raw);
}

function calculateB2BRecord_(raw) {
  const record = Object.assign({}, raw);
  const items = sanitizeBusinessArray_(raw.items).map(function (item) {
    const cantidad = Math.max(0, toNumber_(item.cantidad));
    const precioUnitario = roundMoney_(item.precioUnitario);
    const costoTermoUnitario = roundMoney_(item.costoTermoUnitario);
    const costoGrabadoUnitario = roundMoney_(item.costoGrabadoUnitario);
    const costoCajaUnitario = roundMoney_(item.costoCajaUnitario);
    const costoUnitario = roundMoney_(costoTermoUnitario + costoGrabadoUnitario + costoCajaUnitario);
    return {
      id: sanitizeText_(item.id, 100) || Utilities.getUuid(), descripcion: sanitizeText_(item.descripcion, 1500),
      cantidad: cantidad, precioUnitario: precioUnitario, costoTermoUnitario: costoTermoUnitario,
      costoGrabadoUnitario: costoGrabadoUnitario, costoCajaUnitario: costoCajaUnitario,
      costoUnitario: costoUnitario, venta: roundMoney_(cantidad * precioUnitario),
      costo: roundMoney_(cantidad * costoUnitario), utilidad: roundMoney_(cantidad * (precioUnitario - costoUnitario))
    };
  });
  const payments = sanitizeBusinessArray_(raw.pagos).map(function (payment) { return sanitizeBusinessPayment_(payment, raw.fecha); }).filter(function (payment) { return payment.monto > 0; });
  const ventaSinIgv = roundMoney_(items.reduce(function (sum, item) { return sum + item.venta; }, 0));
  const aplicaIgv = boolean_(raw.aplicaIgv);
  const igv = aplicaIgv ? roundMoney_(ventaSinIgv * 0.18) : 0;
  const costoTermos = roundMoney_(items.reduce(function (sum, item) { return sum + item.cantidad * item.costoTermoUnitario; }, 0));
  const costoGrabados = roundMoney_(items.reduce(function (sum, item) { return sum + item.cantidad * item.costoGrabadoUnitario; }, 0));
  const costoCajas = roundMoney_(items.reduce(function (sum, item) { return sum + item.cantidad * item.costoCajaUnitario; }, 0));
  const costoProductos = roundMoney_(costoTermos + costoGrabados + costoCajas);
  const gastoAdminVentas = roundMoney_(raw.gastoAdminVentas);
  const gastoLogistico = roundMoney_(raw.gastoLogistico);
  const otrosCostos = roundMoney_(raw.otrosCostos);
  const costoTotal = roundMoney_(costoProductos + gastoAdminVentas + gastoLogistico + otrosCostos);
  const ventaTotal = roundMoney_(ventaSinIgv + igv);
  const cobrado = roundMoney_(payments.reduce(function (sum, payment) { return sum + payment.monto; }, 0));
  Object.assign(record, {
    fecha: normalizeDate_(raw.fecha) || today_(), fechaEntregaAcordada: normalizeDate_(raw.fechaEntregaAcordada),
    fechaEntregaReal: normalizeDate_(raw.fechaEntregaReal), empresa: sanitizeText_(raw.empresa, 500),
    ruc: sanitizeText_(raw.ruc, 30), contacto: sanitizeText_(raw.contacto, 500), items: items, pagos: payments,
    aplicaIgv: aplicaIgv, facturaEmitida: boolean_(raw.facturaEmitida), ventaSinIgv: ventaSinIgv, igv: igv,
    ventaTotal: ventaTotal, costoTermos: costoTermos, costoGrabados: costoGrabados, costoCajas: costoCajas,
    costoProductos: costoProductos, gastoAdminVentas: gastoAdminVentas, gastoLogistico: gastoLogistico,
    otrosCostos: otrosCostos, costoTotal: costoTotal, utilidad: roundMoney_(ventaSinIgv - costoTotal),
    cantidadTotal: items.reduce(function (sum, item) { return sum + item.cantidad; }, 0), cobrado: cobrado,
    porCobrar: roundMoney_(Math.max(0, ventaTotal - cobrado)), notas: sanitizeText_(raw.notas, 2000)
  });
  record.margen = ventaSinIgv ? roundMoney_(record.utilidad / ventaSinIgv * 100) : 0;
  return record;
}

function calculatePurchaseRecord_(raw) {
  const record = Object.assign({}, raw);
  const cantidad = Math.max(0, toNumber_(raw.cantidad));
  const costoUnitario = roundMoney_(raw.costoUnitario);
  const costoTotal = roundMoney_(cantidad * costoUnitario);
  const payments = sanitizeBusinessArray_(raw.pagos).map(function (payment) { return sanitizeBusinessPayment_(payment, raw.fecha); }).filter(function (payment) { return payment.monto > 0; });
  const pagado = roundMoney_(payments.reduce(function (sum, payment) { return sum + payment.monto; }, 0));
  const incluyeIgv = boolean_(raw.incluyeIgv);
  const valorSinIgv = incluyeIgv ? roundMoney_(costoTotal / 1.18) : costoTotal;
  Object.assign(record, {
    fecha: normalizeDate_(raw.fecha) || today_(), categoria: sanitizeText_(raw.categoria, 200),
    producto: sanitizeText_(raw.producto, 500), proveedor: sanitizeText_(raw.proveedor, 500),
    detalle: sanitizeText_(raw.detalle, 1000), cantidad: cantidad, costoUnitario: costoUnitario,
    costoTotal: costoTotal, pagos: payments, pagado: pagado, porPagar: roundMoney_(Math.max(0, costoTotal - pagado)),
    incluyeIgv: incluyeIgv, valorSinIgv: valorSinIgv, igv: incluyeIgv ? roundMoney_(costoTotal - valorSinIgv) : 0,
    notas: sanitizeText_(raw.notas, 2000)
  });
  return record;
}

function calculateMarketingRecord_(raw) {
  const record = Object.assign({}, raw);
  const dolares = roundMoney_(raw.dolares);
  const tipoCambio = toNumber_(raw.tipoCambio);
  Object.assign(record, {
    fecha: normalizeDate_(raw.fecha) || today_(), categoria: sanitizeText_(raw.categoria, 200),
    soles: dolares > 0 ? roundMoney_(dolares * tipoCambio) : roundMoney_(raw.soles), dolares: dolares,
    tipoCambio: dolares > 0 ? tipoCambio : 0, detalle: sanitizeText_(raw.detalle, 1500),
    pagadoPor: normalizeBusinessAccount_(raw.pagadoPor)
  });
  return record;
}

function validateBusinessRecord_(type, record) {
  const errors = [];
  if (!record.fecha) errors.push("Selecciona la fecha.");
  if (type === "b2b") {
    if (!record.empresa) errors.push("Ingresa la empresa.");
    if (!record.fechaEntregaAcordada) errors.push("Ingresa la entrega acordada.");
    if (!record.items.length) errors.push("Agrega al menos un producto.");
    record.items.forEach(function (item) {
      if (!item.descripcion || item.cantidad <= 0) errors.push("Completa la descripción y cantidad de todos los productos.");
    });
    if (record.cobrado > record.ventaTotal + 0.009) errors.push("Los pagos superan la venta total.");
  }
  if (type === "purchase") {
    if (!record.categoria || !record.producto || !record.proveedor) errors.push("Completa categoría, producto y proveedor.");
    if (record.cantidad <= 0) errors.push("La cantidad debe ser mayor que cero.");
    if (record.pagado > record.costoTotal + 0.009) errors.push("Los pagos superan el costo total.");
  }
  if (type === "marketing") {
    if (!record.categoria || !record.detalle) errors.push("Completa categoría y detalle.");
    if (record.dolares > 0 && record.tipoCambio <= 0) errors.push("Ingresa el tipo de cambio del banco.");
    if (record.soles <= 0) errors.push("El gasto debe ser mayor que cero.");
  }
  if (errors.length) throw apiError_("VALIDATION_ERROR", errors.join(" "));
}

function sanitizeBusinessPayment_(raw, fallbackDate) {
  return {
    id: sanitizeText_(raw.id, 100) || Utilities.getUuid(), fecha: normalizeDate_(raw.fecha) || normalizeDate_(fallbackDate) || today_(),
    monto: roundMoney_(raw.monto), cuenta: normalizeBusinessAccount_(raw.cuenta || raw.pagadoPor),
    metodo: sanitizeText_(raw.metodo, 200), nota: sanitizeText_(raw.nota, 500)
  };
}

function sanitizeBusinessArray_(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; }
  catch (error) { return []; }
}

function normalizeBusinessAccount_(value) {
  const normalized = normalizeText_(value);
  if (normalized === "gonzalo") return "Gonzalo";
  if (normalized === "alberto") return "Alberto";
  return "Termal";
}

function nextBusinessCode_(records, prefix) {
  const max = records.reduce(function (value, record) {
    const match = String(record.codigo || "").match(/(\d+)$/);
    return Math.max(value, match ? Number(match[1]) : 0);
  }, 0);
  return prefix + "-" + ("000" + (max + 1)).slice(-3);
}

function applyBusinessAttachment_(record, type, attachment) {
  const name = sanitizeText_(attachment.name, 200);
  const mimeType = sanitizeText_(attachment.mimeType, 100);
  const base64 = String(attachment.base64 || "");
  if (!name || mimeType !== "application/pdf" || !base64) throw apiError_("INVALID_FILE", "Adjunta un PDF válido.");
  if (base64.length > 12 * 1024 * 1024) throw apiError_("FILE_TOO_LARGE", "El PDF supera el máximo de 8 MB.");
  let bytes;
  try { bytes = Utilities.base64Decode(base64); }
  catch (error) { throw apiError_("INVALID_FILE", "No se pudo leer el PDF."); }
  const folder = getDocumentsFolder_();
  const safeName = (type === "b2b" ? "Cotizacion" : "Factura") + " - " + sanitizeText_(record.codigo || record.producto || record.id, 80) + " - " + name;
  const file = folder.createFile(Utilities.newBlob(bytes, MimeType.PDF, safeName));
  if (type === "b2b") {
    record.cotizacionNombre = name; record.cotizacionUrl = file.getUrl(); record.cotizacionFileId = file.getId();
  } else {
    record.facturaNombre = name; record.facturaUrl = file.getUrl(); record.facturaFileId = file.getId();
  }
  return record;
}

function getDocumentsFolder_() {
  const properties = PropertiesService.getScriptProperties();
  const key = "TERMAL_DOCUMENTS_FOLDER_ID";
  const existingId = properties.getProperty(key);
  if (existingId) {
    try { return DriveApp.getFolderById(existingId); }
    catch (error) { /* Se crea una carpeta nueva abajo. */ }
  }
  const folder = DriveApp.createFolder("ERP MINI TERMAL - Documentos");
  properties.setProperty(key, folder.getId());
  return folder;
}

function boolean_(value) {
  return value === true || String(value).toLowerCase() === "true" || normalizeText_(value) === "si";
}

function cashMovementPerson_(value) {
  const normalized = normalizeText_(value);
  if (normalized === "gonzalo") return "Gonzalo";
  if (normalized === "alberto") return "Alberto";
  if (normalized === "dinsides") return "DINSIDES";
  return "";
}

function cashMovementSignedAmount_(movement) {
  if (movement.signedAmount !== "" && movement.signedAmount !== undefined) {
    return roundMoney_(movement.signedAmount);
  }
  const amount = roundMoney_(movement.amount);
  return movement.naturaleza === "TERMAL_TO_PERSON" ? amount : -amount;
}

function cashSaleBalance_(sale, person) {
  const normalized = normalizeText_(person);
  if (normalized === "gonzalo") return roundMoney_(sale.gonzaloDebeDevolver);
  if (normalized === "alberto") return roundMoney_(sale.albertoDebeDevolver);
  if (normalized === "dinsides") {
    return roundMoney_(
      toNumber_(sale.dinsidesDebeDepositar) - toNumber_(sale.termalDebePagarDinsides)
    );
  }
  return 0;
}

function cashBalanceForPerson_(sales, movements, person, spreadsheet) {
  const normalizedPerson = cashMovementPerson_(person);
  let balance = sales.reduce(function (sum, sale) {
    return sum + cashSaleBalance_(sale, normalizedPerson);
  }, 0);
  movements.forEach(function (movement) {
    const isNewCashMovement = movement.affectsCash === true || toNumber_(movement.schemaVersion) >= 2;
    if (!isNewCashMovement || cashMovementPerson_(movement.persona) !== normalizedPerson) return;
    balance += cashMovementSignedAmount_(movement);
  });
  if (spreadsheet) balance += businessCashBalanceForPerson_(spreadsheet, normalizedPerson);
  return roundMoney_(balance);
}

function businessCashBalanceForPerson_(spreadsheet, person) {
  let balance = 0;
  try {
    getBusinessRecords_(spreadsheet, "b2b").filter(function (record) { return record.active !== false; }).forEach(function (record) {
      (record.pagos || []).forEach(function (payment) {
        if (normalizeBusinessAccount_(payment.cuenta) === person) balance += toNumber_(payment.monto);
      });
    });
    getBusinessRecords_(spreadsheet, "purchase").filter(function (record) { return record.active !== false; }).forEach(function (record) {
      (record.pagos || []).forEach(function (payment) {
        if (normalizeBusinessAccount_(payment.cuenta) === person) balance -= toNumber_(payment.monto);
      });
    });
    getBusinessRecords_(spreadsheet, "marketing").filter(function (record) { return record.active !== false; }).forEach(function (record) {
      if (normalizeBusinessAccount_(record.pagadoPor) === person) balance -= toNumber_(record.soles);
    });
  } catch (error) {
    return 0;
  }
  return roundMoney_(balance);
}

function findSale_(spreadsheet, id) {
  if (!id) return null;
  const sheet = spreadsheet.getSheetByName(TERMAL_CONFIG.SALES_SHEET);
  const records = getSalesRecordsWithRows_(spreadsheet);
  const record = records.find(function (item) { return String(item.sale.id) === String(id); });
  return record ? { sheet: sheet, row: record.row, sale: record.sale } : null;
}

function sanitizeSale_(input) {
  const textFields = [
    "id", "createdAt", "updatedAt", "deletedAt", "codigo", "cliente", "telefono", "producto",
    "sku", "tipoProducto", "colorProducto", "disenoProducto",
    "canal", "origen", "observaciones", "modalidadPago", "cuentaAdelanto", "cuentaSaldo",
    "metodoPago", "paisCompra", "estadoCobro", "agencia", "modalidadLogistica",
    "pagadorLogistica", "estadoPedido", "codigoSeguimiento", "tipoProblema",
    "descripcionProblema", "estadoLiquidacion", "batchSalidaId",
    "destinatarioEnvio", "telefonoEnvio", "dniEnvio", "direccionEnvio", "enlaceMaps"
  ];
  const numberFields = [
    "version", "cantidad", "ventaTotal", "adelanto", "saldoCobrado", "cobradoTotal",
    "porCobrar", "comisionTarjeta", "costoTermo", "costoPackaging", "costoGrabado",
    "costoProduccionPersonalizado", "costoProduccion", "costoEnvio",
    "costoRecojo", "otrosCostos", "costoProblema", "costoTotal", "utilidad",
    "liquidadoGonzalo", "liquidadoAlberto", "liquidadoDinsides", "pagadoADinsides",
    "gonzaloDebeDevolver", "albertoDebeDevolver", "dinsidesDebeDepositar",
    "termalDebePagarDinsides"
  ];
  const sale = {};
  textFields.forEach(function (key) { sale[key] = sanitizeText_(input[key], key === "observaciones" ? 2000 : 500); });
  numberFields.forEach(function (key) { sale[key] = roundMoney_(input[key]); });
  sale.active = input.active === false || String(input.active).toLowerCase() === "false" ? false : true;
  sale.comisionManual = input.comisionManual === true || String(input.comisionManual).toLowerCase() === "true";
  sale.grabadoLaser = input.grabadoLaser === true || String(input.grabadoLaser).toLowerCase() === "true";
  sale.costoPersonalizadoActivo = input.costoPersonalizadoActivo === true ||
    String(input.costoPersonalizadoActivo).toLowerCase() === "true";
  sale.tieneProblemas = input.tieneProblemas === true || String(input.tieneProblemas).toLowerCase() === "true";
  sale.problemasDetalle = sanitizeProblems_(input.problemasDetalle);
  sale.pagosDetalle = sanitizePayments_(input.pagosDetalle);
  sale.fecha = normalizeDate_(input.fecha);
  sale.fechaAcordadaEntrega = normalizeDate_(input.fechaAcordadaEntrega);
  sale.fechaDespacho = normalizeDate_(input.fechaDespacho);
  sale.fechaEntrega = normalizeDate_(input.fechaEntrega);
  sale.cantidad = Math.max(1, Math.round(toNumber_(input.cantidad) || 1));
  return sale;
}

function calculateSale_(input) {
  const sale = Object.assign({}, input);
  const originalLaserCost = input.costoGrabado;
  const n = function (key) { return roundMoney_(sale[key]); };
  sale.ventaTotal = n("ventaTotal");
  sale.adelanto = n("adelanto");
  sale.saldoCobrado = n("saldoCobrado");
  sale.costoTermo = n("costoTermo");
  sale.costoPackaging = n("costoPackaging");
  sale.costoGrabado = n("costoGrabado");
  sale.costoProduccionPersonalizado = n("costoProduccionPersonalizado");
  sale.costoEnvio = n("costoEnvio");
  sale.costoRecojo = n("costoRecojo");
  sale.otrosCostos = n("otrosCostos");
  sale.costoProblema = n("costoProblema");
  sale.liquidadoGonzalo = n("liquidadoGonzalo");
  sale.liquidadoAlberto = n("liquidadoAlberto");
  sale.liquidadoDinsides = n("liquidadoDinsides");
  sale.pagadoADinsides = n("pagadoADinsides");

  if (sale.tipoProducto) {
    sale.costoTermo = productBaseCost_(sale.tipoProducto);
    sale.costoPackaging = 3;
    sale.costoGrabado = sale.grabadoLaser
      ? roundMoney_(originalLaserCost === "" || originalLaserCost === undefined || originalLaserCost === null
        ? 20
        : originalLaserCost)
      : 0;
    sale.sku = buildSku_(sale.tipoProducto, sale.colorProducto, sale.disenoProducto);
    sale.producto = sale.sku || sale.producto;
  }
  sale.costoProduccion = sale.costoPersonalizadoActivo
    ? sale.costoProduccionPersonalizado
    : roundMoney_((sale.costoTermo + sale.costoPackaging + sale.costoGrabado) * (toNumber_(sale.cantidad) || 1));
  sale.problemasDetalle = saleProblems_(sale);
  sale.tieneProblemas = sale.problemasDetalle.length > 0;
  sale.costoProblema = roundMoney_(sale.problemasDetalle.reduce(function (sum, problem) {
    return sum + toNumber_(problem.costo);
  }, 0));
  sale.tipoProblema = sale.tieneProblemas
    ? sale.problemasDetalle.map(function (problem) { return problem.tipo || "Otro problema"; }).join(" · ")
    : "NO";
  sale.descripcionProblema = sale.tieneProblemas
    ? sale.problemasDetalle.map(function (problem) { return problem.nota || problem.tipo; }).filter(Boolean).join(" | ")
    : "";
  sale.pagosDetalle = salePayments_(sale);
  if (sale.pagosDetalle.length) {
    sale.saldoCobrado = roundMoney_(sale.pagosDetalle.reduce(function (sum, payment) {
      return sum + toNumber_(payment.monto);
    }, 0));
  }

  const shopify = normalizeText_(sale.modalidadPago).indexOf("shopify") >= 0;
  if (!sale.comisionManual) {
    const rate = shopify
      ? (normalizeText_(sale.paisCompra).indexOf("internacional") >= 0 ? 0.052 : 0.038)
      : 0;
    sale.comisionTarjeta = roundMoney_(sale.ventaTotal * rate);
  } else {
    sale.comisionTarjeta = n("comisionTarjeta");
  }
  sale.cobradoTotal = roundMoney_(sale.adelanto + sale.saldoCobrado);
  sale.porCobrar = roundMoney_(Math.max(0, sale.ventaTotal - sale.cobradoTotal));
  sale.costoTotal = roundMoney_(
    sale.costoProduccion + sale.costoEnvio + sale.costoRecojo +
    sale.otrosCostos + sale.costoProblema + sale.comisionTarjeta
  );
  sale.utilidad = roundMoney_(sale.ventaTotal - sale.costoTotal);
  sale.estadoCobro = sale.porCobrar <= 0 ? "Cobrado" : (sale.cobradoTotal > 0 ? "Parcial" : "Pendiente");

  const accountAdvance = normalizeText_(sale.cuentaAdelanto);
  const accountBalance = normalizeText_(sale.cuentaSaldo);
  const receivedBalanceBy = function (account) {
    if (sale.pagosDetalle.length) {
      return sale.pagosDetalle.reduce(function (sum, payment) {
        return sum + (normalizeText_(payment.cuenta) === account ? toNumber_(payment.monto) : 0);
      }, 0);
    }
    return accountBalance === account ? sale.saldoCobrado : 0;
  };
  const logisticsPayer = normalizeText_(sale.pagadorLogistica);
  const logisticsCosts = roundMoney_(sale.costoEnvio + sale.costoRecojo);
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

  sale.gonzaloDebeDevolver = roundMoney_(
    receivedGonzalo - (logisticsPayer === "gonzalo" ? logisticsCosts : 0) - sale.liquidadoGonzalo
  );
  sale.albertoDebeDevolver = roundMoney_(
    receivedAlberto - (logisticsPayer === "alberto" ? logisticsCosts : 0) - sale.liquidadoAlberto
  );
  sale.dinsidesDebeDepositar = roundMoney_(Math.max(
    0,
    collectedDinsides - deductedByDinsides - sale.liquidadoDinsides
  ));
  sale.termalDebePagarDinsides = roundMoney_(Math.max(
    0,
    deductedByDinsides - collectedDinsides - sale.pagadoADinsides
  ));
  const pending = Math.abs(sale.gonzaloDebeDevolver) + Math.abs(sale.albertoDebeDevolver) +
    sale.dinsidesDebeDepositar + sale.termalDebePagarDinsides;
  const applied = sale.liquidadoGonzalo + sale.liquidadoAlberto +
    sale.liquidadoDinsides + sale.pagadoADinsides;
  sale.estadoLiquidacion = pending <= 0 ? "Liquidado" : (applied > 0 ? "Parcial" : "Pendiente");
  return sale;
}

function sanitizeProblems_(raw) {
  let details = raw;
  if (typeof details === "string") {
    try { details = JSON.parse(details); } catch (error) { details = []; }
  }
  if (!Array.isArray(details)) return [];
  return details.map(function (problem, index) {
    return {
      id: sanitizeText_(problem && problem.id ? problem.id : "problema_" + (index + 1), 100),
      tipo: sanitizeText_(problem && problem.tipo, 200),
      costo: roundMoney_(problem && problem.costo),
      nota: sanitizeText_(problem && problem.nota, 1000)
    };
  }).filter(function (problem) {
    return Boolean(problem.tipo || problem.nota || problem.costo > 0);
  });
}

function saleProblems_(sale) {
  const details = sanitizeProblems_(sale.problemasDetalle);
  const legacyType = sanitizeText_(sale.tipoProblema, 200);
  if (!details.length && normalizeText_(legacyType) !== "no" &&
    (legacyType || toNumber_(sale.costoProblema) > 0 || sanitizeText_(sale.descripcionProblema, 1000))) {
    details.push({
      id: "problema_legacy",
      tipo: legacyType || "Otro problema",
      costo: roundMoney_(sale.costoProblema),
      nota: sanitizeText_(sale.descripcionProblema, 1000)
    });
  }
  return details;
}

function sanitizePayments_(raw) {
  let details = raw;
  if (typeof details === "string") {
    try { details = JSON.parse(details); } catch (error) { details = []; }
  }
  if (!Array.isArray(details)) return [];
  return details.map(function (payment, index) {
    return {
      id: sanitizeText_(payment && payment.id ? payment.id : "pago_" + (index + 1), 100),
      monto: roundMoney_(payment && payment.monto),
      cuenta: sanitizeText_(payment && payment.cuenta, 200),
      fecha: normalizeDate_(payment && payment.fecha) || today_()
    };
  }).filter(function (payment) {
    return payment.monto > 0;
  });
}

function salePayments_(sale) {
  return sanitizePayments_(sale.pagosDetalle);
}

function productBaseCost_(type) {
  const normalized = normalizeText_(type);
  if (normalized.indexOf("1200") >= 0) return 25.5;
  if (normalized.indexOf("890") >= 0) return 19;
  if (normalized.indexOf("shaker") >= 0) return 29;
  return 0;
}

function buildSku_(type, color, design) {
  if (!type || !color || !design) return "";
  return designCode_(design) + "-" + colorCode_(color) + "-" + productSizeCode_(type);
}

function productSizeCode_(type) {
  const normalized = normalizeText_(type);
  if (normalized.indexOf("1200") >= 0) return "1200";
  if (normalized.indexOf("890") >= 0) return "890";
  if (normalized.indexOf("shaker") >= 0) return "SH";
  return shortCode_(type, 3);
}

function colorCode_(color) {
  const codes = { negro: "N", crema: "C", blanco: "B", azul: "A" };
  return codes[normalizeText_(color)] || shortCode_(color, 2);
}

function designCode_(design) {
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
  return codes[normalizeText_(design)] || shortCode_(design, 6);
}

function shortCode_(value, maxLength) {
  const parts = normalizeText_(value).replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  const code = parts.map(function (part) { return part.charAt(0); }).join("").toUpperCase().slice(0, maxLength);
  return code || "OTR";
}

function validateSale_(sale, existing, currentId) {
  const errors = [];
  if (!sale.fecha) errors.push("Selecciona la fecha.");
  if (!sale.codigo) errors.push("Ingresa o genera el código.");
  if (!sale.cliente) errors.push("Ingresa el nombre del cliente.");
  if (!sale.tipoProducto) errors.push("Selecciona el tipo de producto.");
  if (!sale.colorProducto) errors.push("Selecciona o escribe el color.");
  if (!sale.disenoProducto) errors.push("Selecciona el diseño.");
  if (!sale.producto) errors.push("Selecciona o escribe el producto.");
  if (sale.tieneProblemas && !saleProblems_(sale).length) {
    errors.push("Completa al menos un problema o desmarca la casilla Problema.");
  }
  if (sale.ventaTotal < 0) errors.push("La venta no puede ser negativa.");
  if (sale.adelanto < 0 || sale.saldoCobrado < 0) errors.push("Los montos cobrados no pueden ser negativos.");
  const normalizedCode = normalizeText_(sale.codigo);
  const duplicate = existing.some(function (item) {
    return String(item.id) !== String(currentId || "") &&
      item.active !== false &&
      normalizeText_(item.codigo) === normalizedCode;
  });
  if (duplicate) errors.push("El código " + sale.codigo + " ya existe.");
  if (errors.length) throw apiError_("VALIDATION_ERROR", errors.join(" "));
}

function nextCode_(sales) {
  const max = sales.reduce(function (value, sale) {
    const match = String(sale.codigo || "").match(/(\d+)$/);
    return Math.max(value, match ? Number(match[1]) : 0);
  }, 0);
  return TERMAL_CONFIG.CODE_PREFIX + (max + 1);
}

function ensureSalesSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(TERMAL_CONFIG.SALES_SHEET);
  if (!sheet) sheet = spreadsheet.insertSheet(TERMAL_CONFIG.SALES_SHEET, 0);
  if (sheet.getMaxColumns() < SALES_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), SALES_HEADERS.length - sheet.getMaxColumns());
  }
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 1 || lastColumn < 1) {
    sheet.getRange(1, 1, 1, SALES_HEADERS.length).setValues([SALES_HEADERS.map(function (item) { return item[1]; })]);
    formatSalesSheet_(sheet);
    return;
  }
  const oldHeaders = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const expectedHeaders = SALES_HEADERS.map(function (item) { return item[1]; });
  const isCurrentSchemaPrefix = oldHeaders.every(function (header, index) {
    return expectedHeaders[index] === header;
  });
  if (isCurrentSchemaPrefix) {
    if (oldHeaders.length < expectedHeaders.length) {
      sheet.getRange(1, oldHeaders.length + 1, 1, expectedHeaders.length - oldHeaders.length)
        .setValues([expectedHeaders.slice(oldHeaders.length)]);
    }
    formatSalesSheet_(sheet);
    return;
  }

  const oldRows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues() : [];
  const migrated = oldRows
    .filter(function (row) { return row.some(function (value) { return value !== ""; }); })
    .map(function (row, index) {
      const old = {};
      oldHeaders.forEach(function (header, column) { old[normalizeText_(header)] = row[column]; });
      const pick = function () {
        for (let i = 0; i < arguments.length; i += 1) {
          const key = normalizeText_(arguments[i]);
          if (old[key] !== undefined && old[key] !== "") return old[key];
        }
        return "";
      };
      let sale = sanitizeSale_({
        id: pick("ID interno") || Utilities.getUuid(),
        active: true,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fecha: pick("Fecha"),
        fechaAcordadaEntrega: pick("Fecha acordada de entrega"),
        codigo: pick("Código", "Codigo") || TERMAL_CONFIG.CODE_PREFIX + (index + 1),
        cliente: pick("Cliente"),
        telefono: pick("Teléfono", "Telefono"),
        producto: pick("Producto"),
        sku: pick("SKU"),
        tipoProducto: pick("Tipo de producto"),
        colorProducto: pick("Color"),
        disenoProducto: pick("Diseño", "Diseno"),
        cantidad: pick("Cantidad") || 1,
        ventaTotal: pick("Venta total", "Venta"),
        canal: pick("Canal"),
        origen: pick("Origen"),
        observaciones: pick("Observaciones"),
        modalidadPago: pick("Modalidad de pago"),
        adelanto: pick("Adelanto", "Cobrado"),
        saldoCobrado: pick("Saldo cobrado"),
        pagosDetalle: pick("Pagos detallados"),
        cuentaAdelanto: pick("Cuenta que recibió el adelanto", "Quién recibió el dinero", "Quien recibio el dinero"),
        cuentaSaldo: pick("Cuenta que recibió el saldo"),
        metodoPago: pick("Método de pago"),
        paisCompra: pick("País de la compra") || "Nacional",
        comisionTarjeta: pick("Comisión de tarjeta", "Comisión", "Comision"),
        comisionManual: false,
        costoTermo: pick("Costo base del producto", "Costo del termo", "Costo termo"),
        costoPackaging: pick("Costo de packaging"),
        grabadoLaser: pick("Grabado láser tercerizado", "Grabado laser tercerizado"),
        costoGrabado: pick("Costo del grabado", "Costo grabado"),
        costoPersonalizadoActivo: pick("Costo personalizado activo"),
        costoProduccionPersonalizado: pick("Costo de producción personalizado", "Costo de produccion personalizado"),
        costoProduccion: pick("Costo de producción", "Costo de produccion"),
        costoEnvio: pick("Costo del envío", "Costo envío", "Costo envio"),
        costoRecojo: pick("Costo de recojo"),
        otrosCostos: pick("Otros costos"),
        costoProblema: pick("Costo del problema", "Costo problema"),
        agencia: pick("Agencia"),
        modalidadLogistica: pick("Modalidad logística") || "Entrega y cobro",
        pagadorLogistica: pick("Quién pagó envío y recojo", "Quien pago envio y recojo") || "Mancomunada",
        destinatarioEnvio: pick("Destinatario de envío", "Destinatario de envio"),
        telefonoEnvio: pick("Teléfono de envío", "Telefono de envio"),
        dniEnvio: pick("DNI de envío", "DNI de envio"),
        direccionEnvio: pick("Dirección o sede", "Direccion o sede"),
        enlaceMaps: pick("Enlace de Google Maps"),
        estadoPedido: pick("Estado del pedido", "Estado") || "Producción",
        fechaDespacho: pick("Fecha de despacho"),
        codigoSeguimiento: pick("Código de seguimiento"),
        fechaEntrega: pick("Fecha de entrega"),
        tipoProblema: pick("Tipo de problema", "Problema") || "NO",
        descripcionProblema: pick("Descripción del problema"),
        problemasDetalle: pick("Problemas detallados"),
        liquidadoGonzalo: pick("Gonzalo ya devolvió", "Gonzalo ya devolvio"),
        liquidadoAlberto: pick("Alberto ya devolvió", "Alberto ya devolvio"),
        liquidadoDinsides: pick("DINSIDES ya depositó", "DINSIDES ya deposito"),
        pagadoADinsides: pick("Termal ya pagó a DINSIDES", "Termal ya pago a DINSIDES"),
        batchSalidaId: pick("ID de salida o recojo")
      });
      return calculateSale_(sale);
    });
  if (sheet.getFilter()) sheet.getFilter().remove();
  sheet.clear();
  sheet.getRange(1, 1, 1, SALES_HEADERS.length).setValues([expectedHeaders]);
  if (migrated.length) {
    sheet.getRange(2, 1, migrated.length, SALES_HEADERS.length)
      .setValues(migrated.map(function (sale) { return objectToRow_(sale, SALES_HEADERS); }));
  }
  formatSalesSheet_(sheet);
}

function ensureListsSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(TERMAL_CONFIG.LISTS_SHEET);
  if (!sheet) sheet = spreadsheet.insertSheet(TERMAL_CONFIG.LISTS_SHEET);
  if (sheet.getLastRow() > 1) return;
  const headers = ["Categoría", "Valor", "Costo base", "Código", "Aplica a", "Nota"];
  const rows = [];
  const categories = {
    Estado: DEFAULT_LISTS.estados,
    Agencia: DEFAULT_LISTS.agencias,
    Canal: DEFAULT_LISTS.canales,
    Origen: DEFAULT_LISTS.origenes,
    "Modalidad de pago": DEFAULT_LISTS.modalidadesPago,
    Cuenta: DEFAULT_LISTS.cuentas,
    "Método de pago": DEFAULT_LISTS.metodosPago,
    Problema: DEFAULT_LISTS.problemas,
    "Modalidad logística": DEFAULT_LISTS.modalidadesLogisticas,
    "Pagador logística": DEFAULT_LISTS.pagadoresLogistica,
    "Categoría compra": DEFAULT_LISTS.categoriasCompras,
    "Categoría marketing": DEFAULT_LISTS.categoriasMarketing
  };
  Object.keys(categories).forEach(function (category) {
    categories[category].forEach(function (value) { rows.push([category, value, "", "", "", ""]); });
  });
  DEFAULT_LISTS.tiposProductos.forEach(function (product) {
    rows.push(["Tipo producto", product.nombre, product.costoBase, product.codigo, "", ""]);
  });
  DEFAULT_LISTS.disenos.forEach(function (design) {
    rows.push(["Diseño", design, "", "", "Todos", ""]);
  });
  Object.keys(DEFAULT_LISTS.coloresPorProducto).forEach(function (type) {
    DEFAULT_LISTS.coloresPorProducto[type].forEach(function (color) {
      rows.push(["Color", color, "", "", type, "Puedes agregar más filas"]);
    });
  });
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#6e103d").setFontColor("#ffffff");
  sheet.autoResizeColumns(1, headers.length);
}

function rememberColorInLists_(spreadsheet, type, color) {
  const cleanType = sanitizeText_(type, 200);
  const cleanColor = sanitizeText_(color, 100);
  if (!cleanType || !cleanColor) return;
  const sheet = spreadsheet.getSheetByName(TERMAL_CONFIG.LISTS_SHEET);
  if (!sheet) return;
  const values = sheet.getDataRange().getDisplayValues();
  const exists = values.slice(1).some(function (row) {
    return normalizeText_(row[0]) === "color" &&
      normalizeText_(row[1]) === normalizeText_(cleanColor) &&
      normalizeText_(row[4]) === normalizeText_(cleanType);
  });
  if (!exists) {
    sheet.appendRow(["Color", cleanColor, "", "", cleanType, "Agregado desde una venta"]);
  }
}

function rememberProblemTypesInLists_(spreadsheet, problems) {
  const details = sanitizeProblems_(problems);
  if (!details.length) return;
  const sheet = spreadsheet.getSheetByName(TERMAL_CONFIG.LISTS_SHEET);
  if (!sheet) return;
  const values = sheet.getDataRange().getDisplayValues();
  details.forEach(function (problem) {
    if (!problem.tipo) return;
    const exists = values.slice(1).some(function (row) {
      return normalizeText_(row[0]) === "problema" &&
        normalizeText_(row[1]) === normalizeText_(problem.tipo);
    });
    if (!exists) {
      sheet.appendRow(["Problema", problem.tipo, "", "", "", "Agregado desde una venta"]);
      values.push(["Problema", problem.tipo, "", "", "", "Agregado desde una venta"]);
    }
  });
}

function ensureMovementsSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(TERMAL_CONFIG.MOVEMENTS_SHEET);
  if (!sheet) sheet = spreadsheet.insertSheet(TERMAL_CONFIG.MOVEMENTS_SHEET);
  if (sheet.getMaxColumns() < MOVEMENT_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), MOVEMENT_HEADERS.length - sheet.getMaxColumns());
  }
  const expectedHeaders = MOVEMENT_HEADERS.map(function (item) { return item[1]; });
  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, MOVEMENT_HEADERS.length)
      .setValues([expectedHeaders]);
  } else {
    const lastColumn = sheet.getLastColumn();
    const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
    const isCurrentSchemaPrefix = currentHeaders.every(function (header, index) {
      return expectedHeaders[index] === header;
    });
    if (!isCurrentSchemaPrefix) {
      throw apiError_(
        "MOVEMENT_SCHEMA_ERROR",
        "La hoja Movimientos tiene encabezados inesperados. No se modificó ningún registro."
      );
    }
    if (currentHeaders.length < expectedHeaders.length) {
      sheet.getRange(1, currentHeaders.length + 1, 1, expectedHeaders.length - currentHeaders.length)
        .setValues([expectedHeaders.slice(currentHeaders.length)]);
    }
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, MOVEMENT_HEADERS.length).setFontWeight("bold").setBackground("#344054").setFontColor("#ffffff");
}

function rememberBusinessCategory_(spreadsheet, category, value) {
  const cleanValue = sanitizeText_(value, 200);
  if (!cleanValue) return;
  const sheet = spreadsheet.getSheetByName(TERMAL_CONFIG.LISTS_SHEET);
  if (!sheet) return;
  const values = sheet.getDataRange().getDisplayValues();
  const exists = values.slice(1).some(function (row) {
    return normalizeText_(row[0]) === normalizeText_(category) && normalizeText_(row[1]) === normalizeText_(cleanValue);
  });
  if (!exists) sheet.appendRow([category, cleanValue, "", "", "", "Agregado desde la aplicación"]);
}

function ensureBusinessSheets_(spreadsheet) {
  ensureBusinessSheet_(spreadsheet, TERMAL_CONFIG.B2B_SHEET, B2B_HEADERS);
  ensureBusinessSheet_(spreadsheet, TERMAL_CONFIG.PURCHASES_SHEET, PURCHASE_HEADERS);
  ensureBusinessSheet_(spreadsheet, TERMAL_CONFIG.MARKETING_SHEET, MARKETING_HEADERS);
}

function ensureBusinessSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  if (sheet.getMaxColumns() < headers.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  const expected = headers.map(function (item) { return item[1]; });
  if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) {
    sheet.getRange(1, 1, 1, headers.length).setValues([expected]);
  } else {
    const current = sheet.getRange(1, 1, 1, Math.min(sheet.getLastColumn(), headers.length)).getDisplayValues()[0];
    const prefixMatches = current.every(function (header, index) { return header === expected[index]; });
    if (!prefixMatches) {
      throw apiError_("BUSINESS_SCHEMA_ERROR", "La hoja " + name + " ya existe con columnas diferentes. No se modificó ningún dato.");
    }
    if (current.length < expected.length) {
      sheet.getRange(1, current.length + 1, 1, expected.length - current.length).setValues([expected.slice(current.length)]);
    }
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#6e103d").setFontColor("#ffffff");
  sheet.autoResizeColumns(1, Math.min(headers.length, 12));
}

function readLists_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(TERMAL_CONFIG.LISTS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return DEFAULT_LISTS;
  const values = sheet.getDataRange().getDisplayValues();
  const headers = values[0].map(normalizeText_);
  const categoryIndex = headers.indexOf("categoria");
  const valueIndex = headers.indexOf("valor");
  if (categoryIndex >= 0 && valueIndex >= 0) {
    const result = {
      estados: [], agencias: [], canales: [], origenes: [], modalidadesPago: [],
      cuentas: [], metodosPago: [], problemas: [], modalidadesLogisticas: [],
      pagadoresLogistica: [], categoriasCompras: [], categoriasMarketing: [], tiposProductos: [], disenos: [],
      coloresPorProducto: {}, productos: []
    };
    const categoryMap = {
      estado: "estados",
      agencia: "agencias",
      canal: "canales",
      origen: "origenes",
      "modalidad de pago": "modalidadesPago",
      cuenta: "cuentas",
      "metodo de pago": "metodosPago",
      problema: "problemas",
      "modalidad logistica": "modalidadesLogisticas",
      "pagador logistica": "pagadoresLogistica",
      "categoria compra": "categoriasCompras",
      "categoria marketing": "categoriasMarketing"
    };
    values.slice(1).forEach(function (row) {
      const category = normalizeText_(row[categoryIndex]);
      const value = sanitizeText_(row[valueIndex], 200);
      if (!value) return;
      if (category === "tipo producto") {
        result.tiposProductos.push({
          nombre: value,
          costoBase: toNumber_(row[2]),
          codigo: sanitizeText_(row[3], 30),
          colores: []
        });
      } else if (category === "diseno") {
        result.disenos.push(value);
      } else if (category === "color") {
        const appliesTo = sanitizeText_(row[4], 200);
        const targets = appliesTo
          ? appliesTo.split(",").map(function (item) { return item.trim(); }).filter(Boolean)
          : DEFAULT_LISTS.tiposProductos.map(function (item) { return item.nombre; });
        targets.forEach(function (type) {
          if (!result.coloresPorProducto[type]) result.coloresPorProducto[type] = [];
          if (result.coloresPorProducto[type].indexOf(value) < 0) result.coloresPorProducto[type].push(value);
        });
      } else if (category === "producto") {
        result.productos.push({
          nombre: value,
          costoTermo: toNumber_(row[2]),
          costoGrabado: toNumber_(row[3]),
          capacidad: sanitizeText_(row[4], 80),
          precioReferencia: toNumber_(row[5])
        });
      } else if (categoryMap[category]) {
        result[categoryMap[category]].push(value);
      }
    });
    [
      "estados", "agencias", "canales", "origenes", "modalidadesPago", "cuentas",
      "metodosPago", "problemas", "modalidadesLogisticas", "pagadoresLogistica",
      "categoriasCompras", "categoriasMarketing", "tiposProductos", "disenos"
    ].forEach(function (key) {
      if (!result[key].length) result[key] = JSON.parse(JSON.stringify(DEFAULT_LISTS[key]));
    });
    Object.keys(DEFAULT_LISTS.coloresPorProducto).forEach(function (typeName) {
      const customColors = result.coloresPorProducto[typeName] || [];
      result.coloresPorProducto[typeName] = DEFAULT_LISTS.coloresPorProducto[typeName]
        .concat(customColors)
        .filter(function (color, index, list) { return list.indexOf(color) === index; });
    });
    result.tiposProductos.forEach(function (type) {
      type.colores = result.coloresPorProducto[type.nombre] ||
        DEFAULT_LISTS.coloresPorProducto[type.nombre] || ["Negro"];
    });
    result.modalidadesPago = DEFAULT_LISTS.modalidadesPago.slice();
    result.problemas = DEFAULT_LISTS.problemas.concat(result.problemas)
      .filter(function (value, index, list) { return list.indexOf(value) === index; });
    return result;
  }

  // Compatibilidad con la hoja inicial: una categoría por columna.
  const result = JSON.parse(JSON.stringify(DEFAULT_LISTS));
  const headerMap = {
    estados: "estados", estado: "estados", agencias: "agencias", agencia: "agencias",
    canales: "canales", canal: "canales", origen: "origenes", origenes: "origenes",
    "modalidad de pago": "modalidadesPago", "cuenta que recibio": "cuentas",
    problemas: "problemas", problema: "problemas", productos: "productos", producto: "productos"
  };
  values[0].forEach(function (header, column) {
    const target = headerMap[normalizeText_(header)];
    if (!target) return;
    const entries = values.slice(1).map(function (row) { return sanitizeText_(row[column], 200); }).filter(Boolean);
    if (!entries.length) return;
    result[target] = target === "productos"
      ? entries.map(function (name) { return { nombre: name, costoTermo: 0, costoGrabado: 0, capacidad: "", precioReferencia: 0 }; })
      : entries;
  });
  result.modalidadesPago = DEFAULT_LISTS.modalidadesPago.slice();
  result.problemas = DEFAULT_LISTS.problemas.concat(result.problemas)
    .filter(function (value, index, list) { return list.indexOf(value) === index; });
  return result;
}

function formatSalesSheet_(sheet) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, SALES_HEADERS.length)
    .setFontWeight("bold")
    .setBackground("#6e103d")
    .setFontColor("#ffffff")
    .setWrap(true);
  sheet.setRowHeight(1, 42);
  const currencyLabels = [
    "Venta total", "Adelanto", "Saldo cobrado", "Cobrado total", "Por cobrar",
    "Comisión de tarjeta", "Costo base del producto", "Costo de packaging", "Costo del grabado",
    "Costo de producción personalizado", "Costo de producción", "Costo del envío",
    "Costo de recojo", "Otros costos", "Costo del problema", "Costo total", "Utilidad",
    "Gonzalo ya devolvió", "Alberto ya devolvió", "DINSIDES ya depositó",
    "Termal ya pagó a DINSIDES", "Gonzalo debe devolver", "Alberto debe devolver",
    "DINSIDES debe depositar", "Termal debe pagar a DINSIDES"
  ];
  currencyLabels.forEach(function (label) {
    const index = SALES_HEADERS.findIndex(function (item) { return item[1] === label; });
    if (index >= 0 && sheet.getMaxRows() > 1) sheet.getRange(2, index + 1, sheet.getMaxRows() - 1, 1).setNumberFormat('"S/" #,##0.00');
  });
  if (!sheet.getFilter() && sheet.getMaxRows() > 1) {
    sheet.getRange(1, 1, Math.max(2, sheet.getLastRow()), SALES_HEADERS.length).createFilter();
  }
}

function resolveSpreadsheetForSetup_() {
  if (TERMAL_CONFIG.SPREADSHEET_ID && TERMAL_CONFIG.SPREADSHEET_ID !== "USAR_HOJA_VINCULADA") {
    return SpreadsheetApp.openById(TERMAL_CONFIG.SPREADSHEET_ID);
  }
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw apiError_(
      "SPREADSHEET_NOT_CONFIGURED",
      "No encontramos una hoja vinculada. Pega el ID en TERMAL_CONFIG.SPREADSHEET_ID."
    );
  }
  return active;
}

function getSpreadsheet_() {
  const properties = PropertiesService.getScriptProperties();
  const id = properties.getProperty(TERMAL_CONFIG.SPREADSHEET_PROPERTY) ||
    (TERMAL_CONFIG.SPREADSHEET_ID !== "USAR_HOJA_VINCULADA" ? TERMAL_CONFIG.SPREADSHEET_ID : "");
  if (!id) {
    throw apiError_(
      "NOT_PREPARED",
      "Primero ejecuta prepararInstalacionInicial() en Google Apps Script."
    );
  }
  try {
    return SpreadsheetApp.openById(id);
  } catch (error) {
    throw apiError_("SPREADSHEET_ERROR", "No se pudo abrir Google Sheets. Revisa el ID y los permisos.");
  }
}

function validateAccess_(provided) {
  const expected = PropertiesService.getScriptProperties().getProperty(TERMAL_CONFIG.ACCESS_KEY_PROPERTY);
  if (!expected) {
    throw apiError_("NOT_PREPARED", "El backend no está preparado. Ejecuta prepararInstalacionInicial().");
  }
  if (!provided || !safeEquals_(String(provided), String(expected))) {
    throw apiError_("UNAUTHORIZED", "La clave no es correcta. Cópiala desde el registro de prepararInstalacionInicial().");
  }
}

function safeEquals_(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function withWriteLock_(callback) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (error) {
    throw apiError_("BUSY", "Otra persona está guardando datos. Espera unos segundos e inténtalo otra vez.");
  }
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function rowToObject_(row, definitions) {
  const object = {};
  definitions.forEach(function (definition, index) { object[definition[0]] = row[index]; });
  object.active = object.active === false || String(object.active).toLowerCase() === "false" ? false : true;
  object.comisionManual = object.comisionManual === true || String(object.comisionManual).toLowerCase() === "true";
  object.grabadoLaser = object.grabadoLaser === true || String(object.grabadoLaser).toLowerCase() === "true";
  object.costoPersonalizadoActivo = object.costoPersonalizadoActivo === true ||
    String(object.costoPersonalizadoActivo).toLowerCase() === "true";
  object.problemasDetalle = sanitizeProblems_(object.problemasDetalle);
  object.pagosDetalle = sanitizePayments_(object.pagosDetalle);
  ["fecha", "fechaAcordadaEntrega", "fechaDespacho", "fechaEntrega"].forEach(function (key) {
    object[key] = normalizeDate_(object[key]);
  });
  return object;
}

function objectToRow_(object, definitions) {
  return definitions.map(function (definition) {
    const value = object[definition[0]];
    if (value === undefined || value === null) return "";
    if (definition[0] === "problemasDetalle") return JSON.stringify(sanitizeProblems_(value));
    if (definition[0] === "pagosDetalle") return JSON.stringify(sanitizePayments_(value));
    if (definition[0] === "allocations" && Array.isArray(value)) return JSON.stringify(value);
    if ((definition[0] === "items" || definition[0] === "pagos") && Array.isArray(value)) return JSON.stringify(value);
    return value;
  });
}

function sanitizeText_(value, maxLength) {
  let text = String(value === undefined || value === null ? "" : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, maxLength || 500);
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return text;
}

function normalizeText_(value) {
  return String(value === undefined || value === null ? "" : value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeDate_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, TERMAL_CONFIG.TIMEZONE, "yyyy-MM-dd");
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    return match[3] + "-" + ("0" + match[2]).slice(-2) + "-" + ("0" + match[1]).slice(-2);
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? "" : Utilities.formatDate(date, TERMAL_CONFIG.TIMEZONE, "yyyy-MM-dd");
}

function toNumber_(value) {
  if (typeof value === "number") return isFinite(value) ? value : 0;
  const normalized = String(value === undefined || value === null ? "" : value)
    .replace(/[^\d,.\-]/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return isFinite(parsed) ? parsed : 0;
}

function roundMoney_(value) {
  return Math.round((toNumber_(value) + Number.EPSILON) * 100) / 100;
}

function today_() {
  return Utilities.formatDate(new Date(), TERMAL_CONFIG.TIMEZONE, "yyyy-MM-dd");
}

function touchUpdated_() {
  PropertiesService.getScriptProperties().setProperty(
    TERMAL_CONFIG.LAST_UPDATED_PROPERTY,
    new Date().toISOString()
  );
}

function generateAccessKey_() {
  return Utilities.base64EncodeWebSafe(Utilities.getUuid() + Utilities.getUuid()).replace(/=+$/g, "").slice(0, 40);
}

function apiError_(code, message) {
  const error = new Error(message);
  error.code = code;
  error.publicMessage = message;
  return error;
}

function jsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
