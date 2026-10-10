# SPEC-04 — Integración de IGDB

| Campo | Valor |
| --- | --- |
| ID | SPEC-04 |
| Título | Integración de IGDB (datos externos de videojuegos) |
| Versión | 0.5 |
| Estado | Aprobada |
| Fecha | 2026-09-17 |
| Autor | Responsable de producto |
| Redactado por | Agente de desarrollo |
| Depende de | SPEC-00, SPEC-01, SPEC-02 y SPEC-03 (aprobadas) |

## Historial de cambios

| Versión | Fecha | Descripción |
| --- | --- | --- |
| 0.1 | 2026-09-16 | Creación inicial. Integración de RAWG como fuente externa, proxy vía Edge Function, validación con Zod, adaptación a dominio y uso de TanStack Query. |
| 0.2 | 2026-09-16 | Resueltas las decisiones pendientes de la v0.1: `genres` opcional sin llamada adicional a `/genres`; `background_image`/`released` tratados como nullable; `page_size = 20` y primera página sin paginación; sin Auth/JWT ni rate limiting propio en SPEC-04; composición transitoria de `list()` sobre mock; atribución RAWG con hipervínculo en el footer; TanStack Query, Zod y estrategia de tests. |
| 0.3 | 2026-09-16 | Cierre documental de las Fases 1–3. SPEC-04 pasa a **Aprobada**. Se añade "Estado de implementación" y se alinean las secciones con el estado real (incluida la eliminación de `VITE_RAWG_PROXY_URL`). |
| 0.4 | 2026-09-17 | **Migración del proveedor externo de RAWG a IGDB.** La fuente externa pasa a ser la API de IGDB, consumida a través de la Edge Function `igdb-proxy`, que obtiene un access token de Twitch (OAuth2 Client Credentials) y lo reutiliza mientras es válido. Se sustituyen los tipos `Rawg*` por `Igdb*`, `rawgGamesRepository` por `igdbGamesRepository`, `invokeRawgProxy` por `invokeIgdbProxy` y la Edge Function `rawg-proxy` por `igdb-proxy`. El identificador de dominio `rawgId` pasa a `externalId` y la ruta `/game/:rawgId` a `/game/:gameId`. Se eliminan `RAWG_API_KEY` y las referencias activas a RAWG. Se mantienen sin cambios la arquitectura, la abstracción `GamesRepository`, TanStack Query, la UI/UX y el alcance de SPEC-04. |
| 0.5 | 2026-10-10 | **Enmienda (T-01): `igdb-proxy` exige sesión de usuario y limita las peticiones.** Ya no basta la clave pública: la función valida el JWT con `auth.getUser` (el usuario de cada token se recuerda 60 s) y responde `401 unauthorized` sin sesión. Límite de **300 peticiones por minuto y usuario**, contado en Postgres (tabla `api_rate_limits` y función `hit_rate_limit`, migración `20261010000000`, solo ejecutable con la clave de servicio) para que valga para todas las copias de la función; al superarlo responde `429 rate_limited` con `Retry-After: 60`. Si el contador falla, no se bloquea al usuario. Sustituye a lo dicho más abajo de una función "sin Auth de usuario". **Además (T-03):** si IGDB falla, la biblioteca se sigue mostrando con "Juego desconocido" y un aviso, en lugar de una pantalla de error. |

## Leyenda de estados de decisión

- **DEFINIDO**: ya establecido por SPEC-00/01/02/03, por la documentación oficial de IGDB/Twitch o por decisión aprobada.
- **PROPUESTO**: recomendación del agente. Requiere aprobación del responsable de producto.
- **PENDING**: decisión abierta que debe aprobar el responsable de producto.
- **NO VERIFICADO**: dato que no ha podido confirmarse en la documentación oficial y que debe validarse en la implementación. No bloquea el avance.
- **IMPLEMENTADO**: decisión aprobada que ya está construida.

> SPEC-04 está **Aprobada**. Esta versión (0.4) formaliza la migración de RAWG a IGDB manteniendo el alcance y las decisiones aprobadas de las versiones anteriores.

## Fuentes consultadas

- Documentación oficial de la API de IGDB: `https://api-docs.igdb.com/` (consultada el 2026-09-17).
- Documentación de autenticación de Twitch: `https://dev.twitch.tv/docs/authentication` (referenciada por IGDB).
- Twitch Developer Service Agreement: `https://www.twitch.tv/p/legal/developer-agreement/`.

> Toda afirmación sobre endpoints, campos, autenticación y límites de IGDB se basa en estas fuentes. Cuando algo no aparece en ellas, se marca como **NO VERIFICADO**.

---

## Estado de implementación

> Refleja el avance real de la implementación de SPEC-04 tras la migración a IGDB. La SPEC está **Aprobada**.

| Fase | Alcance | Estado |
| --- | --- | --- |
| Fase 1 | Infraestructura de datos externos + Edge Function (`rawg-proxy`, sustituida en la v0.4 por `igdb-proxy`): proxy seguro, secretos, CORS, errores, timeout, `.env.example` | **Completada** |
| Fase 2 | Adaptación de datos externos (`Rawg*` → `Igdb*` + Zod + mapper → `Game` + repositorio, con tests) | **Completada** |
| Fase 3 | TanStack Query + búsqueda real en `/search` (`QueryProvider`, `useGameSearch`, tests) | **Completada** |
| Fase 4 | Detalle `/game/:gameId` con TanStack Query y elementos pendientes | **Pendiente** |

