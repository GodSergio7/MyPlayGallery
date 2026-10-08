# SPEC-06 — Animaciones con React Bits

| Campo | Valor |
| --- | --- |
| ID | SPEC-06 |
| Título | Animaciones de interfaz con React Bits |
| Versión | 0.2 |
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

**Estado**: `IMPLEMENTADO`.

## 4. Dependencias nuevas

| Paquete | Usado por | Motivo |
| --- | --- | --- |
| `motion` (^12) | `CountUp`, `BlurText`, `TiltedCard` | Animaciones con muelles y valores animados en React |
| `gsap` (^3) | `AnimatedContent` | Animación de entrada al hacer scroll (`ScrollTrigger`) |
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

SPEC-06 queda **Aprobada** (v0.2) por decisión explícita del responsable de producto, que eligió los efectos, pidió el fondo `CrystalizedBall` y autorizó las dependencias necesarias.
