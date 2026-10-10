# SPEC-01 — Arquitectura técnica

| Campo | Valor |
| --- | --- |
| ID | SPEC-01 |
| Título | Arquitectura técnica |
| Versión | 0.5 |
| Estado | Aprobada |
| Fecha | 2026-09-16 |
| Autor | Responsable de producto |
| Redactado por | Agente de desarrollo |
| Depende de | SPEC-00 — Base del proyecto (aprobada) |

## Historial de cambios

| Versión | Fecha | Descripción |
| --- | --- | --- |
| 0.1 | 2026-09-16 | Creación inicial. Arquitectura técnica del MVP. |
| 0.2 | 2026-09-16 | Resueltas las decisiones pendientes: estructura, oxlint, CSS Modules, React Router, estado/datos, Supabase Auth + RLS, RAWG sin persistir + Edge Function, Zod, testing y alias `@/`. |
| 0.3 | 2026-09-16 | Aprobadas las decisiones de gestión de variables de entorno y de errores/carga. SPEC-01 aprobada. Unificada la nomenclatura a MyPlayGallery. |
| 0.4 | 2026-10-08 | Enmienda por SPEC-05: Supabase Auth pasa de cuenta única a registro abierto (multiusuario). Se añaden `AuthProvider` y `RequireAuth` en `src/app/auth`. |
| 0.5 | 2026-10-10 | **Carga bajo demanda (T-06).** Cada página se carga con `React.lazy` (ayudante `lazyNamed`) y un `Suspense` en `AppShell`; la pantalla de acceso solo se descarga sin sesión y el fondo `LineWaves` se carga aparte. Las librerías van en archivos propios (`react`, `supabase`, `datos` con TanStack Query y Zod, `gsap`, `ogl`) mediante `build.rolldownOptions.output.codeSplitting`. La descarga inicial con sesión pasa de 856 KB (256 KB comprimido) a unos 690 KB (210 KB), y las librerías quedan en caché entre versiones. |

## Leyenda de estados de decisión

- **DEFINIDO**: ya establecido por SPEC-00 o por el scaffold actual. No requiere aprobación.
- **PROPUESTO**: recomendación del agente. Requiere aprobación del responsable de producto.
- **PENDING**: decisión abierta que debe aprobar el responsable de producto.

> Esta SPEC es **solo documentación**. No implica implementación, creación de tablas SQL, ni integración de Supabase/RAWG.

---

## 1. Arquitectura general

**Problema**: definir la forma global de la aplicación y cómo se separan las responsabilidades antes de escribir código.

**Propuesta** (estructura aprobada): aplicación **SPA** construida con Vite y servida como estáticos, con Supabase como backend (BaaS). Organización por capas:

- **`app`**: arranque, shell de la aplicación, router y providers globales.
- **`features`**: código por área funcional (dashboard, biblioteca, buscador, juego). Cada feature agrupa componentes, hooks y lógica de su dominio.
- **`shared`**: elementos reutilizables sin lógica de negocio (componentes de UI, hooks genéricos, utilidades, tipos comunes, estilos y tokens).
- **`data`**: capa de acceso a datos, única que conoce RAWG y Supabase. Contiene clientes, mappers y repositorios.

Regla de dependencia: `app` → `features` → `shared`; `features` puede usar `data`; `data` no depende de la UI.

**Alternativas**:

- Organización estrictamente por tipo (`components/`, `hooks/`, `services/`): más simple al inicio, pero escala peor y mezcla dominios.
- Monolito sin capas: descartado por la regla de separar datos externos y personales (sección 17).

**Estado**: `DEFINIDO`.

## 2. Estructura de carpetas y responsabilidades

**Problema**: fijar una convención de carpetas predecible.

**Propuesta** (a crear en SPEC de implementación, no ahora):

