"""
Genera foods.db a partir de data/productos_es.csv.

Pasos: limpiar -> deduplicar -> crear tablas -> insertar -> índice FTS5 -> VACUUM.
Ejecutar desde la carpeta pipeline/:  python 02_build_db.py
"""

import os
import sqlite3
import unicodedata

import pandas as pd

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
    search_text TEXT NOT NULL  -- nombre + marca en minúsculas y sin tildes, para búsquedas LIKE
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
    df = df.sort_values("_completitud", ascending=False, kind="stable")
    df = df.drop_duplicates(subset=["_clave_nombre", "_clave_marca"])
    df = df.drop(columns=["_clave_nombre", "_clave_marca", "_completitud"])
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
         normalizar(f"{r.nombre} {r.brands or ''}".strip()))
        for r in filas.itertuples(index=False)
    ]

    con = sqlite3.connect(DB)
    con.executescript(SCHEMA)
    con.executemany(
        "INSERT INTO foods (barcode, name, brand, kcal, protein, carbs, fat, sugars, fiber, salt, search_text)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
    print("Prueba de búsqueda 'jamon serrano':")
    for nombre, marca, kcal in con.execute(
        "SELECT f.name, f.brand, f.kcal FROM foods_fts "
        "JOIN foods f ON f.id = foods_fts.rowid "
        "WHERE foods_fts MATCH 'jamon serrano' ORDER BY rank LIMIT 5"
    ):
        print(f"  {nombre} | {marca} | {kcal} kcal")
    con.close()


if __name__ == "__main__":
    df = pd.read_csv(CSV, dtype={"code": str})
    df = limpiar(df)
    df = deduplicar(df)
    crear_db(df)
    comprobar()
