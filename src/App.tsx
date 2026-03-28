import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import type { Session, Location, Person } from './types'
import HomeScreen from './pages/HomeScreen'
import SessionList from './pages/SessionList'
import SessionView from './pages/SessionView'
import DataManagerPage from './pages/DataManagerPage'
import LocationList from './pages/LocationList'
import LocationDetail from './pages/LocationDetail'
import PeopleList from './pages/PeopleList'
import PersonDetail from './pages/PersonDetail'
import BandInventory from './pages/BandInventory'
import AboutPage from './pages/AboutPage'
import UpdateBanner from './components/UpdateBanner'
import ErrorBoundary from './components/ErrorBoundary'

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
  | { mode: 'about' }

export default function App() {
  const [view, setView] = useState<AppView>({ mode: 'home' })
  const goHome = () => setView({ mode: 'home' })

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  let page: React.ReactNode = null

  if (view.mode === 'session') {
    page = (
      <SessionView
        session={view.session}
        onBack={() => setView({ mode: 'sessions' })}
        onHome={goHome}
        onSessionDeleted={() => setView({ mode: 'sessions' })}
        onSessionUpdated={(s) => setView({ mode: 'session', session: s })}
      />
    )
  } else if (view.mode === 'sessions') {
    page = (
      <SessionList
        onSelectSession={session => setView({ mode: 'session', session })}
        onHome={goHome}
      />
    )
  } else if (view.mode === 'export') {
    page = <DataManagerPage onHome={goHome} />
  } else if (view.mode === 'person-detail') {
    page = (
      <PersonDetail
        person={view.person}
        onBack={() => setView({ mode: 'banders' })}
        onPersonUpdated={() => setView({ mode: 'banders' })}
        onHome={goHome}
      />
    )
  } else if (view.mode === 'banders') {
    page = (
      <PeopleList
        onSelectPerson={person => setView({ mode: 'person-detail', person })}
        onHome={goHome}
      />
    )
  } else if (view.mode === 'band-inventory') {
    page = <BandInventory onHome={goHome} />
  } else if (view.mode === 'location-detail') {
    page = (
      <LocationDetail
        location={view.location}
        onBack={() => setView({ mode: 'locations' })}
        onLocationUpdated={() => setView({ mode: 'locations' })}
        onHome={goHome}
      />
    )
  } else if (view.mode === 'locations') {
    page = (
      <LocationList
        onSelectLocation={location => setView({ mode: 'location-detail', location })}
        onHome={goHome}
      />
    )
  } else if (view.mode === 'about') {
    page = <AboutPage onHome={goHome} />
  } else if (view.mode === 'feedback') {
    window.location.href = 'mailto:ks.birdnerd@pm.me?subject=BirdNerd%20Feedback'
    setView({ mode: 'home' })
  } else {
    page = <HomeScreen onNavigate={(mode) => setView({ mode } as AppView)} />
  }

  return (
    <ErrorBoundary>
      {page}
      {needRefresh && <UpdateBanner onUpdate={() => updateServiceWorker(true)} />}
    </ErrorBoundary>
  )
}
