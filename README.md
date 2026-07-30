# ERP MINI TERMAL

Aplicación web sencilla para registrar ventas una sola vez y obtener automáticamente el SKU, los cobros, el costo, la utilidad y el estado operativo.

La navegación diaria tiene tres secciones: **Dashboard**, **Pedidos** y **Problemas**. Producción, Por despachar, Despachados y Entregados se gestionan mediante filtros y acciones dentro de Pedidos.

No necesitas instalar programas ni contratar un servidor. La aplicación usa:

- Google Sheets para guardar los pedidos.
- Google Apps Script para leer y modificar la hoja.
- GitHub Pages para publicar la pantalla de la aplicación.

La aplicación ya funciona en **modo demostración**. Mientras `config.js` conserve el texto `PEGAR_AQUI_URL_DE_GOOGLE_APPS_SCRIPT`, los datos de ejemplo se guardan únicamente en ese navegador y nunca se mezclan con tu Google Sheets.

## Antes de comenzar

Reserva entre 30 y 45 minutos. Necesitarás:

- Una cuenta de Google.
- Una cuenta de GitHub.
- El archivo `ERP_MINI_TERMAL_v1.xlsx`.
- Esta carpeta completa.

Haz primero una copia del Excel. La preparación inicial reorganiza la hoja `Ventas` para añadir las columnas que necesita la aplicación.

## Parte 1 — Probar la aplicación sin conectar Google Sheets

1. Abre la carpeta del proyecto.
2. Haz doble clic en `index.html`.
3. Se abrirá la aplicación con pedidos de ejemplo.
4. Prueba **Nueva venta**, **Editar**, **Agregar pago**, **Agregar envío** y las flechas de estado en **Pedidos**.
5. Estos datos son solo de demostración y permanecen en ese navegador.

## Parte 2 — Crear el repositorio en GitHub

