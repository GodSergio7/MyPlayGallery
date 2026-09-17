# SPEC-04 — Integración de RAWG

| Campo | Valor |
| --- | --- |
| ID | SPEC-04 |
| Título | Integración de RAWG (datos externos de videojuegos) |
| Versión | 0.3 |
| Estado | Aprobada |
| Fecha | 2026-09-16 |
| Autor | Responsable de producto |
| Redactado por | Agente de desarrollo |
| Depende de | SPEC-00, SPEC-01, SPEC-02 y SPEC-03 (aprobadas) |

## Historial de cambios

| Versión | Fecha | Descripción |
| --- | --- | --- |
| 0.1 | 2026-09-16 | Creación inicial. Integración de RAWG como fuente externa, proxy vía Edge Function, validación con Zod, adaptación a dominio y uso de TanStack Query. |
| 0.2 | 2026-09-16 | Resueltas las decisiones pendientes de la v0.1: `genres` opcional sin llamada adicional a `/genres`; `background_image`/`released` tratados como nullable; `page_size = 20` y primera página sin paginación; sin Auth/JWT ni rate limiting propio en SPEC-04; composición transitoria de `list()` sobre mock; atribución RAWG con hipervínculo en el footer; TanStack Query, Zod y estrategia de tests. No se detectaron cambios en la documentación oficial de RAWG respecto a la v0.1. |
| 0.3 | 2026-09-16 | Cierre documental de las Fases 1–3. SPEC-04 pasa a **Aprobada**. Se añade la sección "Estado de implementación": Fase 1 (infraestructura RAWG + Edge Function), Fase 2 (adaptación de datos RAWG) y Fase 3 (TanStack Query + búsqueda real en `/search`) completadas; Fase 4 (detalle `/game/:rawgId`) pendiente. Se alinean §9, §10, §11, §12, §16, §17, §19, §20, §21 y §22 con el estado real (incluida la eliminación de `VITE_RAWG_PROXY_URL`). Sin cambios funcionales aprobados respecto a la v0.2. |

## Leyenda de estados de decisión

- **DEFINIDO**: ya establecido por SPEC-00/01/02/03, por la documentación oficial de RAWG o por decisión aprobada en la revisión de SPEC-04.
- **PROPUESTO**: recomendación del agente. Requiere aprobación del responsable de producto.
- **PENDING**: decisión abierta que debe aprobar el responsable de producto.
- **NO VERIFICADO**: dato que no ha podido confirmarse en la documentación oficial de RAWG y que debe validarse en la implementación. No bloquea el avance.
- **IMPLEMENTADO**: decisión aprobada que ya está construida en las Fases 1–3 (se documenta como hecho, sin alterar el alcance aprobado).

> SPEC-04 está **Aprobada** y se implementa por fases. Este documento fija las decisiones, el alcance y la arquitectura aprobados; el estado real de avance se detalla en **Estado de implementación**. Las decisiones de fases posteriores **no** se consideran aprobadas por el hecho de estar implementadas las Fases 1–3.

## Fuentes consultadas

- Página oficial de RAWG API: `https://rawg.io/apidocs` (consultada el 2026-09-16).
- Especificación OpenAPI (Swagger 2.0) oficial: `https://api.rawg.io/docs/?format=openapi` (consultada el 2026-09-16).

> Toda afirmación sobre endpoints y campos de RAWG se basa en estas dos fuentes. Cuando algo no aparece en ellas, se marca como **NO VERIFICADO**.

---

## Estado de implementación

> Refleja el avance real de la implementación de SPEC-04. La SPEC está **Aprobada**; las Fases 1–3 están completadas y la Fase 4 queda pendiente.

| Fase | Alcance | Estado |
| --- | --- | --- |
| Fase 1 | Infraestructura RAWG + Edge Function `rawg-proxy` (proxy seguro, secretos, CORS, errores, timeout, `.env.example`) | **Completada** |
| Fase 2 | Adaptación de datos RAWG (`Rawg*` + Zod + mapper → `Game` + `rawgGamesRepository`, con tests) | **Completada** |
| Fase 3 | TanStack Query + búsqueda RAWG real en `/search` (`QueryProvider`, `useGameSearch`, tests) | **Completada** |
| Fase 4 | Detalle `/game/:rawgId` con TanStack Query y elementos pendientes | **Pendiente** |

Detalles ya implementados:

- `QueryProvider` global en `src/app/providers`, montado en `src/main.tsx` (dentro de `StrictMode`). Sin Zustand ni otros gestores globales.
- `/search` usa RAWG real mediante `useGameSearch` → `gamesRepository.search()` → `rawgGamesRepository` → cliente → Edge Function → RAWG.
- Query key `['rawg', 'search', normalizedQuery]`, con normalización `trim().toLowerCase()`.
- Query deshabilitada cuando el término está vacío; debounce de 350 ms en `SearchPage`.
- `AbortSignal` de TanStack Query propagado al repository; `AbortError` no se muestra como error de usuario.
- `staleTime` de búsqueda: **5 minutos**; `gcTime`: **30 minutos**.
- Sin paginación; primera página; 20 resultados (`page_size = 20` aplicado en la Edge Function).
- Estados de la búsqueda: inicial, loading (skeletons), resultados, sin resultados y error + retry.
- `retry` limitado a errores recuperables (`network`, `upstreamError`, `timeout`, `rateLimited`; máximo 2); no se reintentan `badRequest`, `notFound` ni `invalidResponse`.
- Dashboard y Library continúan usando datos **mock** (`gamesRepository.list()` y `libraryRepository.*`).
- `/game/:rawgId` **no** se ha migrado todavía a TanStack Query (sigue con `useAsync`); su capa de datos `getById` ya apunta a RAWG desde la Fase 2. La migración corresponde a la Fase 4.
- **Pendiente**: la atribución a RAWG como enlace activo en el footer (§14) aún no se ha implementado.

