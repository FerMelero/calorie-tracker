"""
Genera foods.db a partir de data/productos_es.csv.

Pasos: limpiar -> deduplicar -> crear tablas -> insertar -> índice FTS5 -> VACUUM.
Ejecutar desde la carpeta pipeline/:  python 02_build_db.py
"""

import os
import sqlite3
import unicodedata

import pandas as pd

from brands import brand_rank

CSV = "data/productos_es.csv"
DB = "data/foods.db"

# Criterios de limpieza
KCAL_MAX = 900  # la grasa pura tiene ~900 kcal/100 g
MACROS_MAX = 100  # proteínas + carbos + grasas no pueden pasar de 100 g/100 g
NOMBRE_MIN = 3  # caracteres mínimos del nombre
NOMBRE_MAX = 100

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
    search_text TEXT NOT NULL,  -- nombre + marca en minúsculas y sin tildes, para búsquedas LIKE
    brand_rank INTEGER,         -- 1-49 supermercado, 50-99 se vende en uno, 100 marca conocida, NULL resto (ver brands.py)
    scans    INTEGER NOT NULL DEFAULT 0  -- veces que se ha escaneado en Open Food Facts (popularidad)
);

CREATE VIRTUAL TABLE foods_fts USING fts5(
    name, brand,
    content='foods', content_rowid='id',
    tokenize='unicode61 remove_diacritics 2'
);
"""

NUTRIENTES = ["kcal", "proteinas", "carbohidratos", "grasas", "azucares", "fibra", "sal"]


def normalizar(texto: str) -> str:
    """Minúsculas y sin tildes (ñ -> n). Debe coincidir con normalize() de app/src/db/search.ts."""
    sin_tildes = "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")
    return sin_tildes.lower()


def limpiar(df: pd.DataFrame) -> pd.DataFrame:
    n0 = len(df)
    print(f"Filas iniciales: {n0}")

    # --- Texto ---
    df["nombre"] = df["nombre"].fillna("").str.strip().str.replace(r"\s+", " ", regex=True)
    df["brands"] = df["brands"].str.strip().replace("", pd.NA)
    for col in ("stores", "scans"):  # el CSV puede ser de una versión anterior sin estas columnas
        if col not in df.columns:
            df[col] = pd.NA
    # Los nombres TODO EN MAYÚSCULAS se pasan a "Solo la primera en mayúscula"
    mayus = df["nombre"].str.isupper()
    df.loc[mayus, "nombre"] = df.loc[mayus, "nombre"].str.capitalize()

    # --- Filtros de filas ---
    largo = df["nombre"].str.len()
    df = df[largo.between(NOMBRE_MIN, NOMBRE_MAX)]
    print(f"Tras filtrar longitud del nombre: {len(df)}")

    # kcal y macros principales son obligatorios y deben ser plausibles
    df = df[df["kcal"].between(0, KCAL_MAX)]
    for col in ["proteinas", "carbohidratos", "grasas"]:
        df = df[df[col].between(0, 100)]
    df = df[(df["proteinas"] + df["carbohidratos"] + df["grasas"]) <= MACROS_MAX]
    print(f"Tras filtrar kcal y macros imposibles: {len(df)}")

    # --- Opcionales: valor imposible -> NULL (se conserva la fila) ---
    for col in ["azucares", "fibra", "sal"]:
        df.loc[~df[col].between(0, 100), col] = pd.NA
    df.loc[df["azucares"] > df["carbohidratos"], "azucares"] = pd.NA

    # --- Redondeo a 1 decimal ---
    df[NUTRIENTES] = df[NUTRIENTES].round(1)

    # --- Prioridad en la búsqueda: supermercados y marcas conocidas primero ---
    df["brand_rank"] = [brand_rank(b, st) for b, st in zip(df["brands"], df["stores"])]
    df["scans"] = pd.to_numeric(df["scans"], errors="coerce").fillna(0).astype(int)
    print("Alimentos de supermercado (marca):", int((df["brand_rank"] < 50).sum()),
          "| solo se venden en uno:", int(df["brand_rank"].between(50, 99).sum()),
          "| marca conocida:", int((df["brand_rank"] == 100).sum()))
    return df


def deduplicar(df: pd.DataFrame) -> pd.DataFrame:
    # Por código de barras (no hay duplicados ahora, pero por si cambia el volcado)
    df = df.drop_duplicates(subset="code")

    # Por nombre + marca (sin distinguir mayúsculas). Nos quedamos con la fila
    # más completa (menos NULL en los nutrientes opcionales).
    df = df.assign(
        _clave_nombre=df["nombre"].str.lower(),
        _clave_marca=df["brands"].fillna("").str.lower(),
        _completitud=df[["azucares", "fibra", "sal"]].notna().sum(axis=1),
    )
    claves = ["_clave_nombre", "_clave_marca"]
    # Al fundir duplicados se conserva la mejor prioridad y se suman los escaneos
    df["brand_rank"] = df.groupby(claves)["brand_rank"].transform("min")
    df["scans"] = df.groupby(claves)["scans"].transform("sum")
    df = df.sort_values("_completitud", ascending=False, kind="stable")
    df = df.drop_duplicates(subset=claves)
    df = df.drop(columns=claves + ["_completitud"])
    print(f"Tras deduplicar por nombre + marca: {len(df)}")
    return df.sort_values("nombre", key=lambda s: s.str.lower()).reset_index(drop=True)


def crear_db(df: pd.DataFrame) -> None:
    if os.path.exists(DB):
        os.remove(DB)

    # pandas usa NaN/NA para los vacíos; sqlite3 necesita None para guardar NULL
    filas = df.astype(object).where(df.notna(), None)
    registros = [
        (r.code, r.nombre, r.brands, r.kcal, r.proteinas, r.carbohidratos,
         r.grasas, r.azucares, r.fibra, r.sal,
         normalizar(f"{r.nombre} {r.brands or ''}".strip()),
         None if r.brand_rank is None else int(r.brand_rank), int(r.scans))
        for r in filas.itertuples(index=False)
    ]

    con = sqlite3.connect(DB)
    con.executescript(SCHEMA)
    con.executemany(
        "INSERT INTO foods (barcode, name, brand, kcal, protein, carbs, fat, sugars, fiber, salt, search_text,"
        " brand_rank, scans) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        registros,
    )
    # Rellena el índice de búsqueda a partir de la tabla foods
    con.execute("INSERT INTO foods_fts(foods_fts) VALUES ('rebuild')")
    con.execute("INSERT INTO foods_fts(foods_fts) VALUES ('optimize')")
    con.commit()
    con.execute("VACUUM")
    con.close()


def comprobar() -> None:
    con = sqlite3.connect(DB)
    total = con.execute("SELECT COUNT(*) FROM foods").fetchone()[0]
    print(f"\nfoods.db: {total} alimentos, {os.path.getsize(DB) / 1e6:.1f} MB")
    for consulta in ("jamon serrano", "carne picada"):
        print(f"Prueba de búsqueda '{consulta}' (supermercados primero):")
        for nombre, marca, rank, scans in con.execute(
            "SELECT f.name, f.brand, f.brand_rank, f.scans FROM foods_fts "
            "JOIN foods f ON f.id = foods_fts.rowid "
            "WHERE foods_fts MATCH ? ORDER BY (f.brand_rank IS NULL), f.brand_rank, rank LIMIT 6",
            (" ".join(f'"{w}"*' for w in consulta.split()),),
        ):
            print(f"  {nombre} | {marca} | prioridad {rank} | {scans} escaneos")
    con.close()


if __name__ == "__main__":
    df = pd.read_csv(CSV, dtype={"code": str})
    df = limpiar(df)
    df = deduplicar(df)
    crear_db(df)
    comprobar()
