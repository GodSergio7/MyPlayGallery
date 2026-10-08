# SPEC-00 — Base del proyecto

| Campo | Valor |
| --- | --- |
| ID | SPEC-00 |
| Título | Base del proyecto |
| Versión | 0.4 |
| Estado | Aprobado |
| Fecha | 2026-09-16 |
| Autor | Responsable de producto |
| Redactado por | Agente de desarrollo |

## Historial de cambios

| Versión | Fecha | Descripción |
| --- | --- | --- |
| 0.1 | 2026-09-16 | Creación inicial del documento base. |
| 0.2 | 2026-09-16 | Definidas puntuación (0–10, pasos de 0.5), estados fijos, precisión de fechas (día/mes/año) y plataformas derivadas de RAWG. |
| 0.3 | 2026-09-16 | Nombre canónico confirmado como MyPlayGallery. Documento aprobado. |
| 0.4 | 2026-10-08 | Enmienda por SPEC-05: el producto deja de ser monousuario y pasa a ser multiusuario con registro abierto; cada usuario tiene su propia biblioteca. |

---

## 1. Resumen y objetivo

**MyPlayGallery** es una **biblioteca personal de videojuegos**. No es un catálogo de videojuegos: su propósito es que el usuario pueda **buscar videojuegos**, **añadirlos a su biblioteca** y **registrar su experiencia personal** con cada uno de ellos.

La aplicación combina dos fuentes de información:

- **RAWG Video Games Database API**: información general y objetiva de los videojuegos (título, portada, fecha de lanzamiento, géneros, plataformas, etc.).
- **Supabase / PostgreSQL**: información personal de la biblioteca del usuario (estado, puntuación, plataforma jugada, platinos, horas, fechas, reseñas, notas, etc.).

El objetivo del MVP es ofrecer una experiencia sencilla para consultar, registrar y analizar la actividad de juego personal.

## 2. Alcance del MVP

El MVP contempla conceptualmente las siguientes capacidades:

- Dashboard con visión general de la biblioteca.
- Biblioteca personal.
- Buscador de videojuegos.
- Integración con RAWG (a nivel conceptual).
- Añadir videojuegos a la biblioteca.
- Editar la información personal de cada entrada.
- Estados (Pendiente / Jugando / Completado / Abandonado).
- Puntuación personal.
- Plataforma en la que se ha jugado.
- Platinos.
- 100% conseguido.
- Horas jugadas.
- Fecha de inicio y fecha de finalización.
- Reseña personal.
- Notas personales.
- Estadísticas básicas.
- Persistencia mediante Supabase.
- Diseño responsive.

> Este alcance es **conceptual**. La implementación se detallará en SPEC posteriores.

## 3. Fuera de alcance

Quedan explícitamente fuera del MVP inicial:

- Red social.
- Amigos.
- Chat.
- Comentarios de otros usuarios.
- Integración con PlayStation Network.
- Integración con Xbox Live.
- Integración con Steam.
- Sistema de recomendaciones mediante IA.
- Tienda.
- Noticias.
- Foro.
- Aplicación móvil nativa.
- Logros / trofeos sincronizados automáticamente.

Estas funcionalidades podrán estudiarse posteriormente mediante nuevas SPEC.

## 4. Stack tecnológico previsto

**Frontend**

- React
- TypeScript
- Vite
- oxlint (herramienta de lint del scaffold actual)
- CSS

> **Nota**: el proyecto se ha creado con **oxlint** como linter, no con ESLint. Se documenta aquí la discrepancia para mantener el stack alineado con la realidad del repositorio.

**Backend / datos**

- Supabase
- PostgreSQL

**API externa**

- RAWG Video Games Database API

## 5. Principios generales y de arquitectura

- **Spec-Driven Development (SDD)**: ninguna funcionalidad se implementa sin una SPEC aprobada que lo indique.
- **Separación de datos**: RAWG aporta datos generales; Supabase almacena datos personales. Ambos dominios se mantienen claramente separados.
- **Una entrada de biblioteca por combinación (juego, plataforma)**: un mismo juego puede registrarse en varias plataformas de forma independiente.
- **Multiusuario con biblioteca personal**: cualquier persona puede registrarse y cada usuario tiene su propia biblioteca, privada e independiente. No hay perfiles públicos ni interacción entre usuarios (SPEC-05). _Sustituye a "MVP monousuario" (v0.3)._
- **Evolución por SPEC**: los cambios de alcance o de arquitectura se tramitan mediante nuevas SPEC.
- **No introducir dependencias ni cambios estructurales** sin una SPEC que los justifique.