Detalles implementados tras la migración a IGDB (v0.4):

- `QueryProvider` global en `src/app/providers`, montado en `src/main.tsx` (dentro de `StrictMode`). Sin Zustand ni otros gestores globales.
- `/search` usa IGDB real mediante `useGameSearch` → `gamesRepository.search()` → `igdbGamesRepository` → cliente → Edge Function `igdb-proxy` → Twitch OAuth → IGDB.
- Query key `['igdb', 'search', normalizedQuery]`, con normalización `trim().toLowerCase()`.
- Query deshabilitada cuando el término está vacío; debounce de 350 ms en `SearchPage`.
- `AbortSignal` de TanStack Query propagado al repository; `AbortError` no se muestra como error de usuario.
- `staleTime` de búsqueda: **5 minutos**; `gcTime`: **30 minutos**.
- Sin paginación; primera página; máximo **20 resultados** (`limit 20` aplicado en la Edge Function).
- Estados de la búsqueda: inicial, loading (skeletons), resultados, sin resultados y error + retry.
- `retry` limitado a errores recuperables (`network`, `upstreamError`, `timeout`, `rateLimited`; máximo 2); no se reintentan `badRequest`, `notFound` ni `invalidResponse`.
- La capa de datos `getById` apunta a IGDB. La página `/game/:gameId` **todavía no se ha migrado a TanStack Query** (sigue usando `useAsync`); su migración corresponde a la Fase 4.
- Dashboard y Library continúan usando datos **mock** (`gamesRepository.list()` y `libraryRepository.*`).
- El modelo de dominio `Game` usa `externalId` (neutro, no acoplado al proveedor). `LibraryEntry` también usa `externalId`.
- La ruta de detalle es `/game/:gameId`.
- **Pendiente de decisión de producto**: requisitos de atribución de IGDB/Twitch en la UI (§14). El footer muestra ahora "Datos de juegos por IGDB" como texto plano.

Validación al cierre de la migración (v0.4): `npm test` → **42/42 OK**; `npm run build` → OK; `npm run lint` → 0 errores / 0 warnings; `tsc -p tsconfig.app.json --noEmit` y `tsc -p tsconfig.node.json --noEmit` → OK.

---

## 1. Objetivo y alcance

**Problema**: MyPlayGallery necesita información externa real de videojuegos (título, portada, fecha, géneros y plataformas) para las pantallas `/search` y `/game/:gameId`, sin exponer las credenciales de Twitch/IGDB y sin acoplar la UI al proveedor.

**Alcance de SPEC-04**:

- Integrar **IGDB** como única fuente externa de metadatos de videojuegos.
- Consumir IGDB **exclusivamente** a través de una **Supabase Edge Function** (`igdb-proxy`) que actúa de proxy y gestiona la autenticación con Twitch.
- Mantener `TWITCH_CLIENT_ID` y `TWITCH_CLIENT_SECRET` **solo en el servidor**.
- Definir tipos `Igdb*`, validación con **Zod**, adaptación a `Game` y el uso de **TanStack Query**.
- Conectar `/search` a datos reales y `/game/:gameId` a datos reales (la capa de datos; su migración a TanStack Query es la Fase 4).
- Adaptar la atribución de la fuente en el footer existente.
- Mantener sin cambios la UI/UX aprobada en SPEC-03.

**Fuera de alcance de SPEC-04** (explícitamente):

- Supabase Auth, modelo de usuarios, perfiles, RLS.
- Persistencia real de `library_entries` ni biblioteca real.
- Migraciones SQL o creación de tablas.
- Dashboard/Biblioteca conectados a Supabase real.
- Cualquier funcionalidad SaaS o multiusuario.
- Paginación de la búsqueda.

**Transición**: la biblioteca personal (entradas) **continúa sobre mocks** hasta una SPEC posterior (SPEC-05). SPEC-04 solo sustituye la fuente de **metadatos externos de juegos**.

**Estado**: `DEFINIDO`.

---

## 2. Arquitectura objetivo

Flujo de dependencias aprobado e implementado:

```
features
  └── GamesRepository
        └── data/igdb
              └── Supabase Edge Function (igdb-proxy)
                    └── Twitch OAuth (Client Credentials)
                          └── IGDB API (https://api.igdb.com/v4)
```

Reglas:

- Las **features nunca** llaman a IGDB ni a Twitch directamente.
- Las credenciales de Twitch **nunca** llegan al navegador.
- La capa `data/igdb` es la única que conoce la forma de los datos de IGDB.
- La UI nunca consume la respuesta cruda de IGDB: recibe siempre `Game`.

**Estado**: `DEFINIDO` (alineado con SPEC-01 §1, §9, §11, §17).

---

## 3. Verificación de la documentación oficial de IGDB

