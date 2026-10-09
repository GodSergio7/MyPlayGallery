# SPEC-07 — Explorar el catálogo

| Campo | Valor |
| --- | --- |
| ID | SPEC-07 |
| Título | Sección Explorar: catálogo completo con filtros y ordenación |
| Versión | 0.2 |
| Estado | Aprobada |
| Fecha | 2026-10-09 |
| Autor | Responsable de producto |
| Redactado por | Agente de desarrollo |
| Depende de | SPEC-03, SPEC-04 y SPEC-06 (aprobadas) |

## Historial de cambios

| Versión | Fecha | Descripción |
| --- | --- | --- |
| 0.1 | 2026-10-09 | Creación inicial. Nueva sección `/explore` con el catálogo de IGDB, filtros, ordenación y scroll infinito. Refleja lo ya implementado. |
| 0.2 | 2026-10-09 | Desde Explorar ya no se añade a la biblioteca: cada juego abre una **ficha informativa** (`/explore/:gameId`) con notas, descripción, tráileres, capturas, ficha técnica, duración, lanzamientos, tiendas y juegos similares. |

---

## 1. Resumen

Nueva sección **Explorar** (`/explore`) donde se puede recorrer todo el catálogo de IGDB (unos 270.000 juegos principales), filtrarlo y ordenarlo según las preferencias del usuario. Complementa a **Buscar** (`/search`), que sigue siendo la búsqueda rápida por título.

**Estado**: `IMPLEMENTADO`.

## 2. Filtros y ordenación

| Filtro | Valores | Parámetro en la URL |
| --- | --- | --- |
| Nombre | Texto que contenga el título (máx. 100 caracteres) | `q` |
| Letra | Todas, `#` (empieza por número) o A–Z | `letra` |
| Consola | 30 plataformas agrupadas: PlayStation, Xbox, Nintendo, PC y móvil, Sega | `consola` |
| Género | 23 géneros de IGDB traducidos | `genero` |
| Época | Años 2020, 2010, 2000, 90, 80 o antes de 1980 | `decada` |
| Nota mínima | 90, 80, 70 o 60 (nota media de IGDB) | `nota` |
| Orden | Más populares, Mejor valorados, Novedades, Próximos lanzamientos, Más antiguos, Nombre A–Z, Nombre Z–A | `orden` |

- Los filtros se combinan entre sí.
- Viven en la URL: se pueden compartir y se conservan al volver desde la ficha de un juego ("Volver a Explorar").
- Los valores de la URL se validan contra listas cerradas; un valor desconocido se ignora.

**Criterios de orden** (en la Edge Function):

| Orden | Criterio | Mínimo de calidad sin filtros | Con filtros |
| --- | --- | --- | --- |
| Más populares | Número de valoraciones | — | — |
| Mejor valorados | Nota media | ≥ 100 votos | ≥ 20 votos |
| Novedades | Fecha de salida (ya publicados) | ≥ 5 votos | — |
| Próximos lanzamientos | Fecha de salida (futuros) | ≥ 10 "hypes" | — |
| Más antiguos | Fecha de salida | — | — |
| Nombre | Alfabético | — | — |

Siempre se muestran solo juegos principales, remakes y remasters con portada, sin versiones o ediciones duplicadas.

**Estado**: `IMPLEMENTADO`.

## 3. Interfaz

- Panel de cristal con buscador, orden, cuatro desplegables y barra de letras.
- En móvil, los desplegables se pliegan tras un botón **Filtros (n)** y la barra de letras se desplaza en horizontal.
- Bajo el panel: número total de juegos, orden actual y los filtros activos como etiquetas que se pueden quitar, más "Limpiar filtros".
- Rejilla de tarjetas con portada, fecha, **nota de IGDB** y la etiqueta **"En tu biblioteca"** si el juego ya está añadido. Si se filtra por consola, esa consola aparece la primera en la tarjeta.
- **Scroll infinito**: 24 juegos por página. La siguiente se carga al acercarse al final, con un botón "Cargar más juegos" como alternativa accesible.
- Estados de carga (esqueleto), error (con reintentar) y sin resultados (con limpiar filtros).
- Acceso desde el menú: tarjeta **Descubrir → Explorar catálogo**.
- Al pulsar un juego se abre su **ficha informativa** (sección 3.1). Desde Explorar **no se añade a la biblioteca**; para eso sigue estando **Buscar**.

**Estado**: `IMPLEMENTADO`.

### 3.1 Ficha del juego (`/explore/:gameId`)

