import { useId, type SVGProps } from 'react'

// Logo de MyPlayGallery: fotos apiladas con un mando delante, en capas rellenas con el
// degradado de marca (rosa → violeta → azul). El volumen sale de las capas, el brillo
// superior del mando y una sombra oscura (sin resplandor de color).
// Los ids internos son únicos por instancia para poder usar varios logos en la misma página.

const PAD =
  'M18 33H46C53 33 57.4 38.4 56.4 45.2L55.6 50.6C55 54.6 50.2 56.2 47.3 53.4L42.6 48.8H21.4L16.7 53.4C13.8 56.2 9 54.6 8.4 50.6L7.6 45.2C6.6 38.4 11 33 18 33Z'
const PHOTO_TRANSFORM = 'rotate(-8 23.5 21)'

type LogoMarkProps = Omit<SVGProps<SVGSVGElement>, 'viewBox'> & {
  /** Tamaño en píxeles (ancho y alto). */
  size?: number
  /** Texto accesible. Si se omite, el logo es decorativo. */
  title?: string
}

export function LogoMark({ size = 40, title, ...rest }: LogoMarkProps) {
  const uid = useId().replace(/:/g, '')
  const id = (name: string) => `${uid}-${name}`
  const ref = (name: string) => `url(#${id(name)})`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      <defs>
        <linearGradient id={id('pad')} x1="8" y1="33" x2="56" y2="55" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF4F96" />
          <stop offset="0.5" stopColor="#B13DFF" />
          <stop offset="1" stopColor="#4F6BFF" />
        </linearGradient>
        <linearGradient id={id('shine')} x1="0" y1="33" x2="0" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('frame')} x1="8" y1="8" x2="40" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF5A9D" />
          <stop offset="1" stopColor="#C04DFF" />
        </linearGradient>
        <linearGradient id={id('sky')} x1="0" y1="8" x2="0" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2A1660" />
          <stop offset="1" stopColor="#4A1F7A" />
        </linearGradient>

        <path id={id('padShape')} d={PAD} />
        <rect id={id('photo')} x="7" y="7" width="33" height="28" rx="5" transform={PHOTO_TRANSFORM} />
        <rect id={id('picture')} x="10.2" y="10.2" width="26.6" height="21.6" rx="2.6" transform={PHOTO_TRANSFORM} />

        {/* Separación entre capas: recorta lo que queda detrás del mando y de la foto delantera */}
        <mask id={id('maskPhoto')} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <use href={`#${id('padShape')}`} fill="#000" stroke="#000" strokeWidth="5" strokeLinejoin="round" />
        </mask>
        <mask id={id('maskBack')} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <use href={`#${id('padShape')}`} fill="#000" stroke="#000" strokeWidth="5" strokeLinejoin="round" />
          <use href={`#${id('photo')}`} fill="#000" stroke="#000" strokeWidth="4" />
        </mask>
        <clipPath id={id('clipPicture')}>
          <use href={`#${id('picture')}`} />
        </clipPath>
        <filter id={id('shadow')} x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="2.2" stdDeviation="1.6" floodColor="#05041A" floodOpacity="0.55" />
        </filter>
      </defs>

      {/* Fotos del fondo */}
      <g mask={ref('maskBack')}>
        <rect x="31" y="11" width="23" height="29" rx="4" transform="rotate(16 42.5 25.5)" fill="#3550E6" />
        <rect x="26" y="9" width="24" height="29" rx="4" transform="rotate(7 38 23.5)" fill="#8A3DF0" />
      </g>

      {/* Foto delantera con paisaje */}
      <g mask={ref('maskPhoto')} filter={ref('shadow')}>
        <use href={`#${id('photo')}`} fill={ref('frame')} />
        <use href={`#${id('picture')}`} fill={ref('sky')} />
        <g clipPath={ref('clipPicture')}>
          <g transform={PHOTO_TRANSFORM}>
            <circle cx="30.5" cy="15.5" r="3.2" fill="#FFD1E4" />
            <path d="M8 33 19 21.5 25 27.5 29 24 40 33Z" fill="#FF5A9D" />
            <path d="M8 33 19 21.5 22 24.7 15 33Z" fill="#fff" fillOpacity="0.18" />
          </g>
        </g>
      </g>

      {/* Mando */}
      <g filter={ref('shadow')}>
        <use href={`#${id('padShape')}`} fill={ref('pad')} />
        <use href={`#${id('padShape')}`} fill={ref('shine')} />
      </g>
      <path d="M19 38.8V45.2M15.8 42H22.2" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
      <g fill="#fff">
        <circle cx="45" cy="38.8" r="1.8" />
        <circle cx="48.2" cy="42" r="1.8" />
        <circle cx="45" cy="45.2" r="1.8" />
        <circle cx="41.8" cy="42" r="1.8" />
      </g>
    </svg>
  )
}
