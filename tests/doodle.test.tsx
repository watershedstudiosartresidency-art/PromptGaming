import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'break-room', component: 'Pane', requestId: 'break-room',
  props: { title: 'Break room', isFocused: false, bodyColumns: 40, placement: 'dock', scroll: { offset: 0, bodyRows: 2 }, view: {} },
} as const
const text = (n: any): string =>
  typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join('') : n?.props?.children !== undefined ? text(n.props.children) : n?.children ? text(n.children) : ''
// paint cells show as '#', using each run's background colour
const paint = (n: any): string => {
  if (typeof n === 'string') return n
  if (Array.isArray(n)) return n.map(paint).join('')
  const bg = n?.props?.backgroundColor ?? n?.backgroundColor
  const kids = n?.props?.children ?? n?.children
  if (bg) return (bg === "text" ? "O" : "#").repeat([...text(n)].length)
  return kids !== undefined ? paint(kids) : ""
}

test('doodle: picture, fill inside the lines, brushes, undo', async ($, on) => {
  on('command.register', () => ({ value: { command: 'break-room' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.resize({ columns: 40, rows: 1, in: 'room' })
  await ui.key({ key: '3', in: 'room' })
  const lines = async () => {
    const tree: any = await ui.drawn({ in: 'room' })
    return (tree.props?.children ?? tree.children) as any[]
  }
  const show = async (label: string) => console.log(`--- ${label}\n` + (await lines()).map(paint).join('\n'))

  // pick the smiley (toolbar 3 = screen row 6), choose fill, click inside the face
  await ui.pointer({ type: 'down', x: 3, y: 6, button: 'left', in: 'room' })
  await ui.pointer({ type: 'up', x: 3, y: 6, button: 'left', in: 'room' })
  await ui.key({ key: 'f', in: 'room' })
  await ui.pointer({ type: 'down', x: 20, y: 7 + 9, button: 'left', in: 'room' })
  await ui.pointer({ type: 'up', x: 20, y: 7 + 9, button: 'left', in: 'room' })
  await show('smiley, filled inside')
  const all = (await lines()).map(paint).join('\n')
  expect(all).toContain('O') // the outline
  expect(all).toContain('#') // the fill
  const outsideRow = paint((await lines())[7]) // top canvas row is outside the face
  expect(outsideRow.slice(2, 8)).not.toContain('#')

  // undo removes the fill
  await ui.key({ key: 'u', in: 'room' })
  expect((await lines()).slice(7, -2).map(paint).join('\n')).not.toContain('#')

  // blank canvas, big rainbow brush with mirror, fast drag
  for (let i = 0; i < 16; i++) await ui.key({ key: "n", in: "room" })
  await ui.key({ key: 'b', in: 'room' })
  await ui.key({ key: 'r', in: 'room' })
  await ui.key({ key: 'm', in: 'room' })
  await ui.pointer({ type: 'down', x: 4, y: 10, button: 'left', in: 'room' })
  await ui.pointer({ type: 'move', x: 14, y: 16, button: 'left', in: 'room' })
  await ui.pointer({ type: 'up', x: 14, y: 16, button: 'left', in: 'room' })
  await show('mirror rainbow line')
  await ui.unmount()
})
