// Adaptado de React Bits (https://reactbits.dev) — licencia MIT + Commons Clause.
// Cambios respecto al original:
// - Enlaces del router (NavLink) en lugar de <a href>, con la página actual resaltada.
// - Admite acciones (p. ej. "Cerrar sesión") además de enlaces.
// - Logo como ReactNode y hueco de acciones a la derecha (ReactNode); al pulsar una, el menú se cierra.
// - Hamburguesa como <button> real; se cierra con Escape, al hacer clic fuera y al navegar.
// - Respeta prefers-reduced-motion; textos en español; icono propio (sin react-icons).
// - Los colores vienen de los tokens de la app (ver CardNav.css).

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { gsap } from 'gsap';
import { ArrowUpRightIcon } from '../icons';
import './CardNav.css';

const COLLAPSED_HEIGHT = 60;
const DESKTOP_EXPANDED_HEIGHT = 260;
const MOBILE_QUERY = '(max-width: 768px)';

export type CardNavLink =
  | { label: string; ariaLabel?: string; to: string; end?: boolean }
  | { label: string; ariaLabel?: string; onClick: () => void };

export type CardNavItem = {
  label: string;
  /** Fondo de la tarjeta (admite degradados). */
  background: string;
  textColor: string;
  /** Texto pequeño bajo el título de la tarjeta. */
  description?: string;
  links: CardNavLink[];
};

export interface CardNavProps {
  logo: ReactNode;
  /** Debe ser estable (useMemo o constante): si cambia, se rehace la animación. */
  items: CardNavItem[];
  /** Botones a la derecha de la barra (p. ej. añadir juego y perfil). Al pulsar, el menú se cierra. */
  actions?: ReactNode;
  className?: string;
  ease?: string;
  ariaLabel?: string;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

const CardNav = ({
  logo,
  items,
  actions,
  className = '',
  ease = 'power3.out',
  ariaLabel = 'Navegación principal'
}: CardNavProps) => {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const calculateHeight = () => {
    const navEl = navRef.current;
    if (!navEl) return DESKTOP_EXPANDED_HEIGHT;

    if (window.matchMedia?.(MOBILE_QUERY).matches) {
      const contentEl = navEl.querySelector<HTMLElement>('.card-nav-content');
      if (contentEl) {
        const previous = {
          visibility: contentEl.style.visibility,
          pointerEvents: contentEl.style.pointerEvents,
          position: contentEl.style.position,
          height: contentEl.style.height
        };

        contentEl.style.visibility = 'visible';
        contentEl.style.pointerEvents = 'auto';
        contentEl.style.position = 'static';
        contentEl.style.height = 'auto';
        void contentEl.offsetHeight;

        // offsetHeight (ya incluye el padding del contenido) y no scrollHeight: las tarjetas aún
        // están desplazadas por la animación de entrada y scrollHeight sumaría ese desplazamiento.
        const contentHeight = contentEl.offsetHeight;

        Object.assign(contentEl.style, previous);
        return COLLAPSED_HEIGHT + contentHeight;
      }
    }
    return DESKTOP_EXPANDED_HEIGHT;
  };

  const createTimeline = () => {
    const navEl = navRef.current;
    if (!navEl) return null;

    const duration = prefersReducedMotion() ? 0 : 0.4;

    gsap.set(navEl, { height: COLLAPSED_HEIGHT, overflow: 'hidden' });
    gsap.set(cardsRef.current, { y: duration ? 50 : 0, opacity: 0 });

    const tl = gsap.timeline({ paused: true });
    tl.to(navEl, { height: calculateHeight, duration, ease });
    tl.to(cardsRef.current, { y: 0, opacity: 1, duration, ease, stagger: duration ? 0.08 : 0 }, duration ? '-=0.1' : 0);

    return tl;
  };

  useLayoutEffect(() => {
    const tl = createTimeline();
    tlRef.current = tl;

    return () => {
      tl?.kill();
      tlRef.current = null;
    };
    // createTimeline solo depende de ease e items.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ease, items]);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!tlRef.current) return;

      tlRef.current.kill();
      const newTl = createTimeline();
      if (!newTl) return;

      // Se decide con isHamburgerOpen (lo que quiere el usuario) y no con isExpanded, que sigue
      // en true mientras se cierra: al entrar en "Añadir juego" el buscador abre el teclado del
      // móvil, la ventana cambia de tamaño a mitad del cierre y el menú volvía a desplegarse.
      if (isHamburgerOpen) {
        gsap.set(navRef.current, { height: calculateHeight() });
        newTl.progress(1);
      } else {
        setIsExpanded(false);
      }
      tlRef.current = newTl;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHamburgerOpen]);

  const openMenu = () => {
    const tl = tlRef.current;
    if (!tl) return;
    setIsHamburgerOpen(true);
    setIsExpanded(true);
    tl.play(0);
  };

  const closeMenu = useCallback(() => {
    const tl = tlRef.current;
    if (!tl) return;
    setIsHamburgerOpen(false);
    tl.eventCallback('onReverseComplete', () => setIsExpanded(false));
    tl.reverse();
  }, []);

  const toggleMenu = () => (isExpanded ? closeMenu() : openMenu());

  // Escape y clic fuera cierran el menú
  useEffect(() => {
    if (!isHamburgerOpen) return undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
        toggleRef.current?.focus();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) closeMenu();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isHamburgerOpen, closeMenu]);

