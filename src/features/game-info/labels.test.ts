import { describe, expect, it } from 'vitest'
import { translateGameModes, translateThemes, usefulWebsites } from './labels'

describe('traducción de etiquetas', () => {
  it('traduce las conocidas y deja en inglés las desconocidas', () => {
    expect(translateThemes([{ id: 38, name: 'Open world' }, { id: 999, name: 'New theme' }])).toEqual([
      'Mundo abierto',
      'New theme',
    ])
    expect(translateGameModes([{ id: 3, name: 'Co-operative' }])).toEqual(['Cooperativo'])
  })
})

describe('usefulWebsites', () => {
  it('se queda con la web oficial, tiendas y Wikipedia, sin redes sociales ni duplicados', () => {
    const links = usefulWebsites([
      { url: 'https://www.twitch.tv/directory/game/Elden%20Ring', type: 6 },
      { url: 'https://store.steampowered.com/app/1245620', type: 13 },
      { url: 'https://en.wikipedia.org/wiki/Elden_Ring', type: 3 },
      { url: 'https://store.playstation.com/es-es/product/x', type: 23 },
      { url: 'https://store.steampowered.com/app/otra', type: 13 },
      { url: 'https://en.bandainamcoent.eu/elden-ring', type: 1 },
      { url: 'javascript:alert(1)', type: 1 },
    ])

    expect(links.map((link) => link.label)).toEqual(['Web oficial', 'Steam', 'PlayStation Store', 'Wikipedia'])
  })
})