Validación al cierre de la Fase 3: `npm test` → **39/39 OK**; `npm run build` → OK; `npm run lint` → 0 errores / 0 warnings; `tsc -p tsconfig.app.json --noEmit` y `tsc -p tsconfig.node.json --noEmit` → OK.

---

## 1. Objetivo y alcance

**Problema**: MyPlayGallery necesita información externa real de videojuegos (título, portada, fecha, géneros y plataformas) para las pantallas `/search` y `/game/:rawgId`, sin exponer la API key de RAWG y sin acoplar la UI al proveedor.

**Alcance de SPEC-04**:

- Integrar **RAWG** como única fuente externa de metadatos de videojuegos.
- Consumir RAWG **exclusivamente** a través de una **Supabase Edge Function** que actúa de proxy.
- Mantener la API key de RAWG **solo en el servidor**.
- Definir tipos `Rawg*`, validación con **Zod**, adaptación a `Game` y el uso de **TanStack Query**.
- Conectar `/search` y `/game/:rawgId` a datos reales (**`/search` implementado en la Fase 3; `/game/:rawgId` pendiente de la Fase 4**).
- Incorporar la **atribución a RAWG con hipervínculo activo** en el footer existente (**pendiente**).
- Mantener sin cambios la UI/UX aprobada en SPEC-03.

**Fuera de alcance de SPEC-04** (explícitamente):

- Supabase Auth, modelo de usuarios, perfiles, RLS.
- Persistencia real de `library_entries` ni biblioteca real.
- Migraciones SQL o creación de tablas.
- Dashboard/Biblioteca conectados a Supabase real.
- Cualquier funcionalidad SaaS o multiusuario.

**Transición**: la biblioteca personal (entradas) **continúa sobre mocks** hasta una SPEC posterior (SPEC-05). SPEC-04 solo sustituye la fuente de **metadatos externos de juegos**.

**Estado**: `DEFINIDO`.

---

## 2. Arquitectura objetivo

Flujo de dependencias aprobado (implementado en las Fases 1–3 para la búsqueda):

```
features
  └── GamesRepository
        └── data/rawg
              └── Supabase Edge Function (rawg-proxy)
                    └── RAWG API (https://api.rawg.io/api)
```

Reglas:

- Las **features nunca** llaman a RAWG directamente.
- La API key de RAWG **nunca** llega al navegador.
- La capa `data/rawg` es la única que conoce la forma de los datos de RAWG.
- La UI nunca consume la respuesta cruda de RAWG: recibe siempre `Game`.

**Estado**: `DEFINIDO` (alineado con SPEC-01 §1, §9, §11, §17).

---

## 3. Verificación de la documentación oficial de RAWG

| Aspecto | Confirmado | Detalle / decisión |
| --- | --- | --- |
| Base URL | Sí | `https://api.rawg.io/api` (OpenAPI `host: api.rawg.io`, `basePath: /api`). |
| Autenticación | Sí | API key en el parámetro de query `key`, en **todas** las peticiones. Ejemplo oficial: `GET https://api.rawg.io/api/platforms?key=YOUR_API_KEY` (rawg.io/apidocs). |
| `GET /games` (listado y búsqueda) | Sí | Parámetros documentados: `page`, `page_size`, `search`, `search_precise`, `search_exact`, `platforms`, `genres`, `ordering`, entre otros. Devuelve `{ count, next, previous, results[] }`. |
| `GET /games/{id}` (detalle) | Sí | `id` admite entero **o slug** (`An ID or a slug identifying this Game`). Devuelve `GameSingle`. |
| `GET /platforms` / `GET /genres` | Sí | Existen, pero **no se consumen** en SPEC-04 (las plataformas vienen embebidas en el juego; ver decisión de géneros). |
| Campo de fecha de lanzamiento | Sí | `released`, formato `date`. Se tratará como **nullable** (decisión aprobada). |
| Campo de portada | Sí | `background_image` (formato `uri`). Se tratará como **nullable** (decisión aprobada). |
| Plataformas dentro del juego | Sí | `platforms[]` con `{ platform: { id, slug, name }, released_at, requirements }`. |
| Géneros dentro del juego | **NO VERIFICADO** | El esquema OpenAPI de `Game` y `GameSingle` **no declara** el campo `genres`, aunque exista el endpoint `/genres`. Se confirmará con una llamada real durante la implementación, **sin bloquear** el avance (decisión aprobada). |
| `page_size`: valor por defecto y máximo | **NO VERIFICADO** | El parámetro existe (`integer`) pero la documentación recuperada no indica default ni máximo. MyPlayGallery fija `page_size = 20` (decisión aprobada). |
| Comportamiento de *rate limit* (p. ej. HTTP 429) | **NO VERIFICADO** | No descrito en el OpenAPI. El plan gratuito documenta **hasta 20.000 peticiones/mes** (rawg.io/apidocs). No se implementa rate limiting propio (decisión aprobada). |
| Atribución con enlace activo | Sí | Los términos exigen atribuir a RAWG y **añadir un hipervínculo activo** desde cada página donde se usen sus datos (rawg.io/apidocs). Requisito aprobado para SPEC-04 (**pendiente de implementar**). |

---

## 4. Endpoints de RAWG utilizados

Solo se utilizan dos operaciones, ambas confirmadas:

