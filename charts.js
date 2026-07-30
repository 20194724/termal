(function () {
  "use strict";
  const U = globalThis.TermalUtils;

  function setup(canvas) {
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(260, rect.width);
    const height = Math.max(180, rect.height);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, width, height);
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    return { ctx, width, height };
  }

  function group(sales, key, valueKey = "ventaTotal") {
    return sales.reduce((acc, sale) => {
      const label = sale[key] || "Sin dato";
      acc[label] = U.money((acc[label] || 0) + U.number(sale[valueKey]));
      return acc;
    }, {});
  }

  function bar(canvas, entries, options = {}) {
    if (!canvas) return;
    const { ctx, width, height } = setup(canvas);
    const padding = { top: 16, right: 12, bottom: 42, left: 50 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;
    const values = entries.map(([, value]) => Number(value));
    const max = Math.max(...values, 1);
    ctx.strokeStyle = "#e4e7ec";
    ctx.fillStyle = "#667085";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const y = padding.top + (plotH / 4) * i;
      ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(width - padding.right, y); ctx.stroke();
      const value = max - (max / 4) * i;
      ctx.fillText(options.currency ? compactMoney(value) : Math.round(value), 2, y);
    }
    const slot = plotW / Math.max(entries.length, 1);
    const barWidth = Math.min(34, slot * 0.58);
    entries.forEach(([label, value], index) => {
      const h = (Number(value) / max) * plotH;
      const x = padding.left + slot * index + (slot - barWidth) / 2;
      const y = padding.top + plotH - h;
      const gradient = ctx.createLinearGradient(0, y, 0, padding.top + plotH);
      gradient.addColorStop(0, options.color || "#6e103d");
      gradient.addColorStop(1, options.colorEnd || "#e8a3c4");
      ctx.fillStyle = gradient;
      roundedRect(ctx, x, y, barWidth, h, 5);
      ctx.fill();
      ctx.save();
      ctx.translate(x + barWidth / 2, height - 28);
      ctx.rotate(entries.length > 7 ? -0.45 : 0);
      ctx.textAlign = "center";
      ctx.fillStyle = "#667085";
      ctx.fillText(shortLabel(label, entries.length > 7 ? 8 : 13), 0, 0);
      ctx.restore();
    });
  }

  function donut(canvas, entries, options = {}) {
    if (!canvas) return;
    const { ctx, width, height } = setup(canvas);
    const total = entries.reduce((sum, [, value]) => sum + Number(value), 0) || 1;
    const colors = options.colors || ["#6e103d", "#a63d70", "#d2719f", "#efb2ce", "#f59e0b", "#f97066"];
    const cx = Math.min(width * 0.34, 135);
    const cy = height / 2;
    const radius = Math.min(72, height * 0.34);
    let start = -Math.PI / 2;
    entries.forEach(([, value], index) => {
      const angle = (Number(value) / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, start, start + angle);
      ctx.strokeStyle = colors[index % colors.length];
      ctx.lineWidth = 22;
      ctx.stroke();
      start += angle;
    });
    ctx.textAlign = "center";
    ctx.fillStyle = "#101828";
    ctx.font = "700 20px Inter, system-ui, sans-serif";
    ctx.fillText(options.center || String(Math.round(total)), cx, cy - 4);
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#667085";
    ctx.fillText(options.centerLabel || "pedidos", cx, cy + 17);
    ctx.textAlign = "left";
    const legendX = Math.max(cx + radius + 36, width * 0.55);
    entries.slice(0, 6).forEach(([label, value], index) => {
      const y = 28 + index * 27;
      ctx.fillStyle = colors[index % colors.length];
      ctx.beginPath(); ctx.arc(legendX, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#344054";
      ctx.font = "12px Inter, system-ui, sans-serif";
      ctx.fillText(shortLabel(label, 18), legendX + 13, y);
      ctx.fillStyle = "#667085";
      ctx.textAlign = "right";
      ctx.fillText(String(value), width - 12, y);
      ctx.textAlign = "left";
    });
  }

  function barCompare(canvas, entries, options = {}) {
    if (!canvas) return;
    const { ctx, width, height } = setup(canvas);
    const padding = { top: 28, right: 12, bottom: 42, left: 50 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;
    const values = entries.flatMap((entry) => [Number(entry[1]), Number(entry[2])]);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const yFor = (value) => padding.top + ((max - value) / range) * plotH;
    const zeroY = yFor(0);
    ctx.strokeStyle = "#e4e7ec";
    ctx.fillStyle = "#667085";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const value = max - (range / 4) * i;
      const y = yFor(value);
      ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(width - padding.right, y); ctx.stroke();
      ctx.fillText(compactMoney(value), 2, y);
    }
    const slot = plotW / Math.max(entries.length, 1);
    const barWidth = Math.min(17, slot * 0.28);
    entries.forEach(([label, sales, profit], index) => {
      [[sales, options.salesColor || "#6e103d", -barWidth], [profit, options.profitColor || "#f59e0b", 1]].forEach(([value, color, offset]) => {
        const valueY = yFor(Number(value));
        const x = padding.left + slot * index + slot / 2 + offset;
        const y = Math.min(valueY, zeroY);
        const h = Math.max(1, Math.abs(zeroY - valueY));
        ctx.fillStyle = color;
        roundedRect(ctx, x, y, barWidth, h, 3);
        ctx.fill();
      });
      const x = padding.left + slot * index + slot / 2;
      ctx.save();
      ctx.translate(x, height - 27);
      ctx.rotate(entries.length > 7 ? -0.45 : 0);
      ctx.textAlign = "center";
      ctx.fillStyle = "#667085";
      ctx.fillText(shortLabel(label, entries.length > 7 ? 8 : 13), 0, 0);
      ctx.restore();
    });
    ctx.textAlign = "left";
    ctx.fillStyle = options.salesColor || "#6e103d";
    ctx.fillRect(padding.left, 7, 9, 9);
    ctx.fillStyle = "#475467";
    ctx.fillText("Ventas", padding.left + 14, 12);
    ctx.fillStyle = options.profitColor || "#f59e0b";
    ctx.fillRect(padding.left + 75, 7, 9, 9);
    ctx.fillStyle = "#475467";
    ctx.fillText("Utilidad", padding.left + 89, 12);
  }

  function lineCompare(canvas, entries, options = {}) {
    if (!canvas) return;
    const { ctx, width, height } = setup(canvas);
    const padding = { top: 32, right: 18, bottom: 42, left: 50 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;
    const values = entries.flatMap((entry) => [Number(entry[1]), Number(entry[2])]);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const yFor = (value) => padding.top + ((max - Number(value)) / range) * plotH;
    const xFor = (index) => entries.length <= 1
      ? padding.left + plotW / 2
      : padding.left + (plotW * index) / (entries.length - 1);

    ctx.strokeStyle = "#e4e7ec";
    ctx.fillStyle = "#667085";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const value = max - (range / 4) * i;
      const y = yFor(value);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(compactMoney(value), 2, y);
    }

    const drawSeries = (valueIndex, color) => {
      if (!entries.length) return;
      ctx.beginPath();
      entries.forEach((entry, index) => {
        const x = xFor(index);
        const y = yFor(entry[valueIndex]);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
      entries.forEach((entry, index) => {
        ctx.beginPath();
        ctx.arc(xFor(index), yFor(entry[valueIndex]), 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    };

    const salesColor = options.salesColor || "#6e103d";
    const profitColor = options.profitColor || "#f59e0b";
    drawSeries(1, salesColor);
    drawSeries(2, profitColor);

    const labelStep = Math.max(1, Math.ceil(entries.length / 8));
    entries.forEach(([label], index) => {
      if (index % labelStep !== 0 && index !== entries.length - 1) return;
      ctx.save();
      ctx.translate(xFor(index), height - 27);
      ctx.rotate(entries.length > 7 ? -0.45 : 0);
      ctx.textAlign = "center";
      ctx.fillStyle = "#667085";
      ctx.font = "12px Inter, system-ui, sans-serif";
      ctx.fillText(shortLabel(label, entries.length > 7 ? 8 : 13), 0, 0);
      ctx.restore();
    });

    ctx.textAlign = "left";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = salesColor;
    ctx.beginPath(); ctx.moveTo(padding.left, 12); ctx.lineTo(padding.left + 16, 12); ctx.stroke();
    ctx.fillStyle = "#475467";
    ctx.fillText("Ventas", padding.left + 22, 12);
    ctx.strokeStyle = profitColor;
    ctx.beginPath(); ctx.moveTo(padding.left + 82, 12); ctx.lineTo(padding.left + 98, 12); ctx.stroke();
    ctx.fillStyle = "#475467";
    ctx.fillText("Utilidad", padding.left + 104, 12);
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function compactMoney(value) {
    return value >= 1000 ? `S/${(value / 1000).toFixed(1)}k` : `S/${Math.round(value)}`;
  }

  function shortLabel(value, length) {
    const text = String(value);
    return text.length > length ? `${text.slice(0, length - 1)}…` : text;
  }

  globalThis.TermalCharts = { bar, barCompare, lineCompare, donut, group };
})();
