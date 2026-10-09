# SPEC-03 — UI/UX y diseño visual

| Campo | Valor |
| --- | --- |
| ID | SPEC-03 |
| Título | UI/UX y diseño visual |
| Versión | 0.8 |
| Estado | Aprobada |
| Fecha | 2026-09-16 |
| Autor | Responsable de producto |
| Redactado por | Agente de desarrollo |
| Depende de | SPEC-00, SPEC-01 y SPEC-02 (aprobadas) |

## Historial de cambios

| Versión | Fecha | Descripción |
| --- | --- | --- |
| 0.1 | 2026-09-16 | Creación inicial. UI/UX y diseño visual del MVP. |
| 0.2 | 2026-09-16 | Resueltas las 6 decisiones pendientes de la v0.1: paleta auxiliar, patrón de navegación, métricas del Dashboard, búsqueda/filtros/ordenación de Biblioteca, rejilla única y footer. SPEC-03 aprobada. |
| 0.3 | 2026-10-08 | Enmienda por SPEC-05: se añaden la pantalla de acceso (inicio de sesión y registro), la pantalla "Revisa tu email" y el botón de cerrar sesión en la cabecera. |
| 0.4 | 2026-10-08 | Nueva identidad visual "gaming" aprobada por el responsable de producto: fondo azul marino profundo, degradado de marca rosa → violeta → azul, superficies de cristal, tipografía Poppins y radios mayores. Sustituye a los colores definidos en la v0.2. La pantalla de acceso pasa a tener panel de presentación y pestañas. |
| 0.5 | 2026-10-08 | La navegación pasa a ser un menú desplegable de tarjetas (Card Nav de React Bits, ver SPEC-06) en móvil y escritorio. Se retiran la cabecera con enlaces y la barra inferior del móvil. |
| 0.6 | 2026-10-08 | Nuevo logo: fotos apiladas con un mando delante, en capas rellenas con el degradado de marca y sombra oscura (sin brillo) (componente `LogoMark`, SVG). Se usa en la pantalla de acceso y el favicon; la barra de navegación muestra solo el texto MyPlayGallery. |
| 0.7 | 2026-10-09 | Interfaz más sobria y natural: un solo violeta sólido como acento (sin degradados en botones, pestañas ni números), sin efecto cristal ni texto degradado en las tarjetas, radios más pequeños, estados vacíos sin icono ni caja, y textos más cortos y directos ("Inicio" en lugar de "Dashboard", sin frases descriptivas bajo los títulos, "entrada" en lugar de "experiencia"). La pantalla de acceso pierde el eslogan, la lista de ventajas y la notificación de ejemplo. |
| 0.8 | 2026-10-09 | Diseño en móvil (por debajo de 768 px), con el mismo estilo que en escritorio. Rejillas de portadas en 2 columnas. Inicio: "Juegos" a todo el ancho y las otras cifras en 2 × 2; "Últimos cambios" (con miniatura de la portada) antes de "Por estado". Biblioteca y Explorar: buscador arriba y filtros plegables tras un botón "Filtros (n)" en 2 × 2. Fichas de la biblioteca y de añadir: portada pequeña junto al título y botones a todo el ancho. Ficha de Explorar: la captura hace de banner con la portada encima, y la duración va justo después de la descripción. Botones de al menos 44 px de alto y campos de 16 px (Safari en iPhone no hace zoom). Se corrige el desbordamiento horizontal del Inicio. |

## Leyenda de estados de decisión

- **DEFINIDO**: ya establecido por SPEC-00/01/02. No requiere aprobación.
- **PROPUESTO**: recomendación del agente. Requiere aprobación del responsable de producto.
- **PENDING**: decisión abierta que debe aprobar el responsable de producto.

> Esta SPEC es **solo documentación**. **No** contiene código, **no** crea componentes, **no** instala dependencias y **no** conecta Supabase ni RAWG.

---

## 1. Principios de diseño

**Problema**: fijar los criterios que guían cada decisión visual y de interacción.

Principios propuestos:

