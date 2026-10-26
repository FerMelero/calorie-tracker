"""
Supermercados y marcas conocidas, para que la búsqueda los muestre primero.

Cada alimento recibe un `brand_rank` (número pequeño = más arriba):
    1 a 49    marca de un supermercado (el orden de SUPERMARKETS es el orden de prioridad)
    50 a 99   sin marca conocida, pero la ficha dice que se vende en ese supermercado
    100       marca conocida (nacional / internacional)
    NULL      el resto

Para ajustar el orden o añadir marcas, edita las listas de abajo y vuelve a ejecutar
02_build_db.py. Los nombres se comparan sin tildes ni mayúsculas, como palabras completas
("dia" no coincide con "diamir", pero "carrefour" sí con "Carrefour Bio").
"""

import re
import unicodedata

# Orden de prioridad: el primero sale antes. Cada entrada: (supermercado, [marcas propias]).
SUPERMARKETS: list[tuple[str, list[str]]] = [
    ("Mercadona", ["mercadona", "hacendado", "deliplus", "bosque verde", "compy"]),
    ("Carrefour", ["carrefour"]),
    ("Lidl", ["lidl", "milbona", "chef select", "deluxe", "dulano", "combino", "favorina", "pilos",
              "italiamo", "vitasia", "alesto", "cien", "freeway", "crownfield", "baresa", "bellarom"]),
    ("Dia", ["dia"]),
    ("Aldi", ["aldi", "gutbio", "milsani", "casa morando", "mamia"]),
    ("Alcampo", ["alcampo", "auchan", "producto alcampo"]),
    ("Eroski", ["eroski"]),
    ("Consum", ["consum"]),
    ("El Corte Inglés", ["el corte ingles", "hipercor", "seleqtia"]),
    ("Bonpreu", ["bonpreu", "esclat"]),
    ("BonÀrea", ["bonarea"]),
    ("Ametller Origen", ["ametller origen"]),
    ("Spar", ["spar"]),
    ("Caprabo", ["caprabo"]),
    ("Condis", ["condis"]),
    ("Covirán", ["coviran"]),
    ("Supersol", ["supersol"]),
    ("Hiper Dino", ["hiper dino", "dinosol"]),
    ("Froiz", ["froiz"]),
    ("Alimerka", ["alimerka"]),
    ("Ahorramas", ["ahorramas"]),
    ("La Sirena", ["la sirena"]),
    ("Veritas", ["veritas"]),
    ("Gadis", ["gadis"]),
]

# Marcas conocidas que no son de un supermercado.
KNOWN_BRANDS: list[str] = [
    # Lácteos y bebidas vegetales
    "danone", "activia", "actimel", "danonino", "yoplait", "pascual", "puleva", "kaiku", "president",
    "central lechera asturiana", "la lechera", "alpro", "chovi", "nestle", "nesquik", "kit kat",
    # Cárnicos y embutidos
    "el pozo", "elpozo", "campofrio", "oscar mayer", "casa tarradellas", "tarradellas", "navidul",
    "revilla", "cinco jotas", "coren", "argal",
    # Pescado y conservas
    "pescanova", "isabel", "frinsa", "calvo", "ortiz", "rio mare", "findus", "iglo",
    # Despensa, salsas y aceites
    "gallina blanca", "knorr", "maggi", "la espanola", "carbonell", "koipesol", "ybarra", "calve",
    "heinz", "barilla", "brillante", "sos", "orlando", "litoral", "buitoni", "bonduelle", "mccain",
    "hero", "solis", "risi",
    # Dulces, galletas y cereales
    "kellogg's", "kelloggs", "gullon", "cuetara", "artiach", "fontaneda", "bimbo", "panrico", "donuts",
    "cola cao", "colacao", "nutella", "ferrero", "kinder", "milka", "oreo", "lindt", "nocilla", "haribo",
    "chupa chups", "dulcesol", "snickers", "twix", "mars",
    # Aperitivos
    "lays", "lay's", "pringles", "ruffles", "doritos", "matutano", "grefusa", "frit ravich",
    # Bebidas
    "coca-cola", "coca cola", "pepsi", "fanta", "schweppes", "san miguel", "mahou", "estrella damm", "damm",
    "estrella galicia", "font vella", "lanjaron", "evian", "vichy catalan", "lipton", "nestea",
    "don simon", "granini", "minute maid", "juver", "zumosol",
]

SUPERMARKET_MAX_RANK = 49
STORE_ONLY_BASE = 50
KNOWN_BRAND_RANK = 100


def _normalize(text: str) -> str:
    sin_tildes = "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")
    return sin_tildes.lower().strip()


def _compile(alias: str) -> re.Pattern[str]:
    # Palabras completas: "dia" no debe coincidir con "diamir"
    return re.compile(rf"(?<![a-z0-9]){re.escape(_normalize(alias))}(?![a-z0-9])")


_SUPERMARKET_PATTERNS = [(i + 1, [_compile(a) for a in aliases]) for i, (_, aliases) in enumerate(SUPERMARKETS)]
_KNOWN_PATTERNS = [_compile(a) for a in KNOWN_BRANDS]


def _split(value: object) -> list[str]:
    """Separa una lista "a, b" en partes normalizadas. Cualquier vacío (None, NaN) da una lista vacía."""
    if not isinstance(value, str):
        return []
    return [_normalize(p) for p in value.split(",") if p.strip()]


def brand_rank(brands: str | None, stores: str | None) -> int | None:
    """Prioridad de un alimento según su marca y las tiendas donde se vende (ver arriba)."""
    brand_parts = _split(brands)
    store_parts = _split(stores)

    # 1) Marca de un supermercado: gana la de mayor prioridad
    best: int | None = None
    for rank, patterns in _SUPERMARKET_PATTERNS:
        if any(p.search(part) for part in brand_parts for p in patterns):
            best = rank
            break
    if best is not None:
        return best

    # 2) Marca conocida
    if any(p.search(part) for part in brand_parts for p in _KNOWN_PATTERNS):
        return KNOWN_BRAND_RANK

    # 3) Sin marca conocida, pero se vende en un supermercado de la lista
    for rank, patterns in _SUPERMARKET_PATTERNS:
        if any(p.search(part) for part in store_parts for p in patterns):
            return STORE_ONLY_BASE + rank
    return None
