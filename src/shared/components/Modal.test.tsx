// @vitest-environment jsdom
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'
import { CoverImage } from './CoverImage'

function Example() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Eliminar
      </button>
      <Modal
        open={open}
        title="Quitar de la biblioteca"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="button">Confirmar</button>
          </>
        }
      >
        <p>¿Seguro?</p>
      </Modal>
    </>
  )
}

afterEach(cleanup)

describe('Modal (T-12)', () => {
  it('lleva el foco dentro, lo mantiene con Tab, bloquea el scroll y lo devuelve al cerrar', async () => {
    const user = userEvent.setup()
    render(<Example />)
    const trigger = screen.getByRole('button', { name: 'Eliminar' })

    await user.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Quitar de la biblioteca' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' }))
    expect(document.body.style.overflow).toBe('hidden')

    // Tab desde el último control vuelve al primero (el botón de cerrar)
    screen.getByRole('button', { name: 'Confirmar' }).focus()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar' }))

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(trigger)
  })
})

describe('CoverImage (T-28)', () => {
  it('si la imagen no carga, muestra las iniciales', () => {
    render(<CoverImage src="https://example.invalid/portada.jpg" title="Hollow Knight" />)
    fireEvent.error(screen.getByRole('img', { name: 'Portada de Hollow Knight' }))
    expect(screen.getByRole('img', { name: 'Portada no disponible de Hollow Knight' }).textContent).toBe('HK')
  })

  it('pide la portada al doble de resolución para pantallas retina (T-37)', () => {
    render(<CoverImage src="https://images.igdb.com/igdb/image/upload/t_cover_big/abc.jpg" title="Juego" />)
    expect(screen.getByRole('img').getAttribute('srcset')).toContain('/t_cover_big_2x/abc.jpg 2x')
  })
})
