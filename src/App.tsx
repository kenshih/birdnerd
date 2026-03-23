import { useState } from 'react'
import type { Session, Location, Person } from './types'
import HomeScreen from './pages/HomeScreen'
import SessionList from './pages/SessionList'
import SessionView from './pages/SessionView'
import PlaceholderPage from './pages/PlaceholderPage'
import DataManagerPage from './pages/DataManagerPage'
import LocationList from './pages/LocationList'
import LocationDetail from './pages/LocationDetail'
import PeopleList from './pages/PeopleList'
import PersonDetail from './pages/PersonDetail'

type AppView =
  | { mode: 'home' }
  | { mode: 'sessions' }
  | { mode: 'session'; session: Session }
  | { mode: 'banders' }
  | { mode: 'person-detail'; person: Person }
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
        onHome={goHome}
        onSessionDeleted={() => setView({ mode: 'sessions' })}
        onSessionUpdated={(s) => setView({ mode: 'session', session: s })}
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
    return <DataManagerPage onHome={goHome} />
  }

  if (view.mode === 'person-detail') {
    return (
      <PersonDetail
        person={view.person}
        onBack={() => setView({ mode: 'banders' })}
        onPersonUpdated={() => setView({ mode: 'banders' })}
        onHome={goHome}
      />
    )
  }

  if (view.mode === 'banders') {
    return (
      <PeopleList
        onSelectPerson={person => setView({ mode: 'person-detail', person })}
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
        onHome={goHome}
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
