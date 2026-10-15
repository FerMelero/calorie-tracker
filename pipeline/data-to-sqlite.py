"""
Análisis exploratorio de productos_es.csv y esquema de la base de datos foods.db.

Las líneas "# %%" dividen el archivo en celdas: en VS Code (con la extensión Python)
puedes ejecutar cada celda por separado con "Run Cell" y ver los resultados.

Ejecutar desde la carpeta pipeline/.
"""

# %% Esquema de la base de datos (lo que habrá que crear en foods.db)
#
# Tabla foods  (todos los valores nutricionales son POR 100 g)
# ┌───────────┬──────────────────────┬─────────────────────────────────────────────┐
# │ columna   │ tipo                 │ origen en el CSV / notas                    │
# ├───────────┼──────────────────────┼─────────────────────────────────────────────┤
# │ id        │ INTEGER PRIMARY KEY  │ identificador interno (autogenerado)        │
# │ barcode   │ TEXT                 │ code (texto: los ceros iniciales importan)  │
# │ name      │ TEXT NOT NULL        │ nombre (limpio)                             │
# │ brand     │ TEXT                 │ brands (puede ser NULL)                     │
# │ kcal      │ REAL NOT NULL        │ kcal                                        │
# │ protein   │ REAL NOT NULL        │ proteinas                                   │
# │ carbs     │ REAL NOT NULL        │ carbohidratos                               │
# │ fat       │ REAL NOT NULL        │ grasas                                      │
# │ sugars    │ REAL                 │ azucares (puede ser NULL)                   │
# │ fiber     │ REAL                 │ fibra (puede ser NULL)                      │
# │ salt      │ REAL                 │ sal (puede ser NULL)                        │
# │ search_text│ TEXT NOT NULL       │ nombre + marca, minúsculas y sin tildes     │
# └───────────┴──────────────────────┴─────────────────────────────────────────────┘
#
# Tabla foods_fts (índice de búsqueda de texto, FTS5)
#   columnas indexadas: name, brand
#   content='foods', content_rowid='id'
#   tokenize='unicode61 remove_diacritics 2'   -> "jamon" encuentra "jamón"

SCHEMA = """
CREATE TABLE foods (
    id       INTEGER PRIMARY KEY,
    barcode  TEXT,
    name     TEXT NOT NULL,
    brand    TEXT,
    kcal     REAL NOT NULL,
    protein  REAL NOT NULL,
    carbs    REAL NOT NULL,
    fat      REAL NOT NULL,
    sugars   REAL,
    fiber    REAL,
    salt     REAL,
    search_text TEXT NOT NULL
);

CREATE VIRTUAL TABLE foods_fts USING fts5(
    name, brand,
    content='foods', content_rowid='id',
    tokenize='unicode61 remove_diacritics 2'
);
"""

# %% Cargar el CSV
import pandas as pd

CSV = "data/productos_es.csv"

# code como texto para no perder los ceros iniciales
df = pd.read_csv(CSV, dtype={"code": str})
print(df.shape)
df.head()

# %% Tipos y valores nulos por columna
print(df.dtypes)
print()
print("Nulos por columna:")
print(df.isna().sum())
print()
print("% nulos:")
print((df.isna().mean() * 100).round(1))

# %% Estadísticas básicas (mira sobre todo min y max: ahí se ven los valores absurdos)
df.describe().round(1)

# %% Duplicados
print("Códigos de barras duplicados:", df["code"].duplicated().sum())
print("Nombre + marca duplicados:", df.duplicated(subset=["nombre", "brands"]).sum())

# %% Valores imposibles o sospechosos
print("kcal > 900:", (df["kcal"] > 900).sum())
print("kcal < 0:", (df["kcal"] < 0).sum())
for col in ["proteinas", "carbohidratos", "grasas", "azucares", "fibra", "sal"]:
    print(f"{col} > 100 g/100 g:", (df[col] > 100).sum())

suma_macros = df["proteinas"] + df["carbohidratos"] + df["grasas"]
print("proteínas + carbos + grasas > 100:", (suma_macros > 100).sum())
print("azúcares > carbohidratos:", (df["azucares"] > df["carbohidratos"]).sum())

# %% Coherencia kcal declaradas vs. calculadas (4·prot + 4·carbos + 9·grasas)
kcal_calc = 4 * df["proteinas"] + 4 * df["carbohidratos"] + 9 * df["grasas"]
dif = (df["kcal"] - kcal_calc).abs()
print("Diferencia > 100 kcal entre declaradas y calculadas:", (dif > 100).sum())
print("Productos con kcal = 0 y macros > 0:", ((df["kcal"] == 0) & (suma_macros > 5)).sum())

# %% Nombres: vacíos, muy cortos/largos, todo en mayúsculas
nombre = df["nombre"].fillna("").str.strip()
print("Nombres vacíos:", (nombre == "").sum())
print("Nombres de 1-2 caracteres:", (nombre.str.len().between(1, 2)).sum())
print("Nombres de más de 100 caracteres:", (nombre.str.len() > 100).sum())
print("Nombres TODO EN MAYÚSCULAS:", (nombre.str.isupper()).sum())
print()
print("Muestra de nombres aleatorios:")
print(nombre.sample(15, random_state=1).to_string())

# %% Marcas más frecuentes (¿hay marcas duplicadas con distinta escritura?)
df["brands"].fillna("(sin marca)").str.lower().value_counts().head(25)

# %% Peso estimado en SQLite (referencia: objetivo de decenas de MB, no cientos)
# Una fila ocupa aprox. len(nombre)+len(marca)+len(barcode) bytes de texto + 7 REAL de 8 bytes.
texto = (
    df["nombre"].fillna("").str.len()
    + df["brands"].fillna("").str.len()
    + df["code"].str.len()
)
bytes_estimados = (texto + 7 * 8).sum()
print(f"Tamaño estimado de la tabla foods: {bytes_estimados / 1e6:.1f} MB (sin índice FTS)")