1. **Búsqueda**
   - `GET /games?key=<secreto>&search=<término>&page_size=20`
   - Respuesta paginada `{ count, next, previous, results[] }`. Se usa **solo la primera página**.

2. **Detalle**
   - `GET /games/{rawgId}?key=<secreto>`
   - Respuesta `GameSingle`.

`/platforms` y `/genres` **no** se consumen: las plataformas vienen embebidas en el juego y los géneros se rigen por la decisión aprobada (§5).

**Estado**: `DEFINIDO`.

---

## 5. Campos de RAWG necesarios para las pantallas aprobadas

Solo se proyectan los campos que la UI de SPEC-03 necesita realmente.

| Dominio (`Game`) | Origen RAWG | Confirmado | Notas / decisión |
| --- | --- | --- | --- |
| `rawgId: number` | `id` | Sí | Identificador entero. |
| `title: string` | `name` | Sí | |
| `coverUrl: string \| null` | `background_image` | Sí (nulabilidad **NO VERIFICADA**) | Decisión aprobada: tratar como **nullable**. Zod y mapper toleran ausencia. El dominio ya admite `null`; no se modifica. |
| `released: string \| null` | `released` | Sí (nulabilidad **NO VERIFICADA**) | Decisión aprobada: tratar como **nullable**. Zod y mapper toleran ausencia. El dominio ya admite `null`; no se modifica. |
| `genres: string[]` | `genres[].name` | **NO VERIFICADO** | Decisión aprobada: `genres` se mantiene en el dominio. Si RAWG no lo devuelve en el payload usado, **no se llama a `/genres`**; el mapper usa `[]` y Zod acepta su ausencia. No bloquea la integración. |
| `platforms: Platform[]` | `platforms[].platform.{id,name}` | Sí | Se descarta `slug`/`requirements`. |

Campos de RAWG **no necesarios** en SPEC-04 (se ignoran): descripción, metacritic, rating, stores, screenshots, movies, requirements, ESRB, etc.

El tipo de dominio `Game` (`src/shared/types/domain.ts`) **no requiere cambios**.

**Estado**: `DEFINIDO` (tipos, schemas y mapper **implementados** en la Fase 2).

---

## 6. Separación de tipos y flujo de datos

Se mantiene la regla de SPEC-01 §17 y la decisión aprobada:

```
RAWG
  → Edge Function
  → Zod
  → Rawg*
  → mapper
  → Game (dominio)
  → UI
```

- Nombres de tipos externos: **`Rawg*`** (`RawgGame`, `RawgGameListResponse`).
- Los `Rawg*` son de **solo lectura**; nunca se editan.
- Los mappers viven **exclusivamente** en `src/data/rawg`.
- La UI no importa tipos `Rawg*`.

**Estado**: `DEFINIDO` (**implementado** en la Fase 2).

---

## 7. Reutilización de la fachada `GamesRepository`

Interfaz actual (`src/data/repository.ts`):

```ts
export interface GamesRepository {
  list(): Promise<Game[]>
  getById(rawgId: number): Promise<Game | undefined>
  search(query: string): Promise<Game[]>
}
```

### 7.1 Suficiencia de los métodos

| Método | Equivalente RAWG | Suficiencia |
| --- | --- | --- |
| `search(query)` | `GET /games?search=` | **Suficiente**. Se mapea `results[]`. |
| `getById(rawgId)` | `GET /games/{id}` | **Suficiente**. Un 404 se traduce a `undefined` para conservar el estado "Juego no encontrado". |
| `list()` | **No existe** un endpoint "todos los juegos" | **No aplica**. `/games` es un listado paginado del catálogo, no la resolución de un conjunto de `rawgId`. |

### 7.2 Interfaz aprobada

```ts
export interface GamesRepository {
  search(query: string, signal?: AbortSignal): Promise<Game[]>
  getById(rawgId: number, signal?: AbortSignal): Promise<Game | undefined>
  list(): Promise<Game[]>
}
```

- **Qué cambia**: se añade un `AbortSignal` **opcional** a `search` y `getById` para permitir la cancelación desde TanStack Query.
- **Por qué**: soportar búsquedas sucesivas que se cancelan y peticiones de detalle que dejan de ser necesarias.
- **Impacto**: **compatible**. Al ser opcional, las llamadas actuales siguen siendo válidas.
- **`list()`**: se mantiene **temporalmente** sobre la implementación **mock** (decisión aprobada).

### 7.3 Composición transitoria (implementada en la Fase 2)

```ts
export const gamesRepository: GamesRepository = {
  ...rawgGamesRepository, // search / getById → RAWG (real)
  list: mockListGames,    // TEMPORAL (mock)
}
```

- `search` y `getById` pasan a RAWG.
- `list()` permanece sobre mock solo para Dashboard/Biblioteca.

**Carácter transitorio de `list()`**:

- **No es una solución definitiva**.
- Es necesaria porque Dashboard/Biblioteca todavía trabajan con `library_entries` mock y resuelven títulos/portadas de todos los juegos.
- Se resolverá cuando la biblioteca pase a **Supabase** (SPEC-05), sustituyéndose por la resolución de metadatos a partir de las entradas (p. ej. `getByIds` sobre RAWG, cacheado).
- **No debe provocar cambios innecesarios en la UI actual**: Dashboard/Biblioteca/EntryDetail no se modifican en SPEC-04.
- **Limitación transitoria conocida**: un juego añadido desde RAWG a la biblioteca mock no aparecerá en `list()` (mock) y podría mostrarse como "Juego desconocido" en Dashboard/Biblioteca hasta SPEC-05.

**Estado**: `DEFINIDO` (**implementado** en la Fase 2).

---

## 8. Adaptador (RAWG → dominio)

