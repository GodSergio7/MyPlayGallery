# SPEC-02 — Modelo de datos de Supabase

| Campo | Valor |
| --- | --- |
| ID | SPEC-02 |
| Título | Modelo de datos de Supabase |
| Versión | 0.2 |
| Estado | Aprobada |
| Fecha | 2026-09-16 |
| Autor | Responsable de producto |
| Redactado por | Agente de desarrollo |
| Depende de | SPEC-00 (aprobada), SPEC-01 (aprobada) |

## Historial de cambios

| Versión | Fecha | Descripción |
| --- | --- | --- |
| 0.1 | 2026-09-16 | Creación inicial. Modelo de datos de Supabase. |
| 0.2 | 2026-09-16 | Resueltas las decisiones pendientes del modelo: sin tablas `games`/`platforms`/`profiles`, `status` con `CHECK`, horas `numeric(6,1)`, booleanos, trigger de `updated_at` y eliminación de `rawg_slug`. Ajustados índices. |

## Leyenda de estados de decisión

- **DEFINIDO**: ya establecido por SPEC-00/SPEC-01 o por el scaffold. No requiere aprobación.
- **PROPUESTO**: recomendación del agente. Requiere aprobación del responsable de producto.
- **PENDING**: decisión abierta que debe aprobar el responsable de producto.

> Esta SPEC es **solo documentación**. **No** contiene SQL ejecutable, **no** crea tablas, **no** ejecuta migraciones y **no** conecta con Supabase.

---

## 1. Alcance y principios

**Problema**: definir el modelo de datos completo que se usará en Supabase/PostgreSQL sin caer en sobreingeniería.

**Principios** (derivados de SPEC-00 y SPEC-01):

- La **unidad personal principal** es `LibraryEntry`: una experiencia personal de un juego en una plataforma.
- **RAWG no se convierte en una base de datos propia**: en el MVP no se duplican título, portada, géneros, fecha de lanzamiento ni plataformas disponibles.
- De RAWG solo se conserva el **identificador necesario** para volver a consultar el juego.
- La información personal se guarda en Supabase y se aísla por usuario mediante **Auth + RLS**.
- Producto **monousuario**, pero el modelo debe ser correcto y seguro con una cuenta autenticada.
- Prioridad: simplicidad, integridad, seguridad, mantenibilidad y ampliabilidad.

**Estado**: `DEFINIDO`.

## 2. Visión general del modelo

Relación conceptual objetivo:

`User → LibraryEntry → Game (RAWG) + Platform`

**Decidido**: el MVP se resuelve con **una única tabla de datos personales** (`library_entries`) más la tabla de usuarios de Supabase. `Game` no es una tabla (es una referencia externa identificada por `rawg_id`); `Platform` y `Status` se representan como **valores controlados** dentro de `library_entries`, sin tablas auxiliares en el MVP.

```
auth.users (Supabase)
    │ 1
    │
    │ N
library_entries ──(rawg_id)──▶ RAWG (externo, no persistido)
    │
    └──(platform_id + platform_name)── platform de RAWG (valor controlado)
```

**Alternativas descartadas para el MVP**:

- Crear tablas `games` y `platforms`: más "normalizado", pero añade sincronización y mantenimiento sin aportar valor claro en un MVP monousuario (ver secciones 5 y 6).
- Persistir una copia local de los metadatos de RAWG: descartado por SPEC-01 (no persistir RAWG).

**Estado**: `DEFINIDO`.

## 3. Entidades / tablas necesarias

| Entidad | ¿Tabla propia? | Propósito |
| --- | --- | --- |
| `auth.users` | Sí (gestionada por Supabase Auth) | Identidad del usuario autenticado. Aporta `user_id`. |
| `library_entries` | Sí | Datos personales de cada experiencia (juego + plataforma). |
| `profiles` | **No** en el MVP | No aporta valor al ser monousuario; se valorará si crece el producto. |
| `games` | **No** en el MVP | `Game` es una referencia externa de RAWG identificada por `rawg_id`. |
| `platforms` | **No** en el MVP (valor controlado) | La plataforma se guarda como `platform_id` + `platform_name` en la entrada. |
| `game_status` | **No** en el MVP (valor controlado) | Los 4 estados fijos se representan con una columna restringida. |