1. **Jerarquía visual clara**: portada y título del juego por encima de los metadatos; la información personal es secundaria pero fácil de escanear.
2. **Simplicidad**: pocos elementos por pantalla; una acción principal evidente por vista.
3. **Consistencia**: mismos patrones, tokens y componentes en toda la aplicación.
4. **Legibilidad**: buen contraste y tamaños de texto cómodos sobre fondo oscuro.
5. **Feedback visual**: el usuario siempre sabe si algo está cargando, ha fallado o ha tenido éxito.
6. **Contenido primero**: la portada del juego es el principal atractivo visual; el resto se mantiene discreto.
7. **Responsive por defecto**: diseño mobile-first, usable con una mano en móvil.
8. **Accesibilidad básica**: contraste, teclado, foco visible y estados no dependientes solo del color.
9. **Sin decoración innecesaria**: nada de RGB, animaciones llamativas ni adornos que no aporten información.

**Estado**: `PROPUESTO`.

## 2. Arquitectura visual general

**Problema**: definir la estructura de pantalla común a toda la aplicación.

**Decidido**: un **shell** simple y repetible:

```
┌──────────────────────────────────────────────┐
│  Header (logo MyPlayGallery + navegación)     │
├──────────────────────────────────────────────┤
│  Contenido principal (máx. ancho, responsive) │
│                                                │
├──────────────────────────────────────────────┤
│  Footer mínimo (atribución RAWG)               │
└──────────────────────────────────────────────┘
```

- **Header**: contiene el logotipo/nombre y la navegación principal. Sticky en escritorio.
- **Contenido principal**: contenedor centrado con ancho máximo; una columna en móvil, rejillas en pantallas grandes.
- **Footer**: mínimo y discreto (nombre + atribución a RAWG). No compite con el contenido principal.
- **Desktop**: navegación en el header.
- **Móvil**: header compacto (logo + acción de búsqueda) y navegación principal en una **barra inferior** (3 destinos, alcance con el pulgar).

**Justificación**: con solo 3 destinos principales, una sidebar no aporta valor; el header + barra inferior móvil es más simple y directo.

**Alternativas descartadas**:

- Sidebar de escritorio: útil con muchos destinos o jerarquías profundas; innecesaria aquí.
- Menú hamburguesa en móvil: oculta la navegación y añade un paso; descartado para 3 destinos.

**Estado**: `DEFINIDO`.

## 3. Navegación

**Problema**: definir cómo se recorre la aplicación y qué representa cada ruta.

Rutas (DEFINIDAS en SPEC-01) y su elemento de navegación:

| Ruta | Pantalla | Navegación principal |
| --- | --- | --- |
| `/` | Dashboard | Sí — "Inicio" |
| `/library` | Biblioteca personal | Sí — "Biblioteca" |
| `/search` | Búsqueda RAWG | Sí — "Buscar" |
| `/game/:rawgId` | Detalle de juego / alta | No (se llega desde Buscar o Biblioteca) |
| `/library/:entryId` | Detalle/edición de entrada | No (se llega desde la Biblioteca) |

**Comportamiento**:

- **Ruta activa**: el elemento correspondiente se resalta con el color principal (`#B8F7E4`) y un indicador (subrayado/punto/grosor), no solo por color. Se marca con `aria-current="page"`.
- **Acción principal global**: "Buscar" destacado como CTA, ya que es el punto de entrada para añadir juegos.
- **Acciones secundarias**: filtros y ordenación viven dentro de Biblioteca; editar/eliminar dentro del detalle de la entrada.
- **Responsive**:
  - Móvil (`< 480` y hasta `768`): barra inferior con Inicio / Biblioteca / Buscar; header con logo y acceso directo a búsqueda.
  - Tablet y escritorio (`≥ 768`): navegación en el header superior.

**Estado**: `DEFINIDO` (header superior en tablet/escritorio; barra inferior fija en móvil con Inicio, Biblioteca y Buscar; sin sidebar ni menú hamburguesa).

> **Enmienda v0.5 (2026-10-08)**: la navegación descrita arriba (header con enlaces en escritorio y barra inferior en móvil) se sustituye por una **barra flotante única** para todos los tamaños: botón de menú a la izquierda, logo en el centro y "Buscar juegos" a la derecha (solo escritorio). Al abrir el menú aparecen tres tarjetas: **Mi colección** (Inicio, Biblioteca), **Descubrir** (Buscar juegos) y **Cuenta** (email y Cerrar sesión). La página actual se marca subrayada. Detalle técnico en SPEC-06.

### 3.1 Acceso y sesión (enmienda v0.3, SPEC-05)

