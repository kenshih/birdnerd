/**
 * TEMPORARY Phase 28 local event-log hand-off. This in-memory append-only log
 * proves the admission boundary without a database or network transport.
 * Phase 29 replaces it with the durable local event/projection store; Phase 30
 * adds the Supabase provider adapter, cursors, retries, and receipts.
 */

import { assertDraftEvent, type DomainEvent } from '@birdnerd/events'

export type EventAdmission = (candidate: DomainEvent, existingEvents: readonly DomainEvent[]) =>
  | { accepted: true }
  | { accepted: false; reason: string }

export type AppendResult =
  | { kind: 'accepted'; event: DomainEvent }
  | { kind: 'duplicate'; event: DomainEvent }
  | { kind: 'rejected'; event: DomainEvent; reason: string }

export class LocalEventLog {
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
    assertDraftEvent(event)
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
