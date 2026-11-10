import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'break-room', component: 'Pane', requestId: 'break-room',
  props: { title: 'Break room', isFocused: false, bodyColumns: 40, placement: 'dock', scroll: { offset: 0, bodyRows: 2 }, view: {} },
} as const
const text = (n: any): string =>
  typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join('') : n?.props?.children !== undefined ? text(n.props.children) : n?.children ? text(n.children) : ''
const paint = (n: any): string => {
  if (typeof n === 'string') return n
  if (Array.isArray(n)) return n.map(paint).join('')
  const bg = n?.props?.backgroundColor ?? n?.backgroundColor
  const kids = n?.props?.children ?? n?.children
  if (bg) return (bg === 'text' ? 'O' : '#').repeat([...text(n)].length)
  return kids !== undefined ? paint(kids) : ''
}

// Every picture's outline must be closed: filling the outside leaves the inside unpainted.
test('every picture fits and keeps a fill outside its lines', async ($, on) => {
  on('command.register', () => ({ value: { command: 'break-room' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.resize({ columns: 40, rows: 1, in: 'room' })
  await ui.key({ key: '3', in: 'room' })
  await ui.key({ key: 'f', in: 'room' })
  const canvas = async () => {
    const tree: any = await ui.drawn({ in: 'room' })
    const lines: any[] = tree.props?.children ?? tree.children
    return lines.slice(7, -2).map(l => [...paint(l)].slice(2, -2).join(''))
  }
  const names: string[] = []
  for (let i = 0; i < 16; i++) {
    await ui.key({ key: 'n', in: 'room' }) // next picture (starts on a clean page)
    const bar: any = await ui.find({ type: 'Text', text: /pic: /, in: 'room' })
    names.push(bar?.text ?? '?')
    const before = await canvas()
    const outline = before.join('').split('O').length - 1
    expect(outline).toBeGreaterThan(10)
    // the picture's outline must not touch the canvas edge
    expect(before[0]).not.toContain('O')
    expect(before[before.length - 1]).not.toContain('O')
    // fill the outside from the top-left corner
    await ui.pointer({ type: 'down', x: 2, y: 7, button: 'left', in: 'room' })
    await ui.pointer({ type: 'up', x: 2, y: 7, button: 'left', in: 'room' })
    const after = await canvas()
    const unpainted = after.join('').replace(/[#O]/g, '').length
    if (unpainted === 0) console.log('LEAKS:', names[names.length - 1])
    expect(unpainted).toBeGreaterThan(0)
  }
  console.log(names.join(' | '))
  await ui.unmount()
})