## 6. Concepto de biblioteca

La biblioteca personal es una colección de **entradas**, donde cada entrada representa la experiencia del usuario con un videojuego **en una plataforma concreta**.

Reglas conceptuales:

- Un videojuego existe **una sola vez** como dato externo (RAWG).
- El usuario puede tener **varias entradas** del mismo videojuego si lo juega en plataformas distintas.
- Cada entrada tiene su propio estado, puntuación, horas, fechas, reseñas, notas, platino y 100%.
- Los campos de experiencia personal son editables en cualquier momento.

Ejemplo: un mismo juego puede aparecer como *Completado* en PC y *Jugando* en Nintendo Switch, con puntuaciones y horas independientes.

## 7. Modelo conceptual inicial

> Modelo **conceptual**. No define tablas, columnas ni tipos SQL. El diseño de datos concreto corresponde a una SPEC posterior.

- **Juego (RAWG)**: entidad de solo lectura con información general obtenida de RAWG (título, portada, fecha de lanzamiento, géneros, plataformas disponibles, etc.).
- **EntradaBiblioteca**: registro personal asociado a un juego y a una plataforma. Contiene estado, puntuación, platino, 100%, horas, fechas, reseña y notas.
- **Plataforma**: plataforma en la que se registra una entrada. Su origen es **RAWG**: las plataformas disponibles se derivan de los datos externos del juego.
- **Estado**: situación de la entrada, con **4 estados fijos**: Pendiente / Jugando / Completado / Abandonado.

Relaciones conceptuales:

- Un **Juego** puede tener muchas **EntradasBiblioteca**.
- Una **EntradaBiblioteca** referencia exactamente un **Juego** y una **Plataforma**.
- Cada **EntradaBiblioteca** tiene un único **Estado**.

Reglas de datos personales:

- **Puntuación personal**: escala de **0 a 10**, en pasos de **0.5**.
- **Estados**: **4 estados fijos** (Pendiente / Jugando / Completado / Abandonado), no personalizables.
- **Fechas**: precisión de **día/mes/año**.
- **Plataformas**: **derivadas de RAWG**.

## 8. Datos externos vs. datos personales

| Dato | Origen | Persistencia |
| --- | --- | --- |
| Título | RAWG | Externa |
| Portada | RAWG | Externa |
| Fecha de lanzamiento | RAWG | Externa |
| Géneros | RAWG | Externa |
| Plataformas disponibles | RAWG | Externa |
| Estado de la entrada | Usuario | Supabase |
| Puntuación personal | Usuario | Supabase |
| Plataforma jugada | Usuario | Supabase |
| Platino conseguido | Usuario | Supabase |
| 100% conseguido | Usuario | Supabase |
| Horas jugadas | Usuario | Supabase |
| Fecha de inicio | Usuario | Supabase |
| Fecha de finalización | Usuario | Supabase |
| Reseña personal | Usuario | Supabase |
| Notas personales | Usuario | Supabase |

## 9. Funcionalidades principales

- **Dashboard**: resumen de la biblioteca (pendientes, en curso, completados, abandonados y estadísticas básicas).
- **Biblioteca personal**: listado y filtrado de las entradas del usuario.
- **Buscador**: búsqueda de videojuegos contra RAWG para incorporarlos.
- **Añadir videojuego**: creación de una entrada (juego + plataforma).
- **Editar información personal**: modificación de estado, puntuación, plataforma, platinos, 100%, horas, fechas, reseña y notas.
- **Estadísticas básicas**: métricas agregadas de la colección (detalle pendiente de definir).

## 10. Pantallas previstas

- **Dashboard**: visión general y estadísticas básicas.
- **Biblioteca personal**: colección de entradas con filtros por estado, plataforma, etc.
- **Buscador de videojuegos**: consulta contra RAWG.
- **Detalle de juego / entrada**: información general + información personal.
- **Alta / edición de entrada**: formulario de datos personales.

## 11. Identidad visual

### Definidos

| Token | Valor |
| --- | --- |
| Color principal | `#B8F7E4` |
| Fondo principal | `#26272C` |

### Estética

- Oscura.
- Minimalista.
- Moderna.
- Limpia.
- Orientada a una biblioteca personal de videojuegos.
- **Sin** estética "gaming RGB".

### Paleta auxiliar (PROPUESTOS)