```
src/
  app/            # main, App, router, providers, layout
  features/
    dashboard/    # estadísticas y resumen
    library/      # lista y detalle de entradas personales
    search/       # búsqueda contra RAWG
    game/         # alta/edición de LibraryEntry
  shared/
    components/   # UI reutilizable
    hooks/        # hooks genéricos
    lib/          # utilidades puras
    types/        # tipos comunes
    styles/       # tokens y estilos globales
  data/
    rawg/         # cliente, tipos Rawg*, mappers
    supabase/     # cliente y repositorios
```

**Alternativas**: estructura type-based (sección 1).

**Estado**: `DEFINIDO`.

## 3. React + TypeScript + Vite

**Problema**: confirmar el núcleo del frontend.

**DEFINIDO** por SPEC-00 y por el scaffold actual:

- React 19.
- TypeScript ~6 con `moduleResolution: bundler`, `verbatimModuleSyntax`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.
- Vite 8 con `@vitejs/plugin-react`.
- `index.html` como punto de entrada; `src/main.tsx` renderiza `<App />` en `StrictMode`.

**Estado**: `DEFINIDO`. No se modifican estas versiones sin una SPEC.

## 4. Oxlint

**Problema**: mantener el linter ya configurado sin introducir ESLint.

**DEFINIDO**: se conserva `.oxlintrc.json` con `plugins: ["react", "typescript", "oxc"]` y las reglas `react/rules-of-hooks` y `react/only-export-components`. El proyecto **no usa ESLint** (la mención a ESLint en el planteamiento inicial queda descartada).

**Opción futura (no en el MVP)**: activar lint type-aware instalando `oxlint-tsgolint` y `options.typeAware`. Queda descartado para el MVP y se valorará en una SPEC posterior si es necesario. Implica una dependencia nueva.

**Estado**: `DEFINIDO`. Se mantiene la configuración actual de oxlint; **no** se activa `oxlint-tsgolint` type-aware en el MVP.

## 5. Estrategia de CSS

**Problema**: escoger cómo se escriben y organizan los estilos sin romper la identidad visual.

**Propuesta (aprobada)**: **CSS Modules** por componente/feature, más un archivo de **tokens** en `:root` con custom properties. Se aprovecha el soporte de **anidamiento nativo** que ya usa `src/index.css` con el pipeline de Vite. Los colores base `#B8F7E4` (principal) y `#26272C` (fondo) se exponen como custom properties; la paleta auxiliar permanece `PROPUESTA` hasta su aprobación en SPEC-00.

**Alternativas**:

- CSS plano con variables: sencillo, pero mayor riesgo de colisiones de clases al crecer.
- Tailwind CSS: rápido, pero añade dependencia y enfoque utility-first que puede dificultar una estética limpia y consistente.
- CSS-in-JS: aporta co-locación, pero añade runtime/dependencia innecesaria para este alcance.

**Estado**: `DEFINIDO` (CSS Modules + variables CSS para tokens globales).

## 6. Routing y páginas

**Problema**: la aplicación es una SPA con varias vistas; hay que definir la navegación.

**Propuesta**: **React Router** (modo declarativo) con rutas:

- `/` — Dashboard.
- `/library` — Biblioteca personal.
- `/search` — Buscador de videojuegos (RAWG).
- `/game/:rawgId` — Detalle de juego y alta de entrada.
- `/library/:entryId` — Detalle y edición de una `LibraryEntry`.

No se ha detectado ninguna incompatibilidad técnica con estas rutas. Los nombres concretos podrán refinarse en la SPEC de implementación sin alterar la arquitectura.

**Alternativas**: TanStack Router (tipado de rutas más fuerte, mayor complejidad inicial); enrutado por estado propio (descartado por falta de URLs compartibles y de historial).

**Estado**: `DEFINIDO` (React Router).

## 7. Gestión del estado y de los datos

**Problema**: distinguir estado local de UI frente a datos asíncronos de RAWG y Supabase.

**Propuesta**:

- **Estado de UI**: `useState`/`useReducer` y contexto de React cuando sea necesario. Sin librería global de estado en el MVP. La sesión de usuario se comparte con un contexto de React (`AuthProvider`, SPEC-05).
- **Datos asíncronos**: **TanStack Query** para consultas, caché y revalidación (búsqueda en RAWG y lecturas/escrituras de Supabase), con claves de consulta por dominio.

