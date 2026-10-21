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
- ✅ Los gramos se eligen al añadir un alimento (con vista previa de kcal y macros) y se pueden editar después, junto con la franja (botón "Editar" en cada registro).
- ✅ Nombre ("Contador de Calorías") y paquete (`com.fernando.contadorcalorias`) definidos; `eas.json` y `.easignore` listos.
- ✅ Icono, icono adaptativo de Android y pantalla de carga propios.
- ⏳ Pendiente: recetas, genéricos de BEDCA.

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

Ver la sección **Versiones, ramas y releases** más abajo.

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
npx eas-cli@latest build -p android --profile preview
```

La primera vez pregunta si crear el proyecto en tu cuenta de Expo y si generar la clave de firma: di que sí. Al terminar da un enlace para descargar la APK. EAS guarda la clave de firma: **no la pierdas**, porque las actualizaciones tienen que ir firmadas con la misma para instalarse encima conservando los datos.

### Qué decir a los testers

- Los datos viven solo en su móvil: **que exporten una copia (Más → Copia de seguridad) antes de instalar una versión nueva** o desinstalar.
- Que anoten qué hacían cuando algo falla (y si es posible, una captura).
- Los objetivos son estimaciones, no consejo médico.

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

> Esa APK se generó con la versión interna `1.0.0` (versionCode 1), antes de adoptar este esquema. Es la misma app que `v0.1.0`. Desde el siguiente build la versión interna coincide con el tag.

### Cómo sacar una versión (receta)

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
- Antes de usar una API de Expo, consulta la documentación de la versión instalada (SDK 57): <https://docs.expo.dev/versions/v57.0.0/>.

## Licencias y atribución

Los datos de alimentos proceden de **[Open Food Facts](https://world.openfoodfacts.org)** y están bajo licencia **ODbL** (contenido bajo DbCL). Obliga a:

- Atribuir la fuente (visible en la app, en una pantalla "Acerca de", y en este README).
- Compartir bajo la misma licencia cualquier base de datos derivada que se distribuya (es decir, `foods.db`).

BEDCA: revisar sus condiciones de uso antes de incluir sus datos.
