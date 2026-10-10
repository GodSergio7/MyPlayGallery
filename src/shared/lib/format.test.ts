import { describe, expect, it } from 'vitest'
import { formatAverage, formatDate, formatHours, parseDisplayDate } from './format'

describe('parseDisplayDate (T-25)', () => {
  it('una fecha sin hora es la medianoche de ese día en la hora local, no en UTC', () => {
    // Leída en UTC, en América caería el día anterior (y en España, a las 1:00 o 2:00).
    const date = parseDisplayDate('2015-05-18')
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2015, 4, 18, 0])
  })

  it('las fechas con hora se respetan', () => {
    expect(parseDisplayDate('2026-10-09T18:00:00Z').toISOString()).toBe('2026-10-09T18:00:00.000Z')
  })
})

describe('formatDate', () => {
  it('valores vacíos o no válidos', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate('no es una fecha')).toBe('—')
  })
})

describe('formatHours y formatAverage', () => {
  it('con una décima como mucho y en formato español', () => {
    expect(formatHours(12.5)).toBe('12,5 h')
    expect(formatHours(null)).toBe('—')
    expect(formatAverage(8.25)).toBe('8,3/10')
  })
})