**Alternativas**: hooks propios con `useEffect` (menos dependencias, pero gestión manual de caché/errores/carreras); Zustand (útil si crece el estado global, innecesario ahora).

**Estado**: `DEFINIDO`. Estado de UI con React (`useState`, `useReducer`, Context cuando sea necesario) y **TanStack Query** para datos asíncronos, caché y revalidación. **No** se usa Zustand ni otra librería global de estado en el MVP.

## 8. Integración futura con Supabase

**Problema**: definir la **estrategia de acceso** a los datos personales sin acoplar la UI.

> Esta sección define **solo la estrategia de acceso**. El **modelo de datos** concreto (tablas, columnas, relaciones y políticas) se definirá posteriormente en **SPEC-02**. No se crean tablas SQL en esta fase.

**Propuesta**:

- Cliente `@supabase/supabase-js` encapsulado en `src/data/supabase`.
- Patrón **repositorio**: funciones tipadas (p. ej. `listLibraryEntries`, `createLibraryEntry`, `updateLibraryEntry`) que aíslan las consultas del resto de la app.
- **Supabase Auth** con **RLS**: las políticas se aplicarán por usuario autenticado.
- ~~El producto sigue siendo **monousuario** funcionalmente.~~ Desde la v0.4 el producto es **multiusuario con registro abierto**: cada usuario tiene su propia biblioteca, sin perfiles, invitaciones, roles ni funciones sociales (SPEC-05).
- El detalle del modelo de tablas, campos y políticas RLS queda para **SPEC-02**.

**Decisión — control de acceso**:

- Opción elegida: **Supabase Auth y RLS**. La alternativa sin autenticación (proyecto/anon key restringido) queda descartada.
- v0.3: cuenta única. **v0.4: registro abierto**, con inicio y cierre de sesión en la app (SPEC-05).

**Estado**: `DEFINIDO` (estrategia de acceso). El modelo de datos: `PENDING` en **SPEC-02**.

## 9. Integración futura con RAWG

**Problema**: consumir la API de RAWG de forma tipada y desacoplada.

**Propuesta**:

- Cliente REST aislado en `src/data/rawg` sobre `https://api.rawg.io/api`.
- Funciones tipadas para búsqueda y detalle de juegos, con paginación.
- **Mappers** que conviertan las respuestas externas (`Rawg*`) en tipos de dominio (`Game`) usados por la UI.
- La UI nunca consume la respuesta cruda de RAWG directamente.
- Las llamadas a RAWG se canalizan a través de una **Supabase Edge Function** para no exponer la API key (ver sección 11).

**Decisión — persistencia y caché**:

- **No** se persisten los datos de RAWG en PostgreSQL en el MVP.
- La caché se resuelve con **TanStack Query** (cliente).
- La opción de cachear metadatos de RAWG en Supabase queda descartada para el MVP.

**Estado**: `DEFINIDO`.

## 10. Gestión de variables de entorno

**Problema**: manejar claves y URLs por entorno.

**Propuesta (aprobada)**:

- `.env.local` para configuración/valores locales, **ignorado** por git.
- `.env.example` **versionado** como documentación, con las claves vacías.
- Prefijo `VITE_` solo para variables que son **públicas por diseño** (p. ej. la Supabase `anon key`). Las variables sensibles **no** se exponen con `VITE_*`.
- Variables previstas: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y la URL de la **Supabase Edge Function** que hace de proxy hacia RAWG (sección 11), en lugar de una key de RAWG en el cliente.
- La API key de RAWG se guarda como **secreto de servidor** en la Edge Function, no como variable `VITE_*`.

**Estado**: `DEFINIDO`.

## 11. Seguridad y exposición de claves

**Problema**: en Vite, cualquier variable `VITE_*` se incluye en el bundle y es **pública**. La API key de RAWG no debe quedar expuesta.

**Propuesta (aprobada)**:

