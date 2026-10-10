# SPEC-05 — Autenticación, registro y persistencia multiusuario

| Campo | Valor |
| --- | --- |
| ID | SPEC-05 |
| Título | Autenticación, registro y persistencia multiusuario |
| Versión | 0.2 |
| Estado | Aprobada |
| Fecha | 2026-10-08 |
| Autor | Responsable de producto |
| Redactado por | Agente de desarrollo |
| Depende de | SPEC-00, SPEC-01, SPEC-02, SPEC-03 y SPEC-04 (aprobadas) |
| Modifica | SPEC-00 (v0.4), SPEC-01 (v0.4), SPEC-02 (v0.3), SPEC-03 (v0.3) |

## Historial de cambios

| Versión | Fecha | Descripción |
| --- | --- | --- |
| 0.1 | 2026-10-08 | Creación inicial. El producto pasa de monousuario a **multiusuario con registro abierto**. Se documentan la persistencia real en Supabase, el inicio de sesión, el registro, el cierre de sesión y la configuración necesaria del proyecto de Supabase. Refleja lo ya implementado. |
| 0.2 | 2026-10-10 | Puesta al día (T-40): `igdb-proxy` exige sesión de usuario y limita las peticiones (T-01); ya no existe el plugin de desarrollo (T-20); mensajes de email sin confirmar con reenvío del correo y de enlace caducado (T-24); URL pública decidida; entrar con Steam (SPEC-09). |

## Leyenda de estados de decisión

- **DEFINIDO**: decisión aprobada por el responsable de producto.
- **IMPLEMENTADO**: decisión aprobada que ya está construida.
- **CONFIGURACIÓN**: ajuste que se hace en el panel de Supabase, no en el código.
- **PENDING**: decisión abierta.

---

## 1. Resumen y motivación

Hasta ahora, SPEC-00, SPEC-01 y SPEC-02 definían MyPlayGallery como un producto **monousuario**, con una única cuenta personal y Supabase Auth + RLS solo como medida de seguridad.

El responsable de producto ha decidido que **cualquier persona pueda crear su propia cuenta** y tener su propia biblioteca. Esta SPEC:

- sustituye la restricción "monousuario / cuenta única" de las SPEC anteriores;
- documenta la persistencia real de la biblioteca en Supabase, que sustituye a los datos mock en memoria;
- define las pantallas de inicio de sesión y registro.

El **modelo de datos no cambia en lo esencial**: `library_entries` ya tenía `user_id` y RLS por `auth.uid()` (SPEC-02), por lo que el aislamiento entre usuarios ya estaba garantizado.

**Estado**: `DEFINIDO`.

## 2. Alcance

**Incluido**

- Registro de usuarios con email y contraseña.
- Confirmación del email (si está activada en el proyecto de Supabase).
- Inicio y cierre de sesión.
- Protección de todas las rutas de la aplicación: sin sesión solo se ve la pantalla de acceso.
- Persistencia de la biblioteca en la tabla `library_entries` de Supabase.

**Fuera de alcance** (se abordará con una SPEC futura si se necesita)

- Recuperación de contraseña ("¿Has olvidado tu contraseña?").
- Inicio de sesión con proveedores externos (Google, Discord, etc.).
- Perfiles públicos, avatares o nombre de usuario.
- Bibliotecas compartidas, amigos, seguidores o cualquier interacción entre usuarios.
- Roles o panel de administración.
- Eliminación de la cuenta desde la propia aplicación.

**Estado**: `DEFINIDO`.

## 3. Modelo de usuarios

- Cada usuario es una fila de `auth.users`, gestionada por Supabase Auth.
- **No** se crea tabla `profiles`: el email de `auth.users` es suficiente para esta fase.
- Cada usuario tiene **su propia biblioteca independiente**. No hay datos compartidos entre usuarios.
- Al borrar un usuario en Supabase, sus entradas se eliminan en cascada (`ON DELETE CASCADE`, SPEC-02 §20).

**Estado**: `DEFINIDO`.

## 4. Persistencia en Supabase

- La tabla `library_entries` se crea con la migración `supabase/migrations/20261008000000_library_entries.sql`, que implementa el modelo de SPEC-02.
- La columna del juego se llama **`external_id`** (identificador de IGDB) en lugar de `rawg_id`, en línea con la migración de RAWG a IGDB de SPEC-04 v0.4. Los identificadores de plataforma `platform_id` son también los de IGDB.
- `user_id` toma por defecto `auth.uid()`: el cliente **no** envía el propietario y RLS impide escribir con otro `user_id`.
- El acceso se hace desde `src/data/supabase/libraryRepository.ts`. Este repositorio sustituye al almacén mock en memoria y mantiene la interfaz `LibraryRepository` de `src/data/repository.ts`, por lo que la UI no cambia.
- Las filas recibidas se validan con Zod antes de convertirlas al tipo de dominio `LibraryEntry`.
- Los errores de PostgreSQL se traducen a `DataError` con mensajes en español (p. ej. entrada duplicada para el mismo juego y plataforma → "Ya tienes este juego en esa plataforma.").