- **Sin sesión**, cualquier ruta muestra la **pantalla de acceso** en lugar del shell: una tarjeta centrada con el logo, sin header, footer ni navegación.
- La pantalla de acceso tiene dos modos en el mismo formulario, que se alternan con un enlace al pie:
  - **Iniciar sesión**: email y contraseña. Enlace "¿No tienes cuenta? Regístrate".
  - **Crear cuenta**: email, contraseña (pista "Mínimo 6 caracteres") y repetición de la contraseña. Enlace "¿Ya tienes cuenta? Inicia sesión".
- El botón principal se desactiva mientras faltan campos o se está enviando, y cambia su texto ("Entrando…", "Creando cuenta…").
- Los errores se muestran bajo los campos con el color de error y `role="alert"`.
- Tras registrarse con confirmación de email activada se muestra **"Revisa tu email"**, con el email usado y un botón "Ir a iniciar sesión".
- **Con sesión**, "Cerrar sesión" está en la tarjeta **Cuenta** del menú (desde v0.5; antes era un botón de icono en la cabecera).
- Mientras se comprueba la sesión al cargar se muestra un estado de carga ("Comprobando tu sesión…").

**Estado**: `IMPLEMENTADO`.

## 4. Dashboard (`/`)

**Problema**: ofrecer una visión general útil sin inventar métricas no soportadas por SPEC-02.

**Estructura** (aprobada):

1. **Cabecera**: saludo breve + nombre de la biblioteca.
2. **Resumen de métricas** (no es obligatorio que cada métrica sea una tarjeta independiente; se organizan para evitar saturación), derivadas de `library_entries`:
   - Total de entradas.
   - Por estado: Pendiente / Jugando / Completado / Abandonado.
   - Horas totales jugadas (suma de `hours_played`).
   - Puntuación media (solo sobre entradas con `score`).
   - Platinos conseguidos (recuento de `platinum`).
   - Juegos al 100% (recuento de `hundred_percent`).
3. **Distribución por estado**: bloque visual independiente (barra segmentada o barras horizontales con recuento). Evitar gráficos complejos en el MVP.
4. **Actividad reciente**: lista corta de las entradas modificadas más recientemente (`updated_at`), enlazando a `/library/:entryId`.
5. **Accesos rápidos**: botones a "Buscar y añadir" (`/search`) y "Ver biblioteca" (`/library`).
6. **Estado vacío**: si no hay entradas, mensaje claro + CTA a `/search`.

> Todas las métricas se calculan a partir de datos de SPEC-02. No se muestran estadísticas que requieran datos no contemplados.

**Estado**: `DEFINIDO` (métricas aprobadas; organización visual libre para mantener el Dashboard limpio, con la distribución por estado como bloque independiente).

## 5. Biblioteca personal (`/library`)

**Problema**: mostrar y filtrar las experiencias personales.

**Estructura**:

- **Barra de herramientas superior**:
  - **Búsqueda local** por título (filtra lo ya mostrado; depende de los metadatos que se hayan resuelto desde RAWG/caché).
  - **Filtro por estado** (los 4 estados).
  - **Filtro por plataforma**.
  - **Ordenación**: actividad reciente (`updated_at`), puntuación, horas jugadas, fecha de inicio, título.
  - **Limpiar filtros**: acción clara y siempre accesible para restablecer búsqueda, filtros y ordenación.
- **Contenido**: **rejilla responsive como única vista del MVP** (sin selector rejilla/lista), con `LibraryCard`. Prioridad visual de la tarjeta:
  1. Portada (RAWG).
  2. Título (RAWG).
  3. Plataforma (`PlatformBadge`).
  4. Estado (`StatusBadge`).
  5. Puntuación y horas jugadas (cuando existan).
  - Columnas: 1 en móvil pequeño, 2 en móvil grande/tablet, 3–4 en escritorio según espacio disponible.
- **Interacción**: pulsar una tarjeta abre `/library/:entryId`.

**Estados**:

- **Loading**: rejilla de *skeletons* con la forma de las tarjetas.
- **Vacío** (sin entradas): `EmptyState` + CTA a `/search`.
- **Sin resultados** (con filtros/búsqueda activos): mensaje "Sin coincidencias" + botón para limpiar filtros.
- **Error**: `ErrorState` con botón "Reintentar".