- La `anon key` de Supabase es pública por diseño, siempre que RLS esté configurado.
- **No** exponer la API key de RAWG en el cliente. Las llamadas a RAWG se canalizan a través de una **Supabase Edge Function** que guarda la key como **secreto de servidor** y devuelve los datos.
- Uso local opcional: key en `.env.local` únicamente durante desarrollo, **nunca** en producción.

**Estado**: `DEFINIDO` (RAWG vía Supabase Edge Function).

## 12. Gestión de errores y estados de carga

**Problema**: toda pantalla que depende de red necesita estados claros.

**Propuesta (aprobada)**:

- **Error Boundary** en la raíz de `app` para errores de render.
- Estados explícitos por pantalla: `loading`, `empty`, `error` y `success`.
- Errores de datos **normalizados** a un tipo común (con mensaje y causa), diferenciando errores de RAWG y de Supabase.
- Reintentos gestionados por **TanStack Query** cuando corresponda.
- Nunca mostrar detalles internos ni secretos en la interfaz.

**Estado**: `DEFINIDO`.

## 13. Validación de datos

**Problema**: RAWG es un dato externo no confiable y los formularios personales requieren reglas.

**Propuesta**:

- Validar las respuestas de RAWG con un esquema antes de mapearlas a dominio.
- Validar los formularios personales según SPEC-00: puntuación de **0 a 10 en pasos de 0.5**, estado entre los **4 estados fijos**, fechas con precisión **día/mes/año** (formato ISO), plataforma **derivada de RAWG**.
- Librería: **Zod**.

**Alternativas**: validación manual (sin dependencia, más código y errores), Valibot (más ligera).

**Estado**: `DEFINIDO` (Zod).

## 14. Testing y qué debería probarse

**Problema**: definir qué se prueba y con qué herramientas.

**Propuesta (aprobada)**:

- **Vitest** como runner, **React Testing Library** + **user-event** para componentes, **MSW** para simular RAWG y otras llamadas HTTP.
- Priorizar:
  - utilidades puras y **mappers** (`Rawg*` → `Game`);
  - **validadores** y reglas de datos personales (puntuación, estados, fechas);
  - cálculos de **estadísticas**;
  - repositorios de datos con clientes simulados;
  - flujos críticos: buscar → añadir → editar una `LibraryEntry`.
- Evitar tests frágiles de snapshot sobre UI extensa.

**Estado**: `DEFINIDO`.

## 15. Responsive

**Problema**: la aplicación debe funcionar en escritorio, tablet y móvil (SPEC-00).

**Propuesta**: enfoque **mobile-first** con Flexbox/Grid y custom properties. Los siguientes breakpoints se documentan como **tokens técnicos** (valores iniciales de implementación), **no** como requisitos funcionales:

| Nombre | Desde |
| --- | --- |
| `sm` | 480px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |

**Estado**: `DEFINIDO` (mobile-first + Flexbox/Grid; breakpoints como tokens técnicos ajustables).

## 16. Convenciones de código

**Problema**: mantener consistencia en el código.

**Propuesta**:

- Componentes en **PascalCase**; hooks `useXxx`; utilidades en camelCase.
- Un componente por archivo; props tipadas explícitamente; sin `any`.
- Preferir funciones puras y componentes pequeños.
- **Sin comentarios** en el código salvo indicación expresa.
- Alias de importación `@/` apuntando a `src/` (requiere configurar `tsconfig` y `vite.config.ts`).
- Respetar las reglas de oxlint y los flags estrictos de TypeScript.

**Estado**: `DEFINIDO` (alias `@/` aprobado; el resto son convenciones de estilo del proyecto).

## 17. Reglas para separar datos externos de RAWG y datos personales

**Problema**: evitar contaminar la información personal con datos externos y viceversa.

**Reglas**:

