import { useState } from 'react'
import type { Session } from './types'
import SessionList from './pages/SessionList'
import SessionView from './pages/SessionView'

type AppView = { mode: 'sessions' } | { mode: 'session'; session: Session }

export default function App() {
  const [view, setView] = useState<AppView>({ mode: 'sessions' })

  if (view.mode === 'session') {
    return (
      <SessionView
        session={view.session}
        onBack={() => setView({ mode: 'sessions' })}
      />
    )
  }

  return (
    <SessionList
      onSelectSession={session => setView({ mode: 'session', session })}
    />
  )
}