> Los metadatos generales (portada/título) proceden de RAWG y **no** se almacenan en Supabase (SPEC-02); su carga es responsabilidad de la consulta a RAWG/caché.

**Estado**: `DEFINIDO` (búsqueda local, filtros por estado/plataforma, ordenación, acción de limpiar filtros y rejilla única responsive con la prioridad visual indicada).

## 6. Búsqueda RAWG (`/search`)

**Problema**: buscar juegos y llevarlos al alta.

**Propuesta de estructura**:

- **`SearchBar`**: campo prominente con debounce; foco automático al entrar.
- **Resultados**: rejilla de tarjetas de juego externo con:
  - Portada.
  - Título.
  - Fecha de lanzamiento (si disponible).
  - Plataformas disponibles (si disponibles).
- **Acción**: cada tarjeta abre `/game/:rawgId`.
- **Estados**:
  - **Inicial**: mensaje que invita a buscar (sin resultados cargados).
  - **Loading**: skeletons de tarjetas.
  - **Sin resultados**: `EmptyState` con sugerencia de cambiar términos.
  - **Error**: `ErrorState` con "Reintentar".

> No se define aquí la integración técnica con RAWG (corresponde a otra SPEC).

**Estado**: `PROPUESTO`.

## 7. Detalle de juego / alta de `LibraryEntry` (`/game/:rawgId`)

**Problema**: separar con claridad la información del juego y la experiencia personal, y permitir varias experiencias por plataforma.

**Propuesta**: pantalla en dos bloques visualmente diferenciados.

**Bloque A — Información del juego (RAWG, solo lectura)**

- Portada.
- Título.
- Fecha de lanzamiento.
- Géneros.
- Plataformas disponibles.
- Otros datos disponibles de RAWG.

Se marca como contenido **externo** (etiqueta o estilo secundario) y no editable.

**Bloque B — Tu experiencia (datos personales)**

- **Experiencias registradas**: lista de `LibraryEntry` existentes para este `rawgId` (una por plataforma), con su estado/puntuación y enlace a `/library/:entryId`.
- **Formulario de nueva entrada**:
  - Plataforma jugada (selección entre las plataformas disponibles de RAWG).
  - Estado (los 4 fijos).
  - Puntuación (0–10, pasos de 0.5).
  - Platino (sí/no).
  - 100% (sí/no).
  - Horas jugadas.
  - Fecha de inicio.
  - Fecha de finalización.
  - Reseña personal.
  - Notas personales.
- **Regla de unicidad**: si ya existe una entrada para la plataforma seleccionada, se avisa y se ofrece **editar la existente** en lugar de crear un duplicado.
- **CTA principal**: "Añadir a mi biblioteca".

Se muestra explícitamente que **un mismo juego puede tener varias experiencias**, una por plataforma.

**Estado**: `PROPUESTO`.

## 8. Detalle y edición de `LibraryEntry` (`/library/:entryId`)

**Problema**: consultar, editar y eliminar una experiencia concreta.

**Propuesta de estructura**:

- **Cabecera**: portada + título (RAWG) + `PlatformBadge` + `StatusBadge`.
- **Resumen personal**: puntuación, platino, 100%, horas, fecha de inicio y fecha de finalización.
- **Reseña** y **notas**.
- **Otras experiencias de este juego**: enlaces a las demás plataformas.
- **Acciones**:
  - **Editar**: abre el formulario de edición (mismos campos que el alta).
  - **Eliminar**: acción destructiva → **diálogo de confirmación** que indica el juego y la plataforma afectados.
  - **Volver a la biblioteca**.
- **Estados**: loading (skeleton), error (`ErrorState` + reintentar), y confirmación de guardado/eliminación.

**Estado**: `PROPUESTO`.

## 9. Componentes visuales reutilizables

**Problema**: fijar los bloques reutilizables y su responsabilidad (sin detallar implementación).

