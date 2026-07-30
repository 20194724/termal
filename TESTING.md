# Pruebas manuales — ERP MINI TERMAL

Realiza primero estas pruebas en modo demostración. Después repite las pruebas 1 a 5 conectado a Google Sheets.

Marca cada casilla cuando el resultado sea correcto.

## Pedidos y persistencia

- [ ] **Crear:** Nueva venta → completa los campos esenciales → Guardar. Aparece en Pedidos y Dashboard sin recargar.
- [ ] **Editar:** cambia cliente, producto o monto. El cambio aparece en todas las vistas.
- [ ] **Menú de acciones:** la fila muestra un botón ⋮ con Agregar/Editar envío, Agregar pago, Señalar/Editar problema y Eliminar pedido.
- [ ] **Eliminar:** elimina un pedido y confirma que desaparece de Pedidos, Operación, Dashboard y liquidaciones.
- [ ] **Restaurar:** abre Filtros → Ver papelera, restaura el pedido y confirma que vuelve a todas las vistas.
- [ ] **Agregar pago:** venta S/ 149.90, cobrado S/ 19.90, pendiente S/ 130.00; agrega S/ 50.00, selecciona quién lo recibió y confirma S/ 69.90 cobrado y S/ 80.00 pendiente.
- [ ] **Responsables distintos:** agrega dos pagos posteriores recibidos por cuentas distintas y confirma en el detalle que ambos conservan su monto, fecha y responsable.
- [ ] **Cobros en la tabla:** la columna Cobrado muestra el total y, debajo, las cuentas que recibieron dinero.
- [ ] **Límite del pago:** intenta agregar más de lo pendiente. Debe impedirlo sin modificar la venta.
- [ ] **Pago total:** agrega exactamente lo pendiente. El menú debe mostrar Pedido pagado y no permitir otro pago.
- [ ] **Agregar envío:** selecciona agencia, costo y quién lo pagó; confirma que cambian costo total, utilidad y liquidación.
- [ ] **Recojo opcional:** el campo de costo de recojo solo aparece después de marcar ¿Hubo costo de recojo?
- [ ] **Editar envío:** corrige un envío existente y confirma que reemplaza el monto anterior, no que lo suma.
- [ ] **Envío compartido:** registra desde Pedidos y edita desde Por despachar —y luego al revés—; ambas vistas muestran el mismo dato sin duplicarlo.
- [ ] **Recargar:** actualiza el navegador y confirma que los cambios permanecen.
- [ ] **Código repetido:** intenta guardar un código existente. Debe mostrar una advertencia clara.
- [ ] **Campos obligatorios:** deja cliente o producto vacío. No debe guardar.
- [ ] **Número simple:** una venta nueva propone el siguiente número (1, 2, 3…) y permite editarlo.
- [ ] **SKU:** Luffy + Negro + Termo 1200 ml produce `OP-L-N-1200`.
- [ ] **SKU:** Jujutsu Kaisen Toji + Crema + Termo 890 ml produce `JJK-TJ-C-890`.
- [ ] **SKU:** Demon Slayer + Negro + Termo 1200 ml produce `DS-N-1200`.
- [ ] **Color nuevo:** elige Otro color, escribe un color y confirma que se conserva en el pedido y en el CSV.
- [ ] **Formulario mínimo:** solo muestra fecha, pedido, cliente, producto, color, diseño, cantidad, venta, cobrado, quién cobró, estado, canal y grabado tercerizado.
- [ ] **Sin logística inicial:** Nueva venta no muestra agencia, envío, recojo ni problemas.
- [ ] **Sin forma de pago:** Nueva venta no muestra selector de forma o método de pago.
- [ ] **Problema simple:** abre ⋮ → Señalar problema, selecciona tipo y costo; el costo se suma automáticamente.
- [ ] **Problemas múltiples:** agrega dos incidencias al mismo pedido y confirma que ambas aparecen en la sección Problemas y que sus costos se suman.
- [ ] **Problema nuevo:** selecciona Nuevo problema, escribe su nombre y confirma que queda disponible para futuros pedidos.
- [ ] **Fila afectada:** un pedido con problemas se resalta en rojo claro y la tabla no tiene columna Problema.
- [ ] **Datos opcionales:** al abrirlos solo aparecen ajustes de costos; no aparecen cobros, teléfono, seguimiento ni otros datos logísticos.

## Cálculos

Usa una venta de S/ 119.90.

- [ ] **Por cobrar:** adelanto S/ 19.90 y saldo S/ 0.00 → por cobrar S/ 100.00.
- [ ] **Cobrado total:** adelanto S/ 19.90 y saldo S/ 100.00 → cobrado S/ 119.90.
- [ ] **Comisión manual:** activa Ajustar comisión manualmente y confirma que conserva el valor escrito.
- [ ] **Costo 890:** producto S/ 19 + packaging S/ 3 = producción S/ 22.
- [ ] **Costo 1200 con láser:** marca grabado por tercero; el costo sugerido es S/ 20 y la producción resulta S/ 48.50.
- [ ] **Láser personalizado:** cambia el costo del tercero a S/ 35 y confirma que la producción suma ese importe.
- [ ] **Costo shaker:** producto S/ 29 + packaging S/ 3 = producción S/ 32.
- [ ] **Grabado TERMAL:** deja la casilla desmarcada y confirma que el grabado suma S/ 0.
- [ ] **Cantidad:** dos unidades duplican producto, packaging y láser en el costo de producción.
- [ ] **Costo personalizado:** actívalo, escribe S/ 40 y confirma que reemplaza el costo automático del pedido.
- [ ] **Cobro mayor a venta:** pide confirmación antes de guardar.