| Aspecto | Confirmado | Detalle / decisión |
| --- | --- | --- |
| Base URL | Sí | `https://api.igdb.com/v4`. |
| Autenticación | Sí | Twitch OAuth2 **Client Credentials**. `POST https://id.twitch.tv/oauth2/token?client_id=…&client_secret=…&grant_type=client_credentials` → `{ access_token, expires_in, token_type }`. |
| Cabeceras de IGDB | Sí | `Client-ID: <client_id>` y `Authorization: Bearer <access_token>` en todas las peticiones. |
| Método de petición | Sí | La mayoría de peticiones usan `POST`; la consulta se envía en el **body** (Apicalypse). |
| `POST /games` (búsqueda) | Sí | Se usa `search "<término>"; fields …; limit 20;`. Devuelve un array de juegos ordenado por relevancia. Se usa **solo la primera página** (no hay paginación en SPEC-04). |
| `POST /games` (detalle) | Sí | Se usa `fields …; where id = <gameId>; limit 1;`. Devuelve un array con 0 o 1 elemento. |
| Campo de fecha de lanzamiento | Sí | `first_release_date`, tipo **Unix timestamp** (segundos). Se trata como nullable. |
| Campo de portada | Sí | `cover.url`, con formato relativo `//images.igdb.com/igdb/image/upload/t_thumb/{hash}.jpg`. Se trata como nullable. |
| Tamaños de imagen | Sí | Estructura `https://images.igdb.com/igdb/image/upload/t_{size}/{hash}.jpg`. Se usa `cover_big` (264×374) para las tarjetas. |
| Géneros dentro del juego | Sí | `genres` con sub-campo `name` (`genres.name`). Se mapean a `string[]`. |
| Plataformas dentro del juego | Sí | `platforms` con `{ id, name }` (`platforms.name`). |
| Rate limit | Sí | **4 peticiones/segundo**; al superarlo, HTTP `429 Too Many Requests`. |
| CORS desde navegador | Sí | IGDB **no** permite peticiones directas desde el navegador; por eso el proxy es obligatorio (coincide con la arquitectura aprobada). |
| Licencia | Sí | Uso **no comercial** bajo el Twitch Developer Service Agreement. |
| Atribución en la UI | **NO VERIFICADO** | IGDB/Twitch no detallan en la página de IGDB un requisito de hipervínculo equivalente al de RAWG. Se mantiene "Datos de juegos por IGDB" en el footer; el requisito exacto queda **PENDING** de decisión de producto (§14). |

---

## 4. Endpoints de IGDB utilizados

Solo se utilizan dos operaciones, ambas sobre `/games`:

1. **Búsqueda**
   - Apicalypse: `search "<término>"; fields name, first_release_date, cover.url, genres.name, platforms.name; limit 20;`
   - Respuesta: array de juegos. Se usa **solo la primera página**.

2. **Detalle**
   - Apicalypse: `fields name, first_release_date, cover.url, genres.name, platforms.name; where id = <gameId>; limit 1;`
   - Respuesta: array con 0 o 1 juego; si viene vacío, se traduce a `not_found`.

No se consume ningún otro endpoint (`/platforms`, `/genres`, etc.).

**Estado**: `DEFINIDO` e **IMPLEMENTADO**.

---

## 5. Campos de IGDB necesarios para las pantallas aprobadas

Solo se proyectan los campos que la UI de SPEC-03 necesita realmente.

| Dominio (`Game`) | Origen IGDB | Confirmado | Notas / decisión |
| --- | --- | --- | --- |
| `externalId: number` | `id` | Sí | Identificador entero de IGDB. |
| `title: string` | `name` | Sí | |
| `coverUrl: string \| null` | `cover.url` | Sí | Se normaliza a `https://…` y se cambia `t_thumb` por `t_cover_big`. Nullable. |
| `released: string \| null` | `first_release_date` | Sí | Unix timestamp (segundos) convertido a `YYYY-MM-DD`. Nullable. |
| `genres: string[]` | `genres[].name` | Sí | Si falta, `[]`. |
| `platforms: Platform[]` | `platforms[].{id,name}` | Sí | Se descartan `slug` y otros campos. |

Campos de IGDB **no necesarios** en SPEC-04 (se ignoran): resumen, ratings, artworks, screenshots, vídeos, empresas, fechas de lanzamiento detalladas, etc.

**Estado**: `DEFINIDO` e **IMPLEMENTADO**.

---

## 6. Separación de tipos y flujo de datos

Se mantiene la regla de SPEC-01 §17:

```
IGDB
  → Edge Function (proyección)
  → Zod
  → Igdb*
  → mapper
  → Game (dominio)
  → UI
```

- Nombres de tipos externos: **`Igdb*`** (`IgdbGame`, `IgdbGameListResponse`, `IgdbPlatform`, `IgdbGenre`, `IgdbCover`).
- Los `Igdb*` son de **solo lectura**; nunca se editan.
- Los mappers viven **exclusivamente** en `src/data/igdb`.
- La UI no importa tipos `Igdb*`.

**Estado**: `DEFINIDO` e **IMPLEMENTADO**.

---

## 7. Reutilización de la fachada `GamesRepository`

