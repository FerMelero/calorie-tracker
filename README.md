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

## Estructura del repo

Esta es la estructura **objetivo**. Dónde va cada cosa:

```
calorie-tracker/
├── app/                    # Aplicación Expo (ya creada)
│   ├── src/app/            #   Pantallas (Expo Router: cada archivo es una ruta)
│   ├── src/components/     #   Componentes reutilizables
│   ├── src/hooks/          #   Hooks
│   ├── src/db/             #   (a crear) acceso a SQLite: abrir BD, migraciones, consultas
│   ├── src/constants/      #   Tema, constantes
│   ├── assets/db/          #   (a crear) foods.db — NO se sube a git
│   └── metro.config.js     #   (a crear) registrar la extensión .db como asset
├── pipeline/               # Pipeline de datos (a crear; solo se ejecuta en PC)
│   ├── requirements.txt    #   duckdb, etc.
│   ├── 01_filter_off.py    #   Volcado OFF -> CSV filtrado de España
│   ├── 02_build_db.py      #   Limpieza + dedupe + foods.db con FTS5
│   └── data/               #   Volcados y CSV intermedios (ignorado por git)
├── docs/                   # (a crear) esquema de BD, decisiones, licencias
├── .gitignore
└── README.md
```

### Estado actual vs. estructura objetivo

Ahora mismo hay archivos sueltos en la raíz que hay que mover (primera tarea, rama `chore/repo-structure`):

| Ahora | Destino |
|---|---|
| `db-test.py` | `pipeline/01_filter_off.py` (es el filtrado de OFF con DuckDB) |
| `en.openfoodfacts.org.products.csv.gz` (~1,3 GB) | `pipeline/data/` |
| `productos_es.csv` (~19 MB, ~257 000 filas) | `pipeline/data/` |
| `venv/` | `pipeline/.venv/` (o recréalo ahí; está ignorado por git) |

Tras moverlos, ajusta las rutas dentro del script (`read_csv('en.openfoodfacts...')` y `TO 'productos_es.csv'`) para que apunten a `pipeline/data/`, y añade `duck_tmp/` al `.gitignore` (el script crea ese directorio temporal).

> El repo está en la rama `master` y **sin ningún commit todavía**. Renómbrala a `main` antes del primer commit: `git branch -M main`.

## Primeros pasos

### Pipeline (Python)

```bash
cd pipeline
python3 -m venv .venv
source .venv/bin/activate
pip install duckdb
python 01_filter_off.py     # genera data/productos_es.csv
python 02_build_db.py       # genera foods.db (y lo copia a app/assets/db/)
```

El volcado se descarga de <https://world.openfoodfacts.org/data> (`en.openfoodfacts.org.products.csv.gz`). Anota la fecha del volcado usado en `docs/` para que el resultado sea reproducible.

### App (Expo)

```bash
cd app
npm install
npx expo install expo-sqlite expo-asset expo-file-system   # al empezar la rama de búsqueda
npx expo start
```

Abre la app en el móvil con Expo Go (escaneando el QR). `expo-sqlite` funciona en Expo Go. Cuando necesites módulos nativos que Expo Go no incluye (p. ej. escáner de códigos de barras) pasa a un development build: `npx expo run:android`.

Comandos útiles (siempre desde `app/`):

```bash
npx expo install <paquete>   # SIEMPRE en lugar de npm install para paquetes de Expo
npx expo lint                # linter
npx tsc --noEmit             # comprobación de tipos
npx expo-doctor              # diagnóstico de dependencias
```

Ejecuta lint y typecheck antes de dar una tarea por terminada.

## Plan de trabajo y ramas

Flujo: `main` siempre estable + **ramas cortas por tarea** que se fusionan a `main` y se borran. Commits convencionales (`feat:`, `fix:`, `chore:`, `docs:`). Al cerrar cada fase, tag de versión (`v0.1.0`, …).

### Fase 0 — Preparación