  const setCardRef = (i: number) => (el: HTMLDivElement | null) => {
    if (el) cardsRef.current[i] = el;
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'nav-card-link nav-card-link--active' : 'nav-card-link';

  return (
    <div className={`card-nav-container ${isHamburgerOpen ? 'card-nav-container--open' : ''} ${className}`.trim()}>
      <nav ref={navRef} className={`card-nav ${isExpanded ? 'open' : ''}`} aria-label={ariaLabel}>
        <div className="card-nav-top">
          <button
            ref={toggleRef}
            type="button"
            className={`hamburger-menu ${isHamburgerOpen ? 'open' : ''}`}
            onClick={toggleMenu}
            aria-label={isHamburgerOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={isHamburgerOpen}
            aria-controls="card-nav-content"
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>

          <div className="logo-container">{logo}</div>

          {actions && (
            <div className="card-nav-actions" onClick={closeMenu}>
              {actions}
            </div>
          )}
        </div>

        <div id="card-nav-content" className="card-nav-content" aria-hidden={!isExpanded}>
          {items.slice(0, 3).map((item, idx) => (
            <div
              key={`${item.label}-${idx}`}
              className="nav-card"
              ref={setCardRef(idx)}
              style={{ background: item.background, color: item.textColor }}
            >
              <div className="nav-card-header">
                <span className="nav-card-label">{item.label}</span>
                {item.description && <span className="nav-card-description">{item.description}</span>}
              </div>
              <div className="nav-card-links">
                {item.links.map((lnk, i) =>
                  'to' in lnk ? (
                    <NavLink
                      key={`${lnk.label}-${i}`}
                      to={lnk.to}
                      end={lnk.end}
                      className={linkClass}
                      aria-label={lnk.ariaLabel}
                      onClick={closeMenu}
                    >
                      <ArrowUpRightIcon className="nav-card-link-icon" width={16} height={16} />
                      {lnk.label}
                    </NavLink>
                  ) : (
                    <button
                      key={`${lnk.label}-${i}`}
                      type="button"
                      className="nav-card-link"
                      aria-label={lnk.ariaLabel}
                      onClick={() => {
                        closeMenu();
                        lnk.onClick();
                      }}
                    >
                      <ArrowUpRightIcon className="nav-card-link-icon" width={16} height={16} />
                      {lnk.label}
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default CardNav;
