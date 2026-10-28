"""Tests de brands.py (solo biblioteca estándar). Ejecutar desde pipeline/:  python -m unittest"""

import unittest

from brands import KNOWN_BRAND_RANK, STORE_ONLY_BASE, SUPERMARKETS, brand_rank


class BrandRankTest(unittest.TestCase):
    def test_marcas_de_supermercado(self):
        self.assertEqual(brand_rank("Hacendado", None), 1)  # Mercadona es la primera de la lista
        self.assertEqual(brand_rank("Hacendado,Mercadona", None), 1)
        self.assertEqual(brand_rank("Carrefour Bio", None), 2)
        self.assertEqual(brand_rank("Milbona (Lidl)", None), 3)

    def test_sin_tildes_ni_mayusculas(self):
        self.assertEqual(brand_rank("EL CORTE INGLÉS", None), brand_rank("el corte ingles", None))

    def test_palabras_completas(self):
        # "dia" es un supermercado, pero "diamir" no es de Dia
        self.assertIsNone(brand_rank("diamir", None))
        self.assertIsNotNone(brand_rank("Dia", None))

    def test_marca_conocida(self):
        self.assertEqual(brand_rank("Danone", None), KNOWN_BRAND_RANK)
        self.assertEqual(brand_rank("Kellogg's", None), KNOWN_BRAND_RANK)

    def test_solo_se_vende_en_un_supermercado(self):
        rank = brand_rank("Marca rara", "Mercadona")
        self.assertEqual(rank, STORE_ONLY_BASE + 1)
        self.assertLess(rank, KNOWN_BRAND_RANK)

    def test_la_marca_gana_a_la_tienda(self):
        # Danone vendido en Carrefour sigue siendo "marca conocida", no "tienda"
        self.assertEqual(brand_rank("Danone", "Carrefour"), KNOWN_BRAND_RANK)

    def test_sin_datos(self):
        self.assertIsNone(brand_rank(None, None))
        self.assertIsNone(brand_rank(float("nan"), float("nan")))  # así llegan los vacíos de pandas
        self.assertIsNone(brand_rank("Marca desconocida", "Tienda de barrio"))

    def test_la_lista_cabe_en_el_rango_de_supermercados(self):
        self.assertLess(len(SUPERMARKETS), STORE_ONLY_BASE)


if __name__ == "__main__":
    unittest.main()
