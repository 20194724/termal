# Guía de Google Apps Script — ERP MINI TERMAL

Esta guía explica únicamente el backend. Para la instalación completa, sigue primero el `README.md` de la carpeta principal.

## Pegar el backend

1. Abre el Google Sheets que usarás con ERP MINI TERMAL.
2. Haz clic en **Extensiones → Apps Script**.
3. En la izquierda, abre `Código.gs`.
4. Selecciona todo con **Ctrl + A** y bórralo.
5. Abre `google-apps-script/Code.gs` de este proyecto.
6. Copia todo su contenido.
7. Pégalo en Apps Script.
8. Haz clic en **Guardar proyecto**.

No pegues la clave en el código. La función de preparación la genera y la guarda fuera de los archivos.

## Variable que puedes modificar

Normalmente no debes cambiar ninguna variable. Como el script se abre desde Google Sheets, detecta la hoja automáticamente.

Solo si creaste un proyecto de Apps Script separado:

1. Busca al inicio de `Code.gs`:

```js
SPREADSHEET_ID: "USAR_HOJA_VINCULADA",
```

2. Reemplaza `USAR_HOJA_VINCULADA` por el ID de Google Sheets.
3. El ID es el texto que aparece entre `/d/` y `/edit` en la dirección de la hoja.

No cambies los nombres `Ventas`, `Listas` o `Movimientos` después de preparar la instalación.

## Preparación inicial

1. En el selector de funciones, elige `prepararInstalacionInicial`.
2. Haz clic en **Ejecutar**.
3. Autoriza los permisos.
4. Abre **Registro de ejecución**.
5. Copia la clave que aparece junto a `CLAVE DE ACCESO`.

La preparación:

- Conserva una fila por pedido.
- Migra las columnas iniciales a la estructura final.
- Recalcula importes.
- Crea `Movimientos` para el historial financiero.
- Mantiene `Listas`.
- Crea una clave privada.

Haz una copia del Google Sheets antes de ejecutarla por primera vez.

## Publicar como aplicación web

1. Haz clic en **Implementar → Nueva implementación**.
2. Pulsa el engranaje y elige **Aplicación web**.
3. En **Ejecutar como**, selecciona **Yo**.
4. En **Quién tiene acceso**, selecciona **Cualquier usuario**.
5. Haz clic en **Implementar**.
6. Copia la URL que termina en `/exec`.
7. Pega esa URL en `config.js` del frontend.

## Publicar una versión nueva

Cada vez que cambies `Code.gs`:

1. Guarda el proyecto.
2. Para la versión 2, ejecuta una vez `prepararActualizacionV2`. Esta función solo añade las columnas faltantes al final de `Ventas` y `Movimientos`; no cambia la clave ni borra pedidos.
3. Haz clic en **Implementar → Administrar implementaciones**.
4. Haz clic en el lápiz de la implementación activa.
5. En **Versión**, elige **Nueva versión**.
6. Añade una descripción breve.
7. Haz clic en **Implementar**.

Si editas el código pero no creas una nueva versión, la aplicación seguirá usando el código anterior.

## Confirmar que Google Sheets está conectado

1. En el selector de funciones, elige `comprobarConexion`.
2. Haz clic en **Ejecutar**.
3. Abre **Registro de ejecución**.
4. Debes ver `Conexión correcta`, el nombre de la hoja y la cantidad de ventas.

También puedes abrir la URL `/exec` en el navegador. Debe responder que el backend está publicado, pero no mostrará datos.

## Revisar errores y registros

1. En la columna izquierda de Apps Script, haz clic en **Ejecuciones**.
2. Haz clic sobre la ejecución que tenga estado **Error**.
3. Revisa **Registros** y **Mensaje de error**.
4. Confirma qué función falló y a qué hora.

Errores comunes:

- `NOT_PREPARED`: ejecuta `prepararInstalacionInicial`.
- `SPREADSHEET_ERROR`: revisa el ID y los permisos.
- `UNAUTHORIZED`: la clave ingresada no coincide.
- `CONFLICT`: otra persona editó la misma venta; sincroniza antes de reintentar.
- `BUSY`: espera unos segundos; otra operación está guardando datos.

## Solucionar errores de permisos

1. Confirma que la cuenta que implementó Apps Script tenga acceso de edición a Google Sheets.
2. Ejecuta `comprobarConexion`.
3. Si aparece una autorización, pulsa **Revisar permisos**.
4. Selecciona la cuenta correcta.
5. Pulsa **Configuración avanzada → Ir a ERP MINI TERMAL → Permitir**.
6. Vuelve a desplegar una nueva versión si el error continúa.

## Generar una clave nueva

1. Selecciona `generarNuevaClaveDeAcceso`.
2. Haz clic en **Ejecutar**.
3. Copia la nueva clave desde **Registro de ejecución**.
4. La clave anterior dejará de funcionar.

La clave se guarda en **Configuración del proyecto → Propiedades del script** con el nombre `TERMAL_ACCESS_KEY`.

## Hacer una copia de seguridad

La forma más simple:

1. Abre Google Sheets.
2. Haz clic en **Archivo → Hacer una copia**.
3. Incluye la fecha en el nombre.

Para exportar:

1. Haz clic en **Archivo → Descargar**.
2. Elige **Microsoft Excel (.xlsx)**.

No copies solo la hoja `Ventas`; la hoja `Movimientos` contiene el historial de liquidaciones parciales.

## Cómo funciona la protección de datos

El frontend envía cada acción mediante POST y añade la clave guardada en la sesión del navegador. Apps Script rechaza la solicitud antes de abrir la hoja si la clave no coincide.

La implementación se ejecuta con los permisos del propietario. Por eso no debes compartir la clave fuera del equipo de Termal.

## Funciones disponibles para la aplicación

- `getAll`: ventas, movimientos y listas.
- `getSale`: una venta por ID.
- `createSale`: crear.
- `updateSale`: editar.
- `archiveSale`: archivar lógicamente.
- `restoreSale`: restaurar.
- `getLists`: listas desplegables y productos.
- `getMetrics`: métricas por rango.
- `nextCode`: siguiente código disponible.
- `createMovement`: devolución, depósito o pago con aplicación parcial.
- `createDispatch`: salida o recojo para varios pedidos.

Las escrituras usan `LockService`, IDs únicos y control de versión. Todos los cálculos financieros se repiten en el backend antes de guardar.
