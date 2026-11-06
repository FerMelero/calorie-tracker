"""
Raciones de Open Food Facts: solo en los alimentos donde una ración tiene sentido.

Open Food Facts trae la "ración" de un 10 % de los productos, pero casi siempre es la sugerencia
del fabricante: tiene sentido en un yogur, una galleta o una bolsa de arroz (se toma entero), y no
lo tiene en unos cereales, el arroz seco o el aceite (cada uno toma lo que quiere). Por eso la
ración solo se guarda en `foods.db` si el producto está en una categoría "con sentido".

Reglas, por orden:
  1. La ración tiene que ser un número entre 1 y 1000 g/ml y distinto de 100: el "100 g" es casi
     siempre un valor por defecto de quien subió el dato, no una ración real.
  2. Si el nombre coincide con STRONG_INCLUDE_WORDS (p. ej. "arroz cocido"), se acepta.
  3. Si el producto está en una categoría de EXCLUDE_TAGS, o su nombre contiene una palabra de
     EXCLUDE_WORDS, se descarta.
  4. Si está en una categoría de INCLUDE_TAGS, o su nombre contiene una palabra de INCLUDE_WORDS,
     se acepta. Si no, se descarta.
  Antes de todo eso, en cosas pequeñas (galletas, barritas...) se descarta una ración de más de
  SMALL_ITEM_MAX_G, que casi siempre es el paquete entero.

El 57 % de los productos no tiene categorías, así que las palabras del nombre cubren ese hueco.
Para cambiar qué productos tienen ración, edita las listas y vuelve a ejecutar 02_build_db.py.
Esto solo afecta al botón de ración que la app ofrece por defecto: el usuario puede definir la suya
en cualquier alimento.
"""

import re
import unicodedata

MIN_G = 1.0
MAX_G = 1000.0
DEFAULT_PLACEHOLDER_G = 100.0  # casi siempre un valor por defecto, no una ración real

# Categorías de Open Food Facts donde se toma una unidad o ración "natural".
INCLUDE_TAGS = {
    # Lácteos individuales
    "en:yogurts", "en:dairy-desserts", "en:fermented-milk-products-desserts",
    # Galletas, bollería y dulces envasados
    "en:biscuits-and-cakes", "en:biscuits", "en:cakes", "en:pastries", "en:muffins", "en:croissants",
    "en:sweet-pastries-and-pies", "en:puffed-cereal-cakes", "en:puffed-rice-cakes", "en:puffed-corn-cakes",
    "en:toasts", "en:sliced-breads", "en:hamburger-buns", "en:toasted-bread-rolls",
    # Barritas
    "en:bars", "en:cereal-bars", "en:protein-bars", "en:energy-bars", "en:candy-chocolate-bars",
    "en:bars-covered-with-chocolate", "en:chocolate-candies",
    # Aperitivos en bolsa individual
    "en:crisps", "en:salty-snacks", "en:chips-and-fries",
    # Bebidas en lata, botella o brick
    "en:sodas", "en:carbonated-drinks", "en:energy-drinks", "en:juices-and-nectars", "en:fruit-juices",
    # Helados
    "en:ice-creams-and-sorbets", "en:ice-cream-bars", "en:ice-creams",
    # Platos preparados que se toman enteros
    "en:pizzas", "en:pizzas-pies-and-quiches", "en:frozen-pizzas", "en:sandwiches",
    "en:frozen-ready-made-meals", "en:microwave-meals", "en:canned-meals", "en:meals",
    "en:prepared-lasagne", "en:rice-dishes", "en:soups", "en:vegetable-soups", "en:cream-soups",
}

# Categorías donde cada uno toma la cantidad que quiere: no se ofrece ración por defecto.
EXCLUDE_TAGS = {
    "en:breakfast-cereals", "en:cereal-grains", "en:flours", "en:pastas", "en:dry-pastas",
    "en:rices", "en:vegetable-oils", "en:olive-oils", "en:oils-and-fats", "en:sugars", "en:salts",
    "en:spices", "en:herbs", "en:seeds", "en:nuts-and-their-products", "en:dried-products",
    "en:fruits", "en:vegetables", "en:fresh-vegetables", "en:meats", "en:fishes", "en:seafood",
    "en:eggs", "en:cheeses", "en:legumes-and-their-products", "en:sauces", "en:condiments",
    "en:spreads", "en:dietary-supplements", "en:bodybuilding-supplements", "en:protein-powders",
    "en:alcoholic-beverages", "en:wines",
}

# Productos concretos que sí valen aunque su categoría general no (p. ej. el arroz de bolsita).
STRONG_INCLUDE_WORDS = [
    r"\barroz\b.*\b(cocido|vapor|vaporizado|precocido|microondas|congelado|tres delicias|3 delicias)\b",
    r"\b(cocido|vapor|vaporizado|precocido|microondas|congelado)\b.*\barroz\b",
    r"\bbolsita\b", r"\bpara micro\b", r"\bmicroondas\b", r"\bvasito\w*\b", r"\barroz con leche\b",
    # Unidades individuales que una palabra de EXCLUDE_WORDS descartaría ("barrita de muesli", "tortita de avena")
    r"\bbarrit\w*\b", r"\btortita\w*\b",
]

