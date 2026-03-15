import { useState } from 'react'
import type { Session } from './types'
import HomeScreen from './pages/HomeScreen'
import SessionList from './pages/SessionList'
import SessionView from './pages/SessionView'

type AppView = { mode: 'home' } | { mode: 'sessions' } | { mode: 'session'; session: Session }

export default function App() {
  const [view, setView] = useState<AppView>({ mode: 'home' })

  if (view.mode === 'session') {
    return (
      <SessionView
        session={view.session}
        onBack={() => setView({ mode: 'sessions' })}
      />
    )
  }

  if (view.mode === 'sessions') {
    return (
      <SessionList
        onSelectSession={session => setView({ mode: 'session', session })}
        onHome={() => setView({ mode: 'home' })}
      />
    )
  }

  return <HomeScreen onStartBanding={() => setView({ mode: 'sessions' })} />
}
