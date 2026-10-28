# Calorie Tracker (offline)

App móvil para llevar el control de calorías y macros (proteínas, carbohidratos y grasas) que funciona **sin conexión, sin cuentas y sin servidores**. La base de datos de alimentos, el registro de comidas y los resúmenes viven en el propio móvil.

## Stack

| Parte | Tecnología |
|---|---|
| App | React Native + Expo (SDK 58, React Native 0.88), TypeScript, Expo Router |
| Datos en el móvil | SQLite local (`expo-sqlite`) con FTS5 para búsqueda de texto |
| Base de alimentos | `foods.db` precompilado, empaquetado como asset de la app |
| Pipeline de datos (solo PC) | Python + DuckDB (filtrar el volcado) + `sqlite3` (generar el `.db`) |
| Fuente de datos | [Open Food Facts](https://world.openfoodfacts.org) (España) y, si es viable, BEDCA |

## Estado del proyecto

**Versión publicada:** `v0.1.0` (APK de prueba para Android). **En desarrollo:** `v0.1.1` (rama `develop`), todavía sin APK.

### Funciones hechas

| Área | Qué hay |
|---|---|
| **Datos** | `foods.db` con ~185 000 alimentos de España (Open Food Facts), limpios y sin duplicados exactos, ~28 MB, con búsqueda de texto rápida (FTS5). Cada alimento lleva su prioridad de marca y su popularidad. |
| **Buscar** | Búsqueda en español, sin importar mayúsculas ni tildes, con porcentaje de parecido y resultados de 10 en 10. Orden: supermercados primero (Mercadona/Hacendado, Carrefour, Lidl, Dia, Aldi…), luego marcas conocidas y productos más escaneados; los alimentos propios tienen ventaja. |
| **Registro rápido** | Pestañas **Recientes** (abren con la última cantidad usada) y **Favoritos ★**, y **Copiar de otro día** (uno de los últimos 14 días, eligiendo las franjas). |
| **Escáner de códigos de barras** | Botón 📷 en Buscar. Lee EAN/UPC con la cámara y lo compara con `foods.db` y con los alimentos propios (sin internet; un EAN-13 y su UPC de 12 dígitos cuentan como el mismo). Si está, abre directamente la ventana de añadir. Si no, ofrece **crearlo uno mismo** (el formulario ya trae el código, y al guardarlo se abre para añadirlo), escanear otro, o **sugerir el alimento por correo**. No se guarda ninguna foto y no se envía nada. |
| **Hoy** | Diario con 5 franjas (desayuno, comida, snacks, merienda, cena), total del día frente al objetivo, macros con barras, y botón **+** en cada franja que abre Buscar con esa franja elegida. |
| **Editar** | Los gramos se eligen al añadir (con vista previa de kcal y macros) y se pueden cambiar después, junto con la franja. |
| **Historial** | Lista de días con sus totales; al tocar uno se ve el detalle y se puede añadir, editar o quitar comida de ese día. |
| **Objetivos** | El usuario elige sus kcal y macros, o los calcula con Mifflin-St Jeor (sexo, edad, peso, altura, actividad y objetivo). |
| **Mis alimentos** | El usuario crea los suyos (se guardan en `user.db`, con código de barras opcional) y salen en Buscar con 🥣. |
| **Copia de seguridad** | Exportar e importar JSON (diario, alimentos propios, favoritos y objetivos), validando el formato antes de importar; los duplicados se saltan. |
| **Sugerencias** | En Más, tarjeta con el correo de sugerencias y un botón que abre el correo del móvil con el mensaje preparado (no envía nada solo). Solo sale cuando `SUGGESTIONS_EMAIL` tiene valor. |
| **Más → Acerca de** | Atribución a Open Food Facts (ODbL) y aviso de que los objetivos son estimaciones. |
| **Identidad y build** | Nombre "Contador de Calorías", paquete `com.fernando.contadorcalorias`, icono y pantalla de carga propios, `eas.json` con perfiles `preview` (móviles) y `preview-emulator`, `.easignore`. Expo SDK 58. |

### Qué está probado y qué no

| | Estado |
|---|---|
| La APK `v0.1.0` | Se instaló y se usó. **Fallo encontrado:** el teclado tapaba los campos (solo en la APK, no en Expo Go). El resto no se ha comprobado de forma sistemática: falta pasar la lista de "Lo que Expo Go no reproduce", y confirmar en concreto que la búsqueda (FTS5) funciona en la APK. |
| Hecho pero **sin comprobar en una APK** | Escáner de códigos de barras (módulo nativo nuevo: necesita APK nueva), arreglo del teclado, reducción del tamaño por arquitecturas, subida a SDK 58 (con R8 activado por defecto), recientes, favoritos, copiar de otro día y el nuevo orden por marcas. Antes de sacar `v0.1.1` hay que probarlos con la lista de "Lo que Expo Go no reproduce". |

### Siguiente en la lista

Ver **"Pendiente y mejoras"**. Lo más inmediato: **poner el correo de sugerencias** en `app/src/constants/contact.ts` y probar una APK nueva (con el escáner, el teclado y el nuevo orden de resultados).

## Estructura del repo

```
calorie-tracker/
├── .github/
│   ├── workflows/ci.yml        # Comprobaciones en cada PR y subida a develop/main
│   ├── workflows/release.yml   # Al subir un tag vX.Y.Z: compila la APK y crea la release en borrador
│   └── pull_request_template.md
├── app/                        # La app del móvil (Expo)
│   ├── src/app/                #   Pantallas (cada archivo es una pantalla/ruta)
│   │   ├── _layout.tsx         #     Abre foods.db y monta las pestañas
│   │   ├── index.tsx           #     Pestaña "Hoy": diario, franjas y totales
│   │   ├── explore.tsx         #     Pestaña "Buscar": búsqueda de alimentos
│   │   ├── goals.tsx           #     Pestaña "Objetivos": calcular o elegir kcal y macros
│   │   ├── history/            #     Pestaña "Historial": lista de días y detalle de cada día
│   │   └── more/               #     Pestaña "Más": Mis alimentos, formulario, copia de seguridad, Acerca de
│   ├── src/components/         #   Piezas reutilizables
│   │   ├── app-tabs.tsx        #     Barra de pestañas de abajo
│   │   ├── add-food-modal.tsx  #     Ventana para elegir franja y gramos al añadir
│   │   ├── macro-pills.tsx     #     Etiquetas de proteínas / carbos / grasas
│   │   ├── macro-bar.tsx       #     Barra con el reparto de macros
│   │   ├── form-controls.tsx   #     Botones de elección, campos numéricos y botones − / +
│   │   ├── day-view.tsx        #     Resumen de un día (lo usan Hoy y el detalle del Historial)
│   │   ├── themed-stack.tsx    #     Navegación con cabecera nativa con los colores de la app
│   │   ├── barcode-scanner-modal.tsx # Cámara que lee códigos de barras
│   │   ├── barcode-not-found-modal.tsx # Qué hacer si el código no está (crear, escanear otro, sugerir)
│   │   ├── custom-food-form.tsx #    Formulario de alimento propio (lo usan Más y el escáner)
│   │   ├── full-screen-modal.tsx #   Pantalla completa con título y botón Cerrar
│   │   ├── food-card.tsx       #     Tarjeta de un alimento con estrella de favorito
│   │   ├── copy-day-modal.tsx  #     Ventana para copiar franjas de otro día
│   │   ├── bottom-sheet-modal.tsx #  Ventana inferior que se aparta del teclado
│   │   ├── keyboard-aware-scroll-view.tsx # ScrollView que sube hasta el campo que escribes
│   │   ├── card.tsx            #     Tarjeta base (fondo, esquinas y sombra suave)
│   │   ├── button.tsx          #     Botón principal / con borde
│   │   └── macro-progress.tsx  #     Macros consumidos frente al objetivo, con barras
│   ├── src/db/                 #   Acceso a datos
│   │   ├── search.ts           #     Búsqueda en foods.db (FTS5 + LIKE + parecido)
│   │   ├── user.ts             #     user.db: diario, migraciones, totales
│   │   ├── goals.ts            #     Guardar y leer los objetivos del usuario
│   │   ├── custom-foods.ts     #     Alimentos propios (tabla custom_foods de user.db)
│   │   ├── favorites.ts        #     Favoritos (tabla favorites de user.db)
│   │   └── backup.ts           #     Construir la copia de seguridad e importarla
│   ├── src/constants/contact.ts #  Correo de sugerencias (SUGGESTIONS_EMAIL) y apertura del correo
│   ├── src/lib/                #   Funciones puras (sin Expo); tests en src/lib/__tests__/
│   │   ├── ranking.ts          #     Parecido y bonus por marca/popularidad de los resultados
│   │   ├── nutrition.ts        #     Fórmula de Mifflin-St Jeor y reparto de macros
│   │   ├── validation.ts       #     Reglas del formato de datos (alimentos, diario, objetivos, copia)
│   │   ├── barcode.ts          #     Limpiar y comparar códigos de barras (EAN-13 / UPC)
│   │   ├── text.ts             #     Normalizar texto (sin tildes) y separar palabras
│   │   └── dates.ts            #     Fechas ISO y formato largo en español
│   ├── src/constants/theme.ts  #   Colores, espacios y colores de los macros
│   └── assets/db/foods.db      #   Base de alimentos (NO se sube a git; copiar desde pipeline)
├── pipeline/                   # Fábrica de datos: solo se ejecuta en el PC
│   ├── 01_filter_off.py        #   Volcado de OFF -> data/productos_es.csv (solo España)
│   ├── FOODS_DB_RELEASE        #   Nombre de la release de GitHub de la que el CI descarga foods.db
│   ├── check_foods_db.py       #   Comprueba que un foods.db sirve para la app (local y CI)
│   ├── test_brands.py, test_build_db.py  # Tests del pipeline (python -m unittest)
│   ├── brands.py               #   Lista editable de supermercados y marcas conocidas (orden de prioridad)
│   ├── 02_build_db.py          #   Limpia, deduplica y genera data/foods.db
│   ├── data-to-sqlite.py       #   Análisis exploratorio del CSV y esquema de la BD
│   └── data/                   #   Volcados, CSV y .db generados (ignorado por git)
├── docs/                       # Documentación (esquema, licencias...)
└── README.md
```

### Dónde hacer cada cosa

| Quiero... | Voy a... |
|---|---|
| Cambiar qué alimentos entran en la base | `pipeline/02_build_db.py` (reglas de limpieza al principio del archivo) |
| Cambiar las columnas de la base de alimentos | `pipeline/02_build_db.py` (`SCHEMA`) y `app/src/db/search.ts` (tipo `Food` y consulta) |
| Cambiar cómo se busca o se ordena | `app/src/db/search.ts` (pesos `BONUS_*` arriba del todo) |
| Ver o cambiar las comprobaciones automáticas | `.github/workflows/ci.yml` |
| Cambiar cómo se compila y publica una versión | `.github/workflows/release.yml` |
| Cambiar qué supermercados o marcas salen primero, o su orden | `pipeline/brands.py`, luego regenerar `foods.db` |
| Cambiar la pantalla de búsqueda | `app/src/app/explore.tsx` |
| Cambiar la pantalla del día | `app/src/app/index.tsx` |
| Guardar algo nuevo en el diario (campos, tablas) | `app/src/db/user.ts` (nueva migración subiendo `USER_DB_VERSION`) |
| Cambiar qué se considera un dato válido (importar / alimentos propios) | `app/src/lib/validation.ts` |
| Cambiar la fórmula de objetivos o sus rangos | `app/src/lib/nutrition.ts` |
| Poner o cambiar el correo de sugerencias | `app/src/constants/contact.ts` (`SUGGESTIONS_EMAIL`) |
| Cambiar colores o espacios | `app/src/constants/theme.ts` |
| Añadir o renombrar una pestaña | un archivo en `app/src/app/` + `app/src/components/app-tabs.tsx` |

## Primeros pasos

### 1. Generar la base de alimentos (solo la primera vez, o al cambiar las reglas)

```bash
cd pipeline
python3 -m venv .venv
source .venv/bin/activate
pip install duckdb pandas
python 01_filter_off.py     # necesita data/en.openfoodfacts.org.products.csv.gz
python 02_build_db.py       # genera data/foods.db
cp data/foods.db ../app/assets/db/foods.db
```

El volcado se descarga de <https://world.openfoodfacts.org/data> (`en.openfoodfacts.org.products.csv.gz`) y se guarda en `pipeline/data/`. Anota la fecha del volcado usado para que el resultado sea reproducible.

> Si regeneras `foods.db`, cambia el número de `FOODS_DB_NAME` (`foods-1.db` → `foods-2.db`) en `app/src/app/_layout.tsx`; si no, la app seguirá usando la copia antigua que ya tiene en el móvil.

### 2. Arrancar la app

```bash
cd app
npm install
npx expo start
```

Abre la app en el móvil con Expo Go (escaneando el QR; móvil y PC en la misma wifi). `expo-sqlite` funciona en Expo Go. Cuando necesites módulos nativos que Expo Go no incluye (p. ej. escáner de códigos de barras) pasa a un development build: `npx expo run:android`.

Si sale un error de "React Native DevTools" / "chrome-sandbox" en Linux, es solo la herramienta opcional de depuración: ignóralo.

Comandos útiles (siempre desde `app/`):

```bash
npx expo install <paquete>   # SIEMPRE en lugar de npm install para paquetes de Expo
npx expo lint                # linter
npx tsc --noEmit             # comprobación de tipos
npx expo-doctor              # diagnóstico de dependencias
```

Ejecuta lint y typecheck antes de dar una tarea por terminada. (`expo lint` da hoy un error en `use-color-scheme.web.ts`, heredado de la plantilla de Expo.)

## Cómo funcionan los datos

- **`foods.db`** (solo lectura, viene empaquetada en la app): tabla `foods` con los valores **por 100 g** y `foods_fts`, el índice de búsqueda. Los datos que no existen se dejan como `NULL`, no como 0.
- **`user.db`** (se crea en el móvil): tabla `entries` con lo que comes. Cada registro guarda los nutrientes ya calculados para los gramos tomados, así el histórico no cambia aunque cambie `foods.db`.
- **Alimentos propios:** tabla `custom_foods` en `user.db` (nunca en `foods.db`, que es de solo lectura y se reemplaza al actualizar). Cada registro del diario guarda su propia copia de los valores, así que borrar o editar un alimento propio no cambia días pasados.
- **Favoritos y recientes:** los favoritos se guardan en `user.db` (tabla `favorites`) con una copia de sus valores por 100 g, igual que los registros. Los recientes no tienen tabla: se calculan a partir del diario (último registro de cada alimento) y sus valores por 100 g se deducen de ese registro.
- **Copia de seguridad:** JSON con `app`, `format_version`, `custom_foods`, `favorites` (opcional, las copias antiguas no lo traen), `entries` y `goals`. Al importar se valida todo (mismas reglas que el pipeline: por 100 g, kcal 0–900, macros ≤ 100 g, nombres de 3 a 100 letras, fechas reales, franjas válidas); si algo falla no se importa nada. Los duplicados se saltan.
- **Objetivos:** una sola fila en `user.db` (tabla `goals`). No hay cuentas: los objetivos pertenecen a quien usa ese móvil. Guarda tanto el resultado (kcal y macros) como los datos del cálculo, para poder editarlos después.
- **Orden de los resultados:** cada alimento de `foods.db` tiene `brand_rank` (1–49 marca de supermercado, 50–99 sin marca conocida pero se vende en uno, 100 marca conocida, vacío el resto) y `scans` (veces escaneado en OFF). La app ordena por `parecido + bonus`: 40 puntos a un supermercado (algo menos cuanto más abajo esté en la lista), 20 a una marca conocida, hasta 10 por popularidad y 50 a los alimentos propios. El parecido que se muestra no incluye los bonus. Los pesos están en `app/src/db/search.ts`. Como en búsquedas amplias ("pollo") los 100 más parecidos pueden no incluir ninguno de supermercado, se piden tres listas de candidatos (por parecido, por marca y por popularidad) y se ordenan juntas.
- **Búsqueda:** el texto se pasa a minúsculas y sin tildes. Primero busca palabras que empiezan por lo escrito (FTS5, muy rápido) y luego lo escrito dentro de cualquier palabra (LIKE). Cada resultado recibe un porcentaje de parecido y se ordenan de mayor a menor. Solo funciona en español y no corrige erratas.

## Plan de trabajo y ramas

Ver la sección **Versiones, ramas y releases** más abajo.

### Fases 0 a 3 — hechas

| Fase | Contenido | Ramas sugeridas si quieres separar el historial |
|---|---|---|
| 0 Preparación | Estructura del repo, licencias | `chore/repo-structure`, `docs/licenses` |
| 1 Datos | Filtrado de OFF, limpieza, `foods.db` | `feat/pipeline-filter-off`, `feat/pipeline-build-db` |
| 2 Búsqueda | `foods.db` en la app, pantalla Buscar | `feat/app-load-foods-db`, `feat/app-food-search` |
| 3 Diario | `user.db`, añadir alimentos, pantalla Hoy | `feat/user-db`, `feat/meal-log`, `feat/day-screen` |

Pendiente de la fase 0: documentar la atribución ODbL en la app (pantalla "Acerca de") y revisar la licencia de BEDCA.

## Pendiente y mejoras

Ordenado por prioridad. Cada punto es una rama `feature/…` o `fix/…` (ver "Versiones, ramas y releases"). Al terminar uno, bórralo de aquí o pásalo a "Estado del proyecto".

### 🔴 Antes de dar la app a más gente

- [ ] **Confirmar en una APK nueva el arreglo del teclado** (los campos quedaban tapados solo en la APK, no en Expo Go). El arreglo ya está en `develop` (`bottom-sheet-modal.tsx`, `keyboard-aware-scroll-view.tsx`); ver "Lo que Expo Go no reproduce".
- [ ] Otros fallos encontrados en las pruebas: describirlos aquí y abrir `fix/…`.
- [ ] **Verificar la búsqueda (FTS5) en la APK de producción**, no solo en Expo Go. Si falla, `foods.db` no se está incluyendo (revisar `.easignore`).
- [ ] **Licencia del código:** `app/LICENSE` es la MIT de la plantilla de Expo (con el copyright de Expo). Sustituirla por una propia y añadir un `LICENSE` en la raíz.
- [ ] **Licencia de los datos (ODbL):** publicar `foods.db` (o el modo de generarlo) en abierto y enlazarlo desde "Más → Acerca de". Hay que hacerlo si se distribuye la app.
- [ ] **Ampliar `pipeline/brands.py`**: la lista de marcas conocidas es corta (~100) y hecha a mano; revisar qué marcas faltan o están mal asignadas.
- [ ] **Activar el CI/CD** (una sola vez): crear el secreto `EXPO_TOKEN`, publicar la release de `foods.db` y probar el workflow con `dry_run`. Pasos en "CI/CD (GitHub Actions)".
- [ ] **Poner el correo de sugerencias** en `app/src/constants/contact.ts` (`SUGGESTIONS_EMAIL`, hoy vacío). Mientras esté vacío, ni la tarjeta de Más ni el botón del escáner se muestran.
- [ ] **Datos incompletos:** en el total del día, avisar cuando algún alimento tenga fibra, azúcares o sal en `NULL` (hoy se suman como 0 sin decir nada).
- [ ] **Probar en más dispositivos** (otras versiones de Android, pantallas pequeñas, modo oscuro, texto grande).

### 🐞 Fallos pequeños por corregir

- [ ] **La ventana de añadir un alimento enseña una barrita arriba** (el "tirador") que parece indicar que se puede arrastrar hacia abajo para cerrarla, pero **no se puede**. Hay dos soluciones: que se pueda (cerrar al deslizar hacia abajo) o quitar la barrita. Afecta a todas las ventanas inferiores, que comparten `components/bottom-sheet-modal.tsx`: añadir alimento, editar registro, copiar de otro día, "No lo encontramos" del escáner. Hoy solo se cierran tocando fuera o con el botón atrás.
- [ ] **Los gramos al añadir no tienen límite, pero la copia de seguridad sí** (0,1 a 10 000 g). `components/add-food-modal.tsx` acepta cualquier número mayor que 0, así que alguien puede registrar 50 000 g o 0,05 g y luego **exportar una copia que él mismo no podría importar**. Hay que usar el mismo rango (`LIMITS.GRAMS_MAX` de `lib/validation.ts`) que ya usa la ventana de editar.
- [ ] **Hoy puede quedarse en el día anterior** si la app se deja abierta en segundo plano toda la noche: la fecha no se recalcula hasta que algo vuelve a dibujar la pantalla. Es probable y fácil de ver (abrir la app por la mañana y mirar la fecha); no se ha comprobado.

### 🟡 Funcionalidad

- [ ] **Genéricos de BEDCA** (pollo, arroz, lentejas…): hoy salen solo productos de marca (con el nuevo orden, los de supermercado primero). Revisar antes licencia y acceso. Rama `feature/bedca-import`.
- [ ] **Recetas:** alimento compuesto cuyos valores por 100 g se calculan desde los ingredientes. Rama `feature/recetas`.
- [ ] **Porciones y unidades** ("1 yogur", "1 cucharada") además de gramos.
- [ ] **Mostrar fibra, azúcares y sal** en la interfaz (ya se guardan).
- [ ] **Escáner: consulta opcional a Open Food Facts** para traer productos que no están en `foods.db`. Se decidió **no hacerlo por ahora** para mantener la app 100 % offline (el escáner solo mira la base y los alimentos propios). Si algún día se hace: sería opcional y con aviso, y habría que declararlo en la política de privacidad y en Play Store.
- [ ] **Escáner: códigos UPC-E** (8 dígitos comprimidos) no se expanden a 12 dígitos, así que no coincidirían con `foods.db`. Poco habitual en España.
- [ ] **Registro de peso y gráficas** de evolución (calorías por semana, peso).
- [ ] **Mover un registro a otro día** (hoy se edita gramos y franja, no la fecha).
- [ ] **Varios perfiles en el mismo móvil** (hoy hay un único usuario por dispositivo).
- [ ] **Búsqueda en inglés** (hoy solo español; la app lo avisa) y **corrección de erratas** ("jamn" no encuentra "jamón").
- [ ] **Exportar a CSV** (además del JSON) para abrirlo en una hoja de cálculo.
- [ ] **Recordatorio de copia de seguridad** o exportación automática periódica: los datos solo viven en el móvil.

### 🟢 Calidad técnica

- [ ] **Tamaño de la APK (121 MB en `v0.1.0`).** Reparto medido: ~88 MB son librerías nativas de 4 arquitecturas (un móvil solo usa 1), ~16 MB código Java, ~11 MB recursos (incluye `foods.db`, que comprime de 27 a 10 MB) y ~3 MB el JavaScript.
  - ✅ El perfil `preview` solo compila para móviles actuales (`arm64-v8a` y `armeabi-v7a`); `preview-emulator` compila para el emulador del PC (`x86_64`). Se configura con la variable `BUILD_ARCHS` en `eas.json` y `app.config.js`. Estimación: ~70 MB (o ~55 MB si se quita `armeabi-v7a`). **Falta medir el resultado real.**
  - [ ] **R8 viene activado por defecto desde SDK 58** en las builds de release: reduce el código pero puede romper librerías que usan reflexión. Medir el tamaño real y probar bien la app en la APK (si algo falla solo en la APK, es el primer sospechoso; se desactiva con `android.enableMinifyInReleaseBuilds: false` en `expo-build-properties`).
  - [ ] Quitar dependencias que ya no se usan (`@expo/ui`, `expo-glass-effect`, `expo-image`, `expo-device`…; **no** `expo-symbols`: en SDK 58 los iconos `md` de las pestañas en Android lo necesitan) junto con los archivos de la plantilla de Expo.
  - En Play Store, el AAB hace que cada móvil descargue solo su parte (~30-40 MB).
- [ ] **Calidad de `foods.db`:** unir duplicados casi iguales ("Jamon serrano" y "jamón serrano", "Milbona,Lidl" y "Lidl, Milbona"), y decidir qué hacer con unos 12 000 productos cuyas kcal no cuadran con sus macros.
- [ ] **Versión de `foods.db` automática:** hoy hay que cambiar `FOODS_DB_NAME` en `_layout.tsx` (ahora `foods-2.db`) a mano al regenerar la base.
- [ ] **Fecha del volcado de Open Food Facts** usado: dejarla anotada para que el resultado sea reproducible.
- [ ] **Más tests:** ya hay tests de `lib/` (validación, objetivos, fechas, ranking, códigos de barras) y del pipeline; faltan los cálculos de `db/user.ts` (editar registros, recientes, copiar día), que dependen de SQLite y hoy solo se han comprobado a mano.
- [ ] **Manejo de errores** en consultas y estados de carga (hoy un fallo de SQLite podría dejar la pantalla en blanco).
- [ ] **Accesibilidad:** etiquetas para lectores de pantalla, contraste y tamaños de fuente.
- [ ] **Limpiar la plantilla de Expo:** borrar los archivos que ya no se usan (`animated-icon.*`, `external-link.tsx`, `hint-row.tsx`, `web-badge.tsx`, `ui/collapsible.tsx`, `expo-logo.png`, `react-logo*.png`, `expo-badge*.png`, `logo-glow.png`, `tutorial-web.png`, `assets/expo.icon/`, `tabIcons/` y `scripts/reset-project.js`) y el error de lint de `use-color-scheme.web.ts`.
- [ ] **Alinear colores:** el verde del icono (lima `#70E83D`) y el de la app (`#2E9E6B`) no coinciden. Unificarlos en `constants/theme.ts` o regenerar el icono.
- [ ] **`pipeline/requirements.txt`** no coincide con lo que realmente usa el pipeline (`duckdb`, `pandas`); regenerarlo desde un entorno limpio.
- [ ] **`docs/licenses.md` y `docs/db-schema.md`:** documentar atribución, licencias y el esquema de `foods.db`.
- [ ] **EAS Update** (actualizaciones sin reinstalar) si se van a corregir fallos con frecuencia: requiere `expo-updates` y un build nuevo.

### ⚪ Para publicar en Play Store (más adelante)

- [ ] Cuenta de desarrollador (unos 25 USD) y verificación de identidad.
- [ ] Prueba cerrada con testers durante varias semanas (comprobar los requisitos vigentes en la Play Console).
- [ ] Política de privacidad con enlace público (la app maneja datos de salud, aunque sean locales).
- [ ] Formularios de la consola: seguridad de datos (la app usa la cámara solo para leer códigos; no se guardan imágenes ni se envía nada), apps de salud, clasificación por edades, público objetivo.
- [ ] Ficha: descripción, capturas, gráfico de portada de 1024×500 (el icono de 512 está en `docs/branding/iconkitchen/android/`).
- [ ] Generar el **AAB** con el perfil `production` de `eas.json` y subirlo.
- [ ] iOS: App Store (99 USD al año), sin probar todavía.

### Actualizar de SDK (Expo)

Expo Go de las tiendas solo abre proyectos de **su misma versión de SDK**: cuando se actualiza en el móvil, el proyecto tiene que subir o hay que instalar la Expo Go antigua. Pasos (siempre en una rama aparte, sin mezclar con funcionalidades):

1. `npm install expo@^NN.0.0` y `npx expo install --fix`. Si npm da un conflicto de dependencias, borra `node_modules` y `package-lock.json` y vuelve a ejecutar `npm install`.
2. `npx expo-doctor` hasta que pase los 20 controles, y `npx tsc --noEmit`.
3. Leer el registro de cambios (https://expo.dev/changelog/sdk-NN) y la guía de Expo Router, y arreglar lo que rompa.
4. Probar en Expo Go **y** en una APK nueva.

Del salto 57 → 58 (hecho): `NativeTabs` pasa a importarse de `expo-router/native-tabs`, `File.write()` es asíncrono (hay que usar `await`), `useColorScheme` ya no devuelve `"unspecified"` y las cabeceras de `FlatList` no admiten `null` (se usa `undefined`).

### Lo que Expo Go no reproduce

Expo Go **no es igual que la APK**. Es una app ya hecha, con sus propios ajustes de Android, y algunas cosas se comportan distinto en tu app compilada. Un caso real: en Android 15 o superior las apps compiladas se dibujan de borde a borde y **ya no suben el contenido al abrir el teclado**; Expo Go sí lo hace, así que los campos parecían bien y en la APK los tapaba el teclado.

Por eso, antes de dar un fallo por arreglado hay que probarlo en una APK. Lista de comprobación para cada APK nueva (en un móvil con Android 15 o superior):

- [ ] Buscar → tocar un alimento → escribir los gramos: la ventana sube y se ve lo que escribes y el botón "Añadir".
- [ ] Editar un registro (Hoy o Historial) → escribir los gramos: igual.
- [ ] Objetivos → rellenar edad, peso y altura (el último campo no queda tapado) y los campos del modo manual.
- [ ] Más → Mis alimentos → Nuevo alimento: los campos de abajo (grasas, fibra, sal) quedan por encima del teclado.
- [ ] Buscar sin escribir: aparecen Recientes (con la última cantidad al tocar) y Favoritos; la estrella añade y quita.
- [ ] Hoy → "Copiar de otro día": elige día y franjas, y se copian al día actual.
- [ ] **Franja pegada:** en Hoy, + de Desayuno → añadir algo → ir a Hoy y abrir Buscar desde la barra de abajo: ya no debe decir "Añadiendo a Desayuno" ni preseleccionarlo. Si vuelves a pulsar el + de otra franja, sí debe usarla.
- [ ] Escáner (📷 en Buscar): pide permiso de cámara la primera vez; un producto conocido (p. ej. algo de Hacendado) abre directamente la ventana de añadir; un código inventado muestra "No lo encontramos" con las opciones; "Crear este alimento" abre el formulario con el código ya puesto y, al guardar, se abre para añadirlo; con la luz apagada, el botón 🔦 enciende el flash. Al escanear de nuevo ese código, ya sale el alimento creado.
- [ ] Todo lo anterior en modo oscuro y con el texto del sistema en tamaño grande.

Cuando haya varios arreglos pendientes, genera una sola APK `preview` para probarlos juntos (los builds gratuitos son limitados).

## Generar una APK para que la prueben amigos

Una APK es el instalador de Android. Se puede pasar por mensaje y se instala sin Play Store (hay que permitir "instalar apps de orígenes desconocidos"). No funciona en iPhone.

### Antes de generarla

1. ✅ **Identidad de la app** en `app/app.json`: nombre "Contador de Calorías", `android.package` y `ios.bundleIdentifier` = `com.fernando.contadorcalorias`. El paquete **no se puede cambiar después** sin que cuente como otra app distinta.
2. ✅ **Icono y pantalla de carga propios** (`app/assets/images/`), generados con icon.kitchen; los originales completos están en `docs/branding/iconkitchen/`. Si los cambias, estos son los archivos y tamaños:
   - `icon.png`: 1024×1024, sin transparencia.
   - `android-icon-foreground.png`: 1024×1024 con fondo transparente; el dibujo debe quedar dentro del círculo central (≈ 66 %), porque Android recorta los bordes.
   - `android-icon-background.png`: 1024×1024 (un color liso o un degradado).
   - `android-icon-monochrome.png`: 1024×1024, silueta en blanco sobre transparente.
   - `splash-icon.png`: logo sobre fondo transparente; el color de fondo de la pantalla de carga se cambia en `app.json` (plugin `expo-splash-screen`).
   - Herramientas: Figma o Canva para diseñar; [icon.kitchen](https://icon.kitchen) genera todos los tamaños y el icono adaptativo de Android a partir de una imagen.
3. ✅ **`.easignore`** (en la raíz y en `app/`, idénticos): EAS no sube lo que git ignora, y `foods.db` está ignorado. Estos archivos copian el `.gitignore` y añaden al final `!**/assets/db/foods.db` para que la APK incluya la base de alimentos, además de excluir `pipeline/` (los volcados pesan 1,3 GB). Si cambias uno, cambia el otro. **Comprobación:** al lanzar el build, EAS indica el tamaño de lo que sube; debe rondar los 30-40 MB. Si son 2 o 3 MB, `foods.db` no se está incluyendo.
4. ⏳ **`foods.db` tiene que existir** en `app/assets/db/` (ver "Primeros pasos") antes de lanzar el build.
5. Probar todo en el emulador o en el móvil y pasar `npx tsc --noEmit`.

### Generarla (EAS Build, en la nube, plan gratuito)

`app/eas.json` ya tiene un perfil `preview` que genera APK (en vez de AAB, que es lo que pide Play Store).

```bash
cd app
npx eas-cli@latest login        # cuenta gratuita de expo.dev
npx eas-cli@latest build -p android --profile preview            # para los amigos (móviles ARM)
npx eas-cli@latest build -p android --profile preview-emulator  # para probar en el emulador del PC (x86_64)
```

La primera vez pregunta si crear el proyecto en tu cuenta de Expo y si generar la clave de firma: di que sí. Al terminar da un enlace para descargar la APK. EAS guarda la clave de firma: **no la pierdas**, porque las actualizaciones tienen que ir firmadas con la misma para instalarse encima conservando los datos.

### Qué decir a los testers

- Los datos viven solo en su móvil: **que exporten una copia (Más → Copia de seguridad) antes de instalar una versión nueva** o desinstalar.
- Que anoten qué hacían cuando algo falla (y si es posible, una captura).
- Los objetivos son estimaciones, no consejo médico.

## CI/CD (GitHub Actions)

Dos workflows en `.github/workflows/`. Están pensados para este proyecto: un solo desarrollador, builds de EAS limitadas, y una base de alimentos que **no está en git**.

### CI — `ci.yml` (automático)
Se ejecuta en cada Pull Request a `develop` o `main` y en cada subida a esas ramas. Tres trabajos:

| Trabajo | Qué comprueba |
|---|---|
| **App** | `tsc` (tipos), `expo lint`, **41 tests** de validación, objetivos, fechas, códigos de barras y orden de resultados, y `expo-doctor` (solo avisa, no bloquea) |
| **Pipeline** | **18 tests** de Python: lista de supermercados, limpieza y deduplicado, y que el esquema de `foods.db` tiene las columnas que lee la app |
| **Repositorio** | Las dos copias de `.easignore` son idénticas; `app.json` y `package.json` tienen la misma versión; no se ha colado en git ninguna base de datos, CSV, APK o clave |

En la PR ves una marca verde ✓ o roja ✗. Si algo falla, el detalle está en la pestaña **Actions**.

### CD — `release.yml` (al poner un tag)
Al subir un tag `vX.Y.Z`:
1. Ejecuta el CI entero. Si falla, **no compila nada** (y no gasta una build).
2. Comprueba que el tag coincide con la versión de `app.json` (el tag `v0.1.2` exige `version: 0.1.2`).
3. Descarga `foods.db` de la release indicada en `pipeline/FOODS_DB_RELEASE` y la valida con `pipeline/check_foods_db.py`.
4. Compila la APK con EAS Build (perfil `preview`).
5. Crea una **release en borrador y pre-release** con la APK ya renombrada (`contador-calorias-vX.Y.Z.apk`) y las notas generadas. La pruebas y, si va bien, pulsas **Publish**.

También se puede lanzar a mano (**Actions → Release (APK) → Run workflow**), eligiendo perfil. Con **`dry_run` activado** solo hace las comprobaciones y **no gasta ninguna build**: es la forma de probar que todo está bien configurado.

### Por qué `foods.db` va como release
`foods.db` pesa 28 MB, cambia con cada regeneración y está en `.gitignore`, así que el CI no la tendría. La solución es subirla como archivo de una **release de GitHub** y que el CI la descargue. Así además: cada build usa exactamente la base publicada (reproducible), y se cumple la obligación de la licencia ODbL de ofrecer abiertamente la base derivada de Open Food Facts.

### Configuración (una sola vez)
1. **Secreto `EXPO_TOKEN`.** En <https://expo.dev> → tu cuenta → **Access tokens** → crear uno. En GitHub → **Settings → Secrets and variables → Actions → New repository secret** → nombre `EXPO_TOKEN`, valor el token.
2. **Publicar `foods.db`.** En GitHub → **Releases → Draft a new release**: tag nuevo `foods-db-2026-10` (el mismo nombre que `pipeline/FOODS_DB_RELEASE`), título "foods.db (volcado de Open Food Facts, octubre 2026)", adjunta `app/assets/db/foods.db` y marca **pre-release** (así no le quita el "Latest" a las versiones de la app). Pon en las notas la fecha del volcado y la licencia: *"Base de datos derivada de Open Food Facts, licencia ODbL"*.
3. **Probar sin gastar build:** **Actions → Release (APK) → Run workflow** con `dry_run` activado. Debe terminar en verde y el resumen dirá "Comprobación correcta ✓".

### Cuando cambies la base de alimentos
Regenerar con el pipeline → `python3 pipeline/check_foods_db.py pipeline/data/foods.db` → crear una release nueva (`foods-db-AAAA-MM`) con el archivo → cambiar `pipeline/FOODS_DB_RELEASE` → cambiar `FOODS_DB_NAME` en `app/src/app/_layout.tsx` (para que los móviles copien la nueva).

### Lo que NO se ha podido probar
Los tests, el lint y los tipos se ejecutaron en local con las mismas órdenes que usa el CI, y los dos archivos pasan `actionlint`. Pero **el paso de EAS Build no se ha ejecutado nunca desde GitHub**: la salida `--json` de `eas build` no está documentada y el workflow busca el enlace de la APK de forma tolerante, pero si algo no cuadra, el fallo saldrá la primera vez que se use y el log mostrará la respuesta de EAS. Si pasa, se corrige ese paso; el resto no se ve afectado. Hasta que lo veas funcionar una vez, la forma manual de la receta de abajo sigue siendo válida.

## Versiones, ramas y releases

### Ramas

| Rama | Para qué sirve | Quién escribe en ella |
|---|---|---|
| `main` | Solo versiones que ya se han entregado a alguien (cada una con su tag). Lo que hay en `main` es lo que se probó. | Solo se fusiona `develop` aquí al sacar una versión |
| `develop` | Rama de trabajo común: aquí se junta todo lo que está terminado y probado. | Se fusionan las ramas `feature/*` y `fix/*` |
| `feature/<nombre>` | Una funcionalidad nueva (ej. `feature/recetas`). Sale de `develop` y vuelve a `develop`. | Tú, mientras trabajas |
| `fix/<nombre>` | Arreglo de un fallo (ej. `fix/gramos-decimales`). Sale de `develop` y vuelve a `develop`. | Tú |
| `hotfix/<nombre>` | Arreglo urgente de algo que ya está en `main`. Sale de `main` y se fusiona a `main` **y** a `develop`. | Solo si hace falta |

Las ramas `feature/*` y `fix/*` se **borran** al fusionarlas. Commits con prefijo: `feat:`, `fix:`, `chore:`, `docs:`.

### Números de versión

Hay tres números distintos, y conviene no mezclarlos:

| Número | Dónde está | Cómo cambia |
|---|---|---|
| **Versión** (`0.1.0`) | `version` en `app/app.json` (y `app/package.json`) | La subes tú a mano antes de cada release |
| **versionCode** (1, 2, 3…) | Interno de Android | Lo sube EAS solo en cada build (`autoIncrement`). Es lo que permite instalar una APK encima de otra |
| **Tag de git** (`v0.1.0`) | El commit exacto del que salió esa versión | Lo creas tú al sacar la versión |

La versión sigue **MAYOR.MENOR.PARCHE**:
- **PARCHE** (`0.1.0` → `0.1.1`): solo arreglos de fallos.
- **MENOR** (`0.1.0` → `0.2.0`): funcionalidades nuevas.
- **MAYOR** (`0.x` → `1.0.0`): primera versión pública (Play Store). Hasta entonces, las versiones de prueba son `0.x`.

### Historial de versiones

| Versión | Commit | Qué incluye |
|---|---|---|
| `v0.1.0` | `56abae2` | Primera APK de prueba (build EAS `a8aa55e4`): buscar alimentos, diario por franjas, objetivos (Mifflin-St Jeor), historial, alimentos propios, editar registros, exportar/importar |
| `v0.1.1` *(en `develop`, sin APK)* | — | Arreglo del teclado en la APK, APK más pequeña (solo arquitecturas de móvil), Expo SDK 58, recientes, favoritos, copiar de otro día, orden de resultados por supermercado y marca conocida |

> Esa APK se generó con la versión interna `1.0.0` (versionCode 1), antes de adoptar este esquema. Es la misma app que `v0.1.0`. Desde el siguiente build la versión interna coincide con el tag.

### Cómo sacar una versión (receta)

**Con CI/CD configurado** (lo más corto): subir `version` (paso 2), fusionar `develop` en `main` (paso 3) y **poner el tag**; el workflow compila y deja la release en borrador con la APK. Los pasos 4 y 5 de abajo son la forma manual.

1. Asegúrate de que todo está fusionado en `develop` y probado.
2. En `develop`: sube `version` en `app/app.json` y `app/package.json` (por ejemplo `0.1.1`) y añade una fila al historial de arriba. Commit: `chore: version 0.1.1`.
3. Fusiona a `main` y crea el tag:
   ```bash
   git checkout main
   git merge --no-ff develop
   git tag -a v0.1.1 -m "Versión 0.1.1"
   git push origin main --tags
   git checkout develop
   ```
4. Genera la APK desde `main`: `cd app && npx eas-cli@latest build -p android --profile preview`.
5. En GitHub: **Releases → Draft a new release** → elige el tag `v0.1.1` → describe los cambios → adjunta la APK descargada de expo.dev. Así cada versión queda con su APK y su código, y el enlace no caduca (los de expo.dev duran 13 días).

### Cómo arreglar un fallo

```bash
git checkout develop
git checkout -b fix/descripcion-corta
# ...arreglar, probar en Expo Go...
git commit -am "fix: descripción"
git checkout develop && git merge fix/descripcion-corta
git branch -d fix/descripcion-corta
```
Junta varios arreglos antes de generar otra APK: los builds del plan gratuito son limitados y tardan.

## Reglas del proyecto

- **`foods.db` no se versiona.** Se regenera con el pipeline y se publica como release asset (o Git LFS). Tampoco los volcados ni los CSV.
- **Dos bases de datos:** `foods.db` (solo lectura, reemplazable) y `user.db` (datos del usuario).
- **Paquetes de Expo** siempre con `npx expo install`.
- Antes de usar una API de Expo, consulta la documentación de la versión instalada (SDK 58): <https://docs.expo.dev/versions/v58.0.0/>.

## Licencias y atribución

Los datos de alimentos proceden de **[Open Food Facts](https://world.openfoodfacts.org)** y están bajo licencia **ODbL** (contenido bajo DbCL). Obliga a:

- Atribuir la fuente (visible en la app, en una pantalla "Acerca de", y en este README).
- Compartir bajo la misma licencia cualquier base de datos derivada que se distribuya (es decir, `foods.db`).

BEDCA: revisar sus condiciones de uso antes de incluir sus datos.