| Componente | Responsabilidad |
| --- | --- |
| `AppShell` | Header, navegación, contenedor y footer. |
| `GameCard` | Tarjeta de juego de RAWG (portada, título, fecha, plataformas). |
| `LibraryCard` | Tarjeta de `LibraryEntry` (portada, título, plataforma, estado, puntuación, horas). |
| `GameGrid` | Rejilla responsive de tarjetas. |
| `StatusBadge` | Los 4 estados, con color + texto (no solo color). |
| `Score` | Puntuación 0–10 (texto/visual). |
| `PlatformBadge` | Nombre de plataforma. |
| `StatCard` | Métrica del dashboard. |
| `SearchBar` | Campo de búsqueda. |
| `EmptyState` | Estado vacío con mensaje y CTA. |
| `LoadingState` / `Skeleton` | Carga. |
| `ErrorState` | Error con reintento. |
| `Modal` / `Dialog` | Confirmaciones y contenido modal. |
| `Button` | Acciones (primario, secundario, peligro). |
| `Input` | Texto, fecha y número. |
| `Select` | Estado, plataforma y ordenación. |
| `Checkbox` | Platino y 100%. |
| `Textarea` | Reseña y notas. |
| `Toast` | Feedback de éxito/error no bloqueante. |

**Estado**: `PROPUESTO`.

## 10. Sistema visual

**Problema**: definir los tokens visuales para mantener consistencia (SPEC-01 usa CSS Modules + variables CSS).

### Colores

> **Enmienda v0.4 (2026-10-08)**: el responsable de producto aprueba una nueva identidad visual moderna y "gaming". Los valores de esta sección sustituyen a los de la v0.2, que se conservan más abajo como histórico. La fuente de verdad es `src/shared/styles/tokens.css`.

**DEFINIDOS (v0.4)**:

| Token | Valor | Uso |
| --- | --- | --- |
| Primario (rosa neón) | `#FF3D8B` | Acento, elementos activos, puntos de estado "Jugando" |
| Secundario (violeta) | `#9B4DFF` | Parte central del degradado, casillas, foco |
| Acento (azul eléctrico) | `#4361FF` | Final del degradado |
| Degradado de marca | `#FF3D8B → #B13DFF → #4361FF` (135°) | Botones principales, navegación activa, logo, iconos destacados, valores numéricos |
| Fondo | `#0A0A1F` liso | Fondo de la aplicación |
| Superficie | Cristal: degradado translúcido violeta oscuro + `backdrop-filter: blur` | Tarjetas, paneles, modales |
| Texto principal | `#F6F4FF` | Texto sobre fondo oscuro |
| Texto secundario | `#A9A6CC` | Metadatos y apoyo |
| Borde | `rgba(255, 255, 255, 0.09)` | Separadores y contornos |
| Éxito | `#3EE6A8` | Completado / confirmaciones |
| Aviso | `#FFC857` | Pendiente / advertencias |
| Error | `#FF5C7A` | Abandonado / errores |
| Foco | `#C58BFF` | Anillo de foco |

**Estilo (v0.4)**: tipografía **Poppins** (Google Fonts), botones en píldora con degradado, tarjetas que se elevan y resaltan el borde al pasar el ratón, **sin efectos de brillo ni neón** (sin sombras de color, halos ni luces difusas), radios de 10 / 16 / 24 / 32 px y títulos de página con barra de acento en degradado.

**Histórico v0.2** (sustituido):

**DEFINIDOS** (no se modifican):

| Token | Valor | Uso |
| --- | --- | --- |
| Color principal | `#B8F7E4` | Acento, foco, elementos activos |
| Fondo principal | `#26272C` | Fondo de la aplicación |

**Auxiliares DEFINIDOS** (aprobados):

| Token | Valor | Uso |
| --- | --- | --- |
| Texto principal | `#F2F5F4` | Texto sobre fondo oscuro |
| Texto secundario | `#A3A8AE` | Metadatos y apoyo |
| Superficie | `#2F3037` | Tarjetas, paneles, inputs |
| Borde | `#3C3E46` | Separadores y contornos |
| Éxito | `#6FE0B0` | Completado / confirmaciones |
| Aviso | `#E8C46A` | Estados intermedios / advertencias |
| Error | `#F08A8A` | Errores y validaciones |
| Foco | `#B8F7E4` | Anillo de foco |

### Otros tokens (PROPUESTOS)

| Familia | Propuesta |
| --- | --- |
| Superficies | Fondo base + superficie de tarjeta; elevación mediante un tono apenas más claro o borde, sin sombras fuertes. |
| Bordes | 1px, color de borde; radio pequeño-medio y consistente. |
| Sombras | Muy sutiles, solo para elementos elevados (modales); evitadas en fondo oscuro. |
| Espaciado | Escala en múltiplos de 4/8 (p. ej. 4, 8, 12, 16, 24, 32, 48). |
| Tipografía | Sans-serif del sistema; títulos con mayor peso, cuerpo regular. |
| Tamaños | Escala reducida (p. ej. 12/14/16/20/24/32) con jerarquía clara de títulos. |
| Iconografía | Iconos de línea, monocromos, tamaño consistente; sin emojis ni adornos. |

