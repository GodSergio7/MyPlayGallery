# SPEC-08 — Ajustes y cuentas conectadas

| Campo | Valor |
| --- | --- |
| ID | SPEC-08 |
| Título | Página de Ajustes y conexión de cuentas de plataformas (Steam) |
| Versión | 0.3 |
| Estado | Aprobada |
| Fecha | 2026-10-09 |
| Autor | Responsable de producto |
| Redactado por | Agente de desarrollo |
| Depende de | SPEC-02, SPEC-03 y SPEC-05 (aprobadas) |

## Historial de cambios

| Versión | Fecha | Descripción |
| --- | --- | --- |
| 0.1 | 2026-10-09 | Creación inicial. Página `/settings` con las secciones Cuenta y Cuentas conectadas. Conexión de Steam con su inicio de sesión oficial (OpenID 2.0), verificada en la Edge Function `steam-connect`. La importación de juegos queda para la fase 2. |
| 0.2 | 2026-10-09 | Fase 2: importación de la biblioteca de Steam. Edge Function `steam-library` (Steam Web API + emparejado con IGDB por `external_game_source`), pantalla de revisión `/settings/steam`, alta múltiple y actualización de horas. |
| 0.3 | 2026-10-09 | Logros de Steam: "Completado" solo cuando se tienen todos los logros (y entonces también "Al 100%"). Los juegos que ya estaban en PC se ponen al día si Steam tiene más horas o todos los logros. Sin logros completos, nunca se propone Completado. |

---

## 1. Resumen

Nueva página **Ajustes** (`/settings`), accesible desde la tarjeta **Cuenta** del menú. Está organizada por secciones para poder añadir más ajustes sin rehacerla. En esta fase tiene dos secciones:

- **Cuenta**: el email de la sesión y el botón de cerrar sesión.
- **Cuentas conectadas**: conectar o desconectar la cuenta de Steam.

**Estado**: `IMPLEMENTADO` (fases 1 y 2).

## 2. Plataformas

| Plataforma | ¿Se puede conectar? | Motivo |
| --- | --- | --- |
| Steam | Sí | Inicio de sesión oficial (OpenID 2.0) y Steam Web API pública. |
| Epic Games Store | No | No hay API pública para leer la biblioteca. |
| GOG | No | Solo existen accesos no oficiales a través del cliente Galaxy. |
| PlayStation | No | No hay API pública; las alternativas usan tokens de sesión no oficiales. |
| Xbox | No | La API de Xbox Live exige ser socio de Microsoft. |
| Nintendo | No | No hay API pública. |

Las plataformas que no se pueden conectar se nombran en una sola nota dentro de la sección, no con una fila deshabilitada por cada una.

## 3. Conectar Steam

1. El usuario pulsa **Conectar**. La app le lleva a `https://steamcommunity.com/openid/login` con `return_to = <origen>/settings?conectar=steam` y `realm = <origen>`.
2. Steam le devuelve a `/settings` con los parámetros `openid.*` en la URL. La página los lee una sola vez, limpia la URL y los envía a la Edge Function `steam-connect` junto con el JWT de la sesión.
3. `steam-connect`:
   - Saca el usuario de la app del JWT, nunca del cuerpo de la petición.
   - Comprueba que `openid.op_endpoint` es Steam, que `claimed_id` coincide con `identity` y tiene la forma `https://steamcommunity.com/openid/id/<SteamID64>`, y que el origen de `return_to` está en `ALLOWED_ORIGINS`.
   - Pregunta a Steam si la respuesta es auténtica (`openid.mode=check_authentication`; Steam rechaza un nonce ya usado).
   - Lee el nombre y el avatar del perfil público (`/profiles/<id>?xml=1`). Si el perfil es privado, guarda la conexión sin ellos.
   - Guarda la conexión con la clave de servicio (`upsert` por usuario y plataforma).
4. Si el usuario cancela en Steam, la página muestra "Has cancelado el inicio de sesión en Steam".

No hace falta la clave de la Steam Web API para conectar; solo para importar (fase 2).

### Errores

| Código | Cuándo | Mensaje en la app |
| --- | --- | --- |
| `invalid_steam_response` | Steam no confirma la respuesta o los parámetros no cuadran | Steam no ha confirmado el inicio de sesión. Vuelve a intentarlo. |
| `already_linked` | Esa cuenta de Steam ya está conectada a otro usuario | Esa cuenta de Steam ya está conectada a otro usuario de MyPlayGallery. |
| `upstream_error` | Steam no responde | No se ha podido contactar con Steam. Inténtalo dentro de un rato. |
| `unauthorized` | Sin sesión válida | Mensaje genérico de acceso. |

## 4. Datos

