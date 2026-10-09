# SPEC-06 — Animaciones con React Bits

| Campo | Valor |
| --- | --- |
| ID | SPEC-06 |
| Título | Animaciones de interfaz con React Bits |
| Versión | 0.7 |
| Estado | Aprobada |
| Fecha | 2026-10-08 |
| Autor | Responsable de producto |
| Redactado por | Agente de desarrollo |
| Depende de | SPEC-01 y SPEC-03 (aprobadas) |

## Historial de cambios

| Versión | Fecha | Descripción |
| --- | --- | --- |
| 0.1 | 2026-10-08 | Creación inicial. Se incorporan cuatro componentes de React Bits y las dependencias `motion` y `gsap`. Refleja lo ya implementado. |
| 0.2 | 2026-10-08 | Se añade el fondo animado `CrystalizedBall` (WebGL) y la dependencia `ogl`. |
| 0.3 | 2026-10-08 | La navegación principal pasa a ser `CardNav`: sustituye a la cabecera y a la barra inferior del móvil. |
| 0.4 | 2026-10-09 | Se retiran `BlurText`, `CountUp`, `TiltedCard` y `AnimatedContent` (y la dependencia `motion`) para una interfaz más sobria. Se mantienen `CardNav` y `CrystalizedBall`. Las secciones de abajo describen el estado anterior de esos cuatro componentes. |
| 0.5 | 2026-10-09 | Se añade `SpotlightCard` para las tarjetas del Inicio, que pasan a ser enlaces a la Biblioteca ya filtrada (juegos, horas, nota, platinos, 100 % y cada estado). Luz blanca muy tenue que sigue al cursor, sin destello al pulsar; tema oscuro con los colores de la app; sin dependencias nuevas. |
| 0.6 | 2026-10-09 | En la pantalla de acceso, `Topography` (mapa de curvas de nivel en WebGL, con `ogl`) sustituye a `CrystalizedBall` detrás del formulario: violetas de la marca, sin brillo ni grano, opacidad 0,7, reacciona al ratón y queda quieto con movimiento reducido. `CrystalizedBall` sigue solo como fondo dentro de la app (`AppBackground`, ya sin la variante `panel`). |
| 0.7 | 2026-10-09 | El fondo de la app (`AppBackground`) pasa a ser `LineWaves`: ondas de líneas en los violetas de la marca, brillo 0,11, velocidad 0,2. El ratón se escucha en la ventana (el fondo no recibe eventos), se ajusta con `ResizeObserver` y queda quieto con movimiento reducido. Se elimina `CrystalizedBall`. |

---

## 1. Resumen

