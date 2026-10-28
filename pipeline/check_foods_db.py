"""
Comprueba que un foods.db es válido para la app, antes de meterlo en una APK.

Uso (desde la raíz del repo):  python3 pipeline/check_foods_db.py app/assets/db/foods.db
Solo usa la biblioteca estándar. Sale con error (código 1) si algo no cuadra.
"""

import os
import sqlite3
import sys

# Lo mismo que lee la app (app/src/db/search.ts). Si falta alguna columna, la búsqueda fallaría.
COLUMNAS = {
    "id", "barcode", "name", "brand", "kcal", "protein", "carbs", "fat",
    "sugars", "fiber", "salt", "search_text", "brand_rank", "scans",
}
MIN_BYTES = 15 * 1024 * 1024
MIN_ALIMENTOS = 100_000
MAX_BYTES = 80 * 1024 * 1024  # si pesa más de esto, algo raro ha pasado (o hay que repensar el tamaño)


def main(ruta: str) -> int:
    errores: list[str] = []

    if not os.path.isfile(ruta):
        print(f"No existe {ruta}")
        return 1
    tamano = os.path.getsize(ruta)
    print(f"Archivo: {ruta} ({tamano / 1e6:.1f} MB)")
    if not MIN_BYTES <= tamano <= MAX_BYTES:
        errores.append(f"Tamaño fuera de lo esperado ({MIN_BYTES // 2**20}-{MAX_BYTES // 2**20} MB)")

    try:
        con = sqlite3.connect(f"file:{ruta}?mode=ro", uri=True)
        if con.execute("PRAGMA quick_check").fetchone()[0] != "ok":
            errores.append("PRAGMA quick_check no devuelve ok: la base está dañada")

        columnas = {f[1] for f in con.execute("PRAGMA table_info(foods)")}
        if not columnas:
            errores.append("No existe la tabla foods")
        elif not COLUMNAS <= columnas:
            errores.append(f"Faltan columnas en foods: {sorted(COLUMNAS - columnas)}")

        total = con.execute("SELECT COUNT(*) FROM foods").fetchone()[0]
        print(f"Alimentos: {total}")
        if total < MIN_ALIMENTOS:
            errores.append(f"Muy pocos alimentos ({total}); se esperaban al menos {MIN_ALIMENTOS}")

        # La búsqueda de texto, tal como la hace la app
        encontrados = con.execute(
            "SELECT COUNT(*) FROM foods_fts WHERE foods_fts MATCH ?", ('"jam"* "serr"*',)
        ).fetchone()[0]
        print(f"Búsqueda 'jam serr': {encontrados} resultados")
        if encontrados == 0:
            errores.append("La búsqueda de texto (FTS5) no devuelve nada para 'jam serr'")

        super_ = con.execute("SELECT COUNT(*) FROM foods WHERE brand_rank < 50").fetchone()[0]
        print(f"Con marca de supermercado: {super_}")
        if super_ == 0:
            errores.append("Ningún alimento tiene marca de supermercado (¿se ejecutó brands.py?)")

        raros = con.execute(
            "SELECT COUNT(*) FROM foods WHERE kcal < 0 OR kcal > 900 OR protein + carbs + fat > 100.05"
        ).fetchone()[0]
        if raros:
            errores.append(f"{raros} alimentos con kcal o macros imposibles")
        con.close()
    except sqlite3.Error as e:
        errores.append(f"Error de SQLite: {e}")

    if errores:
        print("\nLA BASE NO ES VÁLIDA:")
        for e in errores:
            print(f"  ✗ {e}")
        return 1
    print("\nfoods.db correcta ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "app/assets/db/foods.db"))