Nueva tabla `platform_connections` (migración `20261009000000_platform_connections.sql`):

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid | Clave primaria |
| `user_id` | uuid | Usuario de la app; se borra en cascada con la cuenta |
| `provider` | text | De momento solo `steam` |
| `external_id` | text | SteamID64 |
| `display_name` | text, nullable | Nombre del perfil de Steam |
| `avatar_url` | text, nullable | Avatar mediano del perfil |
| `connected_at` | timestamptz | Fecha de la última conexión |
| `last_synced_at` | timestamptz, nullable | Última importación (fase 2) |

- Única por `(user_id, provider)`: una cuenta de cada plataforma por usuario.
- Única por `(provider, external_id)`: una cuenta de Steam solo puede estar conectada a un usuario.
- **RLS**: el usuario puede **leer** y **borrar** sus filas. No hay políticas de `insert` ni `update`: solo escribe la Edge Function con la clave de servicio, tras verificar con Steam. Así nadie puede apuntarse la cuenta de otra persona.

## 5. Interfaz

- En escritorio, cada sección tiene el título y una explicación corta a la izquierda y la tarjeta a la derecha. En móvil, se apilan.
- Fila de Steam: marca de Steam, nombre de la plataforma y, debajo, la explicación (sin conectar) o el avatar y nombre del perfil, con enlace al perfil, y la fecha de conexión (conectado). A la derecha, **Conectar** o **Desconectar**.
- Mientras se verifica la vuelta de Steam, el botón muestra "Comprobando…".
- Los avisos (conectado, cancelado, error) aparecen debajo de la fila.

## 6. Fase 2: importar la biblioteca

La clave de la Steam Web API está guardada como secreto `STEAM_API_KEY` de las Edge Functions, nunca en el cliente ni en Vercel.

### Edge Function `steam-library`

1. Saca el usuario del JWT y busca su conexión de Steam. Si no tiene, devuelve `not_connected`.
2. Llama a `IPlayerService/GetOwnedGames` con `include_appinfo=1` e `include_played_free_games=1`: appid, nombre, minutos jugados y última partida. Si Steam no devuelve la lista (perfil con los detalles de juego en privado), devuelve `private_profile`.
3. Empareja cada appid con IGDB mediante `external_games` con `external_game_source = 1` (Steam), en lotes de 250. El campo antiguo `category` ya no devuelve resultados.
4. Para los juegos jugados con ficha en IGDB (los más jugados primero, hasta 400), pide los logros con `ISteamUserStats/GetPlayerAchievements`, 8 peticiones a la vez y 6 s de límite por juego. Si un juego no tiene logros o Steam falla, ese juego queda "sin datos" y la importación sigue.
5. Guarda la fecha en `last_synced_at` y devuelve `{ games: [{ appId, name, minutes, lastPlayedAt, igdbId, achievements: { unlocked, total } | null }], syncedAt }`.

No escribe en la biblioteca: lo decide el usuario en la pantalla de revisión.

### Plan de importación (`steamImport.ts`, con tests)

- **Sin ficha**: appid sin juego en IGDB (herramientas, bandas sonoras, demos). Solo se listan.
- Si varios appid son el mismo juego de IGDB, se queda el más jugado.
- **Nuevos**: juegos que no están en la biblioteca **en PC** (`platform_id` 6). Si lo tienes en otra plataforma, se añade también en PC.
- **Poner al día**: ya están en PC, pero Steam tiene más horas o todos los logros (y en la biblioteca aún no está al 100%). Con todos los logros se marcan "Al 100%" y "Completado".
- **Al día**: el resto.
- Horas = minutos / 60, redondeadas a una décima.
- Estado propuesto. **Completado solo con todos los logros**, porque Steam no informa de si has terminado la historia:

| Lo que dice Steam | Estado | Al 100% |
| --- | --- | --- |
| 0 minutos | Pendiente | No |
| Todos los logros | Completado | Sí |
| Jugado en los últimos 30 días | Jugando | No |
| El resto (también los juegos sin logros) | Abandonado | No |

### Pantalla `/settings/steam`

- Resumen: juegos en la cuenta, nuevos, con más horas en Steam y ya al día.
- **Juegos nuevos**: casilla, portada de IGDB, título, horas, logros (trofeo con conseguidos/total, en verde si están todos) y estado (editable). Vienen marcados los que tienen horas. Buscador y "Marcar todos" / "Desmarcar".
- **Poner al día**: horas actuales → horas de Steam y/o "Todos los logros: Completado y al 100%", marcadas por defecto.
- **Sin ficha en IGDB**: plegado, solo los nombres.
- Barra fija abajo con el recuento ("4 juegos y 1 actualización") y el botón **Importar**.
- Guardado: un solo `upsert` con `ignoreDuplicates` para los nuevos y una actualización de `hours_played` por cada juego con horas nuevas.
- Al terminar: resumen y botón "Ver mi biblioteca".

### En Ajustes

Con Steam conectado, la fila muestra **Importar juegos**. Debajo aparecen la fecha de la última lectura y "Desconectar".

### Pendiente

- Comparar las horas con la duración de IGDB para proponer Completado en juegos terminados sin todos los logros.