**Estado**: `DEFINIDO`.

## 4. `library_entries` — propósito y campos

**Propósito**: almacenar la información personal de cada experiencia de juego. Es la entidad central del producto.

**Campos** (tipos PostgreSQL, documentación, no DDL):

| Campo | Tipo | Obligatorio | Descripción |
| --- | --- | --- | --- |
| `id` | `uuid` | Sí | Clave primaria (`gen_random_uuid()`). |
| `user_id` | `uuid` | Sí | Propietario. FK a `auth.users(id)`. |
| `rawg_id` | `integer` | Sí | Identificador externo del juego en RAWG. |
| `platform_id` | `integer` | Sí | Identificador de plataforma de RAWG. |
| `platform_name` | `text` | Sí | Nombre de la plataforma (valor controlado mostrado en UI). |
| `status` | `text` | Sí | Uno de los 4 estados (por defecto `pending`). |
| `score` | `numeric(3,1)` | No | Puntuación personal 0–10 en pasos de 0.5. |
| `platinum` | `boolean` | Sí | Platino conseguido (por defecto `false`). |
| `hundred_percent` | `boolean` | Sí | 100% conseguido (por defecto `false`). |
| `hours_played` | `numeric(6,1)` | No | Horas jugadas (≥ 0). |
| `started_on` | `date` | No | Fecha de inicio (día/mes/año). |
| `finished_on` | `date` | No | Fecha de finalización (día/mes/año). |
| `review` | `text` | No | Reseña personal. |
| `notes` | `text` | No | Notas personales. |
| `created_at` | `timestamptz` | Sí | Marca de creación (por defecto `now()`). |
| `updated_at` | `timestamptz` | Sí | Marca de última modificación (actualizada por trigger). |

**Estado**: `DEFINIDO`.

## 5. Representación de `Game` (RAWG)

**Problema**: decidir si `Game` debe ser una tabla propia.

**Decisión**: **no** se crea tabla `games` en el MVP. `library_entries` referencia directamente al juego externo mediante `rawg_id`. RAWG sigue siendo la fuente de los metadatos generales y **no** se persisten título, portada, géneros, fecha de lanzamiento ni otros metadatos.

**Alternativas descartadas**:

- **Opción B — tabla `games` con solo el `rawg_id`**: ancla de identidad con FK. Añade una tabla y un join sin beneficio claro en el MVP.
- **Opción C — tabla `games` con snapshot de metadatos**: contradice SPEC-01 y añade sincronización.

**Estado**: `DEFINIDO`.

## 6. Representación de `Platform`

**Problema**: decidir cómo representar la plataforma en la que se juega.

**Decisión**: **no** se crea tabla `platforms` en el MVP. `library_entries` guarda `platform_id` + `platform_name`, ambos procedentes de la plataforma seleccionada de RAWG. Se podrá crear una tabla `platforms` en el futuro mediante una nueva SPEC si aparece la necesidad.

**Alternativa descartada**:

- **Opción B — tabla `platforms`**: tabla de referencia (`rawg_platform_id`, `name`, `slug`) con FK desde `library_entries`. Mejor integridad y agrupación, pero requiere poblar y mantener la lista.

**Estado**: `DEFINIDO`.

## 7. Representación de los 4 estados

**Problema**: representar `Pendiente / Jugando / Completado / Abandonado` con integridad y sin sobreingeniería.

**Decisión**: `status` como `text` + restricción `CHECK` con los valores `pending`, `playing`, `completed`, `abandoned`. Valor por defecto: `pending`.

**Alternativas descartadas**:

