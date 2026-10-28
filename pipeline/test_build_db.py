"""
Tests de 02_build_db.py con unos pocos productos inventados (no necesita el volcado de OFF).
Necesita pandas.  Ejecutar desde pipeline/:  python -m unittest
"""

import importlib.util
import os
import sqlite3
import sys
import tempfile
import unittest

import pandas as pd

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)

# El archivo se llama 02_build_db.py, así que no se puede importar con "import"
spec = importlib.util.spec_from_file_location("build_db", os.path.join(AQUI, "02_build_db.py"))
build_db = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_db)

# Columnas que la app lee de la tabla foods (app/src/db/search.ts). Si cambia el esquema del
# pipeline sin cambiar la app, este test falla en vez de fallar en el móvil.
COLUMNAS_QUE_USA_LA_APP = {
    "id", "barcode", "name", "brand", "kcal", "protein", "carbs", "fat",
    "sugars", "fiber", "salt", "search_text", "brand_rank", "scans",
}


def producto(**campos):
    base = dict(
        code="8480000000001", nombre="Jamón serrano", brands="Hacendado", stores=None, scans=3,
        kcal=250.0, proteinas=30.0, carbohidratos=0.5, grasas=14.0, azucares=0.0, fibra=None, sal=4.0,
    )
    base.update(campos)
    return base


def frame(*filas):
    return pd.DataFrame(list(filas))


class LimpiezaTest(unittest.TestCase):
    def test_descarta_valores_imposibles(self):
        df = frame(
            producto(),
            producto(code="1", nombre="Aceite imposible", kcal=950.0),  # más de 900 kcal
            producto(code="2", nombre="Macros absurdos", proteinas=60.0, carbohidratos=60.0, grasas=10.0),
            producto(code="3", nombre="ab"),  # nombre demasiado corto
        )
        limpio = build_db.limpiar(df)
        self.assertEqual(list(limpio["code"]), ["8480000000001"])

    def test_nombres_en_mayusculas_se_normalizan(self):
        limpio = build_db.limpiar(frame(producto(nombre="JAMÓN SERRANO")))
        self.assertEqual(limpio.iloc[0]["nombre"], "Jamón serrano")

    def test_opcionales_imposibles_pasan_a_null_sin_perder_la_fila(self):
        limpio = build_db.limpiar(frame(producto(azucares=5.0, carbohidratos=1.0, sal=150.0)))
        self.assertEqual(len(limpio), 1)
        self.assertTrue(pd.isna(limpio.iloc[0]["azucares"]))  # azúcares > carbohidratos
        self.assertTrue(pd.isna(limpio.iloc[0]["sal"]))  # más de 100 g por 100 g

    def test_prioridad_de_marca_y_popularidad(self):
        limpio = build_db.limpiar(frame(producto(), producto(code="2", nombre="Galletas", brands="Marca rara", scans=None)))
        self.assertEqual(list(limpio["brand_rank"].astype("Int64")), [1, pd.NA])
        self.assertEqual(list(limpio["scans"]), [3, 0])


class DeduplicadoTest(unittest.TestCase):
    def test_une_nombre_y_marca_iguales_sin_distinguir_mayusculas(self):
        df = build_db.limpiar(frame(
            producto(code="1", scans=2),
            producto(code="2", nombre="JAMÓN SERRANO", brands="hacendado", scans=5),
            producto(code="3", nombre="Jamón serrano", brands="Carrefour"),  # otra marca: se conserva
        ))
        unico = build_db.deduplicar(df)
        self.assertEqual(len(unico), 2)
        hacendado = unico[unico["brands"].str.lower() == "hacendado"].iloc[0]
        self.assertEqual(hacendado["scans"], 7)  # se suman los escaneos de los duplicados


class BaseDeDatosTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        build_db.DB = os.path.join(self.tmp.name, "foods.db")
        df = build_db.limpiar(frame(
            producto(),
            producto(code="0012345678905", nombre="Yogur natural", brands="Danone", kcal=61.0, proteinas=3.5, carbohidratos=4.7, grasas=3.3),
            producto(code="3", nombre="Arroz", brands=None, scans=None, kcal=350.0, proteinas=7.0, carbohidratos=78.0, grasas=0.6),
        ))
        build_db.crear_db(build_db.deduplicar(df))
        self.con = sqlite3.connect(build_db.DB)

    def tearDown(self):
        self.con.close()
        self.tmp.cleanup()

    def test_la_tabla_tiene_las_columnas_que_lee_la_app(self):
        columnas = {fila[1] for fila in self.con.execute("PRAGMA table_info(foods)")}
        self.assertTrue(COLUMNAS_QUE_USA_LA_APP <= columnas, COLUMNAS_QUE_USA_LA_APP - columnas)

    def test_busqueda_de_texto_ignora_tildes(self):
        sql = "SELECT f.name FROM foods_fts JOIN foods f ON f.id = foods_fts.rowid WHERE foods_fts MATCH ?"
        self.assertEqual(self.con.execute(sql, ('"jamon"* "serr"*',)).fetchone()[0], "Jamón serrano")

    def test_busqueda_like_sobre_search_text(self):
        fila = self.con.execute("SELECT name FROM foods WHERE search_text LIKE ?", ("%erran%",)).fetchone()
        self.assertEqual(fila[0], "Jamón serrano")

    def test_codigo_de_barras_con_o_sin_ceros_delante(self):
        # Es la misma consulta que usa findFoodByBarcode en la app
        for escaneado in ("12345678905", "0012345678905"):
            fila = self.con.execute("SELECT name FROM foods WHERE ltrim(barcode, '0') = ?", (escaneado.lstrip("0"),)).fetchone()
            self.assertEqual(fila[0], "Yogur natural", escaneado)

    def test_orden_por_prioridad_de_marca(self):
        filas = self.con.execute("SELECT name FROM foods ORDER BY (brand_rank IS NULL), brand_rank").fetchall()
        self.assertEqual([f[0] for f in filas], ["Jamón serrano", "Yogur natural", "Arroz"])


if __name__ == "__main__":
    unittest.main()
