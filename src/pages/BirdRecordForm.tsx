import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import type { BirdRecord, Session } from '../types'
import { saveRecord } from '../db'
import { AGE_CODES, SEX_CODES, SKULL_CODES, FAT_CODES, MOLT_CODES, CAPTURE_STATUS_CODES } from '../data/codes'
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

export default function BirdRecordForm({ session, record, onSaved, onCancel }: Props) {
  const { register, handleSubmit, setValue, watch, reset } = useForm<FormValues>()

  useEffect(() => {
    if (record) {
      reset({
        bandNumber: record.bandNumber,
        speciesCode: record.speciesCode,
        age: record.age,
        sex: record.sex,
        howAged: record.howAged,
        howSexed: record.howSexed,
        bbpCode: record.bbpCode,
        skull: record.skull,
        cp: record.cp,
        bp: record.bp,
        fat: record.fat,
        bodyMolt: record.bodyMolt,
        ffMolt: record.ffMolt,
        tfMolt: record.tfMolt,
        ffWear: record.ffWear,
        moltLimitsPlumage: record.moltLimitsPlumage,
        wing: record.wing,
        bodyMass: record.bodyMass,
        status: record.status,
        captureTime: record.captureTime,
        date: record.date,
        station: record.station ?? session.station,
        net: record.net,
        bander: record.bander,
        notes: record.notes,
      })
    } else {
      reset({
        station: session.station,
        date: session.date,
      })
    }
  }, [record, session, reset])

  const speciesCode = watch('speciesCode')

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
              <input {...register('howAged')} placeholder="e.g. S, W" style={inputStyle} />
            </Field>
            <Field label="How Sexed">
              <input {...register('howSexed')} placeholder="e.g. CP, P" style={inputStyle} />
            </Field>
          </Row>
          <Field label="Capture Status">
            <select {...register('bbpCode')} style={inputStyle}>
              <option value="">—</option>
              {CAPTURE_STATUS_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </Field>
        </Section>

        <Section title="Condition">
          <Row>
            <Field label="Skull (0–6/X)">
              <select {...register('skull')} style={inputStyle}>
                <option value="">—</option>
                {SKULL_CODES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </Field>
            <Field label="Fat (0–5/T)">
              <select {...register('fat')} style={inputStyle}>
                <option value="">—</option>
                {FAT_CODES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="CP">
              <input {...register('cp')} placeholder="0–3" style={inputStyle} />
            </Field>
            <Field label="BP">
              <input {...register('bp')} placeholder="0–5" style={inputStyle} />
            </Field>
          </Row>
        </Section>

        <Section title="Molt">
          <Row>
            <Field label="Body Molt">
              <select {...register('bodyMolt')} style={inputStyle}>
                <option value="">—</option>
                {MOLT_CODES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
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
              <input {...register('ffWear')} placeholder="1–5" style={inputStyle} />
            </Field>
          </Row>
          <Field label="Molt Limits & Plumage">
            <input {...register('moltLimitsPlumage')} placeholder="Notes" style={inputStyle} />
          </Field>
        </Section>

        <Section title="Measurements">
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
            <Field label="Body Mass (g)">
              <input
                {...register('bodyMass', { valueAsNumber: true })}
                type="number"
                step="0.1"
                placeholder="e.g. 18.3"
                style={inputStyle}
              />
            </Field>
          </Row>
        </Section>

        <Section title="Logistics">
          <Row>
            <Field label="Capture Time">
              <input {...register('captureTime')} type="time" style={inputStyle} />
            </Field>
            <Field label="Net">
              <input {...register('net')} placeholder="Net #" style={inputStyle} />
            </Field>
          </Row>
          <Row>
            <Field label="Status">
              <input {...register('status')} placeholder="e.g. A" style={inputStyle} />
            </Field>
            <Field label="Bander">
              <input {...register('bander')} placeholder="Initials" style={inputStyle} />
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
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem', color: '#333' }}>
        {label}
      </label>
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

const backBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#2d6a4f',
  fontSize: '1rem',
  cursor: 'pointer',
  padding: '0.25rem 0',
}