Interfaz actual (`src/data/repository.ts`):

```ts
export interface GamesRepository {
  search(query: string, signal?: AbortSignal): Promise<Game[]>
  getById(gameId: number, signal?: AbortSignal): Promise<Game | undefined>
  list(): Promise<Game[]>
}
```

### 7.1 Suficiencia de los métodos

| Método | Equivalente IGDB | Suficiencia |
| --- | --- | --- |
| `search(query)` | `POST /games` con `search` | **Suficiente**. Se mapea el array resultante. |
| `getById(gameId)` | `POST /games` con `where id =` | **Suficiente**. Un resultado vacío/404 se traduce a `undefined`. |
| `list()` | **No existe** un endpoint "todos los juegos" apropiado | **No aplica**. Se mantiene sobre mock. |

### 7.2 Composición transitoria

```ts
export const gamesRepository: GamesRepository = {
  ...igdbGamesRepository, // search / getById → IGDB (real)
  list: mockListGames,    // TEMPORAL (mock)
}
```

- `search` y `getById` usan IGDB.
- `list()` permanece sobre mock solo para Dashboard/Biblioteca.

**Carácter transitorio de `list()`**: se resolverá cuando la biblioteca pase a Supabase (SPEC-05). Limitación conocida: un juego añadido desde IGDB a la biblioteca mock no aparecerá en `list()` y podría mostrarse como "Juego desconocido" hasta SPEC-05.

**Estado**: `DEFINIDO` e **IMPLEMENTADO**.

---

## 8. Adaptador (IGDB → dominio)

Ubicación obligatoria: `src/data/igdb/` (fuera de `features`).

Responsabilidades:

- `mapIgdbGame(igdb: IgdbGame): Game`
- `mapIgdbGameList(response: IgdbGameListResponse): Game[]`
- `mapIgdbPlatform(igdbPlatform: IgdbPlatform): Platform`
- `mapIgdbCoverUrl(cover: IgdbCover | null): string | null`
- `mapIgdbReleaseDate(timestamp: number | null): string | null`

Reglas de mapeo:

- `externalId = igdb.id`
- `title = igdb.name`
- `coverUrl = mapIgdbCoverUrl(igdb.cover)`: prefija `https:`, reemplaza `t_thumb` por `t_cover_big`; `null` si no hay portada.
- `released = mapIgdbReleaseDate(igdb.first_release_date)`: `new Date(ts * 1000).toISOString().slice(0, 10)`; `null` si no hay fecha o es inválida.
- `genres = igdb.genres.map((g) => g.name)`
- `platforms = igdb.platforms.map((p) => ({ id: p.id, name: p.name }))`
- Se descartan campos no usados.

Los mappers son **funciones puras** y están cubiertos con tests.

**Estado**: `DEFINIDO` e **IMPLEMENTADO**.

---

## 9. Validación con Zod

SPEC-01 §13 establece Zod. **Implementado.**

- **Qué se valida**: la respuesta de la **Edge Function** (proyección de IGDB), no la de IGDB directamente.
  - `IgdbGameListResponseSchema`: `{ results: IgdbGame[] }`.
  - `IgdbGameSchema`: `id`, `name`, `first_release_date` (nullable), `cover` (nullable), `genres` (opcional), `platforms` (opcional).
- **Cómo**: `safeParse`. Nunca `parse` que lance sin control.
- **Si la respuesta es inesperada**: se normaliza un error `invalidResponse` y la UI muestra el `ErrorState` existente.
- **Campos opcionales**: `genres`/`platforms` ausentes se degradan a `[]`; `cover`/`first_release_date` ausentes o nulos se degradan a `null`.

**Estado**: `DEFINIDO` e **IMPLEMENTADO**.

---

## 10. Supabase Edge Function (`igdb-proxy`)

Arquitectura lógica del proxy seguro. **Implementada.**

### 10.1 Responsabilidad

- Única puerta de salida hacia IGDB.
- Custodiar `TWITCH_CLIENT_ID` y `TWITCH_CLIENT_SECRET` como **secretos de servidor**.
- Obtener y **reutilizar temporalmente** el access token de Twitch.
- Validar parámetros de entrada.
- Proyectar la respuesta a los campos mínimos necesarios.
- Normalizar errores y aplicar CORS.

### 10.2 Endpoints lógicos

| Método | Ruta lógica (frontend) | Operación IGDB |
| --- | --- | --- |
| `GET` | `/games?search=<término>` | `POST /games` con `search "<término>"; … limit 20;` |
| `GET` | `/games/:gameId` | `POST /games` con `where id = <gameId>; limit 1;` |

> El frontend invoca la función con `supabase.functions.invoke()` (que deriva la URL de `VITE_SUPABASE_URL` y adjunta la `apikey`). No se necesita una variable con la URL de la función.

### 10.3 No es un proxy arbitrario

- Solo acepta las **operaciones definidas** (`/games` con `search`, y `/games/:gameId`).
- Valida **estrictamente** los parámetros (tipo, longitud, formato).
- Solo construye peticiones hacia `https://api.igdb.com/v4/games`.
- **No acepta URLs externas** ni parámetros de destino.
- **No reenvía rutas arbitrarias**: el endpoint de IGDB y la consulta Apicalypse se derivan de la operación, no de la entrada del cliente.

