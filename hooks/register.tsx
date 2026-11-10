import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Activity } from '../types'

const PANE = 'break-room'
const TITLE = 'Break room'
const activity = atom(
  { plugin: 'break-room', key: 'activity' } as const,
  { working: false, since: 0 } as Activity,
  { shape: 'activity-1' },
)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'break-room',
      description: 'Open the break room panel (game, breathing, doodle)',
    })
    void $.ui.open({ id: PANE, title: TITLE })
    return next(e)
  })

  on('command.run', { command: 'break-room' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'Break room opened.' }
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      await update($, activity, () => ({ working: true, since: Date.now() }))
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId === undefined) {
      await update($, activity, () => ({ working: false, since: Date.now() }))
    }
    return done
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const els = $.ui.resolve(e)
    const { Box, Text } = els
    const now = await read($, activity)
    // Exactly the pane's room, never more (one row of slack), so the region and
    // the pane can't push each other's size back and forth.
    const columns = Math.max(1, e.props.bodyColumns ?? e.viewport?.columns ?? 40)
    // Where the pane reports too few rows (it can size itself to its content),
    // ask for a comfortable fixed height and let the pane scroll if it must.
    const body = (e.props.scroll?.bodyRows ?? 0) - 1
    const rows = body >= 16 ? body : 26

    if (!('Client' in els)) {
      return (
        <Box flexDirection="column">
          <Text bold>{now.working ? 'Claude is working…' : 'Your turn'}</Text>
          <Text dimColor>The break room games need the desktop app or the terminal.</Text>
        </Box>
      )
    }
    const { Client } = els as typeof els & { Client: any }
    return (
      <Client
        key="room"
        module="./panel.tsx"
        props={{ working: now.working, since: now.since, rows }}
        width={columns}
        height={rows}
      />
    )
  })
}
