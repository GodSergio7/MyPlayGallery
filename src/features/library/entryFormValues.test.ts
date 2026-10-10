import { describe, expect, it } from 'vitest'
import { createEmptyForm, formToInput, hasErrors, validateEntryForm, type EntryFormValues } from './entryFormValues'

const valid = (patch: Partial<EntryFormValues> = {}): EntryFormValues => ({ ...createEmptyForm(), platformId: '6', ...patch })

describe('validateEntryForm (T-08)', () => {
  it('un formulario correcto no tiene errores', () => {
    expect(hasErrors(validateEntryForm(valid({ hoursPlayed: '12.5', startedOn: '2026-01-01', finishedOn: '2026-02-01' })))).toBe(false)
  })

  it('exige plataforma', () => {
    expect(validateEntryForm(valid({ platformId: '' })).platformId).toBe('Elige una plataforma.')
  })

  it('horas negativas, no numéricas o por encima del máximo', () => {
    expect(validateEntryForm(valid({ hoursPlayed: '-1' })).hoursPlayed).toMatch(/negativas/)
    expect(validateEntryForm(valid({ hoursPlayed: 'muchas' })).hoursPlayed).toMatch(/número/)
    expect(validateEntryForm(valid({ hoursPlayed: '100000' })).hoursPlayed).toMatch(/99\.999,9/)
  })

  it('la fecha de fin no puede ser anterior a la de inicio', () => {
    expect(validateEntryForm(valid({ startedOn: '2026-05-10', finishedOn: '2026-05-09' })).finishedOn).toMatch(/anterior/)
    expect(validateEntryForm(valid({ startedOn: '2026-05-10', finishedOn: '2026-05-10' })).finishedOn).toBeUndefined()
  })

  it('reseña y notas como mucho de 5.000 caracteres (T-21)', () => {
    const errors = validateEntryForm(valid({ review: 'a'.repeat(5001), notes: 'b'.repeat(5000) }))
    expect(errors.review).toMatch(/5000/)
    expect(errors.notes).toBeUndefined()
  })
})

describe('formToInput', () => {
  it('redondea las horas a una décima y deja vacíos los textos en blanco', () => {
    const input = formToInput(valid({ hoursPlayed: '12.345', review: '   ', notes: 'nota' }), [
      { id: 6, name: 'PC (Microsoft Windows)' },
    ])
    expect(input).toMatchObject({ platformName: 'PC (Microsoft Windows)', hoursPlayed: 12.3, review: null, notes: 'nota' })
  })
})