- **Tipos externos** de RAWG se nombran con prefijo `Rawg*` y son **de solo lectura**; nunca se editan.
- **Tipos de dominio** (`Game`) representan el videojuego ya normalizado y son los que consume la UI.
- **Tipos personales** (`LibraryEntry`) contienen únicamente información del usuario.
- Los **mappers** que transforman `Rawg*` → `Game` viven exclusivamente en `src/data/rawg`.
- La capa `data` es la **única** que conoce RAWG y Supabase; la UI no importa tipos `Rawg*`.
- Una **`LibraryEntry`** referencia un juego y una **plataforma**; un mismo juego puede tener **varias entradas, una por plataforma**.
- **Nunca** se persisten campos de RAWG como si fueran datos personales.
- La estrategia de caché de RAWG (sección 9) debe respetar esta separación.

**Estado**: `DEFINIDO` (regla de arquitectura derivada de SPEC-00).

## 18. Estado de las decisiones técnicas

| # | Decisión | Sección | Estado |
| --- | --- | --- | --- |
| 1 | Arquitectura por capas (`app`/`features`/`shared`/`data`) | 1 | DEFINIDO |
| 2 | Estructura de carpetas concreta | 2 | DEFINIDO |
| 3 | Oxlint: mantener configuración actual, sin type-aware en el MVP | 4 | DEFINIDO |
| 4 | Estrategia de CSS: CSS Modules + variables CSS | 5 | DEFINIDO |
| 5 | Routing: React Router | 6 | DEFINIDO |
| 6 | Estado: React + TanStack Query (sin Zustand) | 7 | DEFINIDO |
| 7 | Supabase: Auth + RLS (estrategia de acceso); multiusuario desde SPEC-05 | 8 | DEFINIDO |
| 8 | Caché de RAWG: sin persistir en PostgreSQL, caché de TanStack Query | 9 | DEFINIDO |
| 9 | Exposición de la API key: RAWG vía Supabase Edge Function | 11 | DEFINIDO |
| 10 | Validación: Zod | 13 | DEFINIDO |
| 11 | Testing: Vitest + React Testing Library + user-event + MSW | 14 | DEFINIDO |
| 12 | Responsive: mobile-first + Flexbox/Grid, breakpoints como tokens técnicos | 15 | DEFINIDO |
| 13 | Alias de importación `@/` | 16 | DEFINIDO |
| 14 | Gestión de variables de entorno (`.env.local` + `.env.example`) | 10 | DEFINIDO |
| 15 | Gestión de errores y estados de carga | 12 | DEFINIDO |

> El **modelo de datos de Supabase** (tablas, columnas, relaciones, políticas RLS) queda explícitamente para **SPEC-02**. La caché de RAWG en TanStack Query y la no persistencia de datos de RAWG en PostgreSQL también quedan fijadas.
>
> Todas las decisiones de esta SPEC están `DEFINIDO`. No quedan decisiones `PROPUESTO` ni `PENDING` en SPEC-01.

## Observaciones

- El nombre canónico del producto es **MyPlayGallery**. Los identificadores técnicos (`package.json`, `package-lock.json`, `index.html`) se han alineado a `myplaygallery` / `MyPlayGallery`.
- La nomenclatura **MyPlayGallery** debe usarse de forma consistente en código, documentación y configuración. Los directorios del repositorio deben nombrarse conforme a ella.

## Estado de aprobación

SPEC-01 queda **Aprobada** (v0.3). El responsable de producto ha confirmado:

1. La arquitectura por capas y la estructura de carpetas (`DEFINIDO`).
2. La estrategia de CSS, routing, estado y datos (`DEFINIDO`).
3. Supabase Auth + RLS y la no persistencia de RAWG, con caché en TanStack Query (`DEFINIDO`).
4. La seguridad y exposición de claves mediante Edge Function (`DEFINIDO`).
5. Validación con Zod, testing y responsive (`DEFINIDO`).
6. La gestión de variables de entorno y la gestión de errores/estados de carga (`DEFINIDO`).

No quedan decisiones `PROPUESTO` ni `PENDING` en SPEC-01. El **modelo de datos se abordará en SPEC-02**.

SPEC-01 no autoriza implementación por sí misma; sirve de base para las SPEC de implementación y para SPEC-02.