| Rama | Qué se hace | Dónde |
|---|---|---|
| `chore/repo-structure` | Renombrar `master` → `main`, mover archivos sueltos (tabla de arriba), añadir `duck_tmp/` al `.gitignore`, primer commit | raíz, `pipeline/` |
| `docs/licenses` | Documentar atribución ODbL de Open Food Facts y revisar la licencia de BEDCA antes de empaquetar nada suyo | `docs/licenses.md`, este README |

### Fase 1 — Datos (todo en `pipeline/`)

| Rama | Qué se hace | Criterio de "hecho" |
|---|---|---|
| `feat/pipeline-filter-off` | Script de filtrado con DuckDB: solo España, kcal y macros completos, columnas mínimas (nombre, marca, kcal, macros, azúcares, fibra, sal). Ya existe una primera versión | CSV reproducible desde el volcado |
| `feat/pipeline-build-db` | Limpieza (valores imposibles, nombres en mayúsculas, marcas duplicadas), deduplicado por código de barras y por nombre+marca, creación de `foods.db` con tabla `foods` + índice FTS5 (`unicode61 remove_diacritics 2`) y `VACUUM` | `foods.db` pesa decenas de MB, no cientos |
| `docs/db-schema` | Documentar el esquema de `foods.db` y los criterios de limpieza | `docs/db-schema.md` |

Cosas a vigilar: 257 000 filas es mucho para empaquetar, así que filtra con criterios más estrictos (valores plausibles, que tengan marca o nombre limpio, etc.) y mide el tamaño en cada build. Todos los valores deben ir **por 100 g/ml**.

### Fase 2 — Prototipo de búsqueda (todo en `app/`)

| Rama | Qué se hace | Dónde |
|---|---|---|
| `chore/app-cleanup` | Quitar la plantilla de ejemplo de Expo (`npm run reset-project` o a mano), dejar la navegación base | `app/src/app/`, `app/src/components/` |
| `feat/app-load-foods-db` | `metro.config.js` con `assetExts.push('db')`; copiar `foods.db` al directorio de documentos en el primer arranque (con `expo-asset` + `expo-file-system`); guardar versión con `PRAGMA user_version` | `app/metro.config.js`, `app/src/db/` |
| `feat/app-food-search` | Pantalla de búsqueda con FTS5, con debounce y resultados limitados | `app/src/app/` (pantalla), `app/src/db/` (consulta) |

**Hito clave:** comprobar en un **móvil real** y con el `.db` completo que FTS5 funciona y la búsqueda va fluida. Es el mayor riesgo técnico; no sigas hasta validarlo. Tag `v0.1.0`.

### Fase 3 — Registro de comidas (en `app/`)

| Rama | Qué se hace | Dónde |
|---|---|---|
| `feat/user-db` | Segunda base de datos `user.db` (separada de `foods.db`, para que actualizar alimentos nunca borre datos del usuario) con migraciones | `app/src/db/` |
| `feat/meal-log` | Tablas de comidas por franja (desayuno, comida, cena, snacks) y porciones. En cada registro se guarda una **copia de los valores nutricionales** para no corromper el histórico | `app/src/db/` |
| `feat/day-screen` | Pantalla del día con totales de kcal y macros y selector de fecha (fechas como texto ISO local `YYYY-MM-DD`) | `app/src/app/` |

Tag `v0.2.0`.

### Fase 4 — Ampliaciones

| Rama | Qué se hace |
|---|---|
| `feat/custom-foods` | Alimentos propios del usuario |
| `feat/recipes` | Recetas: alimento compuesto cuyos valores por 100 g se calculan desde los ingredientes |
| `feat/bedca-import` | Genéricos (pollo, arroz, lentejas…) desde BEDCA en el pipeline, si la licencia y el acceso lo permiten |
| `feat/export-import` | Exportar/importar los datos del usuario en JSON (es la única copia de seguridad que existe) |
| `feat/ui-polish` | Pulir interfaz, modo oscuro, iconos |

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