1. Entra en [github.com](https://github.com/) e inicia sesión.
2. En la esquina superior derecha, haz clic en el símbolo **+**.
3. Haz clic en **New repository**.
4. En **Repository name**, escribe `erp-mini-termal`.
5. En visibilidad puedes elegir **Private** o **Public**. GitHub Pages puede exigir un plan de pago para repositorios privados, según tu cuenta. La clave y los datos no están en el repositorio.
6. No marques **Add a README file**, porque este proyecto ya tiene uno.
7. Haz clic en **Create repository**.
8. En la pantalla siguiente, busca el enlace **uploading an existing file** y haz clic.
9. Arrastra a la página todos los archivos y carpetas de este proyecto. Deben incluir `index.html`, `styles.css`, `app.js`, `api.js`, `config.js`, `utils.js`, `charts.js`, `demo-data.js`, `README.md`, `TESTING.md`, la carpeta `google-apps-script` y tu archivo `logo-termal.png`.
10. Espera a que termine la carga.
11. En **Commit changes**, escribe `Primera versión de ERP MINI TERMAL`.
12. Haz clic en **Commit changes**.

Todavía no actives GitHub Pages. Primero conecta Google Sheets y actualiza `config.js`.

## Parte 3 — Subir y convertir el Excel a Google Sheets

1. Entra en [drive.google.com](https://drive.google.com/) con la cuenta que administrará Termal.
2. Haz clic en **+ Nuevo**.
3. Haz clic en **Subir archivo**.
4. Selecciona `ERP_MINI_TERMAL_v1.xlsx`.
5. Espera a que termine la carga.
6. Haz doble clic sobre el archivo subido.
7. En la parte superior, haz clic en **Abrir con Hojas de cálculo de Google**.
8. Cuando se abra, haz clic en **Archivo**.
9. Haz clic en **Guardar como Hojas de cálculo de Google**.
10. Se abrirá una nueva copia. Confirma que aparecen las hojas `Ventas`, `Listas` y `README`.
11. Cambia el nombre de la nueva hoja a `ERP MINI TERMAL`.
12. Haz clic en **Archivo → Hacer una copia** y guarda una copia llamada `RESPALDO ANTES DE INSTALAR ERP MINI TERMAL`.

### Cómo reconocer el ID de la hoja

Mira la dirección que aparece en el navegador. Tendrá una forma parecida a:

`https://docs.google.com/spreadsheets/d/1AbCDefGHIjkLmNopQRstuVWxyz123456789/edit`

El ID es el texto que está entre `/d/` y `/edit`. En el ejemplo sería:

`1AbCDefGHIjkLmNopQRstuVWxyz123456789`

Si abres Apps Script desde la propia hoja, normalmente no tendrás que pegar este ID porque la conexión se detecta sola.

## Parte 4 — Pegar y preparar Google Apps Script

1. En la hoja `ERP MINI TERMAL`, abre el menú **Extensiones**.
2. Haz clic en **Apps Script**.
3. Se abrirá una nueva pestaña.
4. En la columna izquierda, haz clic en el archivo `Código.gs` o `Code.gs`.
5. Selecciona todo el texto del editor con **Ctrl + A**.
6. Bórralo.
7. Abre el archivo `google-apps-script/Code.gs` de este proyecto con el Bloc de notas.
8. Selecciona todo con **Ctrl + A** y copia con **Ctrl + C**.
9. Regresa a Apps Script y pega con **Ctrl + V**.
10. Haz clic en el icono de disquete **Guardar proyecto**.
11. Arriba del editor, abre el selector que suele mostrar `doGet`.
12. Selecciona `prepararInstalacionInicial`.
13. Haz clic en **Ejecutar**.
14. Google mostrará **Se requiere autorización**. Haz clic en **Revisar permisos**.
15. Selecciona la misma cuenta de Google.
16. Si aparece “Google no verificó esta aplicación”, haz clic en **Configuración avanzada**.
17. Haz clic en **Ir a ERP MINI TERMAL (no seguro)**. El aviso aparece porque es tu propio script, no porque el código se envíe a un tercero.
18. Haz clic en **Permitir**.
19. Espera a que la ejecución termine.
20. Abajo, abre **Registro de ejecución** si no está visible.
21. Busca la línea `CLAVE DE ACCESO (cópiala ahora)`.
22. Copia únicamente la clave que aparece después de los dos puntos y guárdala en un lugar privado. La aplicación te la pedirá al entrar.
23. Regresa a Google Sheets y confirma que existe una hoja nueva llamada `Movimientos`. No la llenes manualmente.

La hoja `Ventas` seguirá siendo la fuente principal. `Movimientos` existe únicamente para conservar el historial de devoluciones y liquidaciones parciales.

### Si Apps Script no detecta la hoja

Esto solo debería ocurrir si creaste el script fuera de Google Sheets.

1. En `Code.gs`, busca `SPREADSHEET_ID: "USAR_HOJA_VINCULADA"`.
2. Reemplaza únicamente `USAR_HOJA_VINCULADA` por el ID explicado arriba.
3. Guarda.
4. Vuelve a ejecutar `prepararInstalacionInicial`.

## Parte 5 — Publicar Google Apps Script como aplicación web

1. En Apps Script, arriba a la derecha, haz clic en **Implementar**.
2. Haz clic en **Nueva implementación**.
3. Junto a **Seleccionar tipo**, haz clic en el icono de engranaje.
4. Selecciona **Aplicación web**.
5. En **Descripción**, escribe `ERP MINI TERMAL v1`.
6. En **Ejecutar como**, selecciona **Yo**.
7. En **Quién tiene acceso**, selecciona **Cualquier usuario**.
8. Haz clic en **Implementar**.
9. Si Google vuelve a pedir permisos, autoriza con la misma cuenta.
10. En **URL de la aplicación web**, haz clic en **Copiar**.
11. La dirección debe terminar en `/exec`. No uses la dirección que termina en `/dev`.
12. Guarda esa dirección temporalmente.

La opción “Cualquier usuario” es necesaria para que el navegador pueda comunicarse desde GitHub Pages. Los datos siguen protegidos por la clave privada comprobada dentro de Apps Script.

## Parte 6 — Conectar `config.js`

1. Regresa a tu repositorio `erp-mini-termal` en GitHub.
2. Haz clic en el archivo `config.js`.
3. Haz clic en el icono del lápiz **Edit this file**.
4. Busca esta línea:

```js
API_URL: "PEGAR_AQUI_URL_DE_GOOGLE_APPS_SCRIPT",
```

5. Reemplaza solo el texto entre comillas por la URL que termina en `/exec`. Ejemplo:

```js
API_URL: "https://script.google.com/macros/s/XXXXXXXXXXXX/exec",
```

6. No pegues la clave de acceso en `config.js`.
7. Haz clic en **Commit changes…**.
8. En el cuadro que aparece, vuelve a hacer clic en **Commit changes**.

## Parte 7 — Activar GitHub Pages

1. En el repositorio de GitHub, haz clic en **Settings**.
2. En la columna izquierda, haz clic en **Pages**.
3. En **Build and deployment**, busca **Source** y selecciona **Deploy from a branch**.
4. En **Branch**, selecciona `main` o `master`, según lo que muestre tu repositorio.
5. En la carpeta, selecciona `/(root)`.
6. Haz clic en **Save**.
7. Espera entre 1 y 5 minutos.
8. Actualiza la página de **Settings → Pages**.
9. GitHub mostrará una dirección parecida a `https://tuusuario.github.io/erp-mini-termal/`.
10. Haz clic en **Visit site**.
11. La aplicación pedirá la clave generada por `prepararInstalacionInicial`.
12. Pega la clave y haz clic en **Entrar**.

La clave se conserva solo durante esa sesión del navegador. Si cierras completamente la pestaña o el navegador, puede pedirla de nuevo.

## Parte 8 — Realizar la prueba completa

1. En la aplicación, haz clic en **Nueva venta**.
2. Deja la fecha de hoy.
3. Confirma que se generó el siguiente número de pedido.
4. Escribe `Cliente de prueba`.
5. Selecciona producto, color y diseño; confirma que aparece el SKU.
6. Escribe `119.90` en venta.
7. Completa modalidad, monto recibido, cuenta, estado y canal.
8. Haz clic en **Guardar venta**.
9. Regresa a Google Sheets.
10. Abre la hoja `Ventas` y confirma que apareció una nueva fila.
11. Regresa a la aplicación y abre **Pedidos**.
12. Busca `Cliente de prueba`.
13. Haz clic en el lápiz, cambia el cliente a `Cliente de prueba editado` y guarda.
14. Confirma el cambio en Google Sheets.
15. En la fila del pedido, pulsa **⋮ → Agregar pago**.
16. Ingresa un monto menor o igual a lo pendiente, elige quién lo recibió y confirma.
17. Comprueba que aumentó **Cobrado** y disminuyó **Por cobrar** en la misma cantidad.

## Uso diario

### Registrar una venta rápido

1. Pulsa **Nueva venta** o usa **Ctrl + K**.
2. Completa fecha, pedido, cliente, producto, color, diseño, cantidad, venta, cobrado, quién cobró, estado y canal. El número y el SKU se generan solos.
3. Si el grabado lo hizo TERMAL, deja desmarcada **Grabado por un tercero**.
4. Si lo tercerizaste, marca la casilla y modifica el costo si fue distinto de los S/ 20 sugeridos.
5. Abre **Datos opcionales** únicamente si necesitas cambiar el costo de producción, la comisión u otro costo.
6. Guarda con el botón o con **Ctrl + Enter**.

La aplicación recuerda el último producto, color, diseño y canal usados en ese navegador.

El registro inicial no solicita envío, forma de pago ni problemas. Esos datos se agregan después desde el menú de tres puntos de cada fila en **Pedidos**.

### Catálogo y colores

- Termo 1200 ml: Negro, Crema y Blanco.
- Termo 890 ml: Negro, Crema y Blanco.
- Shaker: Negro y Azul.
- En el formulario puedes elegir **Otro color…**. Al guardar la venta, ese color queda disponible automáticamente para los siguientes pedidos del mismo producto.
- También puedes administrarlos directamente en la hoja `Listas`: categoría `Color`, el nombre en `Valor` y el producto exacto en `Aplica a`.

Los códigos se forman automáticamente. Ejemplos: `OP-L-N-1200`, `JJK-TJ-C-890` y `DS-N-1200`.

### Agregar un pago posterior

1. Abre **Pedidos**.
2. Busca el pedido, pulsa **⋮** y elige **Agregar pago**.
3. Escribe el nuevo monto y selecciona quién recibió el pago.
4. Confirma. **Cobrado** aumenta y **Por cobrar** disminuye automáticamente.

Por ejemplo, una venta de S/ 149.90 con S/ 19.90 cobrados queda en S/ 130.00 por cobrar. Si agregas S/ 50.00, mostrará S/ 69.90 cobrados y S/ 80.00 por cobrar.

Cada pago posterior conserva su monto, fecha y responsable, por lo que varios pagos del mismo pedido pueden haber sido recibidos por personas distintas.

### Agregar o corregir un envío posterior

1. Abre **Pedidos**, pulsa **⋮** y elige **Agregar envío**.
2. Selecciona la agencia, escribe el costo y selecciona quién pagó el envío.
3. Si hubo recojo, marca **¿Hubo costo de recojo?** y escribe el monto.
4. Guarda. El costo total, la utilidad y las liquidaciones se recalculan automáticamente.

Si el envío ya estaba registrado, el menú muestra **Editar envío** y reemplaza el registro anterior; nunca se suma dos veces.

### Revisar problemas

En **Pedidos**, pulsa **⋮ → Señalar problema**. La fila afectada se resalta suavemente en rojo, sin añadir una columna extra. Abre la sección **Problemas** para ver cada incidencia por separado, incluyendo cliente, tipo, nota y costo. Si un pedido tiene dos incidencias, aparecen dos filas.

### Eliminar o restaurar un pedido

En **Pedidos**, pulsa **⋮ → Eliminar pedido**. El pedido se mueve a la papelera y deja de contar inmediatamente en el Dashboard y las liquidaciones.

La eliminación es recuperable: abre **Filtros**, marca **Ver papelera** y pulsa **Restaurar** en la fila correspondiente. El pedido nunca se borra físicamente de Google Sheets.

### Confirmar una salida

1. Abre **Pedidos** y usa el filtro **Por despachar**.
2. Si falta la logística, abre **⋮ → Agregar envío**.
3. Para una salida individual, pulsa la flecha de la tarjeta o fila.
4. Para una salida conjunta, abre **Filtros → Despachar varios**, selecciona los pedidos, revisa la fecha y confirma.

La flecha de cada tarjeta o fila avanza el pedido: Producción → Por despachar → Despachado → Entregado. Al despachar, la flecha abre los datos mínimos de la salida.

### Consultar el Dashboard

El Dashboard está dedicado al análisis y evita repetir la lista operativa de Pedidos. Muestra el resumen económico del periodo, el canal principal, el producto más rentable, el diseño más vendido, el porcentaje cobrado y comparaciones ordenadas por canal, producto y diseño.

Puedes consultar **Hoy**, **Esta semana**, todo el **Histórico**, un mes específico o un rango personalizado desde un único selector compacto. Todas las métricas y comparaciones se actualizan juntas.

### Registrar una devolución a la mancomunada

1. En el Dashboard, haz clic en **Registrar devolución**.
2. Para Alberto, abre primero la tarjeta **Alberto debe devolver** y pulsa **Registrar devolución**.
3. Ingresa el monto y la fecha.
4. Añade una observación si deseas.
5. Confirma.

El monto se aplica a las obligaciones más antiguas. Si no cubre todo, queda una liquidación parcial. La hoja `Movimientos` conserva cada aplicación.

Los saldos de Gonzalo y Alberto son netos. Si una persona pagó un envío con su dinero y todavía no recibió dinero del pedido, su tarjeta puede mostrar un número negativo. Por ejemplo, **Gonzalo debe devolver −S/ 12.00** significa que Termal le debe S/ 12.00 a Gonzalo.

## Actualizar el backend después de cambiar `Code.gs`

No basta con guardar el archivo. Debes crear una versión nueva:

1. En Apps Script, haz clic en **Implementar**.
2. Haz clic en **Administrar implementaciones**.
3. En la implementación activa, haz clic en el icono del lápiz.
4. En **Versión**, selecciona **Nueva versión**.
5. Escribe una descripción.
6. Haz clic en **Implementar**.
7. La URL `/exec` normalmente permanece igual; no necesitas volver a editar `config.js`.

## Seguridad: qué protege esta versión y cuáles son sus límites

GitHub Pages publica archivos estáticos. Por sí solo no puede ocultar la pantalla con seguridad ni guardar secretos.

Esta versión usa una clave compartida que:

- Se genera y almacena en **Propiedades del script** de Google Apps Script.
- No está escrita en GitHub.
- Se envía al backend con cada operación.
- Se guarda únicamente en la sesión del navegador.
- Es comprobada antes de leer o modificar Google Sheets.

Limitaciones honestas:

- Quien obtenga la clave podrá usar la API hasta que generes una nueva.
- La clave puede verse en las herramientas del navegador mientras la sesión está abierta.
- “Cualquier usuario” permite llegar al script, pero no leer datos sin la clave.
- Esto es una protección razonable para un equipo pequeño, no una autenticación empresarial con usuarios individuales y permisos distintos.

Si más adelante necesitas máxima seguridad, usuarios individuales, doble factor o auditoría por persona, conviene mover el frontend y la API a un servicio con autenticación real, por ejemplo Cloudflare Access/Workers, Firebase Authentication o una aplicación interna de Google Workspace. Esa arquitectura es más compleja que el objetivo de este ERP.

Si sospechas que alguien obtuvo la clave:

1. Abre Apps Script.
2. Selecciona la función `generarNuevaClaveDeAcceso`.
3. Haz clic en **Ejecutar**.
4. Copia la nueva clave desde **Registro de ejecución**.
5. La clave anterior dejará de funcionar inmediatamente.

## Copias de seguridad

1. Abre Google Sheets.
2. Haz clic en **Archivo → Hacer una copia**.
3. Nombra la copia `RESPALDO ERP MINI TERMAL - fecha`.
4. Hazlo por lo menos una vez por semana.
5. También puedes usar **Archivo → Historial de versiones → Ver historial de versiones** para recuperar cambios.

## Solución de problemas

### “No se pudo conectar con Google Sheets”

1. Abre `config.js` en GitHub.
2. Confirma que la URL termina en `/exec`.
3. Abre Apps Script → **Implementar → Administrar implementaciones**.
4. Confirma que **Quién tiene acceso** sea **Cualquier usuario**.
5. Confirma que ejecutaste `prepararInstalacionInicial`.
6. Prueba abrir la URL `/exec` en otra pestaña. Debe mostrar un mensaje indicando que el backend está publicado.

### “La clave no es correcta”

1. Ejecuta `generarNuevaClaveDeAcceso` en Apps Script.
2. Abre **Registro de ejecución**.
3. Copia la clave completa, sin espacios al principio o al final.
4. Recarga la aplicación y pégala.

### La venta no aparece en la aplicación

1. Haz clic en el botón circular **↻** de la esquina superior derecha.
2. Espera a que muestre “Actualizado”.
3. Revisa que la venta no esté archivada.
4. Revisa los filtros activos en **Pedidos**.

### Cambié `Code.gs` y el cambio no funciona

Debes crear una **Nueva versión** en **Implementar → Administrar implementaciones**. Guardar el código no actualiza la versión pública.

### Google muestra un error de permisos

1. Abre Apps Script.
2. Ejecuta `comprobarConexion`.
3. Autoriza de nuevo si lo solicita.
4. Si la hoja pertenece a otra cuenta, comparte el Google Sheets con la cuenta que creó la implementación.

### Se duplicó un código

El backend bloquea escrituras simultáneas y rechaza códigos repetidos. Si escribiste filas directamente en Google Sheets, corrige el código duplicado allí y sincroniza.

### No hay internet

La aplicación muestra una franja de aviso. No permite guardar cambios sin conexión para evitar pedidos duplicados o inconsistentes. Cuando vuelva internet, pulsa **↻**.

## Archivos del proyecto

- `index.html`: estructura principal.
- `styles.css`: diseño responsive.
- `app.js`: pantallas e interacciones.
- `api.js`: conexión con Google Apps Script y modo demostración.
- `utils.js`: cálculos y validaciones.
- `charts.js`: gráficos sin librerías externas.
- `demo-data.js`: pedidos de demostración, separados de los reales.
- `config.js`: única URL que debes cambiar.
- `google-apps-script/Code.gs`: backend.
- `google-apps-script/appsscript.json`: configuración de Apps Script.
- `google-apps-script/README_GOOGLE_APPS_SCRIPT.md`: guía específica del backend.
- `TESTING.md`: pruebas manuales.

## Referencias oficiales

- [Configurar GitHub Pages desde una rama](https://docs.github.com/es/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Publicar Google Apps Script como aplicación web](https://developers.google.com/apps-script/guides/web)
- [Convertir archivos de Microsoft Office en Google Drive](https://support.google.com/drive/answer/9406611?hl=es)