Página de solo lectura con los datos de IGDB:

| Bloque | Contenido |
| --- | --- |
| Cabecera | Captura del juego de fondo (con capa oscura), portada, título, fecha, estudio, PEGI, géneros, plataformas y la etiqueta "En tu biblioteca" si ya lo tienes |
| Notas | Nota IGDB (global), crítica y usuarios, con su número de valoraciones; verde ≥ 75, amarillo ≥ 50, rojo < 50 |
| Descripción e historia | Textos originales de IGDB **en inglés** (IGDB no ofrece traducción); la historia larga se pliega con "Leer más" |
| Tráileres | Hasta 4 vídeos de YouTube. Primero se ve la miniatura; el reproductor (`youtube-nocookie`) solo se carga al pulsar |
| Capturas | Hasta 12, en galería; se abren a pantalla completa con flechas, Escape y contador |
| Ficha | Desarrolladora, editora, saga, modos de juego, perspectiva, temas y motor (etiquetas traducidas al español) |
| ¿Cuánto dura? | Historia principal, historia y extras, y 100 %, en horas (media de los jugadores de IGDB) |
| Lanzamientos | Fecha de salida en cada plataforma |
| Dónde conseguirlo | Web oficial, tiendas (Steam, PlayStation Store, Microsoft Store, Nintendo eShop, Epic, GOG…) y Wikipedia; sin redes sociales |
| Juegos similares | Hasta 10, con portada, año y nota; abren su propia ficha |

- "Volver a Explorar" devuelve a la lista con los mismos filtros.
- La pestaña del navegador muestra el nombre del juego.
- Si faltan datos, el bloque correspondiente no aparece. Sin ninguna nota, se indica "Todavía no tiene notas en IGDB".
- La página de añadir a la biblioteca (`/game/:gameId`) se mantiene solo para el flujo de **Buscar**.

**Estado**: `IMPLEMENTADO`.

## 4. Implementación

- **Edge Function** `igdb-proxy`: nueva ruta `GET games/browse` con los parámetros `q`, `letter`, `platform`, `genre`, `from`, `to`, `min_rating`, `sort` y `offset` (máx. 4.800).
  - Todos los parámetros se validan; los inválidos devuelven `400`. El texto se limpia de comillas antes de usarlo en la consulta.
  - Devuelve `{ results, has_more, total }`. El total (`/games/count`) solo se calcula en la primera página.
- Las respuestas de IGDB incluyen ahora `total_rating`, que el dominio expone como `Game.rating` (0–100, redondeado).
- **Ficha**: nueva ruta `GET games/:id/full` en la Edge Function. Pide el juego con todos sus campos y, en paralelo, la duración (`/game_time_to_beats`; si falla, la ficha se muestra sin ella). Limita capturas, vídeos, similares y enlaces, valida los ids de YouTube y solo deja enlaces `http(s)`. En el cliente: `gamesRepository.getDetails`, esquema `IgdbFullGameSchema`, `mapIgdbFullGame` y el tipo de dominio `GameDetails`; caché de 30 minutos.
- **Cliente**:
  - `gamesRepository.browse(filters, offset)` se encarga de pedir cada página al servidor.
  - `useGameBrowse` usa `useInfiniteQuery` de TanStack Query con 5 minutos de caché.
  - `useExploreFilters` guarda los filtros en la URL.
- `GameGrid` recalcula las animaciones de entrada (`ScrollTrigger.refresh`) cuando cambia la lista, para que las tarjetas no se queden invisibles al filtrar o cargar más.

**Estado**: `IMPLEMENTADO`.

## 5. Tests

- `browseSearchParams`: conversión de filtros a parámetros.
- `igdbGamesRepository.browse`: petición con filtros, respuesta válida e inválida.
- `mapIgdbGame` / `mapIgdbBrowsePage`: nota redondeada y página de exploración.
- `mapIgdbFullGame` e `igdbImageUrl`: ficha completa, tamaños de imagen, horas de duración y casos sin datos.
- `labels`: traducción de etiquetas y selección de enlaces útiles (sin redes sociales, sin duplicados, sin URLs que no sean http).

**Estado**: `IMPLEMENTADO`.

## Estado de aprobación

SPEC-07 queda **Aprobada** (v0.2) por petición explícita del responsable de producto de una sección con todos los juegos, ordenable y filtrable por nombre, letra, consola y otros criterios, y de que cada juego del catálogo tenga su ficha informativa en lugar de la opción de añadirlo a la biblioteca.