# Para los productos sin categorías: palabras del nombre.
INCLUDE_WORDS = [
    r"\byogur\w*\b", r"\byogurt\w*\b", r"\byoghurt\w*\b", r"\bgalleta\w*\b", r"\bbarrita\w*\b",
    r"\bbizcocho\w*\b", r"\bmagdalena\w*\b", r"\bcroissant\w*\b", r"\bdonut\w*\b", r"\bnapolitana\w*\b",
    r"\bpizza\w*\b", r"\bsandwich\w*\b", r"\bsandw\w*\b", r"\bhelado\w*\b", r"\brefresco\w*\b",
    r"\bzumo\w*\b", r"\bbatido\w*\b", r"\blasa[nñ]a\w*\b", r"\bcanelon\w*\b", r"\bpatatas fritas\b",
    r"\bpan de molde\b", r"\bflan\b", r"\bnatillas?\b", r"\bpostre\w*\b",
    r"\bsnack\w*\b", r"\bnachos?\b", r"\bnatxos\b", r"\bpalomitas\b", r"\bpatatas fritas\b", r"\bpapas\b",
    r"\bbombon\w*\b", r"\bchocolatina\w*\b",
]

# Cosas pequeñas que se toman de una en una: una ración de más de SMALL_ITEM_MAX_G suele ser el
# paquete entero ("galletas, 600 g") y no tiene sentido.
SMALL_ITEM_MAX_G = 250.0
SMALL_ITEM_TAGS = {
    "en:biscuits", "en:cakes", "en:pastries", "en:muffins", "en:croissants", "en:cereal-bars", "en:bars",
    "en:protein-bars", "en:energy-bars", "en:candy-chocolate-bars", "en:crisps", "en:salty-snacks",
    "en:puffed-cereal-cakes", "en:puffed-rice-cakes", "en:puffed-corn-cakes", "en:toasts",
}
SMALL_ITEM_WORDS = [
    r"\bgalleta\w*\b", r"\bbarrita\w*\b", r"\bdonut\w*\b", r"\bcroissant\w*\b",
    r"\bmagdalena\w*\b", r"\btortita\w*\b", r"\bnapolitana\w*\b",
]

# Palabras que descartan aunque haya coincidencia con las de arriba.
EXCLUDE_WORDS = [
    r"\bcereales?\b", r"\bmuesli\b", r"\bgranola\b", r"\bcopos\b", r"\bavena\b", r"\bharina\b",
    r"\baceite\b", r"\bazucar\b", r"\bcola ?cao\b", r"\bnesquik\b", r"\bpolvo\b", r"\bproteina en polvo\b",
    r"\bcrema de cacao\b", r"\bmermelada\b", r"\bmiel\b", r"\bsalsa\b", r"\bmayonesa\b", r"\bketchup\b",
]


def _normalize(text: str) -> str:
    sin_tildes = "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")
    return sin_tildes.lower()


def _compile(patterns: list[str]) -> re.Pattern[str]:
    return re.compile("|".join(f"(?:{p})" for p in patterns))


_STRONG = _compile([_normalize(p) for p in STRONG_INCLUDE_WORDS])
_INCLUDE = _compile([_normalize(p) for p in INCLUDE_WORDS])
_EXCLUDE = _compile([_normalize(p) for p in EXCLUDE_WORDS])
_SMALL_ITEM = _compile([_normalize(p) for p in SMALL_ITEM_WORDS])


def _tags(categories: object) -> set[str]:
    if not isinstance(categories, str):
        return set()
    return {t.strip() for t in categories.split(",") if t.strip().startswith("en:")}


def _grams(value: object) -> float | None:
    try:
        grams = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if grams != grams:  # NaN (así llegan los vacíos de pandas)
        return None
    if not MIN_G <= grams <= MAX_G or grams == DEFAULT_PLACEHOLDER_G:
        return None
    return round(grams, 1)


def serving_grams(categories: object, name: object, serving_quantity: object) -> float | None:
    """Ración en gramos si el producto es de los que la tienen con sentido; si no, None."""
    grams = _grams(serving_quantity)
    if grams is None:
        return None

    nombre = _normalize(name) if isinstance(name, str) else ""
    tags = _tags(categories)

    es_pequeno = bool(tags & SMALL_ITEM_TAGS) or bool(_SMALL_ITEM.search(nombre))
    if es_pequeno and grams > SMALL_ITEM_MAX_G:
        return None  # casi seguro es el paquete entero, no una unidad

    if _STRONG.search(nombre):
        return grams
    if tags & EXCLUDE_TAGS or _EXCLUDE.search(nombre):
        return None
    if tags & INCLUDE_TAGS or _INCLUDE.search(nombre):
        return grams
    return None