## Liquidaciones de los escenarios reales

- [ ] **Gonzalo + DINSIDES:** venta 119.90; adelanto 19.90 a Gonzalo; saldo 100 a DINSIDES; envío 12 pagado por Gonzalo → Gonzalo S/ 7.90 y DINSIDES S/ 100.00.
- [ ] **DINSIDES descuenta envío:** saldo 100 a DINSIDES; envío 12 y pagador DINSIDES → DINSIDES debe depositar S/ 88.00.
- [ ] **Pedido pagado y recojo DINSIDES:** pago 119.90 a Mancomunada; saldo DINSIDES 0; envío 12 y pagador DINSIDES → Termal debe pagar S/ 12.00.
- [ ] **Shalom provincia:** pago completo 119.90 a Gonzalo; envío 15 pagado por Gonzalo → Gonzalo debe devolver S/ 104.90.
- [ ] **Izipay:** pago 119.90 a Mancomunada → Gonzalo y Alberto deben devolver S/ 0.00.
- [ ] **Alberto:** pago 89.90 a Alberto; envío 12 pagado por Alberto → Alberto debe devolver S/ 77.90.
- [ ] **Saldo negativo:** sin dinero recibido por Gonzalo, registra un envío de S/ 12 pagado por Gonzalo → Gonzalo debe devolver −S/ 12.00 y la tarjeta indica que es un saldo a su favor.
- [ ] **Devolución parcial:** registra menos que el total pendiente. El pedido muestra liquidación Parcial.
- [ ] **Aplicación por antigüedad:** registra una devolución que cubra varios pedidos. Confirma en el detalle que se aplicó primero al más antiguo.
- [ ] **Monto excesivo:** intenta registrar más que el pendiente. Debe rechazarlo.
- [ ] **Historial:** confirma que el movimiento aparece en el detalle y en la hoja `Movimientos`.

## Producción y despachos

- [ ] **Operación:** Producción, Por despachar, Despachados y Entregados están en una sola sección.
- [ ] **Tablas:** todas las pestañas, incluida Producción, muestran sus pedidos como tabla.
- [ ] **Primera flecha:** en Producción pulsa A despacho →. El pedido pasa a Por despachar.
- [ ] **Segunda flecha:** en Por despachar pulsa Despachar →. Se abre la salida y, al confirmar, pasa a Despachados.
- [ ] **Tercera flecha:** en Despachados pulsa Entregado →. El pedido pasa a Entregados con fecha de hoy.
- [ ] **Agregar envío aquí:** Por despachar permite agregar o editar el mismo envío de la sección Pedidos.
- [ ] **Confirmar salida:** cambia todos los seleccionados a Despachado y registra la fecha sin modificar sus costos de envío.
- [ ] **En ruta:** muestra teléfono, seguimiento, cobro y liquidación.
- [ ] **Ruta demorada:** un pedido con 3 o más días se resalta.
- [ ] **Entregado:** marca un pedido en ruta como Entregado; registra la fecha de hoy.
- [ ] **Problemas:** una fila afectada se resalta en Pedidos; su tipo, nota y costo aparecen en la sección Problemas.
- [ ] **Problemas múltiples:** dos problemas del mismo pedido aparecen como dos filas en la sección Problemas.

## Dashboard y filtros

- [ ] Cambia entre Hoy, Esta semana, Histórico, un mes de la lista y Rango personalizado.
- [ ] Las métricas coinciden con las ventas del periodo.
- [ ] La gráfica de Ventas y Utilidad usa líneas y cambia junto con las métricas para cada filtro.
- [ ] Histórico incluye todos los pedidos; el selector mensual permite revisar por lo menos los últimos 24 meses.
- [ ] Haz clic en una liquidación y revisa los pedidos que componen el total.
- [ ] Busca por código, cliente y producto.
- [ ] Prueba filtros de estado, producto, canal y problema.
- [ ] Exporta CSV y confirma que Excel lo abre con acentos correctos.
- [ ] En Pedidos aparece un solo botón Nueva venta y el buscador, filtros y exportación comparten una fila en escritorio.

## Sincronización y errores

- [ ] Pulsa ↻ y confirma el mensaje de actualización.
- [ ] Modifica una fila en Google Sheets, espera 30 segundos y confirma que aparece.
- [ ] Desconecta internet. Debe mostrar aviso y no guardar.
- [ ] Deja `API_URL` sin configurar. Debe usar demostración y no Google Sheets.
- [ ] Escribe una URL incorrecta. Debe explicar que revises `config.js` y la implementación.
- [ ] Ingresa una clave incorrecta. No debe mostrar ventas reales.
- [ ] Abre la aplicación en dos navegadores, edita la misma venta y confirma que evita sobrescribir una versión más reciente.

## Celular y accesibilidad

- [ ] Abre la aplicación en un teléfono o usa el modo móvil del navegador.
- [ ] El menú inferior permite abrir Dashboard, Pedidos, Operación y Problemas.
- [ ] El botón central ＋ abre Nueva venta.
- [ ] El formulario puede desplazarse y el botón Guardar permanece visible.
- [ ] Las tablas se desplazan horizontalmente sin romper la página.
- [ ] Los campos se pueden recorrer con Tab en computadora.
- [ ] Ctrl + Enter guarda el formulario.
- [ ] No hay botones visibles que no respondan.
