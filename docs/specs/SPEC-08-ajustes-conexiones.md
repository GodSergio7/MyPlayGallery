# SPEC-08 — Ajustes y cuentas conectadas

| Campo | Valor |
| --- | --- |
| ID | SPEC-08 |
| Título | Página de Ajustes y conexión de cuentas de plataformas (Steam) |
| Versión | 0.1 |
| Estado | Aprobada |
| Fecha | 2026-10-09 |
| Autor | Responsable de producto |
| Redactado por | Agente de desarrollo |
| Depende de | SPEC-02, SPEC-03 y SPEC-05 (aprobadas) |

## Historial de cambios

| Versión | Fecha | Descripción |
| --- | --- | --- |
| 0.1 | 2026-10-09 | Creación inicial. Página `/settings` con las secciones Cuenta y Cuentas conectadas. Conexión de Steam con su inicio de sesión oficial (OpenID 2.0), verificada en la Edge Function `steam-connect`. La importación de juegos queda para la fase 2. |

---

## 1. Resumen

Nueva página **Ajustes** (`/settings`), accesible desde la tarjeta **Cuenta** del menú. Está organizada por secciones para poder añadir más ajustes sin rehacerla. En esta fase tiene dos secciones:

- **Cuenta**: el email de la sesión y el botón de cerrar sesión.
- **Cuentas conectadas**: conectar o desconectar la cuenta de Steam.

**Estado**: `IMPLEMENTADO` (fase 1).

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

## 6. Fase 2 (pendiente)

Importar la biblioteca de Steam. Requiere la clave de la Steam Web API como secreto de la Edge Function, nunca en el cliente ni en Vercel.

- `IPlayerService/GetOwnedGames` con `include_appinfo=1`: juegos y minutos jugados. El perfil debe tener los detalles de juego en público.
- Emparejar cada `appid` con IGDB mediante `external_games` (categoría Steam).
- Pantalla de revisión antes de guardar: el usuario marca qué juegos importar. Plataforma PC, horas de Steam, estado propuesto según las horas.
- Botón **Actualizar desde Steam** que rellena `last_synced_at`.
- Opcional: logros (`GetPlayerAchievements`) para marcar los juegos al 100%.
