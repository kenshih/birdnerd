import { useState } from 'react'
import type { Session, Location } from './types'
import HomeScreen from './pages/HomeScreen'
import SessionList from './pages/SessionList'
import SessionView from './pages/SessionView'
import PlaceholderPage from './pages/PlaceholderPage'
import ExportPage from './pages/ExportPage'
import LocationList from './pages/LocationList'
import LocationDetail from './pages/LocationDetail'

type AppView =
  | { mode: 'home' }
  | { mode: 'sessions' }
  | { mode: 'session'; session: Session }
  | { mode: 'banders' }
  | { mode: 'band-inventory' }
  | { mode: 'locations' }
  | { mode: 'location-detail'; location: Location }
  | { mode: 'export' }
  | { mode: 'feedback' }

export default function App() {
  const [view, setView] = useState<AppView>({ mode: 'home' })
  const goHome = () => setView({ mode: 'home' })

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
        onHome={goHome}
      />
    )
  }

  if (view.mode === 'export') {
    return <ExportPage onHome={goHome} />
  }

  if (view.mode === 'banders') {
    return (
      <PlaceholderPage
        title="People"
        description="Manage team members and their roles (Bander, Extractor, Data Entry, etc.)."
        onHome={goHome}
      />
    )
  }

  if (view.mode === 'band-inventory') {
    return (
      <PlaceholderPage
        title="Band Inventory"
        description="Add, track, and manage USGS BBL band stock. View deployed vs available bands by size and type."
        onHome={goHome}
      />
    )
  }

  if (view.mode === 'location-detail') {
    return (
      <LocationDetail
        location={view.location}
        onBack={() => setView({ mode: 'locations' })}
        onLocationUpdated={() => setView({ mode: 'locations' })}
      />
    )
  }

  if (view.mode === 'locations') {
    return (
      <LocationList
        onSelectLocation={location => setView({ mode: 'location-detail', location })}
        onHome={goHome}
      />
    )
  }

  if (view.mode === 'feedback') {
    window.location.href = 'mailto:ks.birdnerd@pm.me?subject=BirdNerd%20Feedback'
    setView({ mode: 'home' })
    return null
  }

  return (
    <HomeScreen
      onNavigate={(mode) => setView({ mode } as AppView)}
    />
  )
}