### Estados interactivos

- **Hover**: ligero cambio de superficie/borde (sin cambios bruscos).
- **Focus**: anillo visible con el color de foco; navegable por teclado.
- **Active**: cambio sutil de superficie.
- **Disabled**: menor contraste, sin cursor de acción.
- **Success / Warning / Error**: colores semánticos + icono/texto (nunca solo color).

**Estado**: `DEFINIDO` (paleta completa, incluidos los auxiliares) / `PROPUESTO` (resto de tokens: espaciado, radios, tipografía, iconografía y estados interactivos).

## 11. Responsive

**Problema**: adaptar la interfaz a distintos tamaños (breakpoints técnicos de SPEC-01: 480/768/1024/1280).

| Rango | Comportamiento propuesto |
| --- | --- |
| Móvil (`< 480`) | 1 columna; navegación inferior; formularios a ancho completo; acciones principales fijas o fáciles de alcanzar. |
| Móvil grande (`480–767`) | 2 columnas en rejillas; misma navegación inferior. |
| Tablet (`768–1023`) | Navegación en header; 2–3 columnas. |
| Escritorio (`≥ 1024`) | Navegación en header; 3–4 columnas; contenedor con ancho máximo. |
| Escritorio amplio (`≥ 1280`) | Igual que escritorio, con más aire; sin estirar el contenido en exceso. |

**Estado**: `PROPUESTO` (los breakpoints son técnicos y ajustables).

## 12. Accesibilidad

**Problema**: garantizar un uso básico accesible.

Requisitos mínimos:

- **Contraste** suficiente entre texto y fondo (objetivo AA en textos principales y secundarios).
- **Navegación por teclado** en toda la aplicación.
- **Focus visible** con el color de foco (nunca `outline: none` sin sustituto).
- **Labels** asociados en todos los campos de formulario.
- **Botones** con texto o nombre accesible; los de solo icono incluyen etiqueta accesible.
- **Textos alternativos** en imágenes (portadas); decorativas con alt vacío.
- **Estados no solo por color**: los badges incluyen texto y/o icono.
- **Ruta activa** marcada con `aria-current`.
- **Movimiento reducido**: respetar `prefers-reduced-motion`.

**Estado**: `PROPUESTO`.

## 13. Estados globales de UI

**Problema**: representar de forma consistente los estados de cualquier pantalla.

| Estado | Representación |
| --- | --- |
| **Loading** | Skeletons con la forma del contenido; spinners solo en acciones puntuales. |
| **Vacío** | `EmptyState` con mensaje y CTA contextual. |
| **Error** | `ErrorState` con mensaje claro y botón "Reintentar". |
| **Éxito** | `Toast` no bloqueante. |
| **Confirmación** | `Modal`/`Dialog` para acciones destructivas. |
| **Operación en curso** | Botón en estado *disabled* con indicador de progreso; evitar dobles envíos. |

Se mantiene el mismo lenguaje visual en todos los casos, alineado con SPEC-01 (error boundary, estados `loading`/`empty`/`error`/`success`).

**Estado**: `PROPUESTO`.

## 14. Datos mock para la primera implementación

**Problema**: permitir la primera versión visual **sin Supabase ni RAWG reales**.

**Reglas**:

- Los mocks viven aislados (p. ej. capa de datos mock) y **no** dependen de Supabase ni de RAWG.
- Deben poder sustituirse por datos reales sin cambiar los componentes.
- Los datos mock siguen el modelo de SPEC-02 y la forma de los datos de RAWG.

**Contenido mínimo a representar**:

