(function () {
  "use strict";

  const U = globalThis.TermalUtils;
  const API = globalThis.TermalAPI;
  const Charts = globalThis.TermalCharts;

  const state = {
    route: "dashboard",
    sales: [],
    movements: [],
    lists: globalThis.TermalDemo.lists,
    updatedAt: "",
    syncing: false,
    period: "month",
    selectedMonth: U.today().slice(0, 7),
    customRange: { start: "", end: "" },
    filtersOpen: false,
    salesQuickFilter: "all",
    filters: {
      search: "", start: "", end: "", estado: "", tipoProducto: "", agencia: "", canal: "", origen: "",
      modalidadPago: "", cuenta: "", estadoCobro: "", estadoLiquidacion: "", problema: "", fechaAcordadaEstado: "",
      showArchived: false
    },
    sort: { key: "fecha", direction: "desc" },
    page: 1,
    pageSize: 15,
    editingId: "",
    paymentSaleId: "",
    shippingSaleId: "",
    problemSaleId: "",
    actionSaleId: "",
    confirmAction: null,
    syncTimer: null
  };

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    [
      "mainContent", "pageTitle", "lastSync", "syncState", "syncButton", "newSaleButton",
      "mobileNewSale", "dataModeBadge", "helpButton", "saleDialog", "saleForm", "saleFormBody",
      "saleModalTitle", "saveSaleButton", "detailDialog", "detailTitle", "detailBody",
      "detailFooter", "movementDialog", "movementForm", "movementTitle", "movementBody",
      "paymentDialog", "paymentForm", "paymentBody",
      "shippingDialog", "shippingForm", "shippingTitle", "shippingBody",
      "problemDialog", "problemForm", "problemTitle", "problemBody",
      "orderActionsDialog", "orderActionsTitle", "orderActionsBody",
      "dispatchDialog", "dispatchForm", "dispatchBody", "confirmDialog", "confirmTitle",
      "confirmBody", "confirmCancel", "confirmAccept", "accessDialog", "accessForm",
      "accessError", "toastRegion", "offlineBanner"
    ].forEach((id) => { els[id] = document.getElementById(id); });

    document.querySelectorAll("[data-route]").forEach((button) => {
      button.addEventListener("click", () => navigate(button.dataset.route));
    });
    document.querySelectorAll("[data-close]").forEach((button) => {
      button.addEventListener("click", () => closeDialog(button.dataset.close));
    });

    els.newSaleButton.addEventListener("click", () => openSaleForm());
    els.mobileNewSale.addEventListener("click", () => openSaleForm());
    els.syncButton.addEventListener("click", () => loadData({ manual: true }));
    els.helpButton.addEventListener("click", () => {
      window.open("README.md", "_blank", "noopener");
    });
    els.mainContent.addEventListener("click", handleMainClick);
    els.mainContent.addEventListener("input", handleMainInput);
    els.mainContent.addEventListener("change", handleMainChange);
    els.saleForm.addEventListener("submit", submitSale);
    els.saleForm.addEventListener("input", handleSaleFormInput);
    els.saleForm.addEventListener("change", handleSaleFormChange);
    els.saleForm.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        els.saleForm.requestSubmit();
      }
    });
    els.movementForm.addEventListener("submit", submitMovement);
    els.paymentForm.addEventListener("submit", submitPayment);
    els.paymentForm.addEventListener("input", updatePaymentPreview);
    els.shippingForm.addEventListener("submit", submitShipping);
    els.shippingForm.addEventListener("change", handleShippingFormChange);
    els.problemForm.addEventListener("submit", submitProblems);
    els.problemForm.addEventListener("click", handleProblemDialogClick);
    els.problemForm.addEventListener("change", handleProblemDialogChange);
    els.problemForm.addEventListener("input", updateProblemDialogTotal);
    els.orderActionsBody.addEventListener("click", handleOrderActionClick);
    els.movementForm.addEventListener("change", (event) => {
      if (event.target.name === "type") updateMovementPerson(event.target.value);
    });
    els.dispatchForm.addEventListener("submit", submitDispatch);
    els.confirmCancel.addEventListener("click", () => closeDialog("confirmDialog"));
    els.confirmAccept.addEventListener("click", runConfirmedAction);
    els.accessForm.addEventListener("submit", submitAccessKey);
    window.addEventListener("online", handleConnection);
    window.addEventListener("offline", handleConnection);
    window.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !isAnyDialogOpen()) {
        event.preventDefault();
        openSaleForm();
      }
    });
    window.addEventListener("resize", debounce(drawDashboardCharts, 150));
    els.confirmDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeDialog("confirmDialog");
    });
    handleConnection();
    updateDataMode();
    loadData();
    state.syncTimer = window.setInterval(() => {
      if (!document.hidden && navigator.onLine && !isAnyDialogOpen()) loadData({ quiet: true });
    }, CONFIG.SYNC_INTERVAL_MS);
  }

  async function loadData(options = {}) {
    if (state.syncing) return;
    state.syncing = true;
    setSyncStatus("syncing", "Sincronizando…");
    if (!options.quiet) els.syncButton.disabled = true;
    try {
      const data = await API.request("getAll");
      const changed = data.updatedAt !== state.updatedAt;
      state.sales = (data.sales || []).map(U.calculateSale);
      state.movements = data.movements || [];
      state.lists = { ...globalThis.TermalDemo.lists, ...(data.lists || {}) };
      state.updatedAt = data.updatedAt || new Date().toISOString();
      setSyncStatus("online", `Actualizado ${formatTime(new Date())}`);
      if (!options.quiet || changed) render();
      if (options.manual) toast("success", "Información actualizada", "Los datos ya están sincronizados.");
    } catch (error) {
      setSyncStatus("error", "No se pudo sincronizar");
      if (error.code === "UNAUTHORIZED" && API.isConfigured()) {
        openAccessDialog(error.message);
      } else if (!options.quiet) {
        toast("error", "No se pudo conectar", error.message);
        if (!state.sales.length) renderConnectionError(error);
      }
    } finally {
      state.syncing = false;
      els.syncButton.disabled = false;
    }
  }

  function render() {
    updateDataMode();
    const renderers = {
      dashboard: renderDashboard,
      ventas: renderSales,
      problemas: renderProblems
    };
    (renderers[state.route] || renderDashboard)();
  }

  function navigate(route) {
    state.route = route;
    state.page = 1;
    document.querySelectorAll("[data-route]").forEach((button) => {
      button.classList.toggle("active", button.dataset.route === route);
    });
    const titles = { dashboard: "Dashboard", ventas: "Pedidos", problemas: "Problemas" };
    els.pageTitle.textContent = titles[route] || "ERP MINI TERMAL";
    render();
    els.mainContent.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateDataMode() {
    els.dataModeBadge.textContent = API.isConfigured()
      ? "● Conectado a Google Sheets"
      : "● Modo demostración · datos separados";
  }

  function renderDashboard() {
    const active = state.sales.filter((sale) => sale.active !== false && sale.estadoPedido !== "Cancelado");
    const range = dashboardRange();
    const sales = active.filter((sale) => U.inRange(sale.fecha, range));
    const totals = summarize(sales);
    const allOutstanding = obligations(active);
    const countProblems = active.filter((sale) => U.saleProblems(sale).length > 0).length;
    const operationCounts = {
      production: active.filter((sale) => sale.estadoPedido === "Producción").length,
      ready: active.filter((sale) => sale.estadoPedido === "Por despachar").length,
      route: active.filter((sale) => sale.estadoPedido === "Despachado").length,
      problems: countProblems
    };

    els.mainContent.innerHTML = `
      <section class="dashboard-hero">
        <div>
          <p class="eyebrow">RESUMEN DEL NEGOCIO</p>
          <h2>El pulso de Termal</h2>
          <p>${dashboardPeriodLabel(range)} · ${totals.orders} pedido${totals.orders === 1 ? "" : "s"} registrado${totals.orders === 1 ? "" : "s"}.</p>
        </div>
        <div class="dashboard-hero-result">
          <span>Utilidad del periodo</span>
          <strong class="${totals.profit < 0 ? "negative" : ""}">${U.currency(totals.profit)}</strong>
          <small>Margen ${percent(totals.profit, totals.sales)}%</small>
        </div>
      </section>

      <div class="period-bar">
        <div class="dashboard-period-controls">
          <div class="segmented" aria-label="Periodo del dashboard">
            ${periodButton("today", "Hoy")}
            ${periodButton("week", "Esta semana")}
            ${periodButton("history", "Histórico")}
          </div>
          <label class="month-picker ${state.period === "month" ? "active" : ""}">
            <span>Mes específico</span>
            <select data-dashboard-month aria-label="Seleccionar un mes">
              ${dashboardMonthOptions().map(({ value, label }) => `<option value="${value}" ${value === state.selectedMonth ? "selected" : ""}>${U.escapeHtml(label)}</option>`).join("")}
            </select>
          </label>
          <button class="date-range-button ${state.period === "custom" ? "active" : ""}" data-period="custom">Rango personalizado</button>
        </div>
        ${state.period === "custom" ? `
          <div class="custom-range">
            <input type="date" aria-label="Fecha inicial" data-dashboard-range="start" value="${U.escapeHtml(state.customRange.start)}">
            <span>—</span>
            <input type="date" aria-label="Fecha final" data-dashboard-range="end" value="${U.escapeHtml(state.customRange.end)}">
          </div>` : `<span class="dashboard-period-caption">${dashboardPeriodLabel(range)}</span>`}
      </div>

      <div class="metric-grid">
        ${metric("Ventas", U.currency(totals.sales), "◎", `${totals.orders} pedidos`, "")}
        ${metric("Cobrado", U.currency(totals.collected), "✓", `${percent(totals.collected, totals.sales)}% de las ventas`, "blue")}
        ${metric("Por cobrar", U.currency(totals.pending), "◷", totals.pending ? "Requiere seguimiento" : "Todo al día", "warning")}
        ${metric("Utilidad", U.currency(totals.profit), "↗", `Margen ${percent(totals.profit, totals.sales)}%`, "purple")}
        ${metric("Pedidos", String(totals.orders), "▤", `${totals.items} unidades`, "blue")}
        ${metric("Ticket promedio", U.currency(totals.ticket), "◈", "Por pedido", "")}
      </div>

      <div class="operation-grid" aria-label="Resumen operativo">
        ${operationItem("production", "En producción", operationCounts.production, "Ver taller")}
        ${operationItem("ready", "Por despachar", operationCounts.ready, "Preparar salida")}
        ${operationItem("route", "En ruta", operationCounts.route, "Dar seguimiento")}
        ${operationItem("problems", "Con problemas", operationCounts.problems, "Revisar incidencias")}
      </div>

      <div class="dashboard-main">
        <section class="card chart-card">
          <div class="card-title"><h3>Evolución de ventas y utilidad</h3><span class="metric-meta">${sales.length} pedidos en el periodo</span></div>
          <canvas id="salesChart" aria-label="Gráfico de líneas de ventas y utilidad"></canvas>
        </section>
        <section class="card liquidation-card">
          <div class="section-head">
            <div><h3>Liquidaciones pendientes</h3><p>Haz clic para ver los pedidos</p></div>
            <div class="page-actions">
              <button class="btn btn-sm btn-secondary" data-action="movement-history">Historial</button>
              <button class="btn btn-sm btn-secondary" data-action="new-return">Registrar devolución</button>
            </div>
          </div>
          <div class="liquidation-list">
            ${liquidationItem("GONZALO_RETURN", "G", "Gonzalo debe devolver", allOutstanding.gonzalo, active)}
            ${liquidationItem("ALBERTO_RETURN", "A", "Alberto debe devolver", allOutstanding.alberto, active)}
            ${liquidationItem("DINSIDES_DEPOSIT", "D", "DINSIDES debe depositar", allOutstanding.dinsides, active)}
            ${liquidationItem("TERMAL_PAY_DINSIDES", "T", "Termal debe pagar", allOutstanding.termalDinsides, active)}
          </div>
        </section>
      </div>

    `;
    requestAnimationFrame(drawDashboardCharts);
  }

  function drawDashboardCharts() {
    if (state.route !== "dashboard" || !document.getElementById("salesChart")) return;
    const range = dashboardRange();
    const active = state.sales.filter((sale) =>
      sale.active !== false && sale.estadoPedido !== "Cancelado" && U.inRange(sale.fecha, range)
    );
    const groupByMonth = state.period === "history" || dashboardRangeDays(range) > 62;
    const grouped = active.reduce((acc, sale) => {
      const key = groupByMonth ? String(sale.fecha).slice(0, 7) : sale.fecha;
      if (!acc[key]) acc[key] = { sales: 0, profit: 0 };
      acc[key].sales = U.money(acc[key].sales + U.number(sale.ventaTotal));
      acc[key].profit = U.money(acc[key].profit + U.number(sale.utilidad));
      return acc;
    }, {});
    const dateEntries = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => [
        groupByMonth ? formatShortMonth(date) : formatShortDate(date),
        values.sales,
        values.profit
      ]);
    Charts.lineCompare(document.getElementById("salesChart"), dateEntries);
  }

  function renderSales() {
    const filtered = filterSales();
    const sorted = sortSales(filtered);
    const readyCount = state.sales.filter((sale) => sale.active !== false && sale.estadoPedido === "Por despachar").length;
    const pages = Math.max(1, Math.ceil(sorted.length / state.pageSize));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * state.pageSize;
    const pageSales = sorted.slice(start, start + state.pageSize);

    els.mainContent.innerHTML = `
      <div class="sales-commandbar">
        <label class="search-box"><input type="search" data-filter="search" value="${U.escapeHtml(state.filters.search)}" placeholder="Buscar cliente, pedido o código…"></label>
        <button class="btn btn-secondary filter-toggle ${hasActiveFilters() ? "has-filters" : ""}" data-action="toggle-filters">
          <span class="filter-toggle-icon">⊞</span>
          <span class="filter-toggle-label">Filtros ${activeFilterCount() ? `(${activeFilterCount()})` : ""}</span>
        </button>
        <div class="sales-command-actions">
          ${readyCount ? `<button class="btn btn-secondary" data-action="open-dispatch">⇢ Despachar varios</button>` : ""}
          <button class="btn btn-secondary" data-action="export-csv">⇩ Exportar CSV</button>
          ${!API.isConfigured() ? `<button class="btn btn-secondary" data-action="reset-demo">Restablecer demo</button>` : ""}
        </div>
      </div>
      ${renderSalesQuickFilters()}
      ${renderFilterPanel(readyCount)}
      <section class="card table-card sales-results-card">
        ${pageSales.length ? `
          <div class="table-scroll sales-desktop-view">
            <table>
              <thead><tr>
                ${sortableTh("fecha", "Fecha")}
                ${sortableTh("codigo", "Cod")}
                <th>Cliente</th><th>Producto</th>
                ${sortableTh("ventaTotal", "Venta")}
                <th>Cobrado</th><th>Por cobrar</th>
                <th>Envío</th><th>Agencia</th><th>Estado</th><th>Canal</th>
                <th>Acciones</th>
              </tr></thead>
              <tbody>${pageSales.map(saleRow).join("")}</tbody>
            </table>
          </div>
          <div class="sales-mobile-view">
            ${pageSales.map(mobileSaleCard).join("")}
          </div>
          <div class="table-footer">
            <span>Mostrando ${start + 1}–${Math.min(start + state.pageSize, sorted.length)} de ${sorted.length}</span>
            <div class="pagination">
              <button class="btn btn-secondary btn-sm" data-page="${state.page - 1}" ${state.page <= 1 ? "disabled" : ""}>←</button>
              <span class="btn btn-sm">${state.page} / ${pages}</span>
              <button class="btn btn-secondary btn-sm" data-page="${state.page + 1}" ${state.page >= pages ? "disabled" : ""}>→</button>
            </div>
          </div>` : emptyState("▤", "No hay pedidos con estos filtros", "Prueba quitando los filtros.")}
      </section>
    `;
  }

  function renderSalesQuickFilters() {
    const active = state.sales.filter((sale) => sale.active !== false);
    const filters = [
      { key: "all", label: "Todos", shortLabel: "Todos", sales: active, priority: true },
      { key: "receivable", label: "Por cobrar", shortLabel: "Por cobrar", sales: active.filter((sale) => U.number(sale.porCobrar) > 0), amount: true, priority: true },
      { key: "production", label: "Por producir", shortLabel: "Producción", sales: active.filter((sale) => sale.estadoPedido === "Producción"), priority: true },
      { key: "ready", label: "Por despachar", shortLabel: "Despachar", sales: active.filter((sale) => sale.estadoPedido === "Por despachar"), priority: true },
      { key: "route", label: "En ruta", sales: active.filter((sale) => sale.estadoPedido === "Despachado"), priority: false },
      { key: "delivered", label: "Entregados", sales: active.filter((sale) => sale.estadoPedido === "Entregado"), priority: false },
      { key: "problems", label: "Problemas", sales: active.filter((sale) => U.saleProblems(sale).length > 0), priority: false },
      { key: "overdue", label: "Atrasados", sales: active.filter(isOverdueSale), priority: false }
    ];
    return `
      <div class="sales-quick-filters" role="group" aria-label="Filtros rápidos de pedidos">
        ${filters.map((filter) => {
          const pending = filter.amount
            ? filter.sales.reduce((sum, sale) => sum + U.number(sale.porCobrar), 0)
            : 0;
          return `<button class="sales-filter-chip sales-filter-${filter.key} ${filter.priority ? "sales-filter-priority" : "sales-filter-secondary"} ${state.salesQuickFilter === filter.key ? "active" : ""}"
            data-quick-filter="${filter.key}" aria-pressed="${state.salesQuickFilter === filter.key}"
            aria-label="${filter.label}: ${filter.sales.length}${filter.amount ? `, ${U.currency(pending)}` : ""}">
            <span class="sales-filter-label">
              <span class="sales-filter-label-full">${filter.label}</span>
              <span class="sales-filter-label-short" aria-hidden="true">${filter.shortLabel || filter.label}</span>
            </span>
            <strong>${filter.sales.length}</strong>
            ${filter.amount ? `<small>${U.currency(pending)}</small>` : ""}
          </button>`;
        }).join("")}
      </div>`;
  }

  function mobileSaleCard(sale) {
    const archived = sale.active === false;
    const problems = U.saleProblems(sale);
    const shipping = hasShipping(sale);
    const deliveryLabel = sale.agencia || sale.modalidadLogistica || "Sin envío";
    const agreedDate = agreedDeliveryStatus(sale);
    return `
      <article class="order-mobile-card ${archived ? "archived-card" : ""} ${problems.length ? "problem-card-highlight" : ""}">
        <button class="order-card-main" data-sale-action="view" data-id="${sale.id}" aria-label="Abrir pedido ${U.escapeHtml(sale.codigo)}">
          <div class="order-card-topline">
            <span class="order-card-code">#${U.escapeHtml(sale.codigo)}</span>
            ${statusChip(sale.estadoPedido)}
            ${problems.length ? `<span class="order-problem-indicator" title="${problems.length} problema${problems.length === 1 ? "" : "s"} registrado${problems.length === 1 ? "" : "s"}" aria-label="Pedido con problemas">!</span>` : ""}
            ${agreedDeliveryBadge(agreedDate)}
          </div>
          <strong class="order-card-client">${U.escapeHtml(sale.cliente)}</strong>
          <span class="order-card-product">${U.escapeHtml(sale.producto || sale.sku || "Sin código")}</span>
          <div class="order-card-shipping">
            <span>${U.escapeHtml(deliveryLabel)}</span>
            <span>${shipping ? `Envío ${U.currency(sale.costoEnvio)}` : "Envío pendiente"}</span>
          </div>
          <div class="order-card-finances">
            <span><small>Venta</small><strong>${U.currency(sale.ventaTotal)}</strong></span>
            <span><small>Por cobrar</small><strong class="${sale.porCobrar > 0 ? "money-warning" : ""}">${U.currency(sale.porCobrar)}</strong></span>
            <span><small>Utilidad</small><strong class="${sale.utilidad < 0 ? "money-danger" : "money-positive"}">${U.currency(sale.utilidad)}</strong></span>
          </div>
        </button>
        <div class="order-card-actions">
          ${archived
            ? `<button class="row-action" data-sale-action="restore" data-id="${sale.id}" title="Restaurar" aria-label="Restaurar pedido ${U.escapeHtml(sale.codigo)}">↶</button>`
            : `${mobileFlowButton(sale)}
              <button class="order-menu-button" data-sale-action="menu" data-id="${sale.id}" aria-label="Acciones de ${U.escapeHtml(sale.codigo)}" title="Acciones del pedido">⋮</button>`}
        </div>
      </article>`;
  }

  function renderFilterPanel(readyCount = 0) {
    const f = state.filters;
    return `
      <div class="filter-panel ${state.filtersOpen ? "open" : ""}">
        <div class="mobile-filter-tools">
          <label class="field"><span>Ordenar pedidos</span>
            <select data-sales-sort>
              <option value="fecha:desc" ${state.sort.key === "fecha" && state.sort.direction === "desc" ? "selected" : ""}>Más recientes</option>
              <option value="fecha:asc" ${state.sort.key === "fecha" && state.sort.direction === "asc" ? "selected" : ""}>Más antiguos</option>
              <option value="fechaAcordadaEntrega:asc" ${state.sort.key === "fechaAcordadaEntrega" && state.sort.direction === "asc" ? "selected" : ""}>Entrega más próxima</option>
              <option value="fechaAcordadaEntrega:desc" ${state.sort.key === "fechaAcordadaEntrega" && state.sort.direction === "desc" ? "selected" : ""}>Entrega más lejana</option>
              <option value="codigo:desc" ${state.sort.key === "codigo" && state.sort.direction === "desc" ? "selected" : ""}>Pedido mayor</option>
              <option value="codigo:asc" ${state.sort.key === "codigo" && state.sort.direction === "asc" ? "selected" : ""}>Pedido menor</option>
            </select>
          </label>
          <div class="mobile-filter-actions">
            <button class="btn btn-secondary btn-sm" data-action="export-csv">⇩ Exportar CSV</button>
            ${!API.isConfigured() ? `<button class="btn btn-secondary btn-sm" data-action="reset-demo">Restablecer demo</button>` : ""}
          </div>
        </div>
        ${readyCount ? `<button class="btn btn-secondary btn-sm mobile-batch-dispatch" data-action="open-dispatch">⇢ Despachar varios (${readyCount})</button>` : ""}
        ${fieldSelect("Estado", "estado", state.lists.estados, f.estado, true, "data-filter")}
        ${fieldSelect("Producto", "tipoProducto", state.lists.tiposProductos, f.tipoProducto, true, "data-filter")}
        ${fieldSelect("Canal", "canal", state.lists.canales, f.canal, true, "data-filter")}
        ${fieldSelect("Problema", "problema", ["Con problema", "Sin problema"], f.problema, true, "data-filter")}
        ${fieldSelect("Fecha acordada", "fechaAcordadaEstado", ["Atrasados", "Hoy o mañana", "Sin fecha"], f.fechaAcordadaEstado, true, "data-filter")}
        <label class="field"><span>Desde</span><input type="date" data-filter="start" value="${U.escapeHtml(f.start)}"></label>
        <label class="field"><span>Hasta</span><input type="date" data-filter="end" value="${U.escapeHtml(f.end)}"></label>
        <label class="check-line"><input type="checkbox" data-filter="showArchived" ${f.showArchived ? "checked" : ""}> Ver papelera (pedidos archivados)</label>
        <div><button class="btn btn-secondary btn-sm" data-action="clear-filters">Limpiar filtros</button></div>
      </div>`;
  }

  function saleRow(sale) {
    const archived = sale.active === false;
    const problems = U.saleProblems(sale);
    const shipping = hasShipping(sale);
    const agreedDate = agreedDeliveryStatus(sale);
    return `
      <tr class="${archived ? "archived-row" : ""} ${problems.length ? "problem-row-highlight" : ""}">
        <td><span class="cell-primary">${U.formatDate(sale.fecha)}</span>${agreedDeliveryBadge(agreedDate, true)}</td>
        <td><button class="link-button cell-primary" data-sale-action="view" data-id="${sale.id}">${U.escapeHtml(sale.codigo)}</button></td>
        <td><span class="cell-primary">${U.escapeHtml(sale.cliente)}</span></td>
        <td>
          <span class="cell-primary">${U.escapeHtml(sale.producto)}</span>
          <span class="cell-secondary">${U.escapeHtml(U.productDescription(sale))}</span>
          <span class="cell-secondary">Grabado: ${sale.grabadoLaser ? `tercero · ${U.currency(sale.costoGrabado)}` : "TERMAL"}</span>
        </td>
        <td class="cell-primary">${U.currency(sale.ventaTotal)}</td>
        <td><span>${U.currency(sale.cobradoTotal)}</span><span class="cell-secondary">${U.escapeHtml(paymentAccounts(sale) || "Sin cobros")}</span></td>
        <td class="${sale.porCobrar > 0 ? "money-warning" : ""}">${U.currency(sale.porCobrar)}</td>
        <td>${shipping
          ? `<span class="cell-primary">${U.currency(sale.costoEnvio)}</span><span class="cell-secondary">${sale.costoRecojo > 0 ? `Recojo ${U.currency(sale.costoRecojo)} · ` : ""}${U.escapeHtml(sale.pagadorLogistica || "—")}</span>`
          : "—"}</td>
        <td>${U.escapeHtml(sale.agencia || "—")}</td>
        <td>${statusChip(sale.estadoPedido)}</td><td>${U.escapeHtml(sale.canal || "—")}</td>
        <td><div class="row-actions">
          ${archived
            ? `<button class="row-action" data-sale-action="restore" data-id="${sale.id}" title="Restaurar">↶</button>`
            : `${flowButton(sale)}
              <button class="order-menu-button" data-sale-action="menu" data-id="${sale.id}" aria-label="Acciones de ${U.escapeHtml(sale.codigo)}" title="Acciones del pedido">⋮</button>`}
        </div></td>
      </tr>`;
  }

  function renderProblems() {
    const incidents = state.sales
      .filter((sale) => sale.active !== false)
      .flatMap((sale) => U.saleProblems(sale).map((problem, index) => ({ sale, problem, index })))
      .sort((a, b) => String(b.sale.fecha).localeCompare(String(a.sale.fecha)));
    const affectedOrders = new Set(incidents.map(({ sale }) => sale.id)).size;
    const totalCost = incidents.reduce((sum, { problem }) => sum + U.number(problem.costo), 0);

    els.mainContent.innerHTML = `
      <div class="page-head">
        <div>
          <h2>Problemas</h2>
          <p>${incidents.length} incidencia${incidents.length === 1 ? "" : "s"} en ${affectedOrders} pedido${affectedOrders === 1 ? "" : "s"}.</p>
        </div>
        <div class="problem-page-total"><span>Costo total</span><strong>${U.currency(totalCost)}</strong></div>
      </div>
      <section class="card table-card">
        ${incidents.length ? `
          <div class="table-scroll">
            <table>
              <thead><tr>
                <th>Fecha</th><th>Pedido</th><th>Cliente</th><th>Producto</th>
                <th>Tipo de problema</th><th>Nota</th><th>Costo</th><th>Estado</th><th>Acciones</th>
              </tr></thead>
              <tbody>
                ${incidents.map(({ sale, problem }) => `
                  <tr>
                    <td>${U.formatDate(sale.fecha)}</td>
                    <td><button class="link-button cell-primary" data-sale-action="view" data-id="${sale.id}">${U.escapeHtml(sale.codigo)}</button></td>
                    <td><span class="cell-primary">${U.escapeHtml(sale.cliente)}</span></td>
                    <td><span class="cell-primary">${U.escapeHtml(sale.producto)}</span><span class="cell-secondary">${U.escapeHtml(U.productDescription(sale))}</span></td>
                    <td>${problemChip(problem.tipo || "Problema")}</td>
                    <td>${U.escapeHtml(problem.nota || "—")}</td>
                    <td class="${U.number(problem.costo) > 0 ? "money-danger" : ""}">${U.currency(problem.costo)}</td>
                    <td>${statusChip(sale.estadoPedido)}</td>
                    <td><div class="row-actions">
                      <button class="row-action" data-sale-action="view" data-id="${sale.id}" title="Ver pedido">○</button>
                      <button class="btn btn-secondary btn-sm" data-sale-action="problem" data-id="${sale.id}">Editar problema</button>
                    </div></td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>` : emptyState("✓", "No hay problemas registrados", "Los pedidos con incidencias aparecerán aquí.")}
      </section>`;
  }

  function flowButton(sale) {
    if (sale.estadoPedido === "Producción") {
      return `<button class="btn btn-primary btn-sm flow-button" data-quick-status="Por despachar" data-id="${sale.id}" title="Pasar a Por despachar">A despacho →</button>`;
    }
    if (sale.estadoPedido === "Por despachar") {
      return `<button class="btn btn-primary btn-sm flow-button" data-single-dispatch="${sale.id}" title="Registrar despacho">Despachar →</button>`;
    }
    if (sale.estadoPedido === "Despachado") {
      return `<button class="btn btn-primary btn-sm flow-button" data-quick-status="Entregado" data-id="${sale.id}" title="Marcar como entregado">Entregado →</button>`;
    }
    return sale.estadoPedido === "Entregado"
      ? `<span class="flow-complete" title="Flujo completado">✓ Entregado</span>`
      : `<span class="flow-complete">—</span>`;
  }

  function mobileFlowButton(sale) {
    if (sale.estadoPedido === "Producción") {
      return `<button class="order-flow-button" data-quick-status="Por despachar" data-id="${sale.id}"
        title="Pasar a Por despachar" aria-label="Pasar ${U.escapeHtml(sale.codigo)} a Por despachar">→</button>`;
    }
    if (sale.estadoPedido === "Por despachar") {
      return `<button class="order-flow-button" data-single-dispatch="${sale.id}"
        title="Registrar despacho" aria-label="Registrar despacho de ${U.escapeHtml(sale.codigo)}">→</button>`;
    }
    if (sale.estadoPedido === "Despachado") {
      return `<button class="order-flow-button" data-quick-status="Entregado" data-id="${sale.id}"
        title="Marcar como entregado" aria-label="Marcar ${U.escapeHtml(sale.codigo)} como entregado">→</button>`;
    }
    return "";
  }

  function previousStage(sale) {
    return {
      "Por despachar": "Producción",
      "Despachado": "Por despachar",
      "Entregado": "Despachado"
    }[sale.estadoPedido] || "";
  }

  async function openSaleForm(sale = null) {
    state.editingId = sale?.id || "";
    const preferences = readPreferences();
    let model = sale ? { ...sale } : {
      fecha: U.today(), fechaAcordadaEntrega: "", codigo: "", cliente: "", telefono: "", producto: "", sku: "", cantidad: 1,
      tipoProducto: preferences.tipoProducto || "Termo 1200 ml",
      colorProducto: preferences.colorProducto || "Negro",
      disenoProducto: preferences.disenoProducto || "One Piece Luffy",
      ventaTotal: 0, canal: preferences.canal || "Instagram", origen: "Orgánico", observaciones: "",
      modalidadPago: "", adelanto: 0,
      saldoCobrado: 0, cuentaAdelanto: "Gonzalo", cuentaSaldo: "DINSIDES", metodoPago: "Yape",
      paisCompra: "Nacional", comisionTarjeta: 0, comisionManual: false, costoTermo: 0,
      costoPackaging: 3, grabadoLaser: false, costoGrabado: 0,
      costoPersonalizadoActivo: false, costoProduccionPersonalizado: 0, costoProduccion: 0,
      costoEnvio: 0, costoRecojo: 0, otrosCostos: 0, costoProblema: 0,
      agencia: "", modalidadLogistica: "Entrega y cobro",
      destinatarioEnvio: "", telefonoEnvio: "", dniEnvio: "", direccionEnvio: "", enlaceMaps: "",
      pagadorLogistica: "", estadoPedido: "Producción", fechaDespacho: "",
      codigoSeguimiento: "", fechaEntrega: "", tipoProblema: "NO",
      descripcionProblema: "", problemasDetalle: [], pagosDetalle: [], liquidadoGonzalo: 0, liquidadoAlberto: 0,
      liquidadoDinsides: 0, pagadoADinsides: 0, active: true
    };
    model = U.calculateSale(prepareProductModel(model));
    els.saleModalTitle.textContent = state.editingId ? `Editar ${model.codigo}` : "Nueva venta";
    els.saleFormBody.innerHTML = saleFormMarkup(model);
    els.saleDialog.showModal();
    updateSaleCalculations();
    setTimeout(() => {
      els.saleForm.querySelector('[name="cliente"]')?.focus();
    }, 60);
    if (!model.codigo) {
      try {
        const response = await API.request("nextCode");
        const input = els.saleForm.querySelector('[name="codigo"]');
        if (input && !input.value) input.value = response.code;
      } catch (error) {
        toast("warning", "No se generó el código", "Puedes escribirlo manualmente.");
      }
    }
  }

  function saleFormMarkup(sale) {
    return `
      <input type="hidden" name="id" value="${U.escapeHtml(sale.id || "")}">
      <input type="hidden" name="producto" value="${U.escapeHtml(sale.producto || sale.sku || "")}">
      <input type="hidden" name="sku" value="${U.escapeHtml(sale.sku || sale.producto || "")}">
      <input type="hidden" name="colorProducto" value="${U.escapeHtml(sale.colorProducto || "")}">
      <input type="hidden" name="costoTermo" value="${U.number(sale.costoTermo)}">
      <input type="hidden" name="costoPackaging" value="${U.number(sale.costoPackaging || 3)}">
      <input type="hidden" name="costoProduccion" value="${U.number(sale.costoProduccion)}">
      <input type="hidden" name="telefono" value="${U.escapeHtml(sale.telefono || "")}">
      <input type="hidden" name="saldoCobrado" value="${U.number(sale.saldoCobrado)}">
      <input type="hidden" name="cuentaSaldo" value="${U.escapeHtml(sale.cuentaSaldo || "")}">
      <input type="hidden" name="pagosDetalle" value="${U.escapeHtml(JSON.stringify(U.salePayments(sale)))}">
      <input type="hidden" name="metodoPago" value="${U.escapeHtml(sale.metodoPago || "Yape")}">
      <input type="hidden" name="paisCompra" value="${U.escapeHtml(sale.paisCompra || "Nacional")}">
      <input type="hidden" name="modalidadPago" value="${U.escapeHtml(sale.modalidadPago || "")}">
      <input type="hidden" name="costoEnvio" value="${U.number(sale.costoEnvio)}">
      <input type="hidden" name="costoRecojo" value="${U.number(sale.costoRecojo)}">
      <input type="hidden" name="agencia" value="${U.escapeHtml(sale.agencia || "")}">
      <input type="hidden" name="modalidadLogistica" value="${U.escapeHtml(sale.modalidadLogistica || "Entrega y cobro")}">
      <input type="hidden" name="destinatarioEnvio" value="${U.escapeHtml(sale.destinatarioEnvio || "")}">
      <input type="hidden" name="telefonoEnvio" value="${U.escapeHtml(sale.telefonoEnvio || "")}">
      <input type="hidden" name="dniEnvio" value="${U.escapeHtml(sale.dniEnvio || "")}">
      <input type="hidden" name="direccionEnvio" value="${U.escapeHtml(sale.direccionEnvio || "")}">
      <input type="hidden" name="enlaceMaps" value="${U.escapeHtml(sale.enlaceMaps || "")}">
      <input type="hidden" name="pagadorLogistica" value="${U.escapeHtml(sale.pagadorLogistica || "")}">
      <input type="hidden" name="fechaDespacho" value="${U.escapeHtml(sale.fechaDespacho || "")}">
      <input type="hidden" name="codigoSeguimiento" value="${U.escapeHtml(sale.codigoSeguimiento || "")}">
      <input type="hidden" name="fechaEntrega" value="${U.escapeHtml(sale.fechaEntrega || "")}">
      <input type="hidden" name="origen" value="${U.escapeHtml(sale.origen || "Orgánico")}">
      <input type="hidden" name="observaciones" value="${U.escapeHtml(sale.observaciones || "")}">
      <input type="hidden" name="problemasDetalle" value="${U.escapeHtml(JSON.stringify(U.saleProblems(sale)))}">
      <input type="hidden" name="costoProblema" value="${U.number(sale.costoProblema)}">
      <input type="hidden" name="tipoProblema" value="${U.escapeHtml(sale.tipoProblema || "NO")}">
      <input type="hidden" name="descripcionProblema" value="${U.escapeHtml(sale.descripcionProblema || "")}">
      <div class="form-section">
        <h3 class="form-section-title">Datos del pedido</h3>
        <div class="form-grid">
          ${fieldInput("Fecha", "fecha", "date", sale.fecha, true)}
          ${fieldInput("Fecha acordada de entrega", "fechaAcordadaEntrega", "date", sale.fechaAcordadaEntrega)}
          <label class="field required"><span>Pedido #</span><div class="input-action"><input name="codigo" value="${U.escapeHtml(sale.codigo)}" inputmode="numeric" required><button class="btn btn-secondary" type="button" data-form-action="next-code" title="Generar el siguiente número">↻</button></div></label>
          ${fieldInput("Cliente", "cliente", "text", sale.cliente, true, "Nombre y apellido")}
          ${fieldSelect("Producto", "tipoProducto", (state.lists.tiposProductos || []).map((item) => item.nombre), sale.tipoProducto, false)}
          ${colorSelectorMarkup(sale)}
          ${fieldSelect("Diseño", "disenoProducto", state.lists.disenos || [], sale.disenoProducto, false)}
          ${fieldInput("Cantidad", "cantidad", "number", sale.cantidad, false, "", 'min="1" step="1"')}
          ${fieldInput("Venta total (S/)", "ventaTotal", "number", sale.ventaTotal, true, "", 'min="0" step="0.01"')}
          ${fieldInput("Cobrado (S/)", "adelanto", "number", sale.adelanto, true, "", 'min="0" step="0.01"')}
          ${fieldSelect("Quién cobró", "cuentaAdelanto", state.lists.cuentas, sale.cuentaAdelanto, false)}
          ${fieldSelect("Estado", "estadoPedido", state.lists.estados, sale.estadoPedido, false)}
          ${fieldSelect("Canal", "canal", state.lists.canales, sale.canal, false)}
          <label class="check-field laser-check">
            <input type="checkbox" name="grabadoLaser" ${sale.grabadoLaser ? "checked" : ""}>
            <span><strong>Grabado por un tercero</strong><small>Sin marcar significa que lo hizo TERMAL sin costo.</small></span>
          </label>
          <div data-laser-cost class="${sale.grabadoLaser ? "" : "is-hidden"}">
            ${fieldInput("Costo del grabado (S/)", "costoGrabado", "number", sale.grabadoLaser ? sale.costoGrabado : 20, false, "", 'min="0" step="0.01"')}
          </div>
        </div>
        <div class="sku-preview">
          <span>Producto</span>
          <strong data-product-sku>${U.escapeHtml(sale.sku || sale.producto || "—")}</strong>
          <small data-product-description>${U.escapeHtml(U.productDescription(sale))}</small>
        </div>
        <div class="calculation-strip">
          <div class="calculation-item"><span>Cobrado</span><strong data-calc="cobradoTotal">${U.currency(sale.cobradoTotal)}</strong></div>
          <div class="calculation-item"><span>Por cobrar</span><strong data-calc="porCobrar">${U.currency(sale.porCobrar)}</strong></div>
          <div class="calculation-item"><span>Costo total</span><strong data-calc="costoTotal">${U.currency(sale.costoTotal)}</strong></div>
          <div class="calculation-item"><span>Utilidad</span><strong data-calc="utilidad">${U.currency(sale.utilidad)}</strong></div>
        </div>
      </div>

      <details class="more-details">
        <summary>Datos opcionales <span class="metric-meta">solo si necesitas modificar algún costo</span></summary>
        <div class="details-content">
          <div class="form-section">
            <h3 class="form-section-title">Ajustes de costos</h3>
            <div class="cost-checks">
              <label class="cost-check">
                <input type="checkbox" name="costoPersonalizadoActivo" ${sale.costoPersonalizadoActivo ? "checked" : ""}>
                <span><strong>Usar costo personalizado</strong><small>Reemplaza el costo automático solo para este pedido.</small></span>
              </label>
            </div>
            <div data-custom-cost class="${sale.costoPersonalizadoActivo ? "" : "is-hidden"}">
              ${fieldInput("Costo de producción personalizado (S/)", "costoProduccionPersonalizado", "number", sale.costoProduccionPersonalizado, false, "", 'min="0" step="0.01"')}
            </div>
            <div class="cost-summary">
              <span>Producto /u<strong data-cost="base">${U.currency(sale.costoTermo)}</strong></span>
              <span>Packaging /u<strong data-cost="packaging">${U.currency(sale.costoPackaging || 3)}</strong></span>
              <span>Láser /u<strong data-cost="laser">${U.currency(sale.costoGrabado)}</strong></span>
              <span>Total producción<strong data-cost="production">${U.currency(sale.costoProduccion)}</strong></span>
            </div>
            <div class="form-grid">
              ${fieldInput("Comisión de tarjeta (S/)", "comisionTarjeta", "number", sale.comisionTarjeta, false, "", 'min="0" step="0.01"')}
              ${fieldInput("Otros costos (S/)", "otrosCostos", "number", sale.otrosCostos, false, "", 'min="0" step="0.01"')}
              <label class="check-line"><input type="checkbox" name="comisionManual" ${sale.comisionManual ? "checked" : ""}> Usar la comisión escrita manualmente</label>
            </div>
          </div>
          ${state.editingId ? `
            <input type="hidden" name="liquidadoGonzalo" value="${sale.liquidadoGonzalo || 0}">
            <input type="hidden" name="liquidadoAlberto" value="${sale.liquidadoAlberto || 0}">
            <input type="hidden" name="liquidadoDinsides" value="${sale.liquidadoDinsides || 0}">
            <input type="hidden" name="pagadoADinsides" value="${sale.pagadoADinsides || 0}">` : ""}
        </div>
      </details>
      <div id="saleFormMessages"></div>
    `;
  }

  function problemRowMarkup(problem = {}, key = `new_${Date.now()}`) {
    const knownProblems = (state.lists.problemas || [])
      .filter((value) => !["no", "otro"].includes(U.normalizeText(value)));
    const type = String(problem.tipo || "");
    const custom = Boolean(type) && !knownProblems.includes(type);
    return `
      <div class="problem-row ${custom ? "has-custom" : ""}" data-problem-row data-problem-key="${U.escapeHtml(key)}">
        <label class="field"><span>Tipo de problema</span>
          <select name="problemaTipo_${U.escapeHtml(key)}" data-problem-type>
            <option value="" ${type ? "" : "selected"}>Seleccionar…</option>
            ${knownProblems.map((value) => `<option value="${U.escapeHtml(value)}" ${value === type ? "selected" : ""}>${U.escapeHtml(value)}</option>`).join("")}
            <option value="__custom__" ${custom ? "selected" : ""}>Nuevo problema…</option>
          </select>
        </label>
        <label class="field ${custom ? "" : "is-hidden"}" data-custom-problem><span>Nombre del problema</span>
          <input name="problemaNuevo_${U.escapeHtml(key)}" value="${custom ? U.escapeHtml(type) : ""}" placeholder="Ej. Error de producción">
        </label>
        ${fieldInput("Costo (S/)", `problemaCosto_${key}`, "number", problem.costo || 0, false, "", 'min="0" step="0.01"')}
        <label class="field problem-note"><span>Nota</span>
          <input name="problemaNota_${U.escapeHtml(key)}" value="${U.escapeHtml(problem.nota || "")}" placeholder="Qué ocurrió">
        </label>
        <button class="row-action danger problem-remove" type="button" data-problem-action="remove" data-problem-key="${U.escapeHtml(key)}" title="Quitar problema">×</button>
      </div>`;
  }

  function colorSelectorMarkup(sale) {
    const colors = availableColors(sale.tipoProducto);
    const current = sale.colorProducto || colors[0] || "";
    const custom = current && !colors.includes(current);
    return `
      <label class="field required"><span>Color</span>
        <select name="colorSelector" required>
          ${colors.map((color) => `<option value="${U.escapeHtml(color)}" ${color === current ? "selected" : ""}>${U.escapeHtml(color)}</option>`).join("")}
          <option value="__custom__" ${custom ? "selected" : ""}>Otro color…</option>
        </select>
      </label>
      <label class="field ${custom ? "" : "is-hidden"}" data-custom-color><span>Nuevo color</span>
        <input name="colorPersonalizado" value="${custom ? U.escapeHtml(current) : ""}" placeholder="Ej. Rojo">
        <small>Al guardar, quedará disponible para futuros pedidos.</small>
      </label>`;
  }

  function availableColors(type) {
    const product = (state.lists.tiposProductos || []).find((item) => item.nombre === type);
    return product?.colores || state.lists.coloresPorProducto?.[type] || [];
  }

  function prepareProductModel(model) {
    const prepared = { ...model };
    if (!prepared.tipoProducto) {
      const legacy = U.normalizeText(prepared.producto);
      prepared.tipoProducto = legacy.includes("890") ? "Termo 890 ml" : legacy.includes("shaker") ? "Shaker" : "Termo 1200 ml";
    }
    const colors = availableColors(prepared.tipoProducto);
    prepared.colorProducto = prepared.colorProducto || colors[0] || "Negro";
    prepared.disenoProducto = prepared.disenoProducto || "Personalizado";
    prepared.sku = U.buildSku(prepared.tipoProducto, prepared.colorProducto, prepared.disenoProducto);
    prepared.producto = prepared.sku || prepared.producto;
    return prepared;
  }

  async function submitSale(event) {
    event.preventDefault();
    const sale = formToObject(els.saleForm);
    const validation = U.validateSale(sale, state.sales, state.editingId);
    const messageBox = document.getElementById("saleFormMessages");
    if (validation.errors.length) {
      messageBox.innerHTML = `<div class="form-warning">${validation.errors.map(U.escapeHtml).join("<br>")}</div>`;
      focusFirstInvalid(sale);
      return;
    }
    if (validation.warnings.length && !sale._warningsConfirmed) {
      const overpaid = validation.calculated.cobradoTotal > validation.calculated.ventaTotal;
      if (overpaid) {
        const confirmed = await confirmDialog(
          "Monto cobrado mayor que la venta",
          `Se registró ${U.currency(validation.calculated.cobradoTotal)} cobrado para una venta de ${U.currency(validation.calculated.ventaTotal)}. ¿Deseas guardar de todos modos?`,
          "Guardar de todos modos",
          false
        );
        if (!confirmed) return;
      }
      messageBox.innerHTML = `<div class="form-warning">${validation.warnings.map(U.escapeHtml).join("<br>")}</div>`;
    }
    const isEdit = Boolean(state.editingId);
    setButtonLoading(els.saveSaleButton, true, isEdit ? "Guardando cambios…" : "Guardando venta…");
    try {
      const saved = await API.request(isEdit ? "updateSale" : "createSale", { sale: validation.calculated });
      upsertSale(saved);
      rememberProductColor(saved);
      savePreferences(saved);
      closeDialog("saleDialog");
      toast("success", isEdit ? "Pedido actualizado" : "Pedido registrado", `${saved.codigo} · ${saved.cliente}`);
      render();
      setSyncStatus("online", `Actualizado ${formatTime(new Date())}`);
    } catch (error) {
      messageBox.innerHTML = `<div class="form-warning">${U.escapeHtml(error.message)}</div>`;
      toast("error", isEdit ? "No se pudo editar" : "No se pudo guardar", error.message);
    } finally {
      setButtonLoading(els.saveSaleButton, false, "Guardar venta");
    }
  }

  function handleSaleFormInput(event) {
    if (event.target.matches("input, select, textarea")) updateSaleCalculations();
  }

  function handleSaleFormChange(event) {
    const target = event.target;
    if (target.name === "tipoProducto") refreshColorSelector(target.value);
    if (["tipoProducto", "colorSelector", "colorPersonalizado", "disenoProducto"].includes(target.name)) {
      syncProductSelection();
    }
    if (target.name === "grabadoLaser") {
      els.saleForm.querySelector("[data-laser-cost]")?.classList.toggle("is-hidden", !target.checked);
      const laserCost = els.saleForm.querySelector('[name="costoGrabado"]');
      if (target.checked && laserCost && laserCost.value === "") laserCost.value = "20";
    }
    if (target.name === "costoPersonalizadoActivo") {
      els.saleForm.querySelector("[data-custom-cost]")?.classList.toggle("is-hidden", !target.checked);
    }
    if (target.name === "estadoPedido" && target.value === "Entregado") {
      const delivered = els.saleForm.querySelector('[name="fechaEntrega"]');
      if (delivered && !delivered.value) delivered.value = U.today();
    }
    if (target.matches("[name]")) updateSaleCalculations();
  }

  function updateSaleCalculations() {
    syncProductSelection();
    const sale = formToObject(els.saleForm);
    const calculated = U.calculateSale(sale);
    ["cobradoTotal", "porCobrar", "costoTotal", "utilidad"].forEach((key) => {
      const element = els.saleForm.querySelector(`[data-calc="${key}"]`);
      if (element) {
        element.textContent = U.currency(calculated[key]);
        if (key === "utilidad") element.style.color = calculated[key] >= 0 ? "var(--success)" : "var(--danger)";
      }
    });
    const commission = els.saleForm.querySelector('[name="comisionTarjeta"]');
    const manual = els.saleForm.querySelector('[name="comisionManual"]');
    if (commission && manual && !manual.checked && document.activeElement !== commission) {
      commission.value = calculated.comisionTarjeta.toFixed(2);
    }
    setFormValue("costoTermo", calculated.costoTermo);
    setFormValue("costoPackaging", calculated.costoPackaging);
    setFormValue("costoProduccion", calculated.costoProduccion);
    ["base", "packaging", "laser", "production"].forEach((key) => {
      const values = {
        base: calculated.costoTermo,
        packaging: calculated.costoPackaging,
        laser: calculated.costoGrabado,
        production: calculated.costoProduccion
      };
      const element = els.saleForm.querySelector(`[data-cost="${key}"]`);
      if (element) element.textContent = U.currency(values[key]);
    });
    els.saleForm.querySelector("[data-custom-cost]")?.classList.toggle("is-hidden", !calculated.costoPersonalizadoActivo);
  }

  function refreshColorSelector(type) {
    const select = els.saleForm.querySelector('[name="colorSelector"]');
    const customField = els.saleForm.querySelector("[data-custom-color]");
    const customInput = els.saleForm.querySelector('[name="colorPersonalizado"]');
    if (!select) return;
    const colors = availableColors(type);
    select.innerHTML = `${colors.map((color) => `<option value="${U.escapeHtml(color)}">${U.escapeHtml(color)}</option>`).join("")}<option value="__custom__">Otro color…</option>`;
    select.value = colors[0] || "__custom__";
    if (customInput) customInput.value = "";
    customField?.classList.toggle("is-hidden", select.value !== "__custom__");
  }

  function syncProductSelection() {
    if (!els.saleForm) return;
    const type = els.saleForm.querySelector('[name="tipoProducto"]')?.value || "";
    const design = els.saleForm.querySelector('[name="disenoProducto"]')?.value || "";
    const selector = els.saleForm.querySelector('[name="colorSelector"]');
    const customField = els.saleForm.querySelector("[data-custom-color]");
    const customInput = els.saleForm.querySelector('[name="colorPersonalizado"]');
    const custom = selector?.value === "__custom__";
    customField?.classList.toggle("is-hidden", !custom);
    if (customInput) customInput.required = custom;
    const color = custom ? (customInput?.value.trim() || "") : (selector?.value || "");
    const sku = U.buildSku(type, color, design);
    setFormValue("colorProducto", color);
    setFormValue("sku", sku);
    setFormValue("producto", sku);
    const skuLabel = els.saleForm.querySelector("[data-product-sku]");
    const description = els.saleForm.querySelector("[data-product-description]");
    if (skuLabel) skuLabel.textContent = sku || "—";
    if (description) description.textContent = U.productDescription({
      tipoProducto: type,
      colorProducto: color,
      disenoProducto: design
    });
  }

  function openPayment(sale) {
    const calculated = U.calculateSale(sale);
    if (calculated.porCobrar <= 0) {
      toast("success", "Pedido pagado", `${calculated.codigo} ya no tiene saldo pendiente.`);
      return;
    }
    state.paymentSaleId = calculated.id;
    els.paymentBody.innerHTML = `
      <p class="payment-customer"><strong>${U.escapeHtml(calculated.codigo)} · ${U.escapeHtml(calculated.cliente)}</strong><span>${U.escapeHtml(calculated.producto)}</span></p>
      <div class="payment-summary">
        <span>Venta<strong>${U.currency(calculated.ventaTotal)}</strong></span>
        <span>Cobrado<strong>${U.currency(calculated.cobradoTotal)}</strong></span>
        <span>Pendiente<strong>${U.currency(calculated.porCobrar)}</strong></span>
      </div>
      <div class="form-grid payment-form-grid">
        ${fieldInput("Monto del nuevo pago (S/)", "amount", "number", "", true, "", `min="0.01" max="${calculated.porCobrar.toFixed(2)}" step="0.01"`)}
        ${fieldSelect("Pago recibido por", "cuentaSaldo", state.lists.cuentas, calculated.cuentaSaldo || "DINSIDES", false)}
      </div>
      <div class="payment-result">
        Después del pago: <strong data-payment-collected>${U.currency(calculated.cobradoTotal)}</strong> cobrado ·
        <strong data-payment-pending>${U.currency(calculated.porCobrar)}</strong> por cobrar
      </div>
      <p class="form-error" id="paymentError"></p>`;
    els.paymentDialog.showModal();
    setTimeout(() => els.paymentForm.querySelector('[name="amount"]')?.focus(), 50);
  }

  function updatePaymentPreview() {
    const sale = state.sales.find((item) => item.id === state.paymentSaleId);
    if (!sale || !els.paymentDialog.open) return;
    const amount = U.number(els.paymentForm.querySelector('[name="amount"]')?.value);
    const saleTotal = U.number(sale.ventaTotal);
    const collected = Math.min(saleTotal, U.money(U.number(sale.cobradoTotal) + amount));
    const pending = U.money(Math.max(0, saleTotal - collected));
    const collectedLabel = els.paymentForm.querySelector("[data-payment-collected]");
    const pendingLabel = els.paymentForm.querySelector("[data-payment-pending]");
    if (collectedLabel) collectedLabel.textContent = U.currency(collected);
    if (pendingLabel) pendingLabel.textContent = U.currency(pending);
  }

  async function submitPayment(event) {
    event.preventDefault();
    const sale = state.sales.find((item) => item.id === state.paymentSaleId);
    const errorBox = document.getElementById("paymentError");
    if (!sale) {
      errorBox.textContent = "No encontramos el pedido. Sincroniza e inténtalo otra vez.";
      return;
    }
    const payment = formToObject(els.paymentForm);
    if (payment.amount <= 0) {
      errorBox.textContent = "Ingresa un pago mayor que cero.";
      return;
    }
    if (payment.amount > sale.porCobrar + 0.001) {
      errorBox.textContent = `El pago no puede superar los ${U.currency(sale.porCobrar)} pendientes.`;
      return;
    }
    const payments = U.salePayments(sale);
    if (!payments.length && U.number(sale.saldoCobrado) > 0) {
      payments.push({
        id: "pago_legacy",
        monto: U.number(sale.saldoCobrado),
        cuenta: sale.cuentaSaldo || "DINSIDES",
        fecha: sale.fecha || U.today()
      });
    }
    payments.push({
      id: U.uid("pago"),
      monto: payment.amount,
      cuenta: payment.cuentaSaldo || "DINSIDES",
      fecha: U.today()
    });
    const updated = {
      ...sale,
      saldoCobrado: U.money(U.number(sale.saldoCobrado) + payment.amount),
      cuentaSaldo: payment.cuentaSaldo || sale.cuentaSaldo || "DINSIDES",
      pagosDetalle: payments
    };
    const button = els.paymentForm.querySelector('[type="submit"]');
    setButtonLoading(button, true, "Agregando…");
    try {
      const saved = await API.request("updateSale", { sale: updated });
      upsertSale(saved);
      state.paymentSaleId = "";
      closeDialog("paymentDialog");
      toast(
        "success",
        "Pago agregado",
        `${saved.codigo}: ${U.currency(saved.cobradoTotal)} cobrado y ${U.currency(saved.porCobrar)} por cobrar.`
      );
      render();
    } catch (error) {
      errorBox.textContent = error.message;
    } finally {
      setButtonLoading(button, false, "Agregar pago");
    }
  }

  function openShipping(sale) {
    const calculated = U.calculateSale(sale);
    state.shippingSaleId = calculated.id;
    const pickup = U.number(calculated.costoRecojo) > 0;
    els.shippingTitle.textContent = hasShipping(calculated) ? "Editar envío" : "Agregar envío";
    els.shippingBody.innerHTML = `
      <p class="payment-customer"><strong>${U.escapeHtml(calculated.codigo)} · ${U.escapeHtml(calculated.cliente)}</strong><span>${U.escapeHtml(calculated.producto)}</span></p>
      <div class="payment-summary">
        <span>Envío actual<strong>${U.currency(calculated.costoEnvio)}</strong></span>
        <span>Agencia<strong>${U.escapeHtml(calculated.agencia || "—")}</strong></span>
        <span>Utilidad actual<strong>${U.currency(calculated.utilidad)}</strong></span>
      </div>
      <div class="form-grid payment-form-grid">
        ${fieldSelect("Agencia", "agencia", state.lists.agencias, calculated.agencia || "DINSIDES", false)}
        ${fieldInput("Costo del envío (S/)", "costoEnvio", "number", calculated.costoEnvio || "", true, "", 'min="0" step="0.01"')}
        ${fieldSelect("Quién pagó el envío", "pagadorLogistica", state.lists.pagadoresLogistica, calculated.pagadorLogistica || "Gonzalo", false)}
        <label class="check-field pickup-check">
          <input type="checkbox" name="tieneRecojo" ${pickup ? "checked" : ""}>
          <span><strong>¿Hubo costo de recojo?</strong><small>Actívalo solo si este pedido tuvo un recojo adicional.</small></span>
        </label>
        <div data-pickup-cost class="${pickup ? "" : "is-hidden"}">
          ${fieldInput("Costo del recojo (S/)", "costoRecojo", "number", calculated.costoRecojo || "", false, "", 'min="0" step="0.01"')}
        </div>
      </div>
      <div class="shipping-extra">
        <div class="shipping-extra-title">
          <strong>Datos para el envío</strong>
          <span>Opcionales</span>
        </div>
        <div class="form-grid payment-form-grid">
          ${fieldInput("Nombre del destinatario", "destinatarioEnvio", "text", calculated.destinatarioEnvio || calculated.cliente || "", false, "Nombre completo")}
          ${fieldInput("Número de teléfono", "telefonoEnvio", "tel", calculated.telefonoEnvio || calculated.telefono || "", false, "Ej. 999 999 999")}
          ${fieldInput("DNI", "dniEnvio", "text", calculated.dniEnvio || "", false, "Documento del destinatario", 'inputmode="numeric" maxlength="12"')}
          ${fieldInput("Dirección o sede de agencia", "direccionEnvio", "text", calculated.direccionEnvio || "", false, "Ej. Agencia Shalom de Surco")}
          ${fieldInput("Enlace de Google Maps", "enlaceMaps", "url", calculated.enlaceMaps || "", false, "https://maps.google.com/...")}
        </div>
      </div>
      <p class="form-error" id="shippingError"></p>`;
    els.shippingDialog.showModal();
    setTimeout(() => els.shippingForm.querySelector('[name="costoEnvio"]')?.focus(), 50);
  }

  function handleShippingFormChange(event) {
    if (event.target.name === "tieneRecojo") {
      els.shippingForm.querySelector("[data-pickup-cost]")?.classList.toggle("is-hidden", !event.target.checked);
      const pickup = els.shippingForm.querySelector('[name="costoRecojo"]');
      if (!event.target.checked && pickup) pickup.value = "";
    }
  }

  async function submitShipping(event) {
    event.preventDefault();
    const sale = state.sales.find((item) => item.id === state.shippingSaleId);
    const errorBox = document.getElementById("shippingError");
    if (!sale) {
      errorBox.textContent = "No encontramos el pedido. Sincroniza e inténtalo otra vez.";
      return;
    }
    const shipping = formToObject(els.shippingForm);
    if (shipping.costoEnvio < 0) {
      errorBox.textContent = "El costo del envío no puede ser negativo.";
      return;
    }
    const updated = {
      ...sale,
      agencia: shipping.agencia || sale.agencia || "DINSIDES",
      costoEnvio: shipping.costoEnvio,
      costoRecojo: shipping.tieneRecojo ? shipping.costoRecojo : 0,
      destinatarioEnvio: shipping.destinatarioEnvio || "",
      telefonoEnvio: shipping.telefonoEnvio || "",
      dniEnvio: shipping.dniEnvio || "",
      direccionEnvio: shipping.direccionEnvio || "",
      enlaceMaps: shipping.enlaceMaps || "",
      pagadorLogistica: shipping.pagadorLogistica || sale.pagadorLogistica || "Gonzalo"
    };
    const button = els.shippingForm.querySelector('[type="submit"]');
    setButtonLoading(button, true, "Guardando…");
    try {
      const saved = await API.request("updateSale", { sale: updated });
      upsertSale(saved);
      state.shippingSaleId = "";
      closeDialog("shippingDialog");
      toast(
        "success",
        "Envío actualizado",
        `${saved.codigo}: ${U.currency(saved.costoEnvio)} pagado por ${saved.pagadorLogistica || "Gonzalo"}.`
      );
      render();
    } catch (error) {
      errorBox.textContent = error.message;
    } finally {
      setButtonLoading(button, false, "Guardar envío");
    }
  }

  function openOrderActions(sale) {
    state.actionSaleId = sale.id;
    const problems = U.saleProblems(sale);
    const previous = previousStage(sale);
    els.orderActionsTitle.textContent = `${sale.codigo} · ${sale.cliente}`;
    els.orderActionsBody.innerHTML = `
      <div class="order-action-list">
        <button class="order-action-choice" data-order-action="shipping">
          <span class="order-action-icon">⇢</span>
          <span><strong>${hasShipping(sale) ? "Editar envío" : "Agregar envío"}</strong><small>Agencia, costos y quién lo pagó</small></span>
        </button>
        <button class="order-action-choice" data-order-action="payment" ${sale.porCobrar <= 0 ? "disabled" : ""}>
          <span class="order-action-icon">S/</span>
          <span><strong>${sale.porCobrar > 0 ? "Agregar pago" : "Pedido pagado"}</strong><small>${sale.porCobrar > 0 ? `${U.currency(sale.porCobrar)} por cobrar` : "No queda saldo pendiente"}</small></span>
        </button>
        <button class="order-action-choice" data-order-action="problem">
          <span class="order-action-icon">!</span>
          <span><strong>${problems.length ? "Editar problema" : "Señalar problema"}</strong><small>${problems.length ? `${problems.length} incidencia${problems.length === 1 ? "" : "s"} registrada${problems.length === 1 ? "" : "s"}` : "Registrar una incidencia y su costo"}</small></span>
        </button>
        ${previous ? `<button class="order-action-choice" data-order-action="previous">
          <span class="order-action-icon">↶</span>
          <span><strong>Regresar a ${previous}</strong><small>Corregir la etapa actual del pedido</small></span>
        </button>` : ""}
        <button class="order-action-choice danger" data-order-action="delete">
          <span class="order-action-icon">×</span>
          <span><strong>Eliminar pedido</strong><small>Se moverá a la papelera y dejará de contar en los totales</small></span>
        </button>
      </div>`;
    els.orderActionsDialog.showModal();
  }

  function handleOrderActionClick(event) {
    const button = event.target.closest("[data-order-action]");
    if (!button || button.disabled) return;
    const sale = state.sales.find((item) => item.id === state.actionSaleId);
    if (!sale) return;
    const action = button.dataset.orderAction;
    closeDialog("orderActionsDialog");
    if (action === "shipping") openShipping(sale);
    if (action === "payment") openPayment(sale);
    if (action === "problem") openProblemForm(sale);
    if (action === "previous") quickStatus(sale.id, previousStage(sale));
    if (action === "delete") archiveSale(sale);
  }

  function openProblemForm(sale) {
    const problems = U.saleProblems(sale);
    state.problemSaleId = sale.id;
    els.problemTitle.textContent = problems.length ? "Editar problemas" : "Señalar problema";
    els.problemBody.innerHTML = `
      <p class="payment-customer"><strong>${U.escapeHtml(sale.codigo)} · ${U.escapeHtml(sale.cliente)}</strong><span>${U.escapeHtml(sale.producto)}</span></p>
      <div class="problem-list" data-problem-list>
        ${(problems.length ? problems : [{}]).map((problem, index) => problemRowMarkup(problem, `problem_${index + 1}_${Date.now()}`)).join("")}
      </div>
      <div class="problem-dialog-footer">
        <button class="btn btn-secondary btn-sm" type="button" data-problem-action="add">＋ Agregar otro problema</button>
        <span>Costo total: <strong data-problem-dialog-total>${U.currency(sale.costoProblema)}</strong></span>
      </div>
      <p class="form-error" id="problemError"></p>`;
    els.problemDialog.showModal();
    updateProblemDialogTotal();
    setTimeout(() => els.problemForm.querySelector("[data-problem-type]")?.focus(), 40);
  }

  function handleProblemDialogClick(event) {
    const button = event.target.closest("[data-problem-action]");
    if (!button) return;
    if (button.dataset.problemAction === "add") {
      const list = els.problemForm.querySelector("[data-problem-list]");
      const key = `problem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      list?.insertAdjacentHTML("beforeend", problemRowMarkup({}, key));
      list?.querySelector(`[data-problem-key="${key}"] select`)?.focus();
    }
    if (button.dataset.problemAction === "remove") {
      button.closest("[data-problem-row]")?.remove();
    }
    updateProblemDialogTotal();
  }

  function handleProblemDialogChange(event) {
    if (!event.target.matches("[data-problem-type]")) return;
    const row = event.target.closest("[data-problem-row]");
    row?.querySelector("[data-custom-problem]")?.classList.toggle("is-hidden", event.target.value !== "__custom__");
    row?.classList.toggle("has-custom", event.target.value === "__custom__");
  }

  function problemsFromForm(form) {
    return [...form.querySelectorAll("[data-problem-row]")].map((row, index) => {
      const selected = row.querySelector("[data-problem-type]")?.value || "";
      const custom = row.querySelector('[name^="problemaNuevo_"]')?.value.trim() || "";
      return {
        id: row.dataset.problemKey || `problema_${index + 1}`,
        tipo: selected === "__custom__" ? custom : selected,
        costo: U.number(row.querySelector('[name^="problemaCosto_"]')?.value),
        nota: row.querySelector('[name^="problemaNota_"]')?.value.trim() || ""
      };
    }).filter((problem) => problem.tipo || problem.nota || problem.costo > 0);
  }

  function updateProblemDialogTotal() {
    const label = els.problemForm.querySelector("[data-problem-dialog-total]");
    if (!label) return;
    const total = problemsFromForm(els.problemForm).reduce((sum, problem) => sum + problem.costo, 0);
    label.textContent = U.currency(total);
  }

  async function submitProblems(event) {
    event.preventDefault();
    const sale = state.sales.find((item) => item.id === state.problemSaleId);
    const errorBox = document.getElementById("problemError");
    if (!sale) {
      errorBox.textContent = "No encontramos el pedido. Sincroniza e inténtalo otra vez.";
      return;
    }
    const problems = problemsFromForm(els.problemForm);
    if (!problems.length && !U.saleProblems(sale).length) {
      errorBox.textContent = "Completa al menos un problema.";
      return;
    }
    const updated = {
      ...sale,
      problemasDetalle: problems,
      tipoProblema: problems.length ? problems.map((problem) => problem.tipo || "Otro problema").join(" · ") : "NO",
      descripcionProblema: problems.map((problem) => problem.nota || problem.tipo).filter(Boolean).join(" | "),
      costoProblema: U.money(problems.reduce((sum, problem) => sum + problem.costo, 0))
    };
    const button = els.problemForm.querySelector('[type="submit"]');
    setButtonLoading(button, true, "Guardando…");
    try {
      const saved = await API.request("updateSale", { sale: updated });
      upsertSale(saved);
      rememberProductColor(saved);
      closeDialog("problemDialog");
      toast("success", problems.length ? "Problema actualizado" : "Problema eliminado", `${saved.codigo} · ${saved.cliente}`);
      render();
    } catch (error) {
      errorBox.textContent = error.message;
    } finally {
      setButtonLoading(button, false, "Guardar problemas");
    }
  }

  async function openDetail(id) {
    const sale = state.sales.find((item) => item.id === id);
    if (!sale) return;
    els.detailTitle.textContent = `${sale.codigo} · ${sale.cliente}`;
    const problems = U.saleProblems(sale);
    const payments = salePaymentTimeline(sale);
    const mapUrl = safeHttpUrl(sale.enlaceMaps);
    const shippingRecipient = sale.destinatarioEnvio || sale.cliente || "—";
    const shippingPhone = sale.telefonoEnvio || sale.telefono || "—";
    els.detailBody.innerHTML = `
      <div class="detail-simple-stack">
        ${detailBlock("Pedido", [
          ["Fecha de venta", U.formatDate(sale.fecha)], ["Fecha acordada", U.formatDate(sale.fechaAcordadaEntrega)],
          ["Estado", sale.estadoPedido],
          ["Cliente", sale.cliente], ["Código de producto", sale.producto || sale.sku || "—"],
          ["Agencia", sale.agencia || "—"]
        ])}
        <section class="detail-block detail-notes-visible">
          <h3>Notas</h3>
          <p>${U.escapeHtml(sale.observaciones || "Sin notas.")}</p>
        </section>
        <details class="detail-disclosure">
          <summary><span>Envío</span><small>${hasShipping(sale) ? sale.agencia || "Registrado" : "Sin registrar"}</small></summary>
          <div class="detail-disclosure-body">
            <dl class="detail-list">
              <div><dt>Agencia</dt><dd>${U.escapeHtml(sale.agencia || "—")}</dd></div>
              <div><dt>Destinatario</dt><dd>${U.escapeHtml(shippingRecipient)}</dd></div>
              <div><dt>Teléfono</dt><dd>${U.escapeHtml(shippingPhone)}</dd></div>
              <div><dt>DNI</dt><dd>${U.escapeHtml(sale.dniEnvio || "—")}</dd></div>
              <div class="detail-wide-row"><dt>Dirección o sede</dt><dd>${U.escapeHtml(sale.direccionEnvio || "—")}</dd></div>
              <div><dt>Enlace</dt><dd>${mapUrl ? `<a href="${U.escapeHtml(mapUrl)}" target="_blank" rel="noopener">Abrir enlace ↗</a>` : "—"}</dd></div>
              <div><dt>Costo de envío / recojo</dt><dd>${U.currency(sale.costoEnvio)} / ${U.currency(sale.costoRecojo)}</dd></div>
              <div><dt>Pagado por</dt><dd>${U.escapeHtml(sale.pagadorLogistica || "—")}</dd></div>
            </dl>
          </div>
        </details>
        <details class="detail-disclosure">
          <summary><span>Pagos</span><small>${payments.length} registrado${payments.length === 1 ? "" : "s"}</small></summary>
          <div class="detail-disclosure-body">
            <div class="payment-detail-table" role="table" aria-label="Pagos del pedido">
              <div class="payment-detail-head" role="row">
                <span>Pago</span><span>Monto</span><span>Recibido por</span>
              </div>
              ${payments.length ? payments.map((payment) => `
                <div class="payment-detail-row" role="row">
                  <span><strong>${U.escapeHtml(payment.label)}</strong><small>${U.formatDate(payment.fecha)}</small></span>
                  <strong>${U.currency(payment.monto)}</strong>
                  <span>${U.escapeHtml(payment.cuenta || "—")}</span>
                </div>`).join("") : `<div class="payment-detail-empty">Todavía no se registraron pagos.</div>`}
            </div>
          </div>
        </details>
        <details class="detail-disclosure">
          <summary><span>Costos y utilidad</span><small>${U.currency(sale.costoTotal)} de costo total</small></summary>
          <div class="detail-disclosure-body">
            <dl class="detail-list">
              <div><dt>Producción</dt><dd>${U.currency(sale.costoProduccion)}</dd></div>
              <div><dt>Producto base</dt><dd>${U.currency(sale.costoTermo)}</dd></div>
              <div><dt>Packaging</dt><dd>${U.currency(sale.costoPackaging)}</dd></div>
              <div><dt>Grabado por</dt><dd>${sale.grabadoLaser ? "Tercero" : "TERMAL"}</dd></div>
              <div><dt>Costo del láser</dt><dd>${U.currency(sale.costoGrabado)}</dd></div>
              <div><dt>Envío + recojo</dt><dd>${U.currency(sale.costoEnvio + sale.costoRecojo)}</dd></div>
              <div><dt>Comisión</dt><dd>${U.currency(sale.comisionTarjeta)}</dd></div>
              <div><dt>Otros costos</dt><dd>${U.currency(sale.otrosCostos)}</dd></div>
              <div><dt>Costo total</dt><dd>${U.currency(sale.costoTotal)}</dd></div>
              <div><dt>Utilidad</dt><dd>${U.currency(sale.utilidad)}</dd></div>
            </dl>
          </div>
        </details>
        <details class="detail-disclosure">
          <summary><span>Problemas</span><small>${problems.length ? `${problems.length} problema${problems.length === 1 ? "" : "s"}` : "Sin problemas"}</small></summary>
          <div class="detail-disclosure-body">
            ${problems.length ? `<div class="history-list">${problems.map((problem) => `
              <div class="history-item">
                <span><strong>${U.escapeHtml(problem.tipo || "Problema")}</strong><small>${U.escapeHtml(problem.nota || "Sin nota")}</small></span>
                <strong class="${problem.costo > 0 ? "money-danger" : ""}">${U.currency(problem.costo)}</strong>
              </div>`).join("")}</div>` : `<p class="metric-meta">Este pedido no tiene problemas registrados.</p>`}
          </div>
        </details>
      </div>`;
    els.detailFooter.innerHTML = `
      ${sale.porCobrar > 0 ? `<button class="btn btn-secondary" data-detail-payment="${sale.id}">＋ Agregar pago</button>` : ""}
      <button class="btn btn-secondary" data-detail-shipping="${sale.id}">${hasShipping(sale) ? "Editar envío" : "＋ Agregar envío"}</button>
      <button class="btn btn-primary" data-detail-edit="${sale.id}">Editar pedido</button>`;
    els.detailFooter.querySelector("[data-detail-payment]")?.addEventListener("click", () => {
      closeDialog("detailDialog"); openPayment(sale);
    });
    els.detailFooter.querySelector("[data-detail-shipping]")?.addEventListener("click", () => {
      closeDialog("detailDialog"); openShipping(sale);
    });
    els.detailFooter.querySelector("[data-detail-edit]").addEventListener("click", () => {
      closeDialog("detailDialog"); openSaleForm(sale);
    });
    els.detailDialog.showModal();
  }

  function salePaymentTimeline(sale) {
    const timeline = [];
    if (U.number(sale.adelanto) > 0) {
      timeline.push({
        label: "Adelanto",
        monto: U.number(sale.adelanto),
        cuenta: sale.cuentaAdelanto || "—",
        fecha: sale.fecha || U.today()
      });
    }
    let additional = U.salePayments(sale);
    if (!additional.length && U.number(sale.saldoCobrado) > 0) {
      additional = [{
        id: "pago_legacy",
        monto: U.number(sale.saldoCobrado),
        cuenta: sale.cuentaSaldo || "—",
        fecha: sale.fecha || U.today()
      }];
    }
    const sequenceStart = timeline.length ? 2 : 1;
    additional.forEach((payment, index) => {
      const sequence = index + sequenceStart;
      timeline.push({ ...payment, label: paymentSequenceLabel(sequence) });
    });
    return timeline;
  }

  function paymentSequenceLabel(sequence) {
    const labels = {
      1: "Primer pago", 2: "Segundo pago", 3: "Tercer pago", 4: "Cuarto pago",
      5: "Quinto pago", 6: "Sexto pago", 7: "Séptimo pago", 8: "Octavo pago",
      9: "Noveno pago", 10: "Décimo pago"
    };
    return labels[sequence] || `Pago ${sequence}`;
  }

  function safeHttpUrl(value) {
    const url = String(value || "").trim();
    return /^https?:\/\//i.test(url) ? url : "";
  }

  function openLiquidationDetail(type) {
    const definitions = {
      GONZALO_RETURN: ["Gonzalo debe devolver", "gonzaloDebeDevolver", "Gonzalo"],
      ALBERTO_RETURN: ["Alberto debe devolver", "albertoDebeDevolver", "Alberto"],
      DINSIDES_DEPOSIT: ["DINSIDES debe depositar", "dinsidesDebeDepositar", "DINSIDES"],
      TERMAL_PAY_DINSIDES: ["Termal debe pagar a DINSIDES", "termalDebePagarDinsides", "DINSIDES"]
    };
    const [label, key, person] = definitions[type];
    const sales = state.sales.filter((sale) => sale.active !== false && Math.abs(U.number(sale[key])) >= 0.01)
      .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
    const total = U.money(sales.reduce((sum, sale) => sum + U.number(sale[key]), 0));
    const negativePersonBalance = total < 0 && (type === "GONZALO_RETURN" || type === "ALBERTO_RETURN");
    els.detailTitle.textContent = label;
    els.detailBody.innerHTML = `
      <div class="metric-card warning"><div class="metric-label">Saldo neto</div><div class="metric-value">${U.currency(total)}</div><div class="metric-meta">${negativePersonBalance ? `El saldo negativo significa que Termal le debe a ${person}` : `${sales.length} pedido${sales.length === 1 ? "" : "s"}`}</div></div>
      <div class="history-list" style="margin-top:14px">
        ${sales.length ? sales.map((sale) => `<button class="liquidation-item" data-liq-sale="${sale.id}">
          <span class="avatar">${U.escapeHtml(sale.codigo.slice(-2))}</span>
          <span><strong>${U.escapeHtml(sale.codigo)} · ${U.escapeHtml(sale.cliente)}</strong><small>${U.formatDate(sale.fecha)} · ${U.escapeHtml(sale.producto)}</small></span>
          <span class="amount ${U.number(sale[key]) < 0 ? "negative-balance" : ""}">${U.currency(sale[key])}</span>
        </button>`).join("") : `<p class="empty-state">No hay liquidaciones pendientes.</p>`}
      </div>`;
    els.detailFooter.innerHTML = `
      <button class="btn btn-secondary" data-close-detail>Cerrar</button>
      ${total > 0 ? `<button class="btn btn-primary" data-register-type="${type}">${type.includes("RETURN") ? "Registrar devolución" : "Registrar como realizado"}</button>` : ""}`;
    els.detailFooter.querySelector("[data-close-detail]").addEventListener("click", () => closeDialog("detailDialog"));
    els.detailBody.querySelectorAll("[data-liq-sale]").forEach((button) => button.addEventListener("click", () => {
      closeDialog("detailDialog"); openDetail(button.dataset.liqSale);
    }));
    els.detailFooter.querySelector("[data-register-type]")?.addEventListener("click", (event) => {
      closeDialog("detailDialog");
      openMovement(event.currentTarget.dataset.registerType);
    });
    els.detailDialog.showModal();
  }

  function openMovement(type = "GONZALO_RETURN") {
    const definitions = {
      GONZALO_RETURN: ["Devolución de Gonzalo", "Gonzalo transfiere a la mancomunada"],
      ALBERTO_RETURN: ["Devolución de Alberto", "Alberto transfiere a la mancomunada"],
      DINSIDES_DEPOSIT: ["Depósito de DINSIDES", "DINSIDES depositó a la mancomunada"],
      TERMAL_PAY_DINSIDES: ["Pago a DINSIDES", "Termal pagó una deuda de envíos"]
    };
    const total = pendingForType(type);
    const isPersonReturn = type === "GONZALO_RETURN" || type === "ALBERTO_RETURN";
    els.movementTitle.textContent = isPersonReturn ? "Registrar devolución a mancomunada" : definitions[type][0];
    els.movementBody.innerHTML = `
      <p class="metric-meta">${definitions[type][1]}. El pago se aplicará primero a los pedidos pendientes más antiguos y admite montos parciales.</p>
      ${isPersonReturn
        ? fieldSelect("Persona", "type", [
            { nombre: "GONZALO_RETURN", etiqueta: "Gonzalo" },
            { nombre: "ALBERTO_RETURN", etiqueta: "Alberto" }
          ], type, false).replace(">GONZALO_RETURN<", ">Gonzalo<").replace(">ALBERTO_RETURN<", ">Alberto<")
        : `<input type="hidden" name="type" value="${type}">`}
      <div class="form-grid" style="margin-top:15px">
        ${fieldInput("Monto transferido (S/)", "amount", "number", total ? total.toFixed(2) : "", true, "", `min="0.01" max="${total.toFixed(2)}" step="0.01"`)}
        ${fieldInput("Fecha", "date", "date", U.today(), true)}
        <label class="field field-span-2"><span>Observación opcional</span><textarea name="note" placeholder="Ej. Transferencia Yape o número de operación"></textarea></label>
      </div>
      <div class="form-warning">Pendiente disponible: <strong data-movement-pending>${U.currency(total)}</strong>. No podrás registrar un monto mayor.</div>
      <p class="form-error" id="movementError"></p>`;
    els.movementDialog.showModal();
    setTimeout(() => els.movementForm.querySelector('[name="amount"]')?.focus(), 50);
  }

  function updateMovementPerson(type) {
    const total = pendingForType(type);
    const amount = els.movementForm.querySelector('[name="amount"]');
    if (amount) {
      amount.max = total.toFixed(2);
      amount.value = total ? total.toFixed(2) : "";
    }
    const pending = els.movementForm.querySelector("[data-movement-pending]");
    if (pending) pending.textContent = U.currency(total);
    const descriptions = {
      GONZALO_RETURN: "Gonzalo transfiere a la mancomunada",
      ALBERTO_RETURN: "Alberto transfiere a la mancomunada"
    };
    const intro = els.movementBody.querySelector(".metric-meta");
    if (intro) intro.textContent = `${descriptions[type]}. El pago se aplicará primero a los pedidos pendientes más antiguos y admite montos parciales.`;
  }

  async function submitMovement(event) {
    event.preventDefault();
    const movement = formToObject(els.movementForm);
    const errorBox = document.getElementById("movementError");
    if (U.number(movement.amount) <= 0) {
      errorBox.textContent = "Ingresa un monto mayor que cero.";
      return;
    }
    const button = els.movementForm.querySelector('[type="submit"]');
    setButtonLoading(button, true, "Registrando…");
    try {
      const result = await API.request("createMovement", { movement });
      state.sales = result.sales.map(U.calculateSale);
      state.movements.unshift(result.movement);
      closeDialog("movementDialog");
      toast("success", "Movimiento registrado", `${U.currency(movement.amount)} aplicado a las liquidaciones más antiguas.`);
      render();
    } catch (error) {
      errorBox.textContent = error.message;
    } finally {
      setButtonLoading(button, false, "Registrar movimiento");
    }
  }

  function openDispatchDialog(saleIds = []) {
    const requestedIds = Array.isArray(saleIds) ? saleIds : [];
    const ready = state.sales.filter((sale) => sale.active !== false && sale.estadoPedido === "Por despachar");
    const selected = requestedIds.length
      ? ready.filter((sale) => requestedIds.includes(sale.id))
      : [];
    if (requestedIds.length && !selected.length) {
      toast("warning", "El pedido ya no está por despachar", "Sincroniza la información e inténtalo otra vez.");
      return;
    }
    if (!requestedIds.length && !ready.length) {
      toast("success", "No hay pedidos por despachar", "Todos los pedidos están al día.");
      return;
    }
    const withoutShipping = selected.filter((sale) => !hasShipping(sale));
    els.dispatchBody.innerHTML = `
      ${requestedIds.length ? `
        <p class="metric-meta">${selected.length} pedido${selected.length === 1 ? "" : "s"}: ${selected.map((sale) => U.escapeHtml(sale.codigo)).join(", ")}</p>
        <input type="hidden" name="saleIds" value="${selected.map((sale) => sale.id).join(",")}">` : `
        <p class="metric-meta">Selecciona los pedidos que saldrán juntos.</p>
        <input type="hidden" name="saleIds" value="">
        <div class="batch-dispatch-list" role="group" aria-label="Pedidos por despachar">
          ${ready.map((sale) => `
            <label class="batch-dispatch-item">
              <input type="checkbox" data-dispatch-choice value="${sale.id}">
              <span>
                <strong>#${U.escapeHtml(sale.codigo)} · ${U.escapeHtml(sale.cliente)}</strong>
                <small>${U.escapeHtml(sale.producto || sale.sku || "Sin código")} · ${U.escapeHtml(sale.agencia || "Sin agencia")}</small>
              </span>
              <em class="${hasShipping(sale) ? "ready" : "pending"}">${hasShipping(sale) ? "Envío listo" : "Falta envío"}</em>
            </label>`).join("")}
        </div>`}
      <div class="form-grid payment-form-grid dispatch-date-field">
        ${fieldInput("Fecha de salida", "fecha", "date", U.today(), true)}
      </div>
      ${requestedIds.length
        ? withoutShipping.length
          ? `<div class="form-warning">${withoutShipping.length} pedido${withoutShipping.length === 1 ? "" : "s"} todavía no ${withoutShipping.length === 1 ? "tiene" : "tienen"} envío registrado. Puedes añadirlo desde Pedidos antes o después de marcar la salida.</div>`
          : `<div class="form-success">El pedido ya tiene sus datos de envío.</div>`
        : ""}
      <p class="form-error" id="dispatchError"></p>`;
    els.dispatchDialog.showModal();
  }

  async function submitDispatch(event) {
    event.preventDefault();
    const dispatch = formToObject(els.dispatchForm);
    const checkedIds = [...els.dispatchForm.querySelectorAll("[data-dispatch-choice]:checked")]
      .map((input) => input.value);
    dispatch.saleIds = checkedIds.length
      ? checkedIds
      : String(dispatch.saleIds).split(",").filter(Boolean);
    if (!dispatch.saleIds.length) {
      document.getElementById("dispatchError").textContent = "Selecciona por lo menos un pedido.";
      return;
    }
    const button = els.dispatchForm.querySelector('[type="submit"]');
    setButtonLoading(button, true, "Creando salida…");
    try {
      const result = await API.request("createDispatch", { dispatch });
      (result.sales || []).forEach(upsertSale);
      closeDialog("dispatchDialog");
      toast("success", "Salida creada", `${dispatch.saleIds.length} pedido${dispatch.saleIds.length === 1 ? "" : "s"} marcado${dispatch.saleIds.length === 1 ? "" : "s"} como despachado.`);
      render();
    } catch (error) {
      document.getElementById("dispatchError").textContent = error.message;
    } finally {
      setButtonLoading(button, false, "Confirmar salida");
    }
  }

  async function quickStatus(id, status) {
    const sale = state.sales.find((item) => item.id === id);
    if (!sale) return;
    const stages = ["Producción", "Por despachar", "Despachado", "Entregado"];
    const currentIndex = stages.indexOf(sale.estadoPedido);
    const targetIndex = stages.indexOf(status);
    const goingBack = currentIndex >= 0 && targetIndex >= 0 && targetIndex < currentIndex;
    const confirmed = await confirmDialog(
      goingBack ? "Regresar etapa del pedido" : "Avanzar etapa del pedido",
      `${sale.codigo} · ${sale.cliente} pasará de “${sale.estadoPedido}” a “${status}”. ¿Confirmas el cambio?`,
      goingBack ? "Sí, regresar" : "Sí, avanzar",
      false
    );
    if (!confirmed) return;
    const updated = { ...sale, estadoPedido: status };
    if (status === "Entregado" && !updated.fechaEntrega) updated.fechaEntrega = U.today();
    if (status !== "Entregado" && sale.estadoPedido === "Entregado") updated.fechaEntrega = "";
    if (status === "Por despachar" && sale.estadoPedido === "Despachado") {
      updated.fechaDespacho = "";
      updated.codigoSeguimiento = "";
    }
    if (status === "Producción") {
      updated.fechaDespacho = "";
      updated.codigoSeguimiento = "";
      updated.fechaEntrega = "";
    }
    try {
      const saved = await API.request("updateSale", { sale: updated });
      upsertSale(saved);
      toast("success", "Estado actualizado", `${saved.codigo} ahora está “${status}”.`);
      render();
    } catch (error) {
      toast("error", "No se pudo actualizar", error.message);
    }
  }

  function handleMainClick(event) {
    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      const action = actionButton.dataset.action;
      if (action === "new-sale") openSaleForm();
      if (action === "toggle-filters") { state.filtersOpen = !state.filtersOpen; renderSales(); }
      if (action === "clear-filters") {
        state.filters = { ...state.filters, search: "", start: "", end: "", estado: "", tipoProducto: "", agencia: "", canal: "", origen: "", modalidadPago: "", cuenta: "", estadoCobro: "", estadoLiquidacion: "", problema: "", fechaAcordadaEstado: "", showArchived: false };
        state.salesQuickFilter = "all";
        state.page = 1; renderSales();
      }
      if (action === "export-csv") exportCsv();
      if (action === "reset-demo") resetDemo();
      if (action === "new-return") openMovement("GONZALO_RETURN");
      if (action === "movement-history") openMovementHistory();
      if (action === "open-dispatch") openDispatchDialog();
      return;
    }
    const quickFilter = event.target.closest("[data-quick-filter]");
    if (quickFilter) {
      state.salesQuickFilter = quickFilter.dataset.quickFilter;
      state.page = 1;
      renderSales();
      return;
    }
    const operation = event.target.closest("[data-operation]");
    if (operation) {
      const target = operation.dataset.operation;
      if (target === "problems") {
        navigate("problemas");
        return;
      }
      state.salesQuickFilter = target;
      navigate("ventas");
      return;
    }
    const period = event.target.closest("[data-period]");
    if (period) {
      state.period = period.dataset.period;
      if (state.period === "custom" && !state.customRange.start && !state.customRange.end) {
        const monthRange = dashboardRangeForMonth(state.selectedMonth);
        state.customRange = { ...monthRange };
      }
      renderDashboard();
      return;
    }
    const liquidation = event.target.closest("[data-liquidation]");
    if (liquidation) { openLiquidationDetail(liquidation.dataset.liquidation); return; }
    const saleAction = event.target.closest("[data-sale-action]");
    if (saleAction) {
      const sale = state.sales.find((item) => item.id === saleAction.dataset.id);
      if (!sale) return;
      if (saleAction.dataset.saleAction === "menu") openOrderActions(sale);
      if (saleAction.dataset.saleAction === "view") openDetail(sale.id);
      if (saleAction.dataset.saleAction === "edit") openSaleForm(sale);
      if (saleAction.dataset.saleAction === "payment") openPayment(sale);
      if (saleAction.dataset.saleAction === "shipping") openShipping(sale);
      if (saleAction.dataset.saleAction === "problem") openProblemForm(sale);
      if (saleAction.dataset.saleAction === "restore") restoreSale(sale);
      return;
    }
    const sort = event.target.closest("[data-sort]");
    if (sort) {
      state.sort.direction = state.sort.key === sort.dataset.sort && state.sort.direction === "asc" ? "desc" : "asc";
      state.sort.key = sort.dataset.sort;
      renderSales(); return;
    }
    const page = event.target.closest("[data-page]");
    if (page && !page.disabled) { state.page = Number(page.dataset.page); renderSales(); return; }
    const singleDispatch = event.target.closest("[data-single-dispatch]");
    if (singleDispatch) {
      openDispatchDialog([singleDispatch.dataset.singleDispatch]);
      return;
    }
    const quick = event.target.closest("[data-quick-status]");
    if (quick) { quickStatus(quick.dataset.id, quick.dataset.quickStatus); }
  }

  function handleMainInput(event) {
    if (event.target.dataset.filter === "search") {
      state.filters.search = event.target.value;
      state.page = 1;
      debounceRenderSales();
    }
  }

  function handleMainChange(event) {
    if (event.target.hasAttribute("data-dashboard-month")) {
      state.selectedMonth = event.target.value;
      state.period = "month";
      renderDashboard();
      return;
    }
    const filter = event.target.dataset.filter;
    if (filter && filter !== "search") {
      state.filters[filter] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
      if (filter === "showArchived" && state.filters.showArchived) state.salesQuickFilter = "all";
      state.page = 1; renderSales(); return;
    }
    if (event.target.hasAttribute("data-sales-sort")) {
      const [key, direction] = event.target.value.split(":");
      state.sort = { key, direction };
      state.page = 1;
      renderSales();
      return;
    }
    const range = event.target.dataset.dashboardRange;
    if (range) { state.customRange[range] = event.target.value; renderDashboard(); return; }
  }

  async function handleFormAction(action, button) {
    if (action === "next-code") {
      const button = els.saleForm.querySelector('[data-form-action="next-code"]');
      button.disabled = true;
      try {
        const response = await API.request("nextCode");
        setFormValue("codigo", response.code);
      } catch (error) {
        toast("error", "No se pudo generar", error.message);
      } finally { button.disabled = false; }
    }
  }

  elsPlaceholder();
  function elsPlaceholder() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-form-action]");
      if (button) handleFormAction(button.dataset.formAction, button);
    });
  }

  function openMovementHistory() {
    els.detailTitle.textContent = "Historial de liquidaciones";
    els.detailBody.innerHTML = state.movements.length ? `
      <div class="history-list">
        ${state.movements.slice(0, 50).map((movement) => `
          <div class="history-item">
            <span><strong>${movementLabel(movement.type)}</strong><small> · ${U.formatDate(movement.date)} · ${(movement.allocations || []).length} pedido${(movement.allocations || []).length === 1 ? "" : "s"}${movement.note ? ` · ${U.escapeHtml(movement.note)}` : ""}</small></span>
            <strong>${U.currency(movement.amount)}</strong>
          </div>`).join("")}
      </div>` : emptyState("≋", "Aún no hay movimientos", "Las devoluciones y liquidaciones realizadas aparecerán aquí.");
    els.detailFooter.innerHTML = `<button class="btn btn-secondary" data-close-detail>Cerrar</button>`;
    els.detailFooter.querySelector("[data-close-detail]").addEventListener("click", () => closeDialog("detailDialog"));
    els.detailDialog.showModal();
  }

  async function restoreSale(sale) {
    try {
      const saved = await API.request("restoreSale", { id: sale.id });
      upsertSale(saved);
      toast("success", "Pedido restaurado", `${sale.codigo} vuelve a estar activo.`);
      render();
    } catch (error) {
      toast("error", "No se pudo restaurar", error.message);
    }
  }

  async function archiveSale(sale) {
    const confirmed = await confirmDialog(
      "Eliminar pedido",
      `${sale.codigo} · ${sale.cliente} se moverá a la papelera. Dejará de aparecer en Pedidos, Dashboard y liquidaciones, pero podrás restaurarlo desde Filtros → Ver papelera.`,
      "Eliminar pedido",
      true
    );
    if (!confirmed) return;
    try {
      const saved = await API.request("archiveSale", { id: sale.id });
      upsertSale(saved);
      toast("success", "Pedido eliminado", `${sale.codigo} se movió a la papelera.`);
      render();
    } catch (error) {
      toast("error", "No se pudo eliminar", error.message);
    }
  }

  async function resetDemo() {
    const confirmed = await confirmDialog(
      "Restablecer demostración",
      "Se borrarán los cambios que hiciste en el modo demostración y volverán los pedidos de ejemplo.",
      "Restablecer",
      true
    );
    if (!confirmed) return;
    await API.resetDemo();
    toast("success", "Demostración restablecida", "Los datos reales de Google Sheets no se han tocado.");
    loadData();
  }

  function exportCsv() {
    const sales = filterSales();
    if (!sales.length) {
      toast("warning", "No hay datos para exportar", "Quita filtros o registra una venta.");
      return;
    }
    const columns = [
      ["Fecha", "fecha"], ["Fecha acordada de entrega", "fechaAcordadaEntrega"],
      ["Código", "codigo"], ["Cliente", "cliente"], ["Teléfono", "telefono"],
      ["SKU", "sku"], ["Producto", "tipoProducto"], ["Color", "colorProducto"], ["Diseño", "disenoProducto"],
      ["Cantidad", "cantidad"], ["Venta total", "ventaTotal"],
      ["Cobrado", "cobradoTotal"], ["Por cobrar", "porCobrar"], ["Costo total", "costoTotal"],
      ["Costo producción", "costoProduccion"], ["Costo envío", "costoEnvio"], ["Utilidad", "utilidad"],
      ["Agencia", "agencia"], ["Estado", "estadoPedido"], ["Canal", "canal"], ["Origen", "origen"],
      ["Destinatario", "destinatarioEnvio"], ["Teléfono de envío", "telefonoEnvio"],
      ["DNI de envío", "dniEnvio"], ["Dirección o sede", "direccionEnvio"], ["Google Maps", "enlaceMaps"],
      ["Problema", "tipoProblema"], ["Notas del problema", "descripcionProblema"], ["Costo problemas", "costoProblema"]
    ];
    const rows = [columns.map(([label]) => csvCell(label)).join(",")];
    sales.forEach((sale) => rows.push(columns.map(([, key]) => csvCell(sale[key])).join(",")));
    U.download(`ventas-termal-${U.today()}.csv`, rows.join("\r\n"), "text/csv;charset=utf-8");
    toast("success", "CSV descargado", `${sales.length} registros exportados.`);
  }

  async function submitAccessKey(event) {
    event.preventDefault();
    const key = new FormData(els.accessForm).get("accessKey");
    API.setAccessKey(String(key || "").trim());
    els.accessError.textContent = "";
    const button = els.accessForm.querySelector("button");
    setButtonLoading(button, true, "Comprobando…");
    try {
      await API.request("ping");
      closeDialog("accessDialog");
      await loadData();
    } catch (error) {
      API.setAccessKey("");
      els.accessError.textContent = error.message;
    } finally {
      setButtonLoading(button, false, "Entrar");
    }
  }

  function openAccessDialog(message) {
    if (!els.accessDialog.open) els.accessDialog.showModal();
    els.accessError.textContent = message || "";
    setTimeout(() => els.accessForm.querySelector("input")?.focus(), 40);
  }

  function confirmDialog(title, message, acceptLabel = "Confirmar", danger = true) {
    return new Promise((resolve) => {
      els.confirmTitle.textContent = title;
      els.confirmBody.innerHTML = `<p>${U.escapeHtml(message)}</p>`;
      els.confirmAccept.textContent = acceptLabel;
      els.confirmAccept.className = `btn ${danger ? "btn-danger" : "btn-primary"}`;
      state.confirmAction = resolve;
      els.confirmDialog.showModal();
    });
  }

  function runConfirmedAction() {
    const resolve = state.confirmAction;
    state.confirmAction = null;
    if (els.confirmDialog.open) els.confirmDialog.close();
    if (resolve) resolve(true);
  }

  function closeDialog(id) {
    const dialog = document.getElementById(id);
    if (dialog?.open) dialog.close();
    if (id === "paymentDialog") state.paymentSaleId = "";
    if (id === "shippingDialog") state.shippingSaleId = "";
    if (id === "problemDialog") state.problemSaleId = "";
    if (id === "orderActionsDialog") state.actionSaleId = "";
    if (id === "confirmDialog" && state.confirmAction) {
      state.confirmAction(false);
      state.confirmAction = null;
    }
  }

  function filterSales() {
    const f = state.filters;
    const term = U.normalizeText(f.search);
    return state.sales.filter((sale) => {
      if (f.showArchived ? sale.active !== false : sale.active === false) return false;
      if (state.salesQuickFilter === "receivable" && U.number(sale.porCobrar) <= 0) return false;
      if (state.salesQuickFilter === "production" && sale.estadoPedido !== "Producción") return false;
      if (state.salesQuickFilter === "ready" && sale.estadoPedido !== "Por despachar") return false;
      if (state.salesQuickFilter === "route" && sale.estadoPedido !== "Despachado") return false;
      if (state.salesQuickFilter === "delivered" && sale.estadoPedido !== "Entregado") return false;
      if (state.salesQuickFilter === "problems" && U.saleProblems(sale).length === 0) return false;
      if (state.salesQuickFilter === "overdue" && !isOverdueSale(sale)) return false;
      if (term) {
        const haystack = U.normalizeText([
          sale.codigo, sale.cliente, sale.telefono, sale.producto, sale.sku,
          sale.tipoProducto, sale.colorProducto, sale.disenoProducto, sale.agencia,
          sale.destinatarioEnvio, sale.telefonoEnvio, sale.dniEnvio, sale.direccionEnvio,
          sale.tipoProblema, sale.descripcionProblema
        ].join(" "));
        if (!haystack.includes(term)) return false;
      }
      if (f.start && U.dateInput(sale.fecha) < f.start) return false;
      if (f.end && U.dateInput(sale.fecha) > f.end) return false;
      if (f.estado && sale.estadoPedido !== f.estado) return false;
      if (f.tipoProducto && sale.tipoProducto !== f.tipoProducto) return false;
      if (f.agencia && sale.agencia !== f.agencia) return false;
      if (f.canal && sale.canal !== f.canal) return false;
      if (f.origen && sale.origen !== f.origen) return false;
      if (f.modalidadPago && sale.modalidadPago !== f.modalidadPago) return false;
      if (f.cuenta && sale.cuentaAdelanto !== f.cuenta && sale.cuentaSaldo !== f.cuenta) return false;
      if (f.estadoCobro && sale.estadoCobro !== f.estadoCobro) return false;
      if (f.estadoLiquidacion && sale.estadoLiquidacion !== f.estadoLiquidacion) return false;
      const hasProblem = U.normalizeText(sale.tipoProblema) !== "no";
      if (f.problema === "Con problema" && !hasProblem) return false;
      if (f.problema === "Sin problema" && hasProblem) return false;
      const agreedStatus = agreedDeliveryStatus(sale);
      if (f.fechaAcordadaEstado === "Atrasados" && agreedStatus.key !== "overdue") return false;
      if (f.fechaAcordadaEstado === "Hoy o mañana" && agreedStatus.key !== "soon") return false;
      if (f.fechaAcordadaEstado === "Sin fecha" && agreedStatus.key !== "none") return false;
      return true;
    });
  }

  function sortSales(sales) {
    const { key, direction } = state.sort;
    return [...sales].sort((a, b) => {
      if (key === "fechaAcordadaEntrega") {
        const aDate = U.dateInput(a.fechaAcordadaEntrega);
        const bDate = U.dateInput(b.fechaAcordadaEntrega);
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        const dateComparison = aDate.localeCompare(bDate);
        return direction === "asc" ? dateComparison : -dateComparison;
      }
      const av = a[key] ?? "";
      const bv = b[key] ?? "";
      const comparison = typeof av === "number" && typeof bv === "number"
        ? av - bv : String(av).localeCompare(String(bv), "es", { numeric: true });
      return direction === "asc" ? comparison : -comparison;
    });
  }

  function summarize(sales) {
    const totals = sales.reduce((acc, sale) => {
      acc.sales += U.number(sale.ventaTotal);
      acc.collected += U.number(sale.cobradoTotal);
      acc.pending += U.number(sale.porCobrar);
      acc.costs += U.number(sale.costoTotal);
      acc.profit += U.number(sale.utilidad);
      acc.items += U.number(sale.cantidad);
      return acc;
    }, { sales: 0, collected: 0, pending: 0, costs: 0, profit: 0, items: 0 });
    totals.orders = sales.length;
    totals.ticket = totals.orders ? totals.sales / totals.orders : 0;
    return totals;
  }

  function obligations(sales) {
    return sales.reduce((acc, sale) => {
      acc.gonzalo += U.number(sale.gonzaloDebeDevolver);
      acc.alberto += U.number(sale.albertoDebeDevolver);
      acc.dinsides += U.number(sale.dinsidesDebeDepositar);
      acc.termalDinsides += U.number(sale.termalDebePagarDinsides);
      return acc;
    }, { gonzalo: 0, alberto: 0, dinsides: 0, termalDinsides: 0 });
  }

  function pendingForType(type) {
    const map = {
      GONZALO_RETURN: "gonzaloDebeDevolver",
      ALBERTO_RETURN: "albertoDebeDevolver",
      DINSIDES_DEPOSIT: "dinsidesDebeDepositar",
      TERMAL_PAY_DINSIDES: "termalDebePagarDinsides"
    };
    return U.money(state.sales.filter((sale) => sale.active !== false)
      .reduce((sum, sale) => sum + U.number(sale[map[type]]), 0));
  }

  function formToObject(form) {
    const data = {};
    new FormData(form).forEach((value, key) => { data[key] = String(value).trim(); });
    form.querySelectorAll('input[type="checkbox"][name]').forEach((input) => { data[input.name] = input.checked; });
    [
      "cantidad", "ventaTotal", "adelanto", "saldoCobrado", "comisionTarjeta", "costoTermo",
      "costoPackaging", "costoGrabado", "costoProduccionPersonalizado", "costoProduccion",
      "costoEnvio", "costoRecojo", "otrosCostos", "costoProblema",
      "liquidadoGonzalo", "liquidadoAlberto", "liquidadoDinsides", "pagadoADinsides", "amount"
    ].forEach((key) => { if (key in data) data[key] = U.number(data[key]); });
    if ("grabadoLaser" in data) {
      data.grabadoLaser = data.grabadoLaser === true || String(data.grabadoLaser).toLowerCase() === "true";
    }
    return data;
  }

  function upsertSale(sale) {
    const calculated = U.calculateSale(sale);
    const index = state.sales.findIndex((item) => item.id === sale.id);
    if (index >= 0) state.sales[index] = calculated;
    else state.sales.unshift(calculated);
  }

  function rememberProductColor(sale) {
    if (!sale.tipoProducto || !sale.colorProducto) return;
    if (!state.lists.coloresPorProducto) state.lists.coloresPorProducto = {};
    const colors = state.lists.coloresPorProducto[sale.tipoProducto] || [];
    if (!colors.includes(sale.colorProducto)) colors.push(sale.colorProducto);
    state.lists.coloresPorProducto[sale.tipoProducto] = colors;
    const type = (state.lists.tiposProductos || []).find((item) => item.nombre === sale.tipoProducto);
    if (type) type.colores = colors;
    if (!state.lists.problemas) state.lists.problemas = ["NO"];
    U.saleProblems(sale).forEach((problem) => {
      if (problem.tipo && !state.lists.problemas.some((value) => U.normalizeText(value) === U.normalizeText(problem.tipo))) {
        state.lists.problemas.push(problem.tipo);
      }
    });
  }

  function fieldInput(label, name, type, value = "", required = false, placeholder = "", attrs = "") {
    return `<label class="field ${required ? "required" : ""}"><span>${label}</span><input type="${type}" name="${name}" value="${U.escapeHtml(value ?? "")}" ${required ? "required" : ""} placeholder="${U.escapeHtml(placeholder)}" ${attrs}></label>`;
  }

  function fieldSelect(label, name, options, value = "", includeAll = false, dataAttr = "") {
    const attr = dataAttr ? `${dataAttr}="${name}"` : `name="${name}"`;
    return `<label class="field"><span>${label}</span><select ${attr}>${includeAll ? `<option value="">Todos</option>` : ""}${options.map((option) => {
      const actual = typeof option === "object" ? option.nombre : option;
      return `<option value="${U.escapeHtml(actual)}" ${String(actual) === String(value) ? "selected" : ""}>${U.escapeHtml(actual || "Seleccionar…")}</option>`;
    }).join("")}</select></label>`;
  }

  function metric(label, value, icon, meta, style) {
    return `<div class="metric-card ${style}"><div class="metric-label">${label}<span class="metric-icon">${icon}</span></div><div class="metric-value">${value}</div><div class="metric-meta">${meta}</div></div>`;
  }

  function operationItem(type, label, value, meta) {
    return `<button class="card operation-item" data-operation="${type}"><span><strong>${value}</strong><span>${label}</span></span><span>${meta} →</span></button>`;
  }

  function periodButton(value, label) {
    return `<button data-period="${value}" class="${state.period === value ? "active" : ""}">${label}</button>`;
  }

  function liquidationItem(type, initial, label, amount, sales) {
    const field = {
      GONZALO_RETURN: "gonzaloDebeDevolver", ALBERTO_RETURN: "albertoDebeDevolver",
      DINSIDES_DEPOSIT: "dinsidesDebeDepositar", TERMAL_PAY_DINSIDES: "termalDebePagarDinsides"
    }[type];
    const count = sales.filter((sale) => Math.abs(U.number(sale[field])) >= 0.01).length;
    const person = type === "GONZALO_RETURN" ? "Gonzalo" : type === "ALBERTO_RETURN" ? "Alberto" : "";
    const meta = amount < 0 && person
      ? `Saldo a favor de ${person}`
      : `${count} pedido${count === 1 ? "" : "s"}`;
    return `<button class="liquidation-item" data-liquidation="${type}"><span class="avatar">${initial}</span><span><strong>${label}</strong><small>${meta}</small></span><span class="amount ${amount < 0 ? "negative-balance" : ""}">${U.currency(amount)}</span></button>`;
  }

  function detailBlock(title, rows) {
    return `<section class="detail-block"><h3>${title}</h3><dl class="detail-list">${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${U.escapeHtml(value ?? "—")}</dd></div>`).join("")}</dl></section>`;
  }

  function obligationBox(label, value) {
    return `<div class="obligation"><span>${label}</span><strong>${U.currency(value)}</strong></div>`;
  }

  function statusChip(status) {
    const normalized = U.normalizeText(status);
    let type = "production";
    if (normalized === "por despachar") type = "ready";
    if (normalized === "despachado") type = "route";
    if (normalized === "entregado") type = "done";
    if (normalized === "cancelado") type = "cancel";
    return `<span class="chip chip-${type}">${U.escapeHtml(status || "Sin estado")}</span>`;
  }

  function problemChip(problem) {
    const hasProblem = U.normalizeText(problem) !== "no";
    return `<span class="chip ${hasProblem ? "chip-problem" : "chip-paid"}">${U.escapeHtml(problem || "NO")}</span>`;
  }

  function sortableTh(key, label) {
    const arrow = state.sort.key === key ? (state.sort.direction === "asc" ? " ↑" : " ↓") : "";
    return `<th class="sortable" data-sort="${key}">${label}${arrow}</th>`;
  }

  function emptyState(icon, title, text, action = "", label = "") {
    return `<div class="empty-state"><div class="empty-icon">${icon}</div><h3>${title}</h3><p>${text}</p>${action ? `<button class="btn btn-primary btn-sm" data-action="${action}">${label}</button>` : ""}</div>`;
  }

  function movementLabel(type) {
    return {
      GONZALO_RETURN: "Devolución de Gonzalo", ALBERTO_RETURN: "Devolución de Alberto",
      DINSIDES_DEPOSIT: "Depósito de DINSIDES", TERMAL_PAY_DINSIDES: "Pago a DINSIDES"
    }[type] || "Movimiento";
  }

  function setFormValue(name, value) {
    const element = els.saleForm.querySelector(`[name="${name}"]`);
    if (element) element.value = value ?? "";
  }

  function focusFirstInvalid(sale) {
    if (!sale.colorProducto) {
      els.saleForm.querySelector('[name="colorPersonalizado"]')?.focus();
      return;
    }
    const names = ["fecha", "codigo", "cliente", "tipoProducto", "disenoProducto", "producto", "ventaTotal"];
    const name = names.find((key) => !sale[key] && key !== "ventaTotal");
    els.saleForm.querySelector(`[name="${name || "cliente"}"]`)?.focus();
  }

  function readPreferences() {
    try { return JSON.parse(localStorage.getItem("termal_form_preferences") || "{}"); }
    catch (_) { return {}; }
  }

  function savePreferences(sale) {
    localStorage.setItem("termal_form_preferences", JSON.stringify({
      canal: sale.canal, tipoProducto: sale.tipoProducto, colorProducto: sale.colorProducto,
      disenoProducto: sale.disenoProducto
    }));
  }

  function hasActiveFilters() { return activeFilterCount() > 0; }
  function activeFilterCount() {
    return Object.entries(state.filters).filter(([key, value]) => key !== "search" && Boolean(value)).length;
  }

  function percent(value, total) { return total ? Math.round((value / total) * 100) : 0; }
  function agreedDeliveryStatus(sale) {
    const agreedDate = U.dateInput(sale?.fechaAcordadaEntrega);
    if (sale?.estadoPedido === "Entregado") {
      return { key: "delivered", label: "Entregado", date: agreedDate };
    }
    if (sale?.estadoPedido === "Cancelado" || !agreedDate) {
      return { key: "none", label: "Sin fecha", date: "" };
    }
    const today = new Date(`${U.today()}T12:00:00-05:00`);
    const delivery = new Date(`${agreedDate}T12:00:00-05:00`);
    const difference = Math.round((delivery - today) / 86400000);
    if (difference < 0) {
      const lateDays = Math.abs(difference);
      return { key: "overdue", label: `Atrasado ${lateDays} d.`, date: agreedDate };
    }
    if (difference === 0) return { key: "soon", label: "Entrega hoy", date: agreedDate };
    if (difference === 1) return { key: "soon", label: "Entrega mañana", date: agreedDate };
    const [, month, day] = agreedDate.split("-");
    return { key: "scheduled", label: `Entrega ${day}/${month}`, date: agreedDate };
  }

  function isOverdueSale(sale) {
    return agreedDeliveryStatus(sale).key === "overdue";
  }

  function agreedDeliveryBadge(status, secondary = false) {
    const title = status.date ? `Fecha acordada: ${U.formatDate(status.date)}` : status.label;
    return `<span class="agreed-date agreed-date-${status.key} ${secondary ? "agreed-date-secondary" : ""}" title="${U.escapeHtml(title)}">${U.escapeHtml(status.label)}</span>`;
  }

  function hasShipping(sale) {
    return Boolean(
      String(sale?.agencia || "").trim() ||
      String(sale?.destinatarioEnvio || "").trim() ||
      String(sale?.telefonoEnvio || "").trim() ||
      String(sale?.dniEnvio || "").trim() ||
      String(sale?.direccionEnvio || "").trim() ||
      String(sale?.enlaceMaps || "").trim() ||
      U.number(sale?.costoEnvio) > 0 ||
      U.number(sale?.costoRecojo) > 0
    );
  }
  function paymentAccounts(sale) {
    const accounts = [];
    if (U.number(sale?.adelanto) > 0 && sale?.cuentaAdelanto) accounts.push(sale.cuentaAdelanto);
    const payments = U.salePayments(sale);
    payments.forEach((payment) => {
      if (payment.cuenta) accounts.push(payment.cuenta);
    });
    if (!payments.length && U.number(sale?.saldoCobrado) > 0 && sale?.cuentaSaldo) accounts.push(sale.cuentaSaldo);
    return [...new Set(accounts)].join(" · ");
  }

  function dashboardRange() {
    if (state.period === "history") return { start: "", end: "" };
    if (state.period === "month") return dashboardRangeForMonth(state.selectedMonth);
    return U.periodRange(state.period, state.customRange);
  }

  function dashboardRangeForMonth(value) {
    const [year, month] = String(value || U.today().slice(0, 7)).split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    return { start: `${prefix}-01`, end: `${prefix}-${String(lastDay).padStart(2, "0")}` };
  }

  function dashboardMonthOptions() {
    const months = new Set();
    const now = new Date();
    for (let offset = 0; offset < 24; offset += 1) {
      const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() - offset, 1));
      months.add(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
    }
    state.sales.forEach((sale) => {
      const month = String(sale.fecha || "").slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(month)) months.add(month);
    });
    return [...months].sort((a, b) => b.localeCompare(a)).map((value) => ({
      value,
      label: monthLabel(value)
    }));
  }

  function dashboardPeriodLabel(range) {
    if (state.period === "history") return "Histórico completo";
    if (state.period === "month") return monthLabel(state.selectedMonth);
    if (state.period === "today") return `Hoy · ${U.formatDate(range.start)}`;
    if (state.period === "week") return `${U.formatDate(range.start)} — ${U.formatDate(range.end)}`;
    if (state.period === "custom") {
      if (!range.start && !range.end) return "Selecciona un rango de fechas";
      return `${range.start ? U.formatDate(range.start) : "Inicio"} — ${range.end ? U.formatDate(range.end) : "Hoy"}`;
    }
    return "Periodo seleccionado";
  }

  function dashboardRangeDays(range) {
    if (!range.start || !range.end) return Number.POSITIVE_INFINITY;
    const start = new Date(`${range.start}T12:00:00-05:00`);
    const end = new Date(`${range.end}T12:00:00-05:00`);
    return Math.max(0, Math.round((end - start) / 86400000));
  }

  function monthLabel(value) {
    if (!/^\d{4}-\d{2}$/.test(String(value))) return "Mes específico";
    const label = new Intl.DateTimeFormat("es-PE", {
      month: "long", year: "numeric", timeZone: "UTC"
    }).format(new Date(`${value}-15T12:00:00Z`));
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function formatShortDate(value) {
    const [year, month, day] = String(value).split("-");
    return year && day ? `${day}/${month}` : value;
  }
  function formatShortMonth(value) {
    if (!/^\d{4}-\d{2}$/.test(String(value))) return value;
    return new Intl.DateTimeFormat("es-PE", {
      month: "short", year: "2-digit", timeZone: "UTC"
    }).format(new Date(`${value}-15T12:00:00Z`)).replace(".", "");
  }
  function formatTime(date) { return date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }); }
  function csvCell(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

  function toast(type, title, message) {
    const icons = { success: "✓", error: "!", warning: "◷" };
    const element = document.createElement("div");
    element.className = `toast ${type}`;
    element.innerHTML = `<strong aria-hidden="true">${icons[type] || "•"}</strong><div><strong>${U.escapeHtml(title)}</strong><p>${U.escapeHtml(message)}</p></div><button aria-label="Cerrar">×</button>`;
    element.querySelector("button").addEventListener("click", () => element.remove());
    els.toastRegion.appendChild(element);
    setTimeout(() => element.remove(), type === "error" ? 9000 : 5000);
  }

  function setSyncStatus(type, text) {
    els.syncState.className = `sync-state ${type}`;
    els.lastSync.textContent = text;
  }

  function setButtonLoading(button, loading, text) {
    if (!button) return;
    if (loading) button.dataset.originalText = button.textContent;
    button.disabled = loading;
    button.textContent = loading ? text : (button.dataset.originalText || text);
  }

  function handleConnection() {
    els.offlineBanner.classList.toggle("visible", !navigator.onLine);
    if (!navigator.onLine) setSyncStatus("error", "Sin internet");
    else if (state.updatedAt) setSyncStatus("online", `Actualizado ${formatTime(new Date())}`);
  }

  function renderConnectionError(error) {
    els.mainContent.innerHTML = `<div class="card">${emptyState("!", "No se pudo cargar la información", error.message)}</div>`;
  }

  function isAnyDialogOpen() {
    return Boolean(document.querySelector("dialog[open]"));
  }

  function debounce(fn, wait) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }
  const debounceRenderSales = debounce(() => {
    if (state.route === "ventas") renderSales();
  }, 160);
})();