### 10.4 Entrada y validación de parámetros

- `search`: string, `trim`, longitud **1–100**; se rechaza vacío. Se **sanean** comillas dobles, barras invertidas y saltos de línea para evitar inyección en la consulta Apicalypse.
- `gameId`: **solo dígitos**, entero > 0. Se rechaza cualquier otro valor.
- Cualquier parámetro no reconocido se ignora.

### 10.5 Autenticación con Twitch (OAuth2 Client Credentials)

- Se hace `POST` a `https://id.twitch.tv/oauth2/token` con `client_id`, `client_secret` y `grant_type=client_credentials`.
- La respuesta se valida (`access_token` string, `expires_in` numérico en segundos).
- El token se **cachea en memoria del isolate** con su instante de expiración.
- Se reutiliza mientras siga siendo válido, aplicando un **margen de seguridad de 60 s**; solo entonces se solicita uno nuevo.
- Si IGDB responde `401` (token inválido/expirado), se descarta el token cacheado y se **reintenta una vez**.

### 10.6 Comunicación con IGDB

- `POST https://api.igdb.com/v4/games` con cabeceras `Client-ID` y `Authorization: Bearer <token>` y la consulta Apicalypse en el body.
- Aplica un **timeout** (9 s) mediante `AbortController`.
- No sigue redirecciones arbitrarias hacia dominios externos.
- No reenvía *headers* del cliente a IGDB.

### 10.7 Respuesta (proyección)

La Edge Function devuelve una **proyección de IGDB**:

- Lista: `{ results: IgdbGameProjection[] }`.
- Detalle: `IgdbGameProjection`.

`IgdbGameProjection` contiene únicamente: `id`, `name`, `first_release_date`, `cover` (`{ url } | null`), `genres` (`[{ name }]`) y `platforms` (`[{ id, name }]`).

**Qué puede llegar al cliente**: solo metadatos públicos de videojuegos. **Nunca**: las credenciales de Twitch, el access token, cabeceras internas, cuerpos de error crudos de IGDB ni trazas.

### 10.8 Errores de la Edge Function

Forma normalizada:

```json
{ "error": { "code": "not_found", "message": "Game not found" } }
```

| Situación | HTTP | `code` |
| --- | --- | --- |
| Parámetros inválidos | 400 | `bad_request` |
| Juego inexistente (detalle) | 404 | `not_found` |
| Rate limit de IGDB/Twitch | 429 | `rate_limited` |
| Error/5xx de IGDB o fallo de Twitch | 502 | `upstream_error` |
| Timeout hacia IGDB/Twitch | 504 | `timeout` |
| Configuración o fallo interno del proxy | 500 | `internal_error` |
| Método no permitido | 405 | `method_not_allowed` |

Los mensajes son genéricos y no revelan detalles internos.

### 10.9 CORS

- Se permite únicamente el/los origen(es) de la aplicación (`ALLOWED_ORIGINS`), método `GET` y las cabeceras `content-type`, `authorization`, `apikey` y `x-client-info`.
- Se responde a `OPTIONS` (preflight). No `*` en producción.

### 10.10 Autenticación de usuario

- SPEC-04 **no implementa autenticación de usuarios**.
- Se mantiene `verify_jwt = true` para que el gateway de Supabase no deje la función completamente expuesta.
- La protección con Auth de Supabase se abordará en SPEC-05.

### 10.11 Secretos

- La Edge Function lee `TWITCH_CLIENT_ID` y `TWITCH_CLIENT_SECRET` desde `Deno.env`.
- No se registran en logs, ni se incluyen en respuestas.

**Estado**: `DEFINIDO` e **IMPLEMENTADO**.

---

## 11. Secretos y variables de entorno

- **Secretos de servidor (Edge Function)**: `TWITCH_CLIENT_ID` y `TWITCH_CLIENT_SECRET`.
  - Se almacenan como secretos de la Edge Function en Supabase.
  - **Nunca** con prefijo `VITE_` ni en el repositorio.