- **Opción B — tipo `ENUM` de PostgreSQL**: integridad fuerte; modificar/eliminar valores es más rígido.
- **Opción C — tabla `game_status`**: útil con muchos estados o etiquetas; excesivo para 4 valores fijos.

**Estado**: `DEFINIDO`.

## 8. Representación de puntuación, horas y fechas

**Puntuación**:

- `numeric(3,1)` nullable. Reglas: `0 ≤ score ≤ 10` y múltiplo de `0.5`. Sin puntuación = `NULL` (no 0).

**Horas jugadas**:

- `numeric(6,1)` nullable, `≥ 0`. Admite valores decimales (p. ej. `35.5`). `NULL` significa que todavía no se ha registrado el dato.

**Fechas**:

- `date` (día/mes/año), nullable. `finished_on` no puede ser anterior a `started_on` cuando ambas existen.
- No se usan `timestamp` porque SPEC-00 fija precisión de día.

**Estado**: `DEFINIDO`.

## 9. Identificadores externos de RAWG

- `rawg_id` (`integer`, obligatorio): identificador del juego en RAWG. Es la referencia que permite volver a consultar el juego y es suficiente para identificarlo.
- `platform_id` (`integer`, obligatorio): identificador de plataforma de RAWG.

> No se guarda `rawg_slug`: no se necesita en el MVP. Si en el futuro hiciera falta, podrá obtenerse desde RAWG.

**Estado**: `DEFINIDO`.

## 10. Datos de RAWG que NO se almacenan

En el MVP **no** se persisten en PostgreSQL:

- Título del juego.
- Portada / imágenes.
- Fecha de lanzamiento.
- Géneros.
- Lista de plataformas disponibles.
- Cualquier otro metadato descriptivo de RAWG.

Estos datos se obtienen de RAWG en tiempo de ejecución y se cachean solo en el cliente (TanStack Query), según SPEC-01.

> Nota: como consecuencia, si RAWG no está disponible, la biblioteca no mostrará el título/portada. Esto es aceptable en el MVP. Recuperar resiliencia offline implicaría volver a evaluar esta regla mediante una SPEC.

## 11. Datos personales que se almacenan

**Datos personales (experiencia del usuario)** — todos editables por el usuario:

- `status`, `score`, `platinum`, `hundred_percent`, `hours_played`, `started_on`, `finished_on`, `review`, `notes`.

**Referencias técnicas (no personales)**:

- `rawg_id` y `platform_id` son identificadores externos de RAWG.
- `platform_name` es una etiqueta de referencia de la plataforma (valor controlado mostrado en UI).

**Campos técnicos / de sistema**:

- `id`, `user_id` (propiedad), `created_at`, `updated_at`.

## 12. Claves primarias y foráneas

- **Clave primaria** de `library_entries`: `id` (`uuid`).
- **Clave foránea**: `user_id` → `auth.users(id)`.
- Solo si en el futuro se adopta una tabla `platforms`: `platform_id` → `platforms(rawg_platform_id)`.

**Estado**: `DEFINIDO`.

## 13. Relaciones entre entidades

- `auth.users` **1 → N** `library_entries` (un usuario tiene muchas entradas).
- `library_entries` **N → 1** `Game (RAWG)` mediante `rawg_id` (referencia externa, sin FK real).
- `library_entries` **N → 1** `Platform` mediante `platform_id` (valor controlado; FK real solo si se adopta la Opción B).

**Estado**: `DEFINIDO` (conceptual).

## 14. Unicidad de una `LibraryEntry`

**Regla**: no puede existir más de una entrada para el mismo usuario, mismo juego (RAWG) y misma plataforma.

**Propuesta (aprobada)**: restricción/índice único sobre `(user_id, rawg_id, platform_id)`.

Esto materializa el ejemplo de *Witcher 3*: el mismo juego puede tener una entrada en PS4, otra en PC y otra en Switch, pero **no** puede haber dos entradas del mismo usuario para el mismo juego y la misma plataforma.

