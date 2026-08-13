/**
 * Generic append-only Event Log state. It knows portable Event Contracts but
 * never banding decisions, projections, IndexedDB, or Field UI. The Field app
 * supplies its durable storage adapter; provider exchange remains Phase 30.
 */

import { assertEvent, type DomainEvent } from '@birdnerd/events'

export type EventAdmission = (candidate: DomainEvent, existingEvents: readonly DomainEvent[]) =>
  | { accepted: true }
  | { accepted: false; reason: string }

export type AppendResult =
  | { kind: 'accepted'; event: DomainEvent }
  | { kind: 'duplicate'; event: DomainEvent }
  | { kind: 'rejected'; event: DomainEvent; reason: string }

/**
 * In-memory command-side view of an append-only Event Log. A caller persists
 * accepted results before exposing a rebuilt projection; retries of identical
 * immutable events remain duplicates rather than second writes.
 */
export class EventLog {
  private readonly events: DomainEvent[]

  constructor(initialEvents: readonly DomainEvent[] = [], private readonly admit: EventAdmission) {
    this.events = []
    for (const event of initialEvents) {
      const result = this.append(event)
      if (result.kind === 'rejected') throw new Error(`Initial Event Log entry was rejected: ${result.reason}`)
    }
  }

  snapshot(): readonly DomainEvent[] {
    return [...this.events]
  }

  append(event: DomainEvent): AppendResult {
    assertEvent(event)
    const existing = this.events.find(candidate => candidate.event_id === event.event_id)
    if (existing) {
      if (JSON.stringify(existing) === JSON.stringify(event)) return { kind: 'duplicate', event: existing }
      return { kind: 'rejected', event, reason: 'Event ID conflicts with an existing immutable event.' }
    }

    const decision = this.admit(event, this.snapshot())
    if (!decision.accepted) return { kind: 'rejected', event, reason: decision.reason }
    this.events.push(event)
    return { kind: 'accepted', event }
  }

  appendAll(events: readonly DomainEvent[]): AppendResult[] {
    return events.map(event => this.append(event))
  }
}
