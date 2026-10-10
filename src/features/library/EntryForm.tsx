import {
  GAME_STATUSES,
  type GameStatus,
  type Platform,
} from '@/shared/types/domain'
import { Checkbox, Field, Input, Select, Textarea } from '@/shared/components/FormControls'
import { MAX_TEXT_LENGTH, type EntryFormErrors, type EntryFormValues } from './entryFormValues'
import styles from './EntryForm.module.css'

const SCORE_OPTIONS: string[] = Array.from({ length: 21 }, (_, index) =>
  (index * 0.5).toFixed(1),
)

interface EntryFieldsProps {
  idPrefix: string
  values: EntryFormValues
  platforms: Platform[]
  onChange: (patch: Partial<EntryFormValues>) => void
  platformDisabled?: boolean
  /** Errores de validación por campo (T-08). */
  errors?: EntryFormErrors
}

export function EntryFields({
  idPrefix,
  values,
  platforms,
  onChange,
  platformDisabled,
  errors = {},
}: EntryFieldsProps) {
  return (
    <div className={styles.grid}>
      <Field label="Plataforma" htmlFor={`${idPrefix}-platform`} error={errors.platformId}>
        <Select
          id={`${idPrefix}-platform`}
          value={values.platformId}
          disabled={platformDisabled}
          required
          onChange={(event) => onChange({ platformId: event.target.value })}
        >
          <option value="" disabled>
            Selecciona una plataforma
          </option>
          {platforms.map((platform) => (
            <option key={platform.id} value={platform.id}>
              {platform.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Estado" htmlFor={`${idPrefix}-status`}>
        <Select
          id={`${idPrefix}-status`}
          value={values.status}
          onChange={(event) => onChange({ status: event.target.value as GameStatus })}
        >
          {GAME_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Puntuación" htmlFor={`${idPrefix}-score`} hint="De 0 a 10, en pasos de 0.5.">
        <Select
          id={`${idPrefix}-score`}
          value={values.score}
          onChange={(event) => onChange({ score: event.target.value })}
        >
          <option value="">Sin puntuar</option>
          {SCORE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Horas jugadas" htmlFor={`${idPrefix}-hours`} error={errors.hoursPlayed}>
        <Input
          id={`${idPrefix}-hours`}
          type="number"
          min={0}
          max={99999.9}
          step={0.1}
          inputMode="decimal"
          value={values.hoursPlayed}
          onChange={(event) => onChange({ hoursPlayed: event.target.value })}
        />
      </Field>

      <Field label="Fecha de inicio" htmlFor={`${idPrefix}-started`}>
        <Input
          id={`${idPrefix}-started`}
          type="date"
          value={values.startedOn}
          onChange={(event) => onChange({ startedOn: event.target.value })}
        />
      </Field>

      <Field label="Fecha de finalización" htmlFor={`${idPrefix}-finished`} error={errors.finishedOn}>
        <Input
          id={`${idPrefix}-finished`}
          type="date"
          min={values.startedOn || undefined}
          value={values.finishedOn}
          onChange={(event) => onChange({ finishedOn: event.target.value })}
        />
      </Field>

      <div className={styles.checkboxes}>
        <Checkbox
          id={`${idPrefix}-platinum`}
          label="Platino conseguido"
          checked={values.platinum}
          onChange={(checked) => onChange({ platinum: checked })}
        />
        <Checkbox
          id={`${idPrefix}-hundred`}
          label="100% conseguido"
          checked={values.hundredPercent}
          onChange={(checked) => onChange({ hundredPercent: checked })}
        />
      </div>

      <div className={styles.full}>
        <Field
          label="Reseña"
          htmlFor={`${idPrefix}-review`}
          error={errors.review}
          hint={lengthHint(values.review)}
        >
          <Textarea
            id={`${idPrefix}-review`}
            maxLength={MAX_TEXT_LENGTH}
            value={values.review}
            onChange={(event) => onChange({ review: event.target.value })}
          />
        </Field>
      </div>

      <div className={styles.full}>
        <Field label="Notas" htmlFor={`${idPrefix}-notes`} error={errors.notes} hint={lengthHint(values.notes)}>
          <Textarea
            id={`${idPrefix}-notes`}
            maxLength={MAX_TEXT_LENGTH}
            rows={3}
            value={values.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
          />
        </Field>
      </div>
    </div>
  )
}

/** Contador de caracteres, solo cuando el texto se acerca al límite. */
function lengthHint(text: string): string | undefined {
  return text.length > MAX_TEXT_LENGTH * 0.8 ? `${text.length} / ${MAX_TEXT_LENGTH} caracteres` : undefined
}
