# Fase 9 — Validación y cierre técnico

Fecha: 30/07/2026

Rama local: `erp-v2-desarrollo`

Publicación: no se hizo push, merge ni despliegue.

## Resultado

La versión de desarrollo quedó validada en modo demostración. Las pruebas cubren cálculos, Pedidos, flujo logístico, Dashboard, Caja interna y comportamiento responsive.

Se corrigió un detalle de accesibilidad:

- el buscador de Pedidos ahora tiene un nombre descriptivo;
- el botón compacto de filtros informa su función y si el panel está abierto.

## Pruebas automáticas

Ejecutadas correctamente:

```powershell
node tests\phase9-smoke.cjs
node tests\phase9-api-smoke.cjs
```

Cobertura principal:

- 12 pedidos de demostración;
- SKU oficiales y costos de 890 ml, 1200 ml y shaker;
- grabado tercerizado, cantidad y costo personalizado;
- cobrado, por cobrar y responsables del dinero;
- filtros, búsqueda, atrasos y estados logísticos;
- pagos múltiples, envío, problemas y detalle del pedido;
- Dashboard analítico;
- Caja con saldos positivos, negativos y movimientos en ambos sentidos;
- alta, edición, papelera, restauración y despacho mediante la API de demostración;
- compatibilidad con movimientos históricos sin contarlos dos veces.

## Pruebas responsive

| Ancho | Resultado |
| --- | --- |
| 360 px | Tarjetas en una columna, cuatro pedidos visibles, sin scroll horizontal |
| 390 px | Tarjetas en una columna, cinco pedidos visibles, sin scroll horizontal |
| 820 px | Tarjetas en dos columnas y navegación móvil, sin scroll horizontal |
| 1280 px | Tabla de escritorio activa, navegación lateral y sin scroll de página |

También se comprobaron:

- formulario de venta desplazable con pie visible;
- detalle del pedido dentro del ancho móvil;
- filtros rápidos;
- confirmación antes de avanzar una etapa;
- Caja interna y sus tres personas;
- ausencia de errores en la consola.

## Google Sheets

Pruebas de solo lectura realizadas:

- el endpoint publicado respondió HTTP 200 y reportó el servicio en línea;
- una clave deliberadamente inválida fue rechazada con `UNAUTHORIZED`;
- no se leyó, creó ni modificó ningún pedido real.

No fue posible ejecutar una prueba autenticada de `getAll` ni de escritura porque `google-apps-script/Code.gs` tiene 0 bytes y nunca quedó versionado. No se debe reemplazar el Apps Script publicado con ese archivo vacío.

## Cambios en Google Sheets

Ninguno.

No se añadieron columnas, no se ejecutaron migraciones y no se modificaron datos reales.

## Revisión manual pendiente

Antes de conectar los nuevos movimientos de Caja a los datos reales:

1. Recuperar el contenido vigente de `Code.gs` desde el editor de Apps Script.
2. Guardarlo en la carpeta local `google-apps-script`.
3. Hacer una copia del Google Sheets.
4. Añadir de forma compatible la acción `createCashMovement` y las columnas nuevas.
5. Probar lectura y escritura sobre una copia de la hoja.
6. Solo después preparar una nueva versión del Apps Script.
