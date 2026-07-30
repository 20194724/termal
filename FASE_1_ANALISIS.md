# Fase 1 — Análisis del ERP MINI TERMAL

Fecha: 30/07/2026  
Rama local: `erp-v2-desarrollo`  
Estado de publicación: sin remoto configurado, sin push, sin merge y sin despliegue.

## 1. Alcance de esta fase

Esta fase no cambia el comportamiento del ERP. Su objetivo es:

- registrar una base local de la versión publicada;
- separar el desarrollo nuevo en una rama;
- revisar Dashboard, Pedidos, Operación, Problemas y liquidaciones;
- identificar duplicidades y dependencias;
- definir una implementación compatible con Google Sheets.

## 2. Arquitectura actual

La aplicación es una SPA sin framework:

- `index.html`: estructura principal, navegación y diálogos.
- `app.js`: estado, renderizado, navegación y flujos de la interfaz.
- `styles.css`: diseño de escritorio y reglas responsive.
- `utils.js`: cálculos de pedidos, cobros, costos y obligaciones.
- `api.js`: conexión con Apps Script y equivalente local de demostración.
- `demo-data.js`: catálogos y pedidos de prueba.
- `charts.js`: gráfica del Dashboard.
- `config.js`: URL pública del Apps Script.
- `google-apps-script/Code.gs`: backend de Google Sheets. La copia local está vacía y debe recuperarse antes de modificar el esquema real.

No se necesita reconstruir la aplicación ni cambiar esta arquitectura.

## 3. Hallazgos por sección

### Dashboard

Ya contiene:

- filtros Hoy, Esta semana, Histórico, mes y rango personalizado;
- Ventas, Cobrado, Por cobrar, Utilidad, Pedidos y Ticket promedio;
- estados Producción, Por despachar, En ruta y Problemas;
- gráfica de líneas;
- liquidaciones y movimientos.

Problemas actuales:

- las métricas financieras aparecen antes que las prioridades operativas;
- las tarjetas operativas abren `Operación`, no Pedidos;
- no existe prioridad Atrasados;
- Por cobrar no funciona como acceso directo;
- no existe Fecha acordada de entrega;
- la gráfica ocupa 230 px también en móvil;
- falta el bloque Próximas acciones;
- la sección se llama Liquidaciones pendientes y todavía separa la deuda de DINSIDES en dos sentidos.

### Pedidos

Ya contiene:

- búsqueda por código, cliente, teléfono y producto;
- filtros avanzados;
- orden por fecha, código y venta;
- pagos, envíos, problemas, edición y papelera;
- detalle del pedido;
- resaltado de filas con problemas.

Problema principal:

- siempre renderiza una tabla de 12 columnas dentro de `.table-scroll`;
- en móvil no existe una vista alternativa y se mantiene el scroll horizontal;
- los filtros operativos no son accesos rápidos;
- las acciones de flujo solo están en Operación;
- el detalle actual está agrupado en cuatro bloques generales y no ofrece copiar datos de envío.

### Operación

Usa los mismos pedidos activos y los vuelve a agrupar por:

- Producción;
- Por despachar;
- Despachados;
- Entregados.

Capacidades que sí son propias de esta vista:

- flecha para avanzar al siguiente estado;
- selección múltiple de pedidos por despachar;
- confirmación de salida en lote;
- edición rápida del envío;
- días en ruta y seguimiento;
- acción rápida para registrar problemas.

Conclusión:

La lista es redundante, pero sus acciones no deben eliminarse. Deben integrarse en Pedidos mediante filtros rápidos, tarjetas/filas y una barra de selección para despacho múltiple. Solo después de esa integración puede retirarse la ruta visible `Operación`.

### Problemas

No es una copia exacta de Pedidos. Convierte cada incidencia en una fila propia y muestra:

- tipo;
- nota;
- costo;
- pedido relacionado;
- estado;
- edición de todas las incidencias del pedido.

Conclusión:

Debe mantenerse como gestión especializada, pero salir de la navegación móvil principal. El filtro Problemas de Pedidos y la tarjeta del Dashboard servirán para localizar pedidos afectados; la vista Problemas seguirá siendo útil para administrar incidencias y costos.

### Liquidaciones actuales

El cálculo actual usa campos por pedido:

- `gonzaloDebeDevolver`;
- `albertoDebeDevolver`;
- `dinsidesDebeDepositar`;
- `termalDebePagarDinsides`;
- importes ya liquidados por cada contraparte.

Gonzalo y Alberto ya admiten saldos negativos. DINSIDES todavía está separado en dos campos y dos filas.

Los movimientos actuales:

- solo liquidan saldos positivos;
- se distribuyen sobre los pedidos más antiguos;
- no permiten registrar un reembolso de Termal a una persona;
- no guardan saldo posterior, concepto, persona normalizada, signo ni pedido opcional;
- muestran un historial resumido.

Conclusión:

La futura Caja interna debe calcular un saldo firmado por persona y conservar compatibilidad con los campos históricos. No conviene borrar ni renombrar las columnas existentes.

## 4. Decisión de navegación

Propuesta para escritorio:

- Dashboard
- Pedidos
- Problemas
- Caja interna

Propuesta para móvil:

- Inicio
- Pedidos
- Caja
- Más
- botón central Nueva venta

`Operación` se retirará de la navegación únicamente después de trasladar a Pedidos todas sus acciones.

## 5. Estrategia de compatibilidad con datos

### Pedidos

Campo nuevo obligatorio para el rediseño:

- `fechaAcordadaEntrega`

Campos logísticos existentes que deben reutilizarse:

- `modalidadLogistica`;
- `agencia`;
- `telefono`;
- `costoEnvio`;
- `costoRecojo`;
- `pagadorLogistica`;
- `fechaDespacho`;
- `codigoSeguimiento`;
- `fechaEntrega`.

Datos de envío solicitados que hoy no existen y solo deben añadirse de forma aditiva:

- `sedeEnvio`;
- `ciudadEnvio`;
- `direccionEnvio`;
- `destinatarioEnvio`.

Los pedidos históricos tendrán `fechaAcordadaEntrega` vacía hasta que se complete manualmente. No se inferirá una fecha.

### Caja interna

El movimiento actual contiene:

- `id`;
- `type`;
- `amount`;
- `date`;
- `note`;
- `allocations`;
- `createdAt`.

El esquema ampliado necesitará, sin eliminar lo anterior:

- `persona`;
- `naturaleza` o signo;
- `concepto`;
- `saleId` y código de pedido opcionales;
- `cliente` opcional;
- `metodoPago` opcional;
- `saldoPosterior`.

Los saldos se calcularán a partir de movimientos firmados y de la compatibilidad con obligaciones históricas; no se crearán saldos manuales desconectados.

## 6. Archivos previstos por fase

### Fases 2 a 6 — experiencia operativa

- `app.js`
  - tarjetas móviles;
  - filtros rápidos;
  - estado de fecha acordada;
  - integración de Operación;
  - detalle reorganizado;
  - Dashboard operativo y accesos directos.
- `styles.css`
  - vista móvil sin tabla horizontal;
  - chips, tarjetas compactas y navegación;
  - detalle y Dashboard responsive;
  - gráfica móvil compacta.
- `index.html`
  - navegación final y reutilización de diálogos.
- `utils.js`
  - funciones de fecha acordada y clasificación de atrasos.
- `demo-data.js`
  - datos de demostración compatibles con los nuevos campos.
- `charts.js`
  - presentación compacta de la gráfica en móvil.

### Fases 7 y 8 — Caja interna

- `app.js`
  - resumen, desglose, registro e historial de Caja.
- `utils.js`
  - saldo neto firmado por persona.
- `api.js`
  - comportamiento equivalente en modo demostración.
- `google-apps-script/Code.gs`
  - almacenamiento y migración segura de movimientos reales.
- `demo-data.js`
  - movimientos de ejemplo.

### Fase 9 — cierre

- `TESTING.md`
  - pruebas funcionales, responsive, de cálculo y sincronización.
- `README.md`
  - instrucciones de migración y prueba local.

## 7. Riesgos y controles

1. `google-apps-script/Code.gs` tiene 0 bytes en esta copia local.
   - No se modificará Google Sheets hasta recuperar el código real desde Apps Script.
   - Las fases visuales pueden avanzar en modo demostración.

2. La versión publicada usa el mismo `config.js`.
   - La rama local no tiene remoto configurado.
   - No se hará push, merge ni deploy sin aprobación explícita.

3. Operación contiene despacho múltiple.
   - La ruta no se eliminará hasta que esa función exista y esté probada dentro de Pedidos.

4. Los campos históricos de liquidación no se eliminarán.
   - La Caja nueva deberá leerlos durante la transición y añadir movimientos firmados.

## 8. Orden recomendado para la siguiente fase

La Fase 2 puede hacerse sin tocar Google Sheets:

1. añadir chips rápidos con los estados disponibles;
2. crear tarjetas móviles de Pedidos;
3. mantener la tabla actual en escritorio;
4. mantener intactas todas las acciones;
5. probar 360 px, 390 px, 820 px y escritorio;
6. detenerse para revisión antes de agregar Fecha acordada.

