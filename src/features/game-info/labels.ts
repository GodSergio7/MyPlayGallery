import type { GameTag } from '@/shared/types/domain'
import { GENRE_OPTIONS } from '@/features/explore/catalog'

// Traducciones de las etiquetas de IGDB (ids de IGDB). Si llega una que no está aquí,
// se muestra su nombre original en inglés.

const GENRES = new Map(GENRE_OPTIONS.map((option) => [option.value, option.label]))

const THEMES = new Map<number, string>([
  [1, 'Acción'],
  [17, 'Fantasía'],
  [18, 'Ciencia ficción'],
  [19, 'Terror'],
  [20, 'Thriller'],
  [21, 'Supervivencia'],
  [22, 'Histórico'],
  [23, 'Sigilo'],
  [27, 'Comedia'],
  [28, 'Negocios'],
  [31, 'Drama'],
  [32, 'No ficción'],
  [33, 'Sandbox'],
  [34, 'Educativo'],
  [35, 'Infantil'],
  [38, 'Mundo abierto'],
  [39, 'Bélico'],
  [40, 'Party'],
  [41, '4X'],
  [43, 'Misterio'],
  [44, 'Romance'],
])

const GAME_MODES = new Map<number, string>([
  [1, 'Un jugador'],
  [2, 'Multijugador'],
  [3, 'Cooperativo'],
  [4, 'Pantalla dividida'],
  [5, 'MMO'],
  [6, 'Battle royale'],
])

const PERSPECTIVES = new Map<number, string>([
  [1, 'Primera persona'],
  [2, 'Tercera persona'],
  [3, 'Vista aérea / isométrica'],
  [4, 'Lateral'],
  [5, 'Texto'],
  [6, 'Auditiva'],
  [7, 'Realidad virtual'],
])

const translate = (map: Map<number, string>) => (tags: GameTag[]) => tags.map((tag) => map.get(tag.id) ?? tag.name)

export const translateGenres = translate(GENRES)
export const translateThemes = translate(THEMES)
export const translateGameModes = translate(GAME_MODES)
export const translatePerspectives = translate(PERSPECTIVES)

// ---------------------------------------------------------------- Enlaces

export interface WebsiteLink {
  url: string
  label: string
  kind: 'official' | 'store' | 'info'
}

const IGDB_OFFICIAL_SITE = 1

const KNOWN_SITES: Array<{ match: RegExp; label: string; kind: WebsiteLink['kind'] }> = [
  { match: /(^|\.)store\.steampowered\.com$/, label: 'Steam', kind: 'store' },
  { match: /(^|\.)store\.playstation\.com$/, label: 'PlayStation Store', kind: 'store' },
  { match: /(^|\.)(xbox\.com|microsoft\.com)$/, label: 'Microsoft Store', kind: 'store' },
  { match: /(^|\.)nintendo\.(com|es|co\.uk|de|fr)$/, label: 'Nintendo eShop', kind: 'store' },
  { match: /(^|\.)(store\.)?epicgames\.com$/, label: 'Epic Games Store', kind: 'store' },
  { match: /(^|\.)gog\.com$/, label: 'GOG', kind: 'store' },
  { match: /(^|\.)itch\.io$/, label: 'itch.io', kind: 'store' },
  { match: /(^|\.)apps\.apple\.com$/, label: 'App Store', kind: 'store' },
  { match: /(^|\.)play\.google\.com$/, label: 'Google Play', kind: 'store' },
  { match: /(^|\.)wikipedia\.org$/, label: 'Wikipedia', kind: 'info' },
]

/**
 * Enlaces útiles: web oficial, tiendas y Wikipedia (sin redes sociales).
 * Sin duplicados por etiqueta; primero la web oficial y luego las tiendas.
 */
export function usefulWebsites(websites: Array<{ url: string; type: number | null }>): WebsiteLink[] {
  const links = new Map<string, WebsiteLink>()

  for (const site of websites) {
    let host: string
    try {
      const url = new URL(site.url)
      if (url.protocol !== 'https:' && url.protocol !== 'http:') continue
      host = url.hostname.replace(/^www\./, '')
    } catch {
      continue
    }

    const known = KNOWN_SITES.find((entry) => entry.match.test(host))
    const link: WebsiteLink | null = known
      ? { url: site.url, label: known.label, kind: known.kind }
      : site.type === IGDB_OFFICIAL_SITE
        ? { url: site.url, label: 'Web oficial', kind: 'official' }
        : null

    if (link && !links.has(link.label)) links.set(link.label, link)
  }

  const order: Record<WebsiteLink['kind'], number> = { official: 0, store: 1, info: 2 }
  return [...links.values()].sort((a, b) => order[a.kind] - order[b.kind])
}
