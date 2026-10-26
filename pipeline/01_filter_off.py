"""
Filtra el volcado de Open Food Facts: solo productos de España con kcal y macros completos.
Ejecutar desde la carpeta pipeline/:  python 01_filter_off.py

`stores` (dónde se vende) y `scans` (veces que se ha escaneado) sirven para ordenar los
resultados de búsqueda: primero supermercados y marcas conocidas.
"""
import duckdb

con = duckdb.connect()
con.execute("SET memory_limit='1GB'")
con.execute("SET threads=2")
con.execute("SET temp_directory='./data/duck_tmp'")

con.execute("""
COPY (
  SELECT code,
         product_name AS nombre,
         brands,
         stores,
         TRY_CAST(unique_scans_n AS BIGINT) AS scans,
         TRY_CAST("energy-kcal_100g" AS DOUBLE) AS kcal,
         TRY_CAST(proteins_100g AS DOUBLE) AS proteinas,
         TRY_CAST(carbohydrates_100g AS DOUBLE) AS carbohidratos,
         TRY_CAST(fat_100g AS DOUBLE) AS grasas,
         TRY_CAST(sugars_100g AS DOUBLE) AS azucares,
         TRY_CAST(fiber_100g AS DOUBLE) AS fibra,
         TRY_CAST(salt_100g AS DOUBLE) AS sal
  FROM read_csv('data/en.openfoodfacts.org.products.csv.gz',
                delim='\\t', quote='', header=true,
                all_varchar=true, ignore_errors=true)
  WHERE countries_tags LIKE '%en:spain%'
    AND product_name IS NOT NULL
    AND TRY_CAST("energy-kcal_100g" AS DOUBLE) IS NOT NULL
    AND TRY_CAST(proteins_100g AS DOUBLE) IS NOT NULL
    AND TRY_CAST(carbohydrates_100g AS DOUBLE) IS NOT NULL
    AND TRY_CAST(fat_100g AS DOUBLE) IS NOT NULL
) TO 'data/productos_es.csv' (HEADER)
""")