El responsable de producto decide usar **React Bits** (https://reactbits.dev) para añadir animaciones a la interfaz. React Bits no es un paquete de npm: es una colección de componentes que se **copian dentro del proyecto** y se pueden modificar. Se usa la variante **TypeScript + CSS**, coherente con CSS Modules (SPEC-01).

Las animaciones deben respetar la identidad visual de SPEC-03 v0.4: **sin brillos ni efectos neón**.

**Estado**: `DEFINIDO`.

## 2. Componentes incorporados

Ubicación: `src/shared/components/reactbits/`. Cada archivo indica su origen y licencia en la cabecera.

| Componente | Dónde se usa | Efecto |
| --- | --- | --- |
| `CountUp` | Tarjetas de estadísticas del Dashboard (`StatCard`) | Las cifras cuentan desde 0 al aparecer |
| `BlurText` | Títulos de página (`PageHeader`) y encabezado del formulario de acceso | El texto aparece palabra a palabra, pasando de desenfocado a nítido |
| `TiltedCard` | Portadas de `GameCard` y `LibraryCard` | La portada se inclina en 3D siguiendo el ratón |
| `AnimatedContent` | Elementos de `GameGrid` (Biblioteca y Búsqueda) | Las tarjetas entran con un deslizamiento suave y escalonado al aparecer en pantalla |
| `CrystalizedBall` | Fondo de la app y de la pantalla de acceso, a través de `AppBackground` | Bola de cristal en WebGL con borde eléctrico y partículas que reaccionan al ratón |
| `CardNav` | Navegación principal (`AppShell`) | Barra flotante que se despliega en tres tarjetas: Biblioteca, Juegos y Cuenta |
| `SpotlightCard` | Tarjetas de cifras del Inicio (`StatCard` con `to`) | Luz tenue que sigue al cursor dentro de la tarjeta para indicar que se puede pulsar |
| `Topography` | Fondo del formulario en la pantalla de acceso | Curvas de nivel que se deforman despacio y reaccionan al ratón |
| `LineWaves` | Fondo de la app (`AppBackground`) | Ondas de líneas diagonales que se mueven despacio y se deforman cerca del ratón |

**Estado**: `IMPLEMENTADO`.

## 3. Adaptaciones respecto al original

- **Movimiento reducido**: todos los componentes respetan `prefers-reduced-motion`. Si está activo, el contenido se muestra en su estado final sin animar.
- **`CountUp`**: formato numérico `es-ES` y nueva prop `format` para mostrar el valor con su unidad durante la animación (horas, nota media).
- **`BlurText`**: la raíz pasa de `<p>` a `<span>` para poder usarse dentro de `<h1>`/`<h2>`. El texto completo se ofrece a lectores de pantalla y los fragmentos animados se ocultan a ellos.
- **`TiltedCard`**: sin aviso móvil (en inglés) ni tooltip por defecto, imagen con carga diferida, radio de borde y colores tomados de los tokens, y `margin: 0` en la `figure`. Solo se aplica cuando hay portada; sin portada se muestra el marcador con iniciales.
- **`AnimatedContent`**: sin cambios funcionales salvo el soporte de movimiento reducido.
- **`CrystalizedBall`**: sin cambios en el componente (ya respeta el movimiento reducido, se pausa fuera de pantalla y libera WebGL al desmontarse). Se configura solo desde `AppBackground` (`src/shared/components/AppBackground.tsx`):
  - Color de marca `#B13DFF` (centro del degradado) y brillo, neblina y chispas reducidos para acercarse a la regla "sin neón" de SPEC-03.
  - Variante `page` (dentro de la app): fija a pantalla completa, detrás de todo (`z-index: -1`, sin crear capas que tapen los modales), opacidad 0,55 y 9.000 partículas.
  - Variante `panel` (pantalla de acceso): en escritorio, detrás de la tarjeta del formulario; en móvil, enmarca el logo en la parte superior. 12.000 partículas.
  - Decorativo: `aria-hidden` y sin eventos de puntero propios (escucha el ratón a nivel de ventana).
  - Necesita WebGL 2. Si el navegador no lo tiene, no se dibuja nada y queda el fondo liso.
- **`CardNav`**: sustituye a la cabecera y a la barra inferior del móvil. Cambios respecto al original:
  - Enlaces del router (`NavLink`) en lugar de `<a href>`, con la página actual subrayada; admite acciones (Cerrar sesión).
  - Hamburguesa como `<button>` con `aria-expanded`; se cierra con Escape (devolviendo el foco), al hacer clic fuera y al elegir un enlace.
  - Logo como `ReactNode`, botón de acción "Buscar juegos" (enlace del router) y velo oscuro detrás del menú abierto.
  - Colores de los tokens: barra de cristal y tarjetas en los tonos oscuros del degradado de marca. Icono propio en lugar de `react-icons`.
  - Corrección de la altura en móvil (medía con las tarjetas desplazadas por la animación y dejaba un hueco).
  - Respeta el movimiento reducido. Contenido: Mi colección (Inicio, Biblioteca), Descubrir (Buscar juegos) y Cuenta (email y Cerrar sesión).

**Estado**: `IMPLEMENTADO`.

## 4. Dependencias nuevas

| Paquete | Usado por | Motivo |
| --- | --- | --- |
| `motion` (^12) | `CountUp`, `BlurText`, `TiltedCard` | Animaciones con muelles y valores animados en React |
| `gsap` (^3) | `AnimatedContent`, `CardNav` | Animación de entrada al hacer scroll (`ScrollTrigger`) y despliegue del menú |
| `ogl` (^1) | `CrystalizedBall` | Motor WebGL ligero para el fondo animado |

**Estado**: `DEFINIDO`. Cualquier componente nuevo de React Bits que requiera otra dependencia (p. ej. `three`, `ogl`) necesita una revisión de esta SPEC.

## 5. Tests

jsdom no implementa `matchMedia` ni `IntersectionObserver`, que usan estas librerías. `src/test/setup.ts` los simula solo en los tests (registrado en `vite.config.ts` como `setupFiles`).

**Estado**: `IMPLEMENTADO`.

## 6. Reglas para añadir más componentes de React Bits

1. Elegir la variante **TS-CSS**.
2. Revisar el código antes de incorporarlo.
3. Copiarlo a `src/shared/components/reactbits/` con la cabecera de origen y licencia.
4. Adaptarlo: textos en español, tokens de color y radio, movimiento reducido y HTML válido.
5. No usar componentes basados en brillos, neón o luces difusas (SPEC-03 v0.4). **Excepción aprobada**: el fondo `CrystalizedBall`, pedido expresamente por el responsable de producto, con su brillo reducido.

**Estado**: `DEFINIDO`.

## Estado de aprobación

SPEC-06 queda **Aprobada** (v0.3) por decisión explícita del responsable de producto, que eligió los efectos, pidió el fondo `CrystalizedBall` y autorizó las dependencias necesarias.
