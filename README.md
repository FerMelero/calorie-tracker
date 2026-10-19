# Calorie Tracker (offline)

App móvil para llevar el control de calorías y macros (proteínas, carbohidratos y grasas) que funciona **sin conexión, sin cuentas y sin servidores**. La base de datos de alimentos, el registro de comidas y los resúmenes viven en el propio móvil.

## Stack

| Parte | Tecnología |
|---|---|
| App | React Native + Expo (SDK 57), TypeScript, Expo Router |
| Datos en el móvil | SQLite local (`expo-sqlite`) con FTS5 para búsqueda de texto |
| Base de alimentos | `foods.db` precompilado, empaquetado como asset de la app |
| Pipeline de datos (solo PC) | Python + DuckDB (filtrar el volcado) + `sqlite3` (generar el `.db`) |
| Fuente de datos | [Open Food Facts](https://world.openfoodfacts.org) (España) y, si es viable, BEDCA |

## Estado del proyecto

- ✅ Pipeline: filtra Open Food Facts (España) y genera `foods.db` (~185 000 alimentos, ~28 MB) con búsqueda de texto.
- ✅ Buscar: búsqueda en español, sin importar mayúsculas ni tildes, con porcentaje de parecido. Los resultados salen de 10 en 10 (botón "Ver más").
- ✅ Hoy: diario del día con 5 franjas (desayuno, comida, snacks, merienda, cena), total del día y total por franja.
- ✅ Objetivos: el usuario elige sus kcal y macros o los calcula con Mifflin-St Jeor (sexo, edad, peso, altura, actividad y objetivo). Hoy muestra el progreso frente al objetivo y cada franja tiene un botón + que abre Buscar con esa franja ya elegida.
- ✅ Historial: lista de días con sus totales; al tocar uno se ve el detalle y se puede añadir o quitar comida de ese día.
- ✅ Mis alimentos: el usuario crea los suyos (se guardan en `user.db`) y salen en Buscar con ⭐.
- ✅ Copia de seguridad: exportar e importar JSON, validando el formato antes de importar.
- ⏳ Pendiente: editar cantidades, recetas, genéricos de BEDCA, icono y pantalla de carga propios.

## Estructura del repo

```
calorie-tracker/
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
│   │   ├── card.tsx            #     Tarjeta base (fondo, esquinas y sombra suave)
│   │   ├── button.tsx          #     Botón principal / con borde
│   │   └── macro-progress.tsx  #     Macros consumidos frente al objetivo, con barras
│   ├── src/db/                 #   Acceso a datos
│   │   ├── search.ts           #     Búsqueda en foods.db (FTS5 + LIKE + parecido)
│   │   ├── user.ts             #     user.db: diario, migraciones, totales
│   │   ├── goals.ts            #     Guardar y leer los objetivos del usuario
│   │   ├── custom-foods.ts     #     Alimentos propios (tabla custom_foods de user.db)
│   │   └── backup.ts           #     Construir la copia de seguridad e importarla
│   ├── src/lib/                #   Funciones puras (sin Expo)
│   │   ├── nutrition.ts        #     Fórmula de Mifflin-St Jeor y reparto de macros
│   │   ├── validation.ts       #     Reglas del formato de datos (alimentos, diario, objetivos, copia)
│   │   ├── text.ts             #     Normalizar texto (sin tildes) y separar palabras
│   │   └── dates.ts            #     Fechas ISO y formato largo en español
│   ├── src/constants/theme.ts  #   Colores, espacios y colores de los macros
│   └── assets/db/foods.db      #   Base de alimentos (NO se sube a git; copiar desde pipeline)
├── pipeline/                   # Fábrica de datos: solo se ejecuta en el PC
│   ├── 01_filter_off.py        #   Volcado de OFF -> data/productos_es.csv (solo España)
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
| Cambiar cómo se busca o se ordena | `app/src/db/search.ts` |
| Cambiar la pantalla de búsqueda | `app/src/app/explore.tsx` |
| Cambiar la pantalla del día | `app/src/app/index.tsx` |
| Guardar algo nuevo en el diario (campos, tablas) | `app/src/db/user.ts` (nueva migración subiendo `USER_DB_VERSION`) |
| Cambiar qué se considera un dato válido (importar / alimentos propios) | `app/src/lib/validation.ts` |
| Cambiar la fórmula de objetivos o sus rangos | `app/src/lib/nutrition.ts` |
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
- **Copia de seguridad:** JSON con `app`, `format_version`, `custom_foods`, `entries` y `goals`. Al importar se valida todo (mismas reglas que el pipeline: por 100 g, kcal 0–900, macros ≤ 100 g, nombres de 3 a 100 letras, fechas reales, franjas válidas); si algo falla no se importa nada. Los duplicados se saltan.
- **Objetivos:** una sola fila en `user.db` (tabla `goals`). No hay cuentas: los objetivos pertenecen a quien usa ese móvil. Guarda tanto el resultado (kcal y macros) como los datos del cálculo, para poder editarlos después.
- **Búsqueda:** el texto se pasa a minúsculas y sin tildes. Primero busca palabras que empiezan por lo escrito (FTS5, muy rápido) y luego lo escrito dentro de cualquier palabra (LIKE). Cada resultado recibe un porcentaje de parecido y se ordenan de mayor a menor. Solo funciona en español y no corrige erratas.

## Plan de trabajo y ramas

Flujo: `main` siempre estable + **ramas cortas por tarea** que se fusionan a `main` y se borran. Commits convencionales (`feat:`, `fix:`, `chore:`, `docs:`). Al cerrar cada fase, tag de versión (`v0.1.0`, …).

### Fases 0 a 3 — hechas

| Fase | Contenido | Ramas sugeridas si quieres separar el historial |
|---|---|---|
| 0 Preparación | Estructura del repo, licencias | `chore/repo-structure`, `docs/licenses` |
| 1 Datos | Filtrado de OFF, limpieza, `foods.db` | `feat/pipeline-filter-off`, `feat/pipeline-build-db` |
| 2 Búsqueda | `foods.db` en la app, pantalla Buscar | `feat/app-load-foods-db`, `feat/app-food-search` |
| 3 Diario | `user.db`, añadir alimentos, pantalla Hoy | `feat/user-db`, `feat/meal-log`, `feat/day-screen` |

Pendiente de la fase 0: documentar la atribución ODbL en la app (pantalla "Acerca de") y revisar la licencia de BEDCA.

### Fase 4 — Ampliaciones

| Rama | Qué se hace |
|---|---|
| `feat/custom-foods` | Alimentos propios del usuario |
| `feat/recipes` | Recetas: alimento compuesto cuyos valores por 100 g se calculan desde los ingredientes |
| `feat/bedca-import` | Genéricos (pollo, arroz, lentejas…) desde BEDCA en el pipeline, si la licencia y el acceso lo permiten |
| `feat/export-import` | Exportar/importar los datos del usuario en JSON (es la única copia de seguridad que existe) |
| `feat/date-picker` | Ver y registrar otros días (selector de fecha en Hoy) |
| `feat/edit-entry` | Editar los gramos de un registro |
| `feat/ui-polish` | Pulir interfaz, iconos, mostrar fibra / azúcares / sal |

## Reglas del proyecto

- **`foods.db` no se versiona.** Se regenera con el pipeline y se publica como release asset (o Git LFS). Tampoco los volcados ni los CSV.
- **Dos bases de datos:** `foods.db` (solo lectura, reemplazable) y `user.db` (datos del usuario).
- **Paquetes de Expo** siempre con `npx expo install`.
- Antes de usar una API de Expo, consulta la documentación de la versión instalada (SDK 57): <https://docs.expo.dev/versions/v57.0.0/>.

## Licencias y atribución

Los datos de alimentos proceden de **[Open Food Facts](https://world.openfoodfacts.org)** y están bajo licencia **ODbL** (contenido bajo DbCL). Obliga a:

- Atribuir la fuente (visible en la app, en una pantalla "Acerca de", y en este README).
- Compartir bajo la misma licencia cualquier base de datos derivada que se distribuya (es decir, `foods.db`).

BEDCA: revisar sus condiciones de uso antes de incluir sus datos.
