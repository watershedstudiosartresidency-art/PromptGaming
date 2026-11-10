import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'break-room',
  component: 'Pane',
  requestId: 'break-room',
  props: {
    title: 'Break room',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 2 },
    view: {},
  },
  viewport: { columns: 40, rows: 30 },
} as const

test('panel runs while Claude works and pauses after', async ($, on) => {
  on('command.register', () => ({ value: { command: 'break-room' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: 'done' }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.resize({ columns: 40, rows: 28 })
  expect((await ui.find({ type: 'Text', text: /Your turn/, in: 'room' }))?.text).toMatch(/Claude is done/)

  await $.turn.start({ text: 'hi', turnId: 't1' })
  await ui.advance(500)
  expect((await ui.find({ type: 'Text', text: /Claude is working/, in: 'room' }))?.text).toMatch(/Claude is working/)
  expect((await ui.find({ type: 'Text', text: /Score/, in: 'room' }))?.text).toMatch(/Score 0/)

  await ui.pointer({ type: 'down', x: 14, y: 1, button: 'left', in: 'room' })
  await ui.advance(1000)
  expect((await ui.find({ type: 'Text', text: /Breathe in/, in: 'room' }))?.text).toMatch(/Breathe in/)

  await ui.key({ key: '3', in: 'room' })
  await ui.pointer({ type: 'down', x: 5, y: 12, button: 'left' })
  await ui.pointer({ type: 'move', x: 9, y: 12, button: 'left' })
  await ui.pointer({ type: 'up', x: 9, y: 12, button: 'left' })
  expect(await ui.find({ type: 'Text', text: /Drag to paint/, in: 'room' })).toBeTruthy()

  await $.turn.complete({ turnId: 't1', answer: 'done', durationMs: 1000, isAborted: false, reason: 'end_turn' } as any)
  await ui.advance(200)
  expect((await ui.find({ type: 'Text', text: /Your turn/, in: 'room' }))?.text).toMatch(/Claude is done/)
  await ui.unmount()
})

test('every row is exactly the panel width, on narrow and wide panes', async ($, on) => {
  on('command.register', () => ({ value: { command: 'break-room' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  for (const [columns, rows] of [[30, 12], [40, 28], [70, 40]]) {
    for (const k of ['1', '2', '3']) {
      await ui.resize({ columns, rows: 1, in: "room" })
      await ui.key({ key: k, in: 'room' })
      const tree: any = await ui.drawn({ in: 'room' })
      const text = (n: any): string =>
        typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join('') : n?.props?.children !== undefined ? text(n.props.children) : (n?.children ? text(n.children) : '')
      const lines: any[] = tree.props?.children ?? tree.children
      expect(lines.length).toBe(26)
      for (const l of lines) expect([...text(l)].length).toBe(columns)
    }
  }
  await ui.unmount()
})
