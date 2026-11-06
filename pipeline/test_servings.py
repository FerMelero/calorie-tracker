"""Tests de servings.py (solo biblioteca estándar). Ejecutar desde pipeline/:  python -m unittest"""

import unittest

from servings import MAX_G, SMALL_ITEM_MAX_G, serving_grams


class ValorDeLaRacionTest(unittest.TestCase):
    def test_sin_dato_o_dato_malo(self):
        for q in (None, float("nan"), "abc", 0, -5, 0.5, MAX_G + 1):
            self.assertIsNone(serving_grams("en:yogurts", "Yogur natural", q), q)

    def test_100_g_es_un_valor_por_defecto_y_se_descarta(self):
        self.assertIsNone(serving_grams("en:yogurts", "Yogur natural", 100))
        self.assertEqual(serving_grams("en:yogurts", "Yogur natural", 125), 125.0)

    def test_se_redondea_a_un_decimal(self):
        self.assertEqual(serving_grams("en:biscuits", "Galletas", 12.7499), 12.7)


class DondeTieneSentidoTest(unittest.TestCase):
    def test_categorias_con_sentido(self):
        for tags, nombre in [
            ("en:yogurts,en:dairies", "Yogur griego"),
            ("en:snacks,en:biscuits", "Galletas María"),
            ("en:sodas,en:beverages", "Cola"),
            ("en:pizzas", "Pizza margarita"),
        ]:
            self.assertEqual(serving_grams(tags, nombre, 40), 40.0, nombre)

    def test_categorias_donde_cada_uno_toma_lo_que_quiere(self):
        for tags, nombre in [
            ("en:breakfast-cereals", "Corn flakes"),
            ("en:rices", "Arroz largo"),
            ("en:olive-oils", "Aceite de oliva virgen extra"),
            ("en:pastas,en:dry-pastas", "Espaguetis"),
            ("en:flours", "Harina de trigo"),
        ]:
            self.assertIsNone(serving_grams(tags, nombre, 40), nombre)

    def test_la_exclusion_gana_a_la_inclusion(self):
        # un producto en las dos categorías no recibe ración
        self.assertIsNone(serving_grams("en:yogurts,en:breakfast-cereals", "Yogur con cereales", 125))

    def test_sin_categorias_se_decide_por_el_nombre(self):
        self.assertEqual(serving_grams(None, "Yogur de coco", 125), 125.0)
        self.assertEqual(serving_grams(float("nan"), "Galletas integrales", 20), 20.0)
        self.assertIsNone(serving_grams(None, "Salchichón ibérico", 30))  # ni categoría ni palabra
        self.assertIsNone(serving_grams(None, "Cereales de desayuno", 30))

    def test_el_arroz_de_bolsita_si_pero_el_arroz_seco_no(self):
        # el caso de uso: bolsitas de arroz cocido (ración = una bolsita)
        self.assertEqual(serving_grams("en:rices", "Arroz cocido basmati", 125), 125.0)
        self.assertEqual(serving_grams(None, "Arroz basmati vasitos microondas", 125), 125.0)
        self.assertEqual(serving_grams("en:rices", "Arroz congelado para micro", 167), 167.0)
        self.assertIsNone(serving_grams("en:rices", "Arroz largo", 62.5))
        self.assertIsNone(serving_grams("en:rices,en:cereals-and-their-products", "Arroz integral", 125))

    def test_las_barritas_de_muesli_si_el_muesli_no(self):
        self.assertEqual(serving_grams(None, "Barritas Muesli Chocolate", 23), 23.0)
        self.assertIsNone(serving_grams(None, "Muesli crujiente", 40))

    def test_el_nombre_se_compara_sin_tildes_ni_mayusculas(self):
        self.assertEqual(serving_grams(None, "LASAÑA DE CARNE", 300), 300.0)
        self.assertEqual(serving_grams(None, "Yogur Griego", 125), 125.0)

    def test_palabras_completas(self):
        # "cola" no debe coincidir con "Cola Cao" (que es un polvo para disolver)
        self.assertIsNone(serving_grams(None, "Cola Cao original", 15))

    def test_bebidas_alcoholicas_no(self):
        self.assertIsNone(serving_grams("en:wines,en:alcoholic-beverages", "Verdejo", 250))


class CosasPequenasTest(unittest.TestCase):
    def test_una_galleta_con_racion_de_paquete_entero_se_descarta(self):
        self.assertIsNone(serving_grams("en:biscuits", "Galleta tostada", 600))
        self.assertEqual(serving_grams("en:biscuits", "Galleta tostada", SMALL_ITEM_MAX_G), SMALL_ITEM_MAX_G)

    def test_una_pizza_puede_tener_racion_grande(self):
        self.assertEqual(serving_grams("en:pizzas", "Pizza familiar", 400), 400.0)


if __name__ == "__main__":
    unittest.main()
