const COVER_COLORS: Array<[string, string]> = [
  ['#2f4a45', '#1f3230'],
  ['#3a3550', '#241f38'],
  ['#4a3b2f', '#2e241a'],
  ['#2f3f52', '#1d2836'],
  ['#4a2f3c', '#2e1c25'],
  ['#33463a', '#1e2c24'],
]

function initials(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

export function makeCover(title: string, seed: number): string {
  const [from, to] = COVER_COLORS[seed % COVER_COLORS.length]
  const label = initials(title)

  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">',
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">',
    `<stop offset="0" stop-color="${from}"/>`,
    `<stop offset="1" stop-color="${to}"/>`,
    '</linearGradient></defs>',
    '<rect width="300" height="400" fill="url(#g)"/>',
    '<text x="150" y="222" font-family="system-ui, sans-serif" font-size="96"',
    ' font-weight="700" fill="#b8f7e4" text-anchor="middle">',
    label,
    '</text></svg>',
  ].join('')

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