Ubicación obligatoria: `src/data/rawg/` (fuera de `features`).

Responsabilidades:

- `mapRawgGame(rawg: RawgGame): Game`
- `mapRawgGameList(response: RawgGameListResponse): Game[]`
- `mapRawgPlatform(rawgPlatform): Platform`

Reglas de mapeo:

- `rawgId = rawg.id`
- `title = rawg.name`
- `coverUrl = rawg.background_image ?? null`
- `released = rawg.released ?? null`
- `genres = rawg.genres?.map((g) => g.name) ?? []`
- `platforms = rawg.platforms?.map((p) => ({ id: p.platform.id, name: p.platform.name })) ?? []`
- Se descartan campos no usados.

Los mappers son **funciones puras** y están cubiertos con tests (SPEC-01 §14).

**Estado**: `DEFINIDO` (**implementado** en la Fase 2).

---

## 9. Validación con Zod

SPEC-01 §13 establece Zod. **Implementado en la Fase 2.**

- **Qué se valida**: la respuesta de la **Edge Function** (proyección RAWG), no la de RAWG directamente.
  - `RawgGameListResponseSchema`: `{ results: RawgGame[] }` (y opcionalmente `count`, `next`, `previous`).
  - `RawgGameSchema`: `id`, `name`, `released` (nullable), `background_image` (nullable), `platforms` (opcional), `genres` (opcional).
- **Cómo**: `safeParse`. Nunca `parse` que lance sin control.
- **Si la respuesta es inesperada**:
  - Se descarta el dato inválido y se normaliza un error `invalidResponse`.
  - La UI muestra el `ErrorState` existente con "Reintentar".
  - La aplicación **no se rompe** (ni pantalla en blanco ni excepción no controlada).
- **Campos opcionales (decidido)**: `genres` y `platforms` se validan como opcionales y se degradan a `[]`. La **ausencia de `genres` no bloquea** la integración y **no** provoca una llamada a `/genres`.

**Estado**: `DEFINIDO` (**implementado** en la Fase 2).

---

## 10. Supabase Edge Function (`rawg-proxy`)

Arquitectura lógica del proxy seguro. **Implementada en la Fase 1.**

### 10.1 Responsabilidad

- Única puerta de salida hacia RAWG.
- Custodiar la API key de RAWG como **secreto de servidor**.
- Validar parámetros de entrada.
- Proyectar la respuesta a los campos mínimos necesarios.
- Normalizar errores.
- Aplicar CORS.

### 10.2 Endpoints lógicos

| Método | Ruta lógica | Equivalente RAWG |
| --- | --- | --- |
| `GET` | `/games?search=<término>` | `GET /games?search=...&page_size=20` |
| `GET` | `/games/:rawgId` | `GET /games/{id}` |

> **Implementado (Fases 1 y 3)**: el frontend invoca la función con `supabase.functions.invoke()` (que deriva la URL a partir de `VITE_SUPABASE_URL` y el nombre de la función y adjunta la `apikey`). Por ello `VITE_RAWG_PROXY_URL` **se eliminó** y ya no es una variable necesaria. No se fija aquí el subdominio exacto de Supabase para no acoplar la SPEC a detalles que pueden cambiar.

### 10.3 No es un proxy arbitrario

Aunque SPEC-04 **no implementa autenticación de usuario**, la Edge Function **no puede** convertirse en un proxy abierto:

- Solo acepta las **operaciones definidas** (`/games` con `search`, y `/games/:rawgId`).
- Valida **estrictamente** los parámetros (tipo, longitud, formato).
- Solo construye URLs hacia `https://api.rawg.io/api`.
- **No acepta URLs externas** ni parámetros de destino.
- **No reenvía rutas arbitrarias**: la ruta de RAWG se deriva de la operación, no de la entrada del cliente.

### 10.4 Entrada y validación de parámetros

- `search`: string, `trim`, longitud **1–100**; se rechaza vacío. Se **codifica** en la URL upstream.
- `rawgId`: **solo dígitos**, entero > 0. Se rechaza cualquier otro valor (evita *path traversal* o inyección).
- Cualquier parámetro no reconocido se ignora.

### 10.5 Comunicación con RAWG

- Llama a `https://api.rawg.io/api/games` (o `/games/{id}`) añadiendo `key=<RAWG_API_KEY>` **en el servidor**.
- Aplica un **timeout** (9 s) mediante `AbortController`.
- No sigue redirecciones arbitrarias hacia dominios externos.
- No reenvía *headers* del cliente a RAWG.

### 10.6 Respuesta (proyección)

La Edge Function devuelve una **proyección RAWG** en `snake_case`, para que el mapper de `data/rawg` conserve su responsabilidad (SPEC-01 §9):

- Lista: `{ results: RawgGameProjection[] }`.
- Detalle: `RawgGameProjection`.

`RawgGameProjection` contiene únicamente: `id`, `name`, `released`, `background_image`, `genres`, `platforms[]` (con `{ platform: { id, name } }`).

**Qué puede llegar al cliente**: solo metadatos públicos de videojuegos. **Nunca**: la API key, cabeceras internas, cuerpos de error crudos de RAWG ni trazas.

### 10.7 Errores de la Edge Function

Forma normalizada:

```json
{ "error": { "code": "not_found", "message": "Game not found" } }
```

| Situación | HTTP | `code` |
| --- | --- | --- |
| Parámetros inválidos | 400 | `bad_request` |
| Juego inexistente en RAWG | 404 | `not_found` |
| Rate limit de RAWG | 429 | `rate_limited` |
| Error/5xx de RAWG | 502 | `upstream_error` |
| Timeout hacia RAWG | 504 | `timeout` |
| Fallo interno del proxy | 500 | `internal_error` |
| Método no permitido | 405 | `method_not_allowed` |