1. **Juegos RAWG** (mock): `rawgId`, título, portada, fecha de lanzamiento, géneros y plataformas disponibles.
2. **Plataformas** (mock): `platformId` + `platformName` (coherentes con RAWG).
3. **Entradas de biblioteca** (mock): `rawgId` + `platformId`, estado, puntuación, platino, 100%, horas, fechas, reseña, notas.
4. **Estados**: al menos una entrada por cada uno de los 4 estados.
5. **Varias experiencias para un mismo juego**: un juego registrado en dos plataformas distintas (p. ej. el mismo `rawgId` en PS4 y PC), para validar la regla de SPEC-02.
6. **Estadísticas**: datos suficientes para que el Dashboard muestre totales, distribución por estado, horas totales, puntuación media, platinos y 100%.
7. **Casos de estado**: datos que permitan ver la biblioteca llena, la biblioteca vacía y la búsqueda sin resultados.

No se escribe código de mocks en esta SPEC; solo se especifica qué deben representar.

**Estado**: `PROPUESTO`.

## 15. Decisiones

### DEFINIDO

**Heredado de SPEC-00/01/02**

- Colores `#B8F7E4` (principal) y `#26272C` (fondo); estética oscura, minimalista, moderna, limpia, sin RGB gamer.
- Rutas `/`, `/library`, `/search`, `/game/:rawgId`, `/library/:entryId` (desde SPEC-04 v0.4, `/game/:gameId`).
- Pantalla de acceso con inicio de sesión y registro, y botón de cerrar sesión (sección 3.1, SPEC-05).
- 4 estados fijos, puntuación 0–10 (pasos de 0.5), fechas día/mes/año, plataformas de RAWG.
- Una `LibraryEntry` por (usuario, juego, plataforma); varias experiencias por juego.
- Los metadatos de RAWG no se almacenan en Supabase.
- Estados de UI `loading`/`empty`/`error`/`success` (SPEC-01).
- CSS Modules + variables CSS; breakpoints técnicos 480/768/1024/1280.

**Aprobado en SPEC-03 (v0.2)**

- **Paleta auxiliar**: texto principal `#F2F5F4`, texto secundario `#A3A8AE`, superficie `#2F3037`, borde `#3C3E46`, éxito `#6FE0B0`, aviso `#E8C46A`, error `#F08A8A`, foco `#B8F7E4`.
- **Patrón de navegación**: header superior en tablet/escritorio; barra inferior fija en móvil (Inicio, Biblioteca, Buscar); header móvil compacto con logo y acceso directo a búsqueda. Sin sidebar ni menú hamburguesa.
- **Métricas del Dashboard**: total de entradas, distribución por los 4 estados, horas totales, puntuación media (sobre entradas con puntuación), platinos, juegos al 100%, actividad reciente y accesos rápidos. La organización visual es libre para evitar saturación; la distribución por estado es un bloque independiente.
- **Biblioteca**: búsqueda local por título, filtro por estado, filtro por plataforma y ordenación por actividad reciente, puntuación, horas jugadas, fecha de inicio y título; acción clara para limpiar filtros/búsqueda.
- **Vista de biblioteca**: rejilla como única vista del MVP (sin selector rejilla/lista), responsive (1 / 2 / 3–4 columnas) y con prioridad visual portada → título → plataforma → estado → puntuación/horas.
- **Footer**: mínimo y discreto, con la atribución correspondiente a RAWG.

### PROPUESTO (recomendación del agente)

- Principios de diseño (sección 1).
- Shell con header + contenedor + footer.
- Rejilla de tarjetas también como vista de la búsqueda.
- Conjunto de componentes reutilizables (sección 9).
- Tokens no cromáticos: espaciado, radios, tipografía, iconografía y estados interactivos (sección 10).
- Comportamiento responsive por rangos (sección 11).
- Requisitos de accesibilidad (sección 12).
- Catálogo de estados de UI (sección 13).
- Contenido de los datos mock (sección 14).

### PENDING

No queda ninguna decisión de producto pendiente en SPEC-03.

## Estado de aprobación

SPEC-03 queda **Aprobada** (v0.2). El responsable de producto ha confirmado:

1. Los principios de diseño y la arquitectura visual.
2. El patrón de navegación y el comportamiento responsive.
3. La estructura de Dashboard, Biblioteca, Búsqueda, Detalle de juego y Detalle/edición.
4. El sistema visual y la paleta auxiliar.
5. La accesibilidad, los estados de UI y el enfoque de datos mock.
6. Las 6 decisiones que estaban `PENDING` en la v0.1.

No quedan decisiones `PENDING`. SPEC-03 no autoriza implementación por sí misma; sirve de base para la primera versión visual (con datos mock).