**Estado**: `DEFINIDO`.

## 15. Restricciones y reglas de integridad

| Regla | Descripción |
| --- | --- |
| `status` válido | Solo `pending`, `playing`, `completed`, `abandoned`. |
| Rango de puntuación | `0 ≤ score ≤ 10`. |
| Incremento de puntuación | `score` múltiplo de `0.5`. |
| Horas no negativas | `hours_played ≥ 0`. |
| Fechas coherentes | `finished_on ≥ started_on` si ambas existen. |
| `rawg_id` positivo | `rawg_id > 0`. |
| `platform_id` positivo | `platform_id > 0`. |
| `platform_name` no vacío | Longitud mínima > 0. |
| `user_id` no nulo | Toda entrada pertenece a un usuario. |

**Estado**: `DEFINIDO`.

## 16. Campos técnicos

- `created_at` (`timestamptz not null default now()`).
- `updated_at` (`timestamptz not null default now()`), actualizado en cada modificación mediante **trigger** (concepto, sin SQL aquí).

**Estado**: `DEFINIDO`. El trigger de `updated_at` se documenta solo a nivel conceptual; **no** se crea SQL todavía.

## 17. Modelo de usuario para Supabase Auth

- Se usa **Supabase Auth**; el usuario vive en `auth.users` (no se crea tabla de perfiles en el MVP).
- `library_entries.user_id` referencia `auth.users(id)`.
- Producto **monousuario**: una única cuenta personal, sin roles, invitaciones ni perfiles.

**Estado**: `DEFINIDO`. No se crea tabla `profiles` en el MVP; `auth.users` es suficiente. Si el producto evoluciona a multiusuario/perfiles, se abordará mediante una SPEC futura.

## 18. Diseño conceptual de RLS

- Activar **RLS** en `library_entries`.
- El acceso se restringe por propietario usando `auth.uid()`:

| Operación | Regla conceptual |
| --- | --- |
| `SELECT` | Solo filas con `user_id = auth.uid()`. |
| `INSERT` | Solo si `user_id = auth.uid()`. |
| `UPDATE` | Solo filas con `user_id = auth.uid()`; no se puede cambiar a otro `user_id`. |
| `DELETE` | Solo filas con `user_id = auth.uid()`. |

- El `user_id` se deriva del usuario autenticado y **no** se confía en el valor enviado por el cliente.
- Las tablas de referencia (si se añaden en el futuro) pueden ser de lectura para usuarios autenticados.

**Estado**: `DEFINIDO` (reglas). El diseño concreto de las políticas se traducirá a SQL durante la implementación de Supabase.

## 19. Índices necesarios o recomendados

El índice único `(user_id, rawg_id, platform_id)` ya empieza por `user_id`, por lo que **no** se añade un índice independiente sobre `(user_id)`: las consultas "todas las entradas del usuario" quedan cubiertas por el prefijo de ese índice.

| Índice | Motivo |
| --- | --- |
| Único `(user_id, rawg_id, platform_id)` | Unicidad de la entrada + acceso por propietario (prefijo `user_id`). |
| `(user_id, status)` | Filtrado de la biblioteca por estado y recuentos del dashboard. |
| `(user_id, platform_id)` | Filtrado/agrupación por plataforma. |
| `(user_id, updated_at desc)` | Ordenación por actividad reciente. |

**Estado**: `DEFINIDO`.

## 20. Estrategia de eliminación

- `library_entries.user_id` → `auth.users(id)` con **`ON DELETE CASCADE`**: al eliminar la cuenta, se eliminan sus entradas.
- Si en el futuro existe `platforms` con FK desde `library_entries.platform_id`, se propone **`ON DELETE RESTRICT`** para no dejar entradas sin plataforma.
- No hay entidades hijas de `library_entries` en el MVP, por lo que no aplican más cascadas.

**Estado**: `DEFINIDO`.