Los siguientes colores son **propuestas** derivadas de la identidad visual. No son decisiones definitivas y deben ser aprobados antes de usarse.

| Token | Valor propuesto | Uso previsto |
| --- | --- | --- |
| Texto principal | `#F2F5F4` | Texto sobre fondo oscuro |
| Texto secundario | `#A3A8AE` | Metadatos, textos de apoyo |
| Superficie / tarjeta | `#2F3037` | Tarjetas, paneles, inputs |
| Borde | `#3C3E46` | Separadores y contornos |
| Éxito | `#6FE0B0` | Estado completado / confirmaciones |
| Aviso | `#E8C46A` | Estados intermedios / advertencias |
| Error | `#F08A8A` | Errores y validaciones |
| Foco | `#B8F7E4` | Anillo de foco y elementos activos |

> Los dos colores **definidos** no deben modificarse.

## 12. Seguridad y persistencia

- **Persistencia**: la información personal se almacena en Supabase / PostgreSQL.
- **Datos generales**: se obtienen de RAWG.
- **Cuentas de usuario**: registro, inicio y cierre de sesión con Supabase Auth; los datos de cada usuario se aíslan con RLS (SPEC-05). _Sustituye a "MVP monousuario" (v0.3)._
- La exposición de la API key de RAWG, el uso de claves y las políticas de acceso se definirán en la SPEC de arquitectura técnica.

## 13. Responsive

- El diseño debe adaptarse a escritorio, tablet y móvil.
- La biblioteca y los formularios deben ser usables en pantallas pequeñas.
- Los breakpoints y la estrategia concreta se definirán en la SPEC de arquitectura técnica.

## 14. Decisiones tomadas

- Nombre del proyecto: **MyPlayGallery**.
- El producto es una **biblioteca personal de videojuegos**, no un catálogo.
- ~~MVP **monousuario**.~~ Desde la v0.4: producto **multiusuario** con registro abierto (SPEC-05).
- Un mismo juego puede registrarse en **varias plataformas** de forma independiente.
- RAWG aporta datos generales; Supabase almacena datos personales.
- **Puntuación personal**: escala de **0 a 10**, en pasos de **0.5**.
- **Estados**: **4 estados fijos** (Pendiente / Jugando / Completado / Abandonado).
- **Fechas**: precisión de **día/mes/año**.
- **Plataformas**: **derivadas de RAWG**.
- Alcance y fuera de alcance del MVP (secciones 2 y 3).
- Colores **definidos**: principal `#B8F7E4` y fondo `#26272C`.
- Paleta auxiliar **propuesta** (sección 11), pendiente de aprobación.

## 15. Decisiones pendientes

**Producto**

- `PENDIENTE` — Idioma de la interfaz.
- `PENDIENTE` — Métricas concretas de las estadísticas básicas.
- `PENDIENTE` — Aprobación de la paleta auxiliar propuesta.

**Técnicas (diferidas a SPEC-01 y posteriores)**

- `PENDIENTE` — Arquitectura CSS / estrategia de estilos.
- `PENDIENTE` — Routing.
- `PENDIENTE` — Data fetching y gestión de estado.
- `PENDIENTE` — Caché de datos de RAWG.
- `PENDIENTE` — Exposición y manejo de la API key de RAWG.
- `PENDIENTE` — Testing.
- `PENDIENTE` — Estructura técnica definitiva del proyecto.

> Estas decisiones se resolverán en **SPEC-01 (arquitectura técnica)** y SPEC posteriores. No se implementan en esta fase.

## 16. Evolución futura

- **SPEC-01**: arquitectura técnica (resolverá las decisiones técnicas pendientes).
- **SPEC posteriores**: modelo de datos y persistencia, integración con RAWG, y funcionalidades fuera del MVP (sección 3).
- La evolución a multiusuario está resuelta en **SPEC-05**. Perfiles públicos o funciones sociales requerirían una SPEC nueva.

## 17. Criterios de aprobación

SPEC-00 se considera aprobada cuando el responsable de producto:

1. Confirma la visión, el alcance y el fuera de alcance.
2. Confirma el stack tecnológico previsto.
3. Confirma el concepto de biblioteca y el modelo conceptual.
4. Aprueba o ajusta la identidad visual y la paleta auxiliar propuesta.
5. Revisa la lista de decisiones pendientes y acepta que se resuelvan en SPEC posteriores.

Hasta su aprobación, **no se avanza a SPEC-01 ni se implementan funcionalidades**.
