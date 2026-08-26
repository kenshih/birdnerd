import type { Meta, StoryObj } from '@storybook/react-vite'
import type { CSSProperties } from 'react'

function StorybookWelcome() {
  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.kicker}>BirdNerd Field</p>
        <h1 style={styles.heading}>Storybook is ready.</h1>
        <p style={styles.body}>
          This temporary starter example confirms the local visual-review catalog is running.
        </p>
      </section>
    </main>
  )
}

const meta = {
  title: 'Setup/Welcome',
  component: StorybookWelcome,
} satisfies Meta<typeof StorybookWelcome>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

const styles = {
  page: {
    minHeight: '100dvh',
    display: 'grid',
    placeItems: 'center',
    padding: '1.5rem',
  },
  card: {
    width: 'min(100%, 34rem)',
    padding: '1.5rem',
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px rgb(0 0 0 / 10%)',
  },
  kicker: {
    margin: 0,
    color: '#276749',
    fontSize: '0.8rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  heading: {
    margin: '0.5rem 0',
    fontSize: '1.5rem',
  },
  body: {
    margin: 0,
    lineHeight: 1.5,
  },
} satisfies Record<string, CSSProperties>
