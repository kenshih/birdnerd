import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { BirdRecord, Session } from '../types'
import { saveRecord, getPeople, getBanders } from '../db'
import {
  AGE_CODES, SEX_CODES, SKULL_CODES, FAT_CODES, MOLT_CODES,
  CAPTURE_STATUS_CODES, HOW_AGED_CODES, HOW_SEXED_CODES, WRP_CODES,
  CP_CODES, BP_CODES, FF_WEAR_CODES, BIRD_STATUS_CODES, DISPOSITION_CODES,
  MOLT_LIMITS_CODES, JUV_BODY_PLUMAGE_CODES,
} from '../data/codes'
import SpeciesAutocomplete from '../components/SpeciesAutocomplete'

interface Props {
  session: Session
  record?: BirdRecord
  onSaved: () => void
  onCancel: () => void
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

type FormValues = Omit<BirdRecord, 'id' | 'sessionId' | 'createdAt' | 'updatedAt'>

const ALL_FIELDS: (keyof FormValues)[] = [
  'bandNumber', 'speciesCode', 'age', 'sex', 'howAged', 'howAged2',
  'howSexed', 'howSexed2', 'bbpCode', 'wrp', 'skull', 'cp', 'bp', 'fat',
  'bodyMolt', 'ffMolt', 'tfMolt', 'ffWear', 'juvBodyPlumage',
  'moltLimitsPCovs', 'moltLimitsSCovs', 'moltLimitsPP', 'moltLimitsSS',
  'moltLimitsTert', 'moltLimitsRec', 'moltLimitsBodyPlum', 'moltLimitsNonFeather',
  'moltLimitsPlumage',
  'wing', 'tail', 'tarsus', 'exposedCulmen', 'otherMeasurement', 'bodyMass',
  'status', 'disposition', 'captureTime', 'releaseTime', 'date', 'station',
  'net', 'bander', 'featherPull', 'bloodSample', 'notes',
]

interface BanderOption {
  initials: string
  name: string
}

export default function BirdRecordForm({ session, record, onSaved, onCancel }: Props) {
  const { register, handleSubmit, setValue, watch, reset } = useForm<FormValues>()
  const [banderOptions, setBanderOptions] = useState<BanderOption[]>([])

  useEffect(() => {
    loadBanders()
  }, [])

  async function loadBanders() {
    const [people, banders] = await Promise.all([getPeople(), getBanders()])
    const banderPersonIds = new Set(banders.map(b => b.personId))
    const activeBanders = people
      .filter(p => p.active && banderPersonIds.has(p.id))
      .sort((a, b) => a.initials.localeCompare(b.initials))
      .map(p => ({ initials: p.initials, name: p.name }))
    setBanderOptions(activeBanders)
  }

  useEffect(() => {
    if (record) {
      const values: Record<string, unknown> = {}
      for (const f of ALL_FIELDS) {
        values[f] = record[f as keyof BirdRecord]
      }
      values.station = record.station ?? session.station
      reset(values as FormValues)
    } else {
      reset({
        station: session.station,
        date: session.date,
      })
    }
  }, [record, session, reset])

  const speciesCode = watch('speciesCode')

  function fillNow(field: 'captureTime' | 'releaseTime') {
    const now = new Date()
    const hh = now.getHours().toString().padStart(2, '0')
    const mm = now.getMinutes().toString().padStart(2, '0')
    setValue(field, `${hh}:${mm}`)
  }

  async function onSubmit(data: FormValues) {
    const now = new Date().toISOString()
    const saved: BirdRecord = {
      ...data,
      id: record?.id ?? generateId(),
      sessionId: session.id,
      createdAt: record?.createdAt ?? now,
      updatedAt: now,
    }
    await saveRecord(saved)
    onSaved()
  }

  return (
    <div style={{ padding: '1rem', maxWidth: 500, margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={onCancel} style={backBtnStyle}>← Back</button>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
          {record ? 'Edit Record' : 'New Bird Record'}
        </h2>
      </div>
      <p style={{ color: '#555', fontSize: '0.85rem', marginTop: 0 }}>
        {session.station} · {session.date}
      </p>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ── Identity ── */}
        <Section title="Identity">
          <Field label="Band Number">
            <input {...register('bandNumber')} placeholder="e.g. 2305043898" style={inputStyle} />
          </Field>
          <Field label="Species">
            <SpeciesAutocomplete
              value={speciesCode ?? ''}
              onChange={code => setValue('speciesCode', code)}
            />
          </Field>
          <Row>
            <Field label="Age">
              <select {...register('age')} style={inputStyle}>
                <option value="">—</option>
                {AGE_CODES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
              </select>
            </Field>
            <Field label="Sex">
              <select {...register('sex')} style={inputStyle}>
                <option value="">—</option>
                {SEX_CODES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="How Aged">
              <select {...register('howAged')} style={inputStyle}>
                <option value="">—</option>
                {HOW_AGED_CODES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
              </select>
            </Field>
            <Field label="How Aged (2nd)">
              <select {...register('howAged2')} style={inputStyle}>
                <option value="">—</option>
                {HOW_AGED_CODES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="How Sexed">
              <select {...register('howSexed')} style={inputStyle}>
                <option value="">—</option>
                {HOW_SEXED_CODES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
              </select>
            </Field>
            <Field label="How Sexed (2nd)">
              <select {...register('howSexed2')} style={inputStyle}>
                <option value="">—</option>
                {HOW_SEXED_CODES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Capture Status">
              <select {...register('bbpCode')} style={inputStyle}>
                <option value="">—</option>
                {CAPTURE_STATUS_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="WRP">
              <select {...register('wrp')} style={inputStyle}>
                <option value="">—</option>
                {WRP_CODES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
              </select>
            </Field>
          </Row>
        </Section>

        {/* ── Condition ── */}
        <Section title="Condition">
          <Row>
            <Field label="Skull">
              <select {...register('skull')} style={inputStyle}>
                <option value="">—</option>
                {SKULL_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Fat">
              <select {...register('fat')} style={inputStyle}>
                <option value="">—</option>
                {FAT_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="CP">
              <select {...register('cp')} style={inputStyle}>
                <option value="">—</option>
                {CP_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="BP">
              <select {...register('bp')} style={inputStyle}>
                <option value="">—</option>
                {BP_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </Field>
          </Row>
        </Section>

        {/* ── Molt ── */}
        <Section title="Molt">
          <Row>
            <Field label="Body Molt">
              <select {...register('bodyMolt')} style={inputStyle}>
                <option value="">—</option>
                {MOLT_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="FF Molt">
              <input {...register('ffMolt')} placeholder="e.g. A1-A3" style={inputStyle} />
            </Field>
          </Row>
          <Row>
            <Field label="TF Molt">
              <input {...register('tfMolt')} placeholder="e.g. T1-T3" style={inputStyle} />
            </Field>
            <Field label="FF Wear">
              <select {...register('ffWear')} style={inputStyle}>
                <option value="">—</option>
                {FF_WEAR_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </Field>
          </Row>
          <Field label="Juv Body Plumage">
            <select {...register('juvBodyPlumage')} style={inputStyle}>
              <option value="">—</option>
              {JUV_BODY_PLUMAGE_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </Field>
        </Section>

        {/* ── Molt Limits & Plumage ── */}
        <Section title="Molt Limits & Plumage">
          <Row>
            <Field label="P Covs">
              <select {...register('moltLimitsPCovs')} style={inputStyle}>
                <option value="">—</option>
                {MOLT_LIMITS_CODES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </Field>
            <Field label="S Covs">
              <select {...register('moltLimitsSCovs')} style={inputStyle}>
                <option value="">—</option>
                {MOLT_LIMITS_CODES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="PP">
              <select {...register('moltLimitsPP')} style={inputStyle}>
                <option value="">—</option>
                {MOLT_LIMITS_CODES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </Field>
            <Field label="SS">
              <select {...register('moltLimitsSS')} style={inputStyle}>
                <option value="">—</option>
                {MOLT_LIMITS_CODES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Tert">
              <select {...register('moltLimitsTert')} style={inputStyle}>
                <option value="">—</option>
                {MOLT_LIMITS_CODES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </Field>
            <Field label="Rec">
              <select {...register('moltLimitsRec')} style={inputStyle}>
                <option value="">—</option>
                {MOLT_LIMITS_CODES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Body Plum">
              <select {...register('moltLimitsBodyPlum')} style={inputStyle}>
                <option value="">—</option>
                {MOLT_LIMITS_CODES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </Field>
            <Field label="Non-Feather">
              <select {...register('moltLimitsNonFeather')} style={inputStyle}>
                <option value="">—</option>
                {MOLT_LIMITS_CODES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </Field>
          </Row>
        </Section>

        {/* ── Morphometrics ── */}
        <Section title="Morphometrics">
          <Row>
            <Field label="Wing (mm)">
              <input
                {...register('wing', { valueAsNumber: true })}
                type="number"
                step="0.5"
                placeholder="e.g. 67"
                style={inputStyle}
              />
            </Field>
            <Field label="Tail (mm)">
              <input
                {...register('tail', { valueAsNumber: true })}
                type="number"
                step="0.5"
                placeholder="e.g. 55"
                style={inputStyle}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Tarsus (mm)">
              <input
                {...register('tarsus', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="e.g. 22.50"
                style={inputStyle}
              />
            </Field>
            <Field label="Exp. Culmen (mm)">
              <input
                {...register('exposedCulmen', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="e.g. 11.20"
                style={inputStyle}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Body Mass (g)">
              <input
                {...register('bodyMass', { valueAsNumber: true })}
                type="number"
                step="0.1"
                placeholder="e.g. 18.3"
                style={inputStyle}
              />
            </Field>
            <Field label="Other Meas. (mm)">
              <input
                {...register('otherMeasurement', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="Add note"
                style={inputStyle}
              />
            </Field>
          </Row>
        </Section>

        {/* ── Status & Disposition ── */}
        <Section title="Status & Disposition">
          <Row>
            <Field label="Status">
              <select {...register('status')} style={inputStyle}>
                <option value="">—</option>
                {BIRD_STATUS_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Disposition">
              <select {...register('disposition')} style={inputStyle}>
                <option value="">—</option>
                {DISPOSITION_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </Field>
          </Row>
        </Section>

        {/* ── Logistics ── */}
        <Section title="Logistics">
          <Row>
            <Field label="Capture Time">
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <input {...register('captureTime')} type="time" style={{ ...inputStyle, flex: 1 }} />
                <button type="button" onClick={() => fillNow('captureTime')} style={nowBtnStyle}>Now</button>
              </div>
            </Field>
            <Field label="Release Time">
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <input {...register('releaseTime')} type="time" style={{ ...inputStyle, flex: 1 }} />
                <button type="button" onClick={() => fillNow('releaseTime')} style={nowBtnStyle}>Now</button>
              </div>
            </Field>
          </Row>
          <Row>
            <Field label="Net">
              <input {...register('net')} placeholder="Net #" style={inputStyle} />
            </Field>
            <Field label="Bander">
              <select {...register('bander')} style={inputStyle}>
                <option value="">—</option>
                {banderOptions.map(b => (
                  <option key={b.initials} value={b.initials}>{b.initials} — {b.name}</option>
                ))}
              </select>
            </Field>
          </Row>
        </Section>

        {/* ── Additional ── */}
        <Section title="Additional">
          <Row>
            <Field label="">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <input type="checkbox" {...register('featherPull')} />
                Feather Pull
              </label>
            </Field>
            <Field label="">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <input type="checkbox" {...register('bloodSample')} />
                Blood Sample
              </label>
            </Field>
          </Row>
          <Field label="Notes">
            <textarea {...register('notes')} rows={2} placeholder="Optional notes" style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>
        </Section>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button type="submit" style={btnStyle('#2d6a4f')}>Save Record</button>
          <button type="button" onClick={onCancel} style={btnStyle('#888')}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2d6a4f', marginBottom: '0.5rem', paddingBottom: '0.25rem', borderBottom: '1px solid #d8f3dc' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      {label && (
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem', color: '#333' }}>
          {label}
        </label>
      )}
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.45rem 0.5rem',
  fontSize: '1rem',
  borderRadius: 6,
  border: '1px solid #ccc',
  boxSizing: 'border-box',
}

const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '0.7rem 1.4rem',
  fontSize: '1rem',
  cursor: 'pointer',
})

const nowBtnStyle: React.CSSProperties = {
  background: '#2d6a4f',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '0.45rem 0.6rem',
  fontSize: '0.8rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const backBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#2d6a4f',
  fontSize: '1rem',
  cursor: 'pointer',
  padding: '0.25rem 0',
}