Los mensajes son genéricos y no revelan detalles internos.

### 10.8 CORS

- Necesario si el frontend llama a la función desde otro origen.
- Se permite únicamente el/los origen(es) de la aplicación (`ALLOWED_ORIGINS`), método `GET` y las cabeceras `content-type`, `authorization`, `apikey` y `x-client-info`. Esta última la envía `supabase-js`, por lo que es **estrictamente necesaria** para que el preflight del navegador no falle. No `*` en producción.
- Se responde a `OPTIONS` (preflight) cuando corresponda.

### 10.9 Autenticación

- SPEC-04 **no implementa autenticación de usuarios**.
- SPEC-04 **no exige** que la Edge Function valide JWT de usuario.
- En la Fase 1 se configuró `verify_jwt = true` para que el gateway de Supabase no deje la función completamente expuesta; no se implementa Auth de usuario.
- La protección mediante autenticación de Supabase se abordará posteriormente junto con **SPEC-05/Auth**.
- Mientras tanto, la contención se basa en §10.3 (no proxy arbitrario), la validación estricta de parámetros y el CORS restringido.

### 10.10 Secretos

- La Edge Function lee `RAWG_API_KEY` desde los secretos del entorno de Supabase (`Deno.env`).
- No se registra el valor en logs.

**Estado**: `DEFINIDO` (**implementado** en la Fase 1).

---

## 11. Secretos y variables de entorno

- **Secreto de servidor (Edge Function)**: `RAWG_API_KEY`.
  - Se almacena como secreto de la Edge Function en Supabase.
  - **Nunca** con prefijo `VITE_` ni en el repositorio.
- **Variables del frontend (públicas por diseño)**:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- **Variable de servidor de la Edge Function** (opcional): `ALLOWED_ORIGINS`, para restringir CORS.
- **Nunca pueden llegar al navegador**: `RAWG_API_KEY` ni ninguna otra clave sensible.
- **Relación con `.env.example`**: el archivo versionado incluye `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con valores vacíos, y documenta `RAWG_API_KEY` y `ALLOWED_ORIGINS` como secretos de servidor. La variable `RAWG_API_KEY` **no** se añade a `.env.example` como `VITE_*`.
- **`VITE_RAWG_PROXY_URL`**: se eliminó (ya no es necesaria) porque el frontend invoca la Edge Function con `supabase.functions.invoke()`. Dado que `supabase-js` adjunta automáticamente la `apikey`, no se requiere la URL base de la función.

> SPEC-04 no introduce ninguna clave real.

**Estado**: `DEFINIDO` (**implementado** en la Fase 1; `VITE_RAWG_PROXY_URL` retirada).

---

## 12. Búsqueda (`/search`)

Respeta la UX aprobada en SPEC-03 §6:

- `SearchBar` con **debounce de 350 ms** y **autofocus**.
- Estado inicial (sin término), loading (skeletons), resultados (rejilla `GameCard`), sin resultados (`EmptyState`) y error (`ErrorState` con reintento).

Reglas funcionales aprobadas:

- **Query mínima**: 1 carácter tras `trim`; sin término no se llama a RAWG.
- **Espacios**: se aplica `trim`; los espacios internos se conservan (RAWG decide la coincidencia).
- **Límite de resultados**: **`page_size = 20`** por búsqueda (decisión aprobada).
- **Primera página únicamente**: **no se implementa paginación**; **no** se añade "Cargar más"; **no** se modifica la UI de SPEC-03.
- **Paginación fuera de esta fase**: podrá revisarse posteriormente si fuese necesario.
- **Búsquedas rápidas sucesivas**: cada término nuevo genera una clave de query distinta; la petición anterior se **cancela** mediante `AbortSignal` (TanStack Query). No se usa `keepPreviousData`, porque SPEC-03 exige el estado *loading* (skeleton) en cada búsqueda.

**Implementación (Fase 3)**: `SearchPage` → `useGameSearch` (TanStack Query) → `gamesRepository.search()`. Query key `['rawg', 'search', normalizedQuery]` con `trim().toLowerCase()`; query deshabilitada con término vacío; `staleTime` 5 min; `gcTime` 30 min. El `AbortError` por cancelación no se muestra como error.

**Estado**: `DEFINIDO` e **implementado en la Fase 3** (la posible paginación futura queda **diferida**, fuera de esta fase).

---

## 13. Detalle (`/game/:rawgId`)

`getById(rawgId)` debe proporcionar lo necesario para `/game/:rawgId` (SPEC-03 §7):

- **Bloque A — información externa (RAWG, solo lectura)**: portada, título, fecha de lanzamiento, géneros, plataformas disponibles.
- **Bloque B — datos personales**: sin cambios; sigue sobre mock hasta SPEC-05.

Reglas:

- Un `rawgId` inexistente (RAWG 404) se traduce a `undefined` y la página mantiene su estado **"Juego no encontrado"** ya existente.
- La información de RAWG es de **solo lectura**; nunca se persiste ni se edita (SPEC-02 §10).
- **Implementación**: la capa de datos `getById` ya apunta a RAWG (Fase 2), pero la página `/game/:rawgId` **todavía no se ha migrado a TanStack Query** (sigue usando `useAsync`). Su migración corresponde a la **Fase 4**.

**Estado**: `DEFINIDO` (página pendiente de la Fase 4).

---

## 14. Atribución de RAWG (requisito aprobado)

Los términos de uso de RAWG exigen atribuir la fuente y **añadir un hipervínculo activo** desde cada página donde se usen sus datos (rawg.io/apidocs).

Requisito aprobado para SPEC-04:

- Se incorpora al **footer existente**.
- Respeta el diseño de SPEC-03: **sin** crear una nueva sección y **sin** alterar el diseño.
- El texto actual del footer ("Datos de juegos por RAWG") se convierte en un **enlace activo a RAWG** (`https://rawg.io`).
- Debe cumplir accesibilidad (enlace con nombre accesible, foco visible).

