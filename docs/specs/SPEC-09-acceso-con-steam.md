# SPEC-09 — Entrar con Steam

| Campo | Valor |
| --- | --- |
| ID | SPEC-09 |
| Título | Inicio de sesión y registro con la cuenta de Steam |
| Versión | 0.1 |
| Estado | Aprobada |
| Fecha | 2026-10-09 |
| Autor | Responsable de producto |
| Redactado por | Agente de desarrollo |
| Depende de | SPEC-05 y SPEC-08 (aprobadas) |

## Historial de cambios

| Versión | Fecha | Descripción |
| --- | --- | --- |
| 0.1 | 2026-10-09 | Creación inicial. Botón "Continuar con Steam" en la pantalla de acceso y Edge Function `steam-login`. |

---

## 1. Resumen

La pantalla de acceso tiene, debajo del formulario y separado por "o", el botón **Continuar con Steam**. Sirve para entrar y para registrarse:

- Si esa cuenta de Steam ya está **conectada** a un usuario (desde Ajustes o por un acceso anterior con Steam), se entra como ese usuario.
- Si no, se **crea un usuario nuevo** ligado a esa cuenta de Steam, sin email ni contraseña.

**Estado**: `IMPLEMENTADO`.

## 2. Por qué un flujo propio

Supabase Auth no tiene Steam entre sus proveedores (Steam usa OpenID 2.0, no OAuth). La sesión se crea así:

1. La app lleva al usuario a `https://steamcommunity.com/openid/login` con `return_to = <origen>/?acceso=steam`.
2. Steam vuelve con los parámetros `openid.*`. La pantalla de acceso los lee una sola vez, limpia la URL (`history.replaceState`) y los envía a la Edge Function **`steam-login`**.
3. `steam-login` (sin JWT: `verify_jwt = false`, es la que crea la sesión):
   - Hace las mismas comprobaciones que `steam-connect` (SPEC-08): el `op_endpoint` es Steam, `claimed_id` coincide con `identity` y tiene la forma `.../openid/id/<SteamID64>`, y el origen de `return_to` está en `ALLOWED_ORIGINS`.
   - Pregunta a Steam si la respuesta es auténtica (`check_authentication`). Una respuesta inventada con el SteamID de otra persona se rechaza aquí.
   - Busca el SteamID en `platform_connections`:
     - si está, toma el email de ese usuario;
     - si no, crea un usuario con el email interno `steam-<SteamID64>@steam.invalid` (confirmado, `.invalid` es un dominio reservado que nunca recibe correo) y con `steam_id` y el nombre en sus metadatos.
   - Genera un **enlace de acceso de un solo uso** con `auth.admin.generateLink({ type: 'magiclink' })`. No se envía por correo.
   - Guarda o actualiza la conexión de Steam del usuario (nombre y avatar actuales).
   - Devuelve `{ tokenHash, created }`.
4. La app canjea el token por la sesión con `auth.verifyOtp({ token_hash, type: 'magiclink' })`. `onAuthStateChange` recoge la sesión y se entra en la app.

## 3. Interfaz

- Botón con los colores de Steam (azul oscuro `#1b2838` y blanco), marca de Steam y "Continuar con Steam". Debajo, una nota: "Si es tu primera vez, se crea tu cuenta al momento" (en la pestaña Entrar) o "Con Steam no necesitas email ni contraseña" (en Crear cuenta).
- Mientras se verifica la vuelta de Steam, la tarjeta muestra la marca de Steam, "Entrando con Steam…" y un indicador de carga.
- Si el usuario cancela en Steam: aviso "Has cancelado el inicio de sesión en Steam".
- Errores: "Steam no ha confirmado el inicio de sesión. Vuelve a intentarlo." o "No se ha podido contactar con Steam…".

## 4. Cuentas creadas con Steam

- El email interno no se muestra nunca:
  - en Ajustes → Cuenta aparece "Acceso: Entras con tu cuenta de Steam";
  - en la tarjeta Cuenta del menú aparece "Cuenta de Steam".
- Nombre y avatar en la barra: los de Steam (SPEC-03 v0.13).
- Si desconectan Steam en Ajustes, al volver a entrar con Steam se reutiliza su usuario (mismo email interno) y se vuelve a conectar.
- Limitación: un usuario que ya tenía cuenta con email pero **no** había conectado Steam obtiene una cuenta **distinta** al entrar con Steam. Para unirlas, debe entrar con email y conectar Steam en Ajustes antes de usar el botón.
