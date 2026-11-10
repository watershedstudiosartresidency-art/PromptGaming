import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'break-room', component: 'Pane', requestId: 'break-room',
  props: { title: 'Break room', isFocused: false, bodyColumns: 40, placement: 'dock', scroll: { offset: 0, bodyRows: 2 }, view: {} },
} as const

const text = (n: any): string =>
  typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join('') : n?.props?.children !== undefined ? text(n.props.children) : n?.children ? text(n.children) : ''

test('starfall frames', async ($, on) => {
  on('command.register', () => ({ value: { command: 'break-room' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.resize({ columns: 40, rows: 1, in: 'room' })
  await $.turn.start({ text: 'hi', turnId: 't1' })
  const frame = async (label: string) => {
    const tree: any = await ui.drawn({ in: 'room' })
    const lines: any[] = tree.props?.children ?? tree.children
    console.log(`--- ${label}\n` + lines.map(text).join('\n'))
  }
  await frame('start')
  await ui.advance(2000)
  await frame('after 2s')
  await ui.pointer({ type: 'move', x: 5, y: 10, in: 'room' })
  await ui.advance(500)
  await frame('after hover to x=5')
  await ui.advance(8000)
  await frame('after 10s')
  await ui.unmount()
})