> Es un cambio de contenido mínimo en el footer, no un rediseño. **Pendiente de implementar** (el footer sigue mostrando texto plano).

**Estado**: `DEFINIDO` (**pendiente de implementar**).

---

## 15. Estrategia de errores normalizados

Se define un error de datos común (`DataError`) con un `kind` (**implementado** en la Fase 2):

| `kind` | Origen | Mensaje de UI |
| --- | --- | --- |
| `badRequest` | 400 / 405 | No se pudo procesar la búsqueda. |
| `notFound` | 404 (detalle) | Juego no encontrado. |
| `unauthorized` | 401/403 (si aplica) | No se pudo acceder a los datos. |
| `rateLimited` | 429 | Demasiadas peticiones. Inténtalo más tarde. |
| `upstreamError` | 502 / error de RAWG | No se pudo obtener la información. |
| `timeout` | 504 / abort por tiempo | La petición ha tardado demasiado. |
| `network` | fallo de red del navegador | Sin conexión. Revisa tu red. |
| `invalidResponse` | Zod `safeParse` fallido | Datos inesperados del servicio. |
| `internalError` | 500 | Error inesperado. Inténtalo de nuevo. |

Reglas:

- El usuario **nunca** recibe secretos ni detalles internos.
- Todos los errores se representan con el `ErrorState` ya existente (con "Reintentar").
- La cancelación (`AbortError`) **no** es un error de UI: no debe mostrarse.

**Estado**: `DEFINIDO` (**implementado** en la Fase 2).

---

## 16. TanStack Query

**DEFINIDO** por SPEC-01 §7. **Implementado en la Fase 3 para la búsqueda**; el detalle se migrará en la Fase 4.

- TanStack Query se usa para **`search()`** (implementado en la Fase 3). `getById()` se migrará en la Fase 4.
- `useAsync` **continúa únicamente** para los mocks y para las pantallas no migradas (detalle y biblioteca).
- La **biblioteca mock no necesita** TanStack Query.

### 16.1 Claves de query

```ts
export const rawgKeys = {
  all: ['rawg'] as const,
  searches: () => [...rawgKeys.all, 'search'] as const,
  search: (query: string) => [...rawgKeys.searches(), query.trim().toLowerCase()] as const,
  details: () => [...rawgKeys.all, 'detail'] as const,
  detail: (rawgId: number) => [...rawgKeys.details(), rawgId] as const,
}
```

> La clave de búsqueda está implementada. La clave de detalle se usará en la Fase 4. Se mantienen salvo que la documentación oficial de RAWG o una incompatibilidad técnica obliguen a cambiarlas.

### 16.2 Comportamiento

- **Búsqueda**: `useQuery({ queryKey: rawgKeys.search(q), queryFn, enabled: q.trim() !== '' })` — **implementado** en `useGameSearch`.
- **Detalle**: `useQuery({ queryKey: rawgKeys.detail(rawgId), queryFn })` — **pendiente (Fase 4)**.
- **Cancelación**: `queryFn` recibe `signal` de TanStack Query y lo pasa al repositorio (`search(q, signal)` / `getById(id, signal)`).
- **Reintentos**: `retry` solo para `network`/`upstreamError`/`timeout`/`rateLimited` (máximo 2); **no** reintentar `badRequest`, `notFound` ni `invalidResponse`.
- **Estados**: `isPending` → skeletons; `isError` → `ErrorState`; `data` → rejilla.
- **Búsquedas sucesivas**: claves distintas por término; se cancelan las obsoletas.
- **Provider global**: `QueryProvider` (`QueryClientProvider`) se monta en `app` (`src/app/providers`), usado en `src/main.tsx`.

### 16.3 Caché

| Query | `staleTime` | `gcTime` | Estado | Justificación |
| --- | --- | --- | --- | --- |
| Búsqueda | 5 minutos | 30 minutos | **Implementado (Fase 3)** | Los resultados de búsqueda cambian poco; evita repetir peticiones al teclear. |
| Detalle | 24 horas | 7 días | Propuesto (Fase 4) | Los metadatos de un juego cambian rara vez; debe poder revalidarse, no cachearse indefinidamente. |

- No se cachea indefinidamente nada.
- La caché es en memoria del cliente (SPEC-01 §9: RAWG no se persiste en PostgreSQL).

**Estado**: `DEFINIDO` (caché de búsqueda **implementada**; la de detalle queda pendiente de la Fase 4).

---

## 17. Testing

Herramientas de SPEC-01 §14: **Vitest + React Testing Library + user-event + MSW**.

**Implementado (Fases 2 y 3)**: tests de esquemas Zod, mappers, repositorio `data/rawg`, hook `useGameSearch` y `SearchPage`. Total al cierre de la Fase 3: **39 tests en verde** (28 de las Fases 1–2 y 11 de la Fase 3), con `jsdom` para los tests de UI.

**Pendiente**: tests de la Edge Function (Deno) y de la migración a TanStack Query del detalle (`/game/:rawgId`), correspondientes a fases posteriores.