- **Variables del frontend (públicas por diseño)**:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- **Variable de servidor opcional**: `ALLOWED_ORIGINS`, para restringir CORS.
- **Nunca pueden llegar al navegador**: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` ni ninguna otra clave sensible.
- **`.env.example`**: incluye `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` vacías y documenta `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` y `ALLOWED_ORIGINS` como secretos de servidor. No se añade ninguna credencial de Twitch como `VITE_*`.

**Estado**: `DEFINIDO` e **IMPLEMENTADO**.

---

## 12. Búsqueda (`/search`)

Respeta la UX aprobada en SPEC-03 §6:

- `SearchBar` con **debounce de 350 ms** y **autofocus**.
- Estado inicial (sin término), loading (skeletons), resultados (rejilla `GameCard`), sin resultados (`EmptyState`) y error (`ErrorState` con reintento).

Reglas funcionales aprobadas:

- **Query mínima**: 1 carácter tras `trim`; sin término no se llama a IGDB.
- **Límite de resultados**: **20** por búsqueda (`limit 20`).
- **Primera página únicamente**: **no** se implementa paginación.
- **Búsquedas rápidas sucesivas**: cada término nuevo genera una clave de query distinta; la petición anterior se **cancela** mediante `AbortSignal`.

**Implementación**: `SearchPage` → `useGameSearch` (TanStack Query) → `gamesRepository.search()`. Query key `['igdb', 'search', normalizedQuery]` con `trim().toLowerCase()`; query deshabilitada con término vacío; `staleTime` 5 min; `gcTime` 30 min. El `AbortError` por cancelación no se muestra como error.

**Estado**: `DEFINIDO` e **IMPLEMENTADO**.

---

## 13. Detalle (`/game/:gameId`)

`getById(gameId)` proporciona lo necesario para `/game/:gameId` (SPEC-03 §7):

- **Bloque A — información externa (IGDB, solo lectura)**: portada, título, fecha de lanzamiento, géneros, plataformas disponibles.
- **Bloque B — datos personales**: sin cambios; sigue sobre mock hasta SPEC-05.

Reglas:

- Un `gameId` inexistente se traduce a `undefined` y la página mantiene su estado **"Juego no encontrado"**.
- La información de IGDB es de **solo lectura**; nunca se persiste ni se edita.
- **Implementación**: la capa de datos `getById` apunta a IGDB, pero la página `/game/:gameId` **todavía no se ha migrado a TanStack Query** (sigue usando `useAsync`). Su migración corresponde a la **Fase 4**.

**Estado**: `DEFINIDO` (página pendiente de la Fase 4).

---

## 14. Atribución de IGDB

- El footer existente muestra ahora **"Datos de juegos por IGDB"** (texto plano), sin rediseño.
- A diferencia de RAWG, la página de documentación de IGDB no detalla un requisito explícito de hipervínculo activo equivalente. El uso de datos de IGDB está sujeto al **Twitch Developer Service Agreement**.
- **PENDING de decisión de producto**: si se exige (o se desea) un enlace activo a `https://www.igdb.com` y/o la mención a Twitch en el footer. **No se ha tomado esta decisión unilateralmente.**

**Estado**: `PENDING` (contenido mínimo del footer ya actualizado).

---

## 15. Estrategia de errores normalizados

Se mantiene el error de datos común (`DataError`) con un `kind`:

| `kind` | Origen | Mensaje de UI |
| --- | --- | --- |
| `badRequest` | 400 / 405 | No se pudo procesar la búsqueda. |
| `notFound` | 404 (detalle) | Juego no encontrado. |
| `unauthorized` | 401/403 | No se pudo acceder a los datos. |
| `rateLimited` | 429 | Demasiadas peticiones. Inténtalo más tarde. |
| `upstreamError` | 502 / error de IGDB | No se pudo obtener la información. |
| `timeout` | 504 / abort por tiempo | La petición ha tardado demasiado. |
| `network` | fallo de red del navegador | Sin conexión. Revisa tu red. |
| `invalidResponse` | Zod `safeParse` fallido | Datos inesperados del servicio. |
| `internalError` | 500 | Error inesperado. Inténtalo de nuevo. |

Reglas:

- El usuario **nunca** recibe secretos ni detalles internos.
- Todos los errores se representan con el `ErrorState` ya existente (con "Reintentar").
- La cancelación (`AbortError`) **no** es un error de UI.

**Estado**: `DEFINIDO` e **IMPLEMENTADO**.

---

## 16. TanStack Query

**DEFINIDO** por SPEC-01 §7. **Implementado para la búsqueda**; el detalle se migrará en la Fase 4.

- TanStack Query se usa para **`search()`**. `getById()` se migrará en la Fase 4.
- `useAsync` **continúa únicamente** para los mocks y para las pantallas no migradas (detalle y biblioteca).

### 16.1 Claves de query

```ts
export function gameSearchQueryKey(query: string) {
  return ['igdb', 'search', query.trim().toLowerCase()] as const
}
```

> Se mantiene una única clave de búsqueda. La clave de detalle se definirá en la Fase 4.

### 16.2 Comportamiento

- **Búsqueda**: `useQuery({ queryKey: gameSearchQueryKey(q), queryFn, enabled: q.trim() !== '' })`.
- **Cancelación**: `queryFn` recibe `signal` de TanStack Query y lo pasa al repositorio (`search(q, signal)` / `getById(id, signal)`).
- **Reintentos**: `retry` solo para `network`/`upstreamError`/`timeout`/`rateLimited` (máximo 2); **no** reintentar `badRequest`, `notFound` ni `invalidResponse`.
- **Estados**: `isPending` → skeletons; `isError` → `ErrorState`; `data` → rejilla.
- **Provider global**: `QueryProvider` (`QueryClientProvider`) se monta en `src/app/providers`, usado en `src/main.tsx`.
- **`refetchOnWindowFocus: false`**.

### 16.3 Caché

| Query | `staleTime` | `gcTime` | Estado |
| --- | --- | --- | --- |
| Búsqueda | 5 minutos | 30 minutos | **Implementado** |
| Detalle | 24 horas | 7 días | Propuesto (Fase 4) |

