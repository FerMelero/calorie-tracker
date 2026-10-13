import duckdb

con = duckdb.connect()
con.execute("SET memory_limit='2GB'")
con.execute("SET threads=2")
con.execute("SET temp_directory='./duck_tmp'")

con.execute("""
COPY (
  SELECT code,
         product_name AS nombre,
         brands,
         TRY_CAST("energy-kcal_100g" AS DOUBLE) AS kcal,
         TRY_CAST(proteins_100g AS DOUBLE) AS proteinas,
         TRY_CAST(carbohydrates_100g AS DOUBLE) AS carbohidratos,
         TRY_CAST(fat_100g AS DOUBLE) AS grasas,
         TRY_CAST(sugars_100g AS DOUBLE) AS azucares,
         TRY_CAST(fiber_100g AS DOUBLE) AS fibra,
         TRY_CAST(salt_100g AS DOUBLE) AS sal
  FROM read_csv('en.openfoodfacts.org.products.csv.gz',
                delim='\\t', quote='', header=true,
                all_varchar=true, ignore_errors=true)
  WHERE countries_tags LIKE '%en:spain%'
    AND product_name IS NOT NULL
    AND TRY_CAST("energy-kcal_100g" AS DOUBLE) IS NOT NULL
    AND TRY_CAST(proteins_100g AS DOUBLE) IS NOT NULL
    AND TRY_CAST(carbohydrates_100g AS DOUBLE) IS NOT NULL
    AND TRY_CAST(fat_100g AS DOUBLE) IS NOT NULL
) TO 'productos_es.csv' (HEADER)
""")