| Qué | Cómo |
| --- | --- |
| Esquemas Zod | Payload válido → ok; payload incompleto/tipo erróneo → `invalidResponse`; ausencia de `genres`/`platforms` → `[]`. |
| Mappers | `RawgGame` → `Game`; `background_image`/`released`/`genres`/`platforms` nulos o ausentes. |
| Repositorio (`data/rawg`) | `fetch` simulado con MSW: 200, 404, 429, 500, timeout y JSON inválido. |
| TanStack Query | Hook con `QueryClientProvider` + MSW: loading → éxito, error y reintento, cancelación (búsqueda implementada). |
| Edge Function | Tests Deno con RAWG simulado: validación de parámetros, proyección, errores y ausencia de secretos en la respuesta (pendiente). |
| Errores | Cada `kind` se mapea al estado de UI correcto; `AbortError` no muestra error. |

MSW simula RAWG (y/o la Edge Function) sin llamadas reales.

**Estado**: `DEFINIDO` (parcialmente **implementado**).

---

## 18. Seguridad

- **API key nunca en el frontend**: solo en el secreto `RAWG_API_KEY` de la Edge Function.
- **Validación de inputs** en la Edge Function (tipo, longitud, `rawgId` numérico).
- **No proxy arbitrario**: la Edge Function solo construye URLs fijas de RAWG con parámetros validados; no acepta URLs ni rutas arbitrarias (§10.3).
- **Errores**: genéricos, sin secretos ni cuerpos crudos.
- **CORS**: restringido al origen de la aplicación (`ALLOWED_ORIGINS`).
- **Rate limiting propio**: **no se implementa** en SPEC-04 (decisión aprobada). La aplicación usa debounce y TanStack Query. Se documenta que podrá añadirse en el futuro si las necesidades reales lo justifican; **no** es una dependencia de la implementación actual.
- **Logs**: nunca registrar la API key ni cabeceras sensibles.
- **Autenticación de usuario**: **fuera de alcance** de SPEC-04; se abordará con SPEC-05/Auth.

**Estado**: `DEFINIDO` (**implementado** en las Fases 1–3).

---

## 19. Estructura de `src/data/rawg` (implementada)

```
src/data/
  errors.ts            # DataError y normalización de errores (compartible con futuras fuentes)
  repository.ts        # fachada existente; compone RAWG + mock transitorio
  supabase/
    client.ts          # getSupabaseClient() perezoso (createClient de @supabase/supabase-js)
  rawg/
    client.ts          # invoca la Edge Function vía supabase.functions.invoke (AbortSignal, HTTP -> DataError)
    schemas.ts         # esquemas Zod de la proyección RAWG
    types.ts           # tipos Rawg* (inferidos de los esquemas)
    mappers.ts         # Rawg* -> Game / Platform (puro)
    repository.ts      # rawgGamesRepository: getById / search (implementa RawgGamesRepository)
src/app/providers/
  queryClient.ts       # createQueryClient() + política de reintentos
  QueryProvider.tsx    # QueryClientProvider global
src/features/search/hooks/
  useGameSearch.ts     # useQuery(['rawg','search',normalized]) -> gamesRepository.search()
```

- Toda la transformación RAWG → dominio queda dentro de `data/rawg`.
- `data` no depende de la UI (SPEC-01 §1).

**Estado**: `DEFINIDO` e **implementado** (Fases 1–3).

---

## 20. Dependencias

| Dependencia | Motivo | Fase |
| --- | --- | --- |
| `zod` | Validación de las respuestas externas. | Fase 2 |
| `@supabase/supabase-js` | Invocación de la Edge Function (y base para Auth/DB futuros). | Fase 1 |
| `@tanstack/react-query` | Datos asíncronos reales, caché, revalidación, cancelación. | Fase 3 |
| `vitest`, `msw`, `@testing-library/react`, `@testing-library/user-event`, `jsdom` | Testing (SPEC-01 §14). | Fases 2–3 |

- **Instaladas** las anteriores. No se introducen dependencias adicionales.
- No se instala Zustand ni otro gestor global de estado.

**Estado**: `DEFINIDO` (**implementado**).

---

## 21. Criterios de aceptación

Verificables al implementar SPEC-04 (estado a cierre de la Fase 3):

1. Una búsqueda desde `/search` obtiene resultados **reales** de RAWG. — **Cumplido (Fase 3)**.
2. La **API key de RAWG nunca** aparece en el bundle frontend ni en el repositorio. — **Cumplido**.
3. `/game/:rawgId` carga datos reales de RAWG y mantiene la estructura de bloques (externo/personal). — **Pendiente (Fase 4)**: la capa de datos ya es RAWG, la página no se ha migrado a TanStack Query.
4. Una respuesta de RAWG **inválida no rompe la UI**: se muestra `ErrorState` y la app sigue operativa. — **Cumplido (Fase 2)**.
5. Los componentes reciben siempre `Game`; **nunca** respuestas RAWG crudas. — **Cumplido**.
6. La **biblioteca mock sigue funcionando** sin cambios de UI. — **Cumplido**.
7. Los errores se muestran mediante el sistema de estados ya definido (`ErrorState`/`EmptyState`). — **Cumplido (Fase 3)**.
8. La atribución a RAWG del footer es un **enlace activo**, sin rediseño. — **Pendiente**.
9. `npm run build`, `npm run lint` y el typecheck siguen pasando. — **Cumplido (Fase 3)**.
10. La integración **puede sustituir el mock** de `GamesRepository` sin modificar innecesariamente la UI. — **Cumplido (Fase 2)**.
11. No se usa `useAsync` para RAWG. — **Cumplido (Fase 3)**.
12. No se introducen Auth, RLS, persistencia Supabase, paginación de búsqueda ni rate limiting propio. — **Cumplido**.
13. La ausencia de `genres`, `background_image` o `released` **no rompe** la UI. — **Cumplido (Fase 2)**.