- No se cachea indefinidamente nada.
- La caché es en memoria del cliente (SPEC-01 §9: no se persiste en PostgreSQL).

**Estado**: `DEFINIDO` (caché de búsqueda **implementada**; la de detalle queda pendiente de la Fase 4).

---

## 17. Testing

Herramientas de SPEC-01 §14: **Vitest + React Testing Library + user-event + MSW**.

**Implementado**: tests de esquemas Zod, mappers, repositorio `data/igdb`, hook `useGameSearch` y `SearchPage`. Total tras la migración: **42 tests en verde**.

| Qué | Cómo |
| --- | --- |
| Esquemas Zod | Payload válido → ok; payload incompleto/tipo erróneo → `invalidResponse`; ausencia de `genres`/`platforms` → `[]`; `cover`/`first_release_date` nulos → `null`. |
| Mappers | `IgdbGame` → `Game`; normalización de portada (`t_cover_big`) y de fecha (timestamp → ISO); `first_release_date`/`cover`/`genres`/`platforms` nulos o ausentes. |
| Repositorio (`data/igdb`) | `fetch` simulado con MSW: 200, 404, 429, 500, 502, timeout, 401, red caída, JSON inválido y cancelación. |
| TanStack Query | Hook con `QueryClientProvider` + MSW: loading → éxito, error, cancelación, query vacía y `AbortSignal`. |
| UI de búsqueda | `SearchPage`: estado inicial, query vacía sin petición, resultados, loading, sin resultados, error + retry y cambio de consulta. |
| Edge Function | **Pendiente** (tests Deno con IGDB/Twitch simulados). |

MSW simula la Edge Function sin llamadas reales.

**Estado**: `DEFINIDO` (parcialmente **implementado**).

---

## 18. Seguridad

- **Credenciales de Twitch nunca en el frontend**: solo como secretos `TWITCH_CLIENT_ID`/`TWITCH_CLIENT_SECRET` de la Edge Function.
- **Validación de inputs** en la Edge Function (tipo, longitud, `gameId` numérico, saneo del término de búsqueda).
- **No proxy arbitrario**: la Edge Function solo construye peticiones fijas a IGDB con parámetros validados.
- **Errores**: genéricos, sin secretos ni cuerpos crudos.
- **CORS**: restringido al origen de la aplicación (`ALLOWED_ORIGINS`).
- **Rate limiting propio**: **no se implementa** (decisión aprobada). La aplicación usa debounce y TanStack Query.
- **Logs**: nunca registrar credenciales ni cabeceras sensibles.
- **Autenticación de usuario**: **fuera de alcance**; se abordará con SPEC-05/Auth.

**Estado**: `DEFINIDO` e **IMPLEMENTADO**.

---

## 19. Estructura de `src/data/igdb`

```
src/data/
  errors.ts            # DataError y normalización de errores (compartible con futuras fuentes)
  repository.ts        # fachada; compone IGDB + mock transitorio
  supabase/
    client.ts          # getSupabaseClient() perezoso (createClient de @supabase/supabase-js)
  igdb/
    client.ts          # invoca la Edge Function vía supabase.functions.invoke (AbortSignal, HTTP -> DataError)
    schemas.ts         # esquemas Zod de la proyección de IGDB
    types.ts           # tipos Igdb* (inferidos de los esquemas)
    mappers.ts         # Igdb* -> Game / Platform (puro)
    repository.ts      # igdbGamesRepository: getById / search (implementa IgdbGamesRepository)
supabase/functions/
  igdb-proxy/          # Edge Function: OAuth Twitch + proxy a IGDB + proyección + errores + CORS
src/app/providers/
  queryClient.ts       # createQueryClient() + política de reintentos
  QueryProvider.tsx    # QueryClientProvider global
src/features/search/hooks/
  useGameSearch.ts     # useQuery(['igdb','search',normalized]) -> gamesRepository.search()
```

- Toda la transformación IGDB → dominio queda dentro de `data/igdb`.
- `data` no depende de la UI (SPEC-01 §1).

**Estado**: `DEFINIDO` e **IMPLEMENTADO**.

---

## 20. Dependencias

| Dependencia | Motivo |
| --- | --- |
| `zod` | Validación de las respuestas externas. |
| `@supabase/supabase-js` | Invocación de la Edge Function (y base para Auth/DB futuros). |
| `@tanstack/react-query` | Datos asíncronos reales, caché, revalidación, cancelación. |
| `vitest`, `msw`, `@testing-library/react`, `@testing-library/user-event`, `jsdom` | Testing (SPEC-01 §14). |

- No se introducen dependencias adicionales. La Edge Function implementa OAuth con `fetch` nativo de Deno (sin librerías).

**Estado**: `DEFINIDO` e **IMPLEMENTADO**.

---

## 21. Criterios de aceptación