**Estado**: `IMPLEMENTADO`.

## 5. Flujo de autenticación

### 5.1 Inicio de sesión

- Email + contraseña (`signInWithPassword`).
- Si las credenciales no son válidas: "Email o contraseña incorrectos."
- Al entrar, la aplicación muestra la ruta solicitada.

### 5.2 Registro

- Campos: email, contraseña y repetición de la contraseña.
- Validación en cliente: contraseña de **al menos 6 caracteres** (mínimo por defecto de Supabase) y las dos contraseñas deben coincidir.
- Errores de Supabase traducidos al español: email ya registrado, contraseña débil, email no válido, registro desactivado y límites de envío o de peticiones.
- **Con confirmación de email activada**: tras registrarse se muestra la pantalla "Revisa tu email". El usuario entra después de pulsar el enlace del correo, que lo devuelve al origen de la aplicación (`emailRedirectTo = window.location.origin`).
- **Con confirmación de email desactivada**: el usuario entra directamente tras registrarse.
- Si el email ya existe y la confirmación está activada, Supabase no devuelve error (para no revelar qué emails existen), sino un usuario sin identidades. La aplicación lo detecta y muestra "Ya existe una cuenta con ese email."

### 5.3 Cierre de sesión

- Botón "Cerrar sesión" en la cabecera.
- Al cerrar sesión se vacía la caché de TanStack Query para que no queden datos del usuario anterior.

### 5.4 Protección de rutas

- `AuthProvider` (`src/app/auth/AuthProvider.tsx`) mantiene la sesión y escucha los cambios con `onAuthStateChange`.
- `RequireAuth` (`src/app/auth/RequireAuth.tsx`) envuelve todas las rutas. Mientras comprueba la sesión muestra un estado de carga; sin sesión muestra la pantalla de acceso.
- La sesión la guarda `supabase-js` en el navegador y se renueva automáticamente.

**Estado**: `IMPLEMENTADO`.

## 6. Edge Function `igdb-proxy`

- Se despliega en el proyecto de Supabase con `verify_jwt = true` y, además, **la función comprueba que el token sea de un usuario con sesión** (la clave pública sola recibe `401`) y limita a 300 peticiones por minuto y usuario (SPEC-04 v0.5, T-01).
- Con sesión iniciada, `supabase-js` envía el token del usuario, así que la búsqueda en IGDB funciona igual para cualquier usuario registrado.
- Ya no hay plugin de desarrollo (`vite/igdbDevProxy.ts` eliminado, T-20): en local también se usa el proyecto real de Supabase.

**Estado**: `IMPLEMENTADO`.

## 7. Configuración del proyecto de Supabase

Estos ajustes se hacen en el panel de Supabase, no en el código:

| Ajuste | Dónde | Valor |
| --- | --- | --- |
| Permitir registros | Authentication → Sign In / Providers → *Allow new users to sign up* | Activado |
| Confirmación de email | Authentication → Sign In / Providers → *Confirm email* | Activado (recomendado) |
| Site URL | Authentication → URL Configuration | `http://localhost:5173` en desarrollo; la URL pública en producción |
| Redirect URLs | Authentication → URL Configuration | Todos los orígenes desde los que se sirva la app |
| SMTP propio | Authentication → Emails → SMTP Settings | Recomendado antes de abrir la app a más usuarios (el servidor de correo de Supabase tiene un límite muy bajo de envíos por hora) |
| Secretos de la Edge Function | `supabase secrets set` | `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` y, en producción, `ALLOWED_ORIGINS` |

**Estado**: `CONFIGURACIÓN`.

## 8. Seguridad

- En el cliente solo se usa la **clave pública** (`VITE_SUPABASE_ANON_KEY`). Las claves secretas o `service_role` **nunca** se incluyen en la app.
- El aislamiento entre usuarios depende de RLS en `library_entries` (SPEC-02 §18). Cualquier tabla nueva con datos personales debe tener RLS activado antes de usarse.
- Las credenciales de Twitch siguen siendo secretos de servidor (SPEC-04).

**Estado**: `DEFINIDO`.

## 9. Decisiones pendientes

- `PENDING` — Recuperación de contraseña.
- `PENDING` — Proveedor SMTP propio para producción (tarea T-23, se configura en el panel de Supabase).
- `RESUELTO` — URL pública de producción: `https://myplaygallery.vercel.app` (Site URL, Redirect URLs y `ALLOWED_ORIGINS` configurados).

## 10. Mensajes de la pantalla de acceso (v0.2, T-24)

- **Email sin confirmar**: al entrar, en lugar de "No se ha podido iniciar sesión", se explica que falta confirmar el email y aparece **"Reenviar el correo de confirmación"** (`auth.resend`, tipo `signup`).
- **Enlace del correo caducado o ya usado**: Supabase vuelve con `#error=…&error_code=otp_expired`; la pantalla de acceso lo explica y limpia la URL.
- **Entrar con Steam**: ver SPEC-09.

## Estado de aprobación

SPEC-05 queda **Aprobada** (v0.1) por decisión explícita del responsable de producto de añadir el registro de usuarios. Su implementación está completada.
