// jsdom no implementa matchMedia ni IntersectionObserver, que usan las animaciones
// (GSAP y Motion). Se simulan solo en los tests que se ejecutan con jsdom.
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })
  }

  if (typeof window.IntersectionObserver === 'undefined') {
    class IntersectionObserverStub {
      readonly root = null
      readonly rootMargin = '0px'
      readonly thresholds: ReadonlyArray<number> = []
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] {
        return []
      }
    }
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: IntersectionObserverStub,
    })
  }
}
