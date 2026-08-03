(function () {
  "use strict";
  const U = globalThis.TermalUtils;
  const ago = (days) => {
    const d = new Date(`${U.today()}T12:00:00-05:00`);
    d.setDate(d.getDate() - days);
    return U.dateInput(d);
  };
  const inDays = (days) => {
    const d = new Date(`${U.today()}T12:00:00-05:00`);
    d.setDate(d.getDate() + days);
    return U.dateInput(d);
  };

  const productTypes = [
    { nombre: "Termo 1200 ml", codigo: "1200", costoBase: 25.5, colores: ["Negro", "Crema", "Blanco"] },
    { nombre: "Termo 890 ml", codigo: "890", costoBase: 19, colores: ["Negro", "Crema", "Blanco"] },
    { nombre: "Shaker", codigo: "SH", costoBase: 29, colores: ["Negro", "Azul"] }
  ];

  const designs = [
    "One Piece Luffy",
    "One Piece Zoro",
    "One Piece Nakamas",
    "Jujutsu Kaisen Legacy",
    "Jujutsu Kaisen Toji",
    "Demon Slayer",
    "Naruto",
    "Chainsawman",
    "Bleach",
    "Dragon Ball",
    "Black Clover",
    "Personalizado"
  ];

  const products = productTypes.flatMap((type) =>
    type.colores.flatMap((color) =>
      designs.map((design) => ({
        nombre: U.buildSku(type.nombre, color, design),
        descripcion: `${design} · ${color} · ${type.nombre}`,
        tipoProducto: type.nombre,
        colorProducto: color,
        disenoProducto: design,
        costoTermo: type.costoBase,
        costoPackaging: 3
      }))
    )
  );

  const baseLists = {
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
    tiposProductos: productTypes,
    disenos: designs,
    coloresPorProducto: {
      "Termo 1200 ml": ["Negro", "Crema", "Blanco"],
      "Termo 890 ml": ["Negro", "Crema", "Blanco"],
      Shaker: ["Negro", "Azul"]
    },
    productos: products
  };

  const defaults = {
    active: true,
    cantidad: 1,
    telefono: "",
    observaciones: "",
    paisCompra: "Nacional",
    comisionTarjeta: 0,
    comisionManual: false,
    grabadoLaser: false,
    costoGrabado: 20,
    costoPackaging: 3,
    costoPersonalizadoActivo: false,
    costoProduccionPersonalizado: 0,
    costoEnvio: 0,
    costoRecojo: 0,
    otrosCostos: 0,
    costoProblema: 0,
    modalidadLogistica: "Entrega y cobro",
    fechaAcordadaEntrega: "",
    fechaDespacho: "",
    codigoSeguimiento: "",
    fechaEntrega: "",
    tipoProblema: "NO",
    descripcionProblema: "",
    problemasDetalle: [],
    pagosDetalle: [],
    pagadorLogistica: "Mancomunada",
    liquidadoGonzalo: 0,
    liquidadoAlberto: 0,
    liquidadoDinsides: 0,
    pagadoADinsides: 0,
    batchSalidaId: "",
    metodoPago: "Yape"
  };

  const rawSales = [
    { fecha: ago(0), fechaAcordadaEntrega: inDays(0), codigo: "12", cliente: "María Fernanda", tipoProducto: "Termo 1200 ml", colorProducto: "Negro", disenoProducto: "One Piece Luffy", ventaTotal: 119.9, adelanto: 19.9, cuentaAdelanto: "Gonzalo", cuentaSaldo: "DINSIDES", agencia: "DINSIDES", estadoPedido: "Producción", canal: "Instagram", origen: "Meta Ads", grabadoLaser: true, costoEnvio: 12, pagadorLogistica: "Gonzalo", modalidadPago: "Adelanto + Contra entrega" },
    { fecha: ago(0), fechaAcordadaEntrega: inDays(1), codigo: "11", cliente: "Diego Ramos", tipoProducto: "Termo 890 ml", colorProducto: "Crema", disenoProducto: "Jujutsu Kaisen Toji", ventaTotal: 89.9, adelanto: 89.9, cuentaAdelanto: "Gonzalo", agencia: "Shalom", estadoPedido: "Por despachar", canal: "TikTok", origen: "Orgánico", costoEnvio: 15, pagadorLogistica: "Gonzalo", modalidadLogistica: "Envío a provincia", modalidadPago: "Pago completo" },
    { fecha: ago(1), fechaAcordadaEntrega: inDays(3), codigo: "10", cliente: "Ana Lucía", tipoProducto: "Shaker", colorProducto: "Azul", disenoProducto: "Dragon Ball", ventaTotal: 99.9, adelanto: 99.9, cuentaAdelanto: "Mancomunada", agencia: "DINSIDES", estadoPedido: "Por despachar", canal: "Shopify WEB", origen: "Meta Ads", costoEnvio: 12, pagadorLogistica: "DINSIDES", modalidadLogistica: "Recojo sin cobro", modalidadPago: "Shopify Web" },
    { fecha: ago(1), fechaAcordadaEntrega: ago(1), codigo: "9", cliente: "Carlos Vega", tipoProducto: "Termo 1200 ml", colorProducto: "Blanco", disenoProducto: "Demon Slayer", ventaTotal: 109.9, adelanto: 19.9, saldoCobrado: 90, cuentaAdelanto: "Gonzalo", cuentaSaldo: "DINSIDES", agencia: "DINSIDES", estadoPedido: "Despachado", fechaDespacho: ago(1), canal: "Instagram", origen: "Orgánico", grabadoLaser: true, costoEnvio: 12, costoRecojo: 8, pagadorLogistica: "DINSIDES", modalidadPago: "Adelanto + Contra entrega" },
    { fecha: ago(2), fechaAcordadaEntrega: ago(2), codigo: "8", cliente: "Sofía Salazar", tipoProducto: "Termo 890 ml", colorProducto: "Negro", disenoProducto: "Bleach", ventaTotal: 129.9, adelanto: 129.9, cuentaAdelanto: "Mancomunada", agencia: "Olva", estadoPedido: "Producción", canal: "Shopify WEB", origen: "TikTok Ads", paisCompra: "Internacional", costoEnvio: 16, modalidadPago: "Shopify Web" },
    { fecha: ago(3), fechaAcordadaEntrega: ago(1), codigo: "7", cliente: "Renzo Molina", tipoProducto: "Termo 890 ml", colorProducto: "Crema", disenoProducto: "Personalizado", ventaTotal: 89.9, adelanto: 19.9, saldoCobrado: 70, cuentaAdelanto: "Alberto", cuentaSaldo: "DINSIDES", agencia: "DINSIDES", estadoPedido: "Entregado", fechaDespacho: ago(2), fechaEntrega: ago(1), canal: "Recomendación", origen: "Orgánico", grabadoLaser: true, costoEnvio: 12, pagadorLogistica: "Alberto", modalidadPago: "Adelanto + Contra entrega" },
    { fecha: ago(4), codigo: "6", cliente: "Valeria Ponce", tipoProducto: "Shaker", colorProducto: "Negro", disenoProducto: "Chainsawman", ventaTotal: 99.9, adelanto: 99.9, cuentaAdelanto: "Gonzalo", agencia: "Shalom", estadoPedido: "Despachado", fechaDespacho: ago(3), codigoSeguimiento: "SH-443991", canal: "Instagram", origen: "Meta Ads", costoEnvio: 15, pagadorLogistica: "Gonzalo", modalidadPago: "Pago completo" },
    { fecha: ago(6), codigo: "5", cliente: "José Medina", tipoProducto: "Termo 1200 ml", colorProducto: "Negro", disenoProducto: "Naruto", ventaTotal: 119.9, adelanto: 19.9, saldoCobrado: 100, cuentaAdelanto: "Gonzalo", cuentaSaldo: "DINSIDES", agencia: "DINSIDES", estadoPedido: "Despachado", fechaDespacho: ago(5), canal: "TikTok", origen: "TikTok Ads", grabadoLaser: true, costoEnvio: 12, pagadorLogistica: "DINSIDES", tipoProblema: "Cliente no estaba", descripcionProblema: "Reprogramado para mañana", costoProblema: 5, modalidadPago: "Adelanto + Contra entrega" },
    { fecha: ago(8), codigo: "4", cliente: "Camila Torres", tipoProducto: "Termo 890 ml", colorProducto: "Blanco", disenoProducto: "One Piece Zoro", ventaTotal: 89.9, adelanto: 89.9, cuentaAdelanto: "Mancomunada", agencia: "DINSIDES", estadoPedido: "Entregado", fechaDespacho: ago(7), fechaEntrega: ago(6), canal: "Shopify WEB", origen: "Orgánico", costoEnvio: 12, pagadorLogistica: "DINSIDES", pagadoADinsides: 12, modalidadPago: "Shopify Web" },
    { fecha: ago(10), codigo: "3", cliente: "Mauricio León", tipoProducto: "Termo 1200 ml", colorProducto: "Crema", disenoProducto: "Black Clover", ventaTotal: 109.9, adelanto: 109.9, cuentaAdelanto: "Gonzalo", agencia: "Shalom", estadoPedido: "Entregado", fechaDespacho: ago(9), fechaEntrega: ago(7), canal: "Instagram", origen: "Orgánico", costoEnvio: 15, pagadorLogistica: "Gonzalo", liquidadoGonzalo: 50, modalidadPago: "Pago completo" },
    { fecha: ago(12), codigo: "2", cliente: "Andrea Soto", tipoProducto: "Shaker", colorProducto: "Azul", disenoProducto: "Jujutsu Kaisen Legacy", ventaTotal: 99.9, adelanto: 19.9, saldoCobrado: 80, cuentaAdelanto: "Gonzalo", cuentaSaldo: "DINSIDES", agencia: "DINSIDES", estadoPedido: "Entregado", fechaDespacho: ago(11), fechaEntrega: ago(10), canal: "Recomendación", origen: "Orgánico", costoEnvio: 12, pagadorLogistica: "DINSIDES", liquidadoDinsides: 80, liquidadoGonzalo: 19.9, modalidadPago: "Adelanto + Contra entrega" },
    { fecha: ago(15), codigo: "1", cliente: "Luis Aguilar", tipoProducto: "Termo 1200 ml", colorProducto: "Blanco", disenoProducto: "One Piece Nakamas", ventaTotal: 119.9, adelanto: 119.9, cuentaAdelanto: "Mancomunada", agencia: "Olva", estadoPedido: "Entregado", fechaDespacho: ago(14), fechaEntrega: ago(12), canal: "Shopify WEB", origen: "Meta Ads", grabadoLaser: true, costoEnvio: 16, modalidadPago: "Shopify Web" }
  ];

  const demoB2B = [{
    id: "demo_b2b_1", active: true, codigo: "B2B-001", fecha: ago(30),
    fechaEntregaAcordada: ago(20), fechaEntregaReal: ago(20), empresa: "SERVICIOS INEFABLES SAC",
    ruc: "20613516540", contacto: "+51 959 091 356", aplicaIgv: true, facturaEmitida: true,
    items: [
      { id: "b2b_i1", descripcion: "Termo 890 ml crema, grabado láser de una cara", cantidad: 9, precioUnitario: 75, costoTermoUnitario: 19, costoGrabadoUnitario: 20, costoCajaUnitario: 2.2 },
      { id: "b2b_i2", descripcion: "Termo 890 ml crema, logo en dos caras", cantidad: 33, precioUnitario: 50, costoTermoUnitario: 19, costoGrabadoUnitario: 8, costoCajaUnitario: 2.2 },
      { id: "b2b_i3", descripcion: "Termo 890 ml negro, logo en dos caras", cantidad: 68, precioUnitario: 50, costoTermoUnitario: 19, costoGrabadoUnitario: 8, costoCajaUnitario: 2.2 }
    ],
    gastoAdminVentas: 0, gastoLogistico: 129.5, otrosCostos: 0,
    pagos: [{ id: "b2b_p1", fecha: ago(20), monto: 6755.5, cuenta: "Termal", metodo: "Transferencia", nota: "Pago completo" }],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }];

  const demoPurchases = [{
    id: "demo_purchase_1", active: true, codigo: "COMP-001", fecha: ago(25), categoria: "Termos",
    producto: "Termos 890 ml", proveedor: "BRILLANTE IMPORTACIONES", detalle: "50 termos negros",
    cantidad: 50, costoUnitario: 19, incluyeIgv: true,
    pagos: [{ id: "purchase_p1", fecha: ago(25), monto: 950, cuenta: "Termal", metodo: "Transferencia", nota: "Pago completo" }],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }];

  const demoMarketing = [{
    id: "demo_marketing_1", active: true, fecha: ago(7), categoria: "Meta ads", dolares: 7.18,
    tipoCambio: 3.46, detalle: "Campaña del mes", pagadoPor: "Gonzalo",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }];

  function makeSale(data, index) {
    return U.calculateSale({
      ...defaults,
      ...data,
      id: `demo_${index + 1}`,
      createdAt: new Date(Date.now() - index * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - index * 1800000).toISOString()
    });
  }

  globalThis.TermalDemo = {
    lists: baseLists,
    seed() {
      return {
        sales: rawSales.map(makeSale),
        movements: [],
        b2b: demoB2B,
        purchases: demoPurchases,
        marketing: demoMarketing,
        lists: JSON.parse(JSON.stringify(baseLists)),
        updatedAt: new Date().toISOString()
      };
    }
  };
})();