1. Una búsqueda desde `/search` obtiene resultados **reales** de IGDB. — **Cumplido**.
2. Las credenciales de Twitch **nunca** aparecen en el bundle frontend ni en el repositorio. — **Cumplido**.
3. `/game/:gameId` carga datos reales de IGDB y mantiene la estructura de bloques (externo/personal). — **Capa de datos cumplida**; la migración de la página a TanStack Query queda para la Fase 4.
4. Una respuesta de IGDB **inválida no rompe la UI**: se muestra `ErrorState`. — **Cumplido**.
5. Los componentes reciben siempre `Game`; **nunca** respuestas de IGDB crudas. — **Cumplido**.
6. La **biblioteca mock sigue funcionando** sin cambios de UI. — **Cumplido**.
7. Los errores se muestran mediante el sistema de estados ya definido. — **Cumplido**.
8. `npm run build`, `npm run lint` y el typecheck pasan. — **Cumplido**.
9. La integración **puede sustituir el mock** de `GamesRepository` sin modificar innecesariamente la UI. — **Cumplido**.
10. No se usa `useAsync` para IGDB en la búsqueda. — **Cumplido**.
11. No se introducen Auth, RLS, persistencia Supabase ni paginación de búsqueda. — **Cumplido**.
12. El dominio `Game` usa un identificador neutro (`externalId`) y no está acoplado a IGDB. — **Cumplido**.

---

## 22. Decisiones

### DEFINIDO

- IGDB es la única fuente externa de metadatos de videojuegos.
- El frontend consume IGDB **solo** a través de la Edge Function `igdb-proxy`.
- Las credenciales de Twitch viven solo como secretos de servidor; el access token se reutiliza temporalmente y nunca llega al cliente.
- Tipos `Igdb*` + validación Zod + mapper a `Game`; la UI solo ve `Game`.
- `Game.externalId` y `LibraryEntry.externalId` son identificadores neutros.
- Ruta `/game/:gameId`.
- `search` usa IGDB; `getById` usa IGDB; `list()` usa mock (transitorio, se resuelve en SPEC-05).
- `AbortSignal` opcional en `search` y `getById`.
- 20 resultados, primera página, sin paginación.
- Edge Function **sin** Auth de usuario; **no** es un proxy arbitrario; validación estricta; solo `https://api.igdb.com/v4/games`; `verify_jwt = true`.
- **Sin** rate limiting propio.
- TanStack Query para `search`; `useAsync` para mocks y pantallas no migradas (detalle y biblioteca).
- Clave de búsqueda `['igdb', 'search', normalized]`.
- Zod valida la respuesta de la Edge Function antes de mapear.
- Footer: "Datos de juegos por IGDB".

### IMPLEMENTADO

- Edge Function `igdb-proxy` con OAuth2 Client Credentials de Twitch (token cacheado + margen de 60 s + reintento ante 401), validación de parámetros, saneo del término, timeout (9 s), proyección, errores normalizados, CORS restringido y secretos de servidor.
- Estructura de `src/data/igdb` (`client`, `schemas`, `types`, `mappers`, `repository`) y `src/data/errors.ts`.
- `igdbGamesRepository` (`search`/`getById`) y composición de la fachada.
- Migración de identificadores (`rawgId` → `externalId`) y de ruta (`/game/:rawgId` → `/game/:gameId`).
- Eliminación de `src/data/rawg`, de la Edge Function `rawg-proxy` y de `RAWG_API_KEY`.
- 42 tests en verde; build, lint y typecheck OK.

### PENDING / NO VERIFICADO / DIFERIDO

- **PENDING** — Requisito exacto de atribución de IGDB/Twitch en la UI (enlace activo y menciones).
- **NO VERIFICADO** — Comportamiento real de rate limit en el plan usado (4 req/s documentado).
- **DIFERIDO** — Migración de `/game/:gameId` a TanStack Query y `staleTime`/`gcTime` del detalle (Fase 4).
- **DIFERIDO** — Sustitución definitiva de `list()` por resolución de metadatos a partir de las entradas en SPEC-05.
- **DIFERIDO** — Autenticación/protección de la Edge Function con Supabase (SPEC-05/Auth).
- **DIFERIDO** — Rate limiting propio, solo si las necesidades reales lo justifican.
- **DIFERIDO** — Paginación de `/search`.

---

## 23. Dependencias y no-alcance

Esta SPEC **depende de**:

- SPEC-00 — Base del proyecto (aprobada).
- SPEC-01 — Arquitectura técnica (aprobada).
- SPEC-02 — Modelo de datos de Supabase (aprobada).
- SPEC-03 — UI/UX y diseño visual (aprobada).

Esta SPEC **NO implementa todavía**:

- Migración de `/game/:gameId` a TanStack Query (Fase 4).
- Persistencia en Supabase.
- Supabase Auth ni modelo de usuarios.
- RLS.
- Biblioteca real (`library_entries`).
- Dashboard/Biblioteca conectados a Supabase.
- Migraciones SQL.
- Funcionalidades SaaS.
- Paginación de búsqueda.

---

## Estado de aprobación

| Campo | Valor |
| --- | --- |
| Estado | **Aprobada** |
| Versión | **0.4** |

SPEC-04 queda **Aprobada** y la migración del proveedor externo **RAWG → IGDB** está implementada para la búsqueda y la capa de datos del detalle. La **Fase 4** (migración del detalle `/game/:gameId` a TanStack Query y elementos pendientes) queda por implementar.