## 21. Reglas para evitar duplicados

- Restricción única `(user_id, rawg_id, platform_id)` (sección 14).
- Normalización de `rawg_id` y `platform_id` a enteros positivos.
- En el flujo de alta, comprobar la existencia previa de la entrada antes de insertar (a nivel de aplicación).
- Consistencia de `platform_name` para un mismo `platform_id` (si en el futuro se adopta la tabla `platforms`, se garantizaría por FK).

**Estado**: `DEFINIDO`.

## 22. Ejemplos conceptuales de registros

`library_entries` (usuario `U`):

| rawg_id | platform_id | platform_name | status | score | platinum | 100% | hours | started_on | finished_on |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4200 | 18 | PlayStation 4 | completed | 9.0 | false | false | 120.0 | 2024-01-10 | 2024-03-02 |
| 4200 | 4 | PC | playing | 8.0 | false | false | 35.0 | 2025-06-01 | (null) |

Interpretación: *Witcher 3* (mismo `rawg_id`) registrado de forma independiente en PS4 y PC.

**Estado**: ilustrativo.

## 23. Evolución futura

- Añadir `platforms` como tabla de referencia si se necesita integridad/agrupación.
- Añadir `games` como ancla local si se decide persistir metadatos mínimos de RAWG.
- Añadir valoraciones o campos adicionales (p. ej. dificultad, rejugadas) mediante nueva SPEC.
- Añadir `profiles` solo si el producto evoluciona a multiusuario.

## 24. Decisiones

### DEFINIDO

**Producto / modelo**

- `LibraryEntry` como unidad personal principal.
- Asociación a un juego (RAWG) y a una plataforma.
- 4 estados fijos.
- Puntuación 0–10 en pasos de 0.5.
- Horas y fechas (día/mes/año).
- No persistir metadatos de RAWG en PostgreSQL; guardar solo identificadores.
- Supabase Auth + RLS, producto monousuario.
- Sin tabla `profiles` en el MVP; `auth.users` es suficiente.

**Estructura de datos**

- Una tabla personal `library_entries` + `auth.users`.
- Campos, tipos y nulabilidad de `library_entries` (sección 4).
- Sin tabla `games`: el juego es referencia externa vía `rawg_id`.
- Sin tabla `platforms`: `platform_id` + `platform_name` embebidos.
- `rawg_slug` eliminado del modelo.
- `uuid` como PK con `gen_random_uuid()`.
- `text` + `CHECK` para `status` (valores `pending`, `playing`, `completed`, `abandoned`; por defecto `pending`).
- `numeric(3,1)` para `score` y `numeric(6,1)` para `hours_played`.
- `boolean` con valor por defecto `false` para `platinum` y `hundred_percent`.
- `date` para `started_on` y `finished_on`.
- `created_at` / `updated_at` con **trigger** de actualización.
- Unicidad `(user_id, rawg_id, platform_id)`.
- Índices: único `(user_id, rawg_id, platform_id)`, `(user_id, status)`, `(user_id, platform_id)` y `(user_id, updated_at desc)`.
- `ON DELETE CASCADE` para `user_id`.
- Reglas de integridad (sección 15).
- RLS por `auth.uid()` en `library_entries` (SELECT / INSERT / UPDATE / DELETE).

### PENDIENTE

No queda ninguna decisión de producto ni de arquitectura pendiente en SPEC-02. Los detalles de implementación de SQL (DDL, políticas, triggers) se abordarán durante la implementación de Supabase, sin cambiar este modelo.

## Criterios de aprobación

SPEC-02 se considera aprobada cuando el responsable de producto:

1. Confirma el modelo de una tabla personal `library_entries` (+ `auth.users`).
2. Confirma campos, tipos, obligatoriedad, unicidad e integridad.
3. Confirma el diseño de RLS y la estrategia de eliminación.

Hasta su aprobación no se crean tablas, migraciones, políticas ni código.