**Estado**: `DEFINIDO` (criterios 1, 2, 4–7 y 9–13 cumplidos; 3 y 8 pendientes).

---

## 22. Decisiones

### DEFINIDO

- RAWG es la única fuente externa de metadatos de videojuegos.
- El frontend consume RAWG **solo** a través de la Edge Function.
- La API key vive solo como secreto de servidor.
- Tipos `Rawg*` + validación Zod + mapper a `Game`; la UI solo ve `Game`.
- `search` y `getById` de `GamesRepository` cubren `/search` y `/game/:rawgId`.
- `AbortSignal` opcional en `search` y `getById`.
- Composición transitoria: `search`/`getById` → RAWG; `list()` → mock (solución transitoria, se resuelve en SPEC-05).
- `genres` se mantiene en el dominio; si RAWG no lo devuelve: mapper `[]`, Zod opcional, **sin** llamada a `/genres`, sin bloquear.
- `background_image` y `released` tratados como nullable; dominio sin cambios.
- `page_size = 20`; solo primera página; **sin** paginación ni "Cargar más"; UI de SPEC-03 sin cambios.
- Edge Function **sin** Auth de usuario en SPEC-04; **no** es un proxy arbitrario; validación estricta; solo URLs de RAWG; gateway con `verify_jwt = true`.
- **Sin** rate limiting propio en SPEC-04 (revisable en el futuro).
- Atribución a RAWG con **hipervínculo activo** en el footer existente.
- TanStack Query para `search`/`getById`; `useAsync` para mocks y pantallas no migradas.
- Claves de query `rawgKeys`.
- Zod para validar la respuesta de la Edge Function antes de mapear.
- `Game` (dominio) no cambia.
- Tests (Vitest/RTL/user-event/MSW): implementados para schemas, mappers, repositorio y búsqueda (Fases 2–3); **pendientes** los de Edge Function y detalle.

### IMPLEMENTADO (Fases 1–3)

- Edge Function `rawg-proxy` con endpoints y proyección de §10, validación de parámetros, timeout (9 s), errores normalizados, CORS restringido vía `ALLOWED_ORIGINS` y secretos de servidor.
- Estructura de `src/data/rawg` de §19 (`client`, `schemas`, `types`, `mappers`, `repository`) y `src/data/errors.ts`.
- Zod en `schemas.ts` validando la proyección de la Edge Function.
- `rawgGamesRepository` (`search`/`getById`) y composición de la fachada (§7.3).
- TanStack Query integrado con `QueryProvider`; búsqueda real en `/search` mediante `useGameSearch`.
- Caché de búsqueda: `staleTime` 5 min / `gcTime` 30 min.
- 39 tests en verde; build, lint y typecheck OK.

### PROPUESTO (pendiente de fases posteriores)

- Migración de `/game/:rawgId` a TanStack Query y `staleTime`/`gcTime` del detalle (§16.3).
- Atribución a RAWG como enlace activo en el footer (§14).

### PENDING / NO VERIFICADO / DIFERIDO

- **NO VERIFICADO** — Confirmar con una llamada real si RAWG devuelve `genres` en el payload utilizado (no bloquea; mapper `[]` en su ausencia).
- **NO VERIFICADO** — Nulabilidad real de `background_image` y `released` (se tratan como nullable).
- **NO VERIFICADO** — `page_size` por defecto/máximo de RAWG.
- **NO VERIFICADO** — Comportamiento real de *rate limit* (HTTP 429).
- **DIFERIDO** — Paginación de `/search`: fuera de SPEC-04; podrá revisarse posteriormente.
- **DIFERIDO** — Sustitución definitiva de `list()` por resolución de metadatos a partir de las entradas en SPEC-05.
- **DIFERIDO** — Autenticación/protección de la Edge Function con Supabase (SPEC-05/Auth).
- **DIFERIDO** — Rate limiting propio, solo si las necesidades reales lo justifican.

> No queda ninguna decisión de producto `PENDING` que bloquee la implementación. Los puntos anteriores son hechos a confirmar durante la implementación o elementos diferidos.

---

## 23. Dependencias y no-alcance

Esta SPEC **depende de**:

- SPEC-00 — Base del proyecto (aprobada).
- SPEC-01 — Arquitectura técnica (aprobada).
- SPEC-02 — Modelo de datos de Supabase (aprobada).
- SPEC-03 — UI/UX y diseño visual (aprobada).

Esta SPEC **NO implementa todavía** (a cierre de la Fase 3):

- Migración de `/game/:rawgId` a TanStack Query (Fase 4).
- Atribución a RAWG con enlace activo en el footer.
- Persistencia en Supabase.
- Supabase Auth ni modelo de usuarios.
- RLS.
- Biblioteca real (`library_entries`).
- Dashboard/Biblioteca conectados a Supabase.
- Migraciones SQL.
- Funcionalidades SaaS.

---

## Estado de aprobación

| Campo | Valor |
| --- | --- |
| Estado | **Aprobada** |
| Versión | **0.3** |

SPEC-04 quedó **Aprobada** y su implementación avanza por fases. A cierre de la Fase 3 están completadas las Fases 1, 2 y 3 (infraestructura RAWG + Edge Function, adaptación de datos RAWG y búsqueda real en `/search`). La **Fase 4** (migración del detalle `/game/:rawgId` a TanStack Query y elementos pendientes) queda por implementar.

Las decisiones marcadas como `PROPUESTO` o `PENDING` en las secciones anteriores **no** se consideran aprobadas por el hecho de haber completado las Fases 1–3.
