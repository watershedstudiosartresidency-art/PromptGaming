import type { ClientModule, ClientPointerEvent, ClientKeyEvent } from 'claude-code'

// The whole panel is one grid of monospace cells, drawn as rows of Text runs.
// No Buttons or Box borders: on the desktop those are not one cell tall, which
// breaks the alignment and where clicks land. Every glyph used is single-width.

type Props = { working: boolean; since: number; rows?: number }
type Tab = 'game' | 'breathe' | 'doodle'
type Star = { x: number; y: number; gold: boolean }
type Pop = { x: number; y: number; text: string; age: number }

type S = {
  tab: Tab
  tick: number
  basket: number
  stars: Star[]
  pops: Pop[]
  score: number
  best: number
  misses: number
  breathMs: number
  cycles: number
  ink: Record<string, number>
  color: number // -1 = eraser, -2 = rainbow
  working: boolean
  brush: Brush
  mirror: boolean
  history: Record<string, number>[]
  last: { x: number; y: number } | null
  hue: number
  idea: number // index into IDEAS, -1 = none
  pic: number // index into PICS, -1 = blank canvas
  picMode: 'colour' | 'trace'
}
type Brush = 'pen' | 'big' | 'spray' | 'fill'

type Cell = { ch: string; color?: string; bg?: string; bold?: boolean; dim?: boolean }
type Line = Cell[]
// row: which line of the card, 0 = the info line, 1 = the field's first line...
type Hit = { x0: number; x1: number; act: () => void; row?: number }

// rows: 0 title, 1 tabs, 2 frame top, 3 info, 4.. field, then frame bottom, hint
const ROW_TABS = 1
const ROW_INFO = 3
const FIELD_TOP = 4
const FIELD_LEFT = 2
const CHROME_ROWS = 6
const MIN_W = 26
const MIN_H = 12

const TICK = 100
// A solid paddle of spaces on a coloured background: spaces are always one
// cell wide, where line-drawing glyphs can draw wider in the desktop's font.
const BASKET = '        '
const BW = BASKET.length
const PADDLE = ['#ff4d4f', '#ff7a45', '#ffc53d', '#73d13d', '#36cfc9', '#4096ff', '#9254de', '#f759ab']
const LIVES = 3
const PALETTE = ['#ff7a45', '#ffc53d', '#73d13d', '#36cfc9', '#4096ff', '#9254de', '#f759ab', '#f0f0f0']
const PHASES = [
  { name: 'Breathe in', ms: 4000, color: 'suggestion' },
  { name: 'Hold', ms: 4000, color: 'claude' },
  { name: 'Breathe out', ms: 4000, color: 'success' },
  { name: 'Rest', ms: 4000, color: 'subtle' },
] as const
const CYCLE = PHASES.reduce((n, p) => n + p.ms, 0)
const TABS: { id: Tab; label: string; n: string }[] = [
  { id: 'game', label: 'Starfall', n: '1' },
  { id: 'breathe', label: 'Breathe', n: '2' },
  { id: 'doodle', label: 'Doodle', n: '3' },
]

const fresh = (): S => ({
  tab: 'game',
  tick: 0,
  basket: 0,
  stars: [],
  pops: [],
  score: 0,
  best: 0,
  misses: 0,
  breathMs: 0,
  cycles: 0,
  ink: {},
  color: 0,
  working: false,
  brush: 'pen',
  mirror: false,
  history: [],
  last: null,
  hue: 0,
  idea: -1,
  pic: -1,
  picMode: 'colour',
})

const IDEAS = [
  'a cat in space', 'your dream house', 'a happy cloud', 'a sea monster', 'a tiny robot',
  'a sunset over hills', 'a pizza planet', 'a sleeping dragon', 'a snack with a face',
  'a rocket ship', 'a jellyfish', 'a city at night', 'a rainbow fish', 'a hot air balloon',
  'a mushroom house', 'a self-portrait', 'a flower garden', 'an alien pet',
]
const DOODLE_TOOLBARS = 3 // toolbar rows above the canvas, inside the field

// 90s-style pictures to colour in or trace. '#' is outline; cells are about
// twice as tall as wide, so shapes are drawn twice as wide as they are tall.
const PICS: { name: string; art: string[] }[] = [
  {
    name: 'smiley',
    art: [
      '       ##########       ',
      '    ###          ###    ',
      '  ##                ##  ',
      ' #     ##      ##     # ',
      '#      ##      ##      #',
      '#                      #',
      '#   #              #   #',
      ' #   ##          ##   # ',
      '  ##   ##########   ##  ',
      '    ###          ###    ',
      '       ##########       ',
    ],
  },
  {
    name: 'cassette',
    art: [
      '##########################',
      '#  ####################  #',
      '#  #                  #  #',
      '#  #   ###      ###   #  #',
      '#  #  #   #    #   #  #  #',
      '#  #   ###      ###   #  #',
      '#  #                  #  #',
      '#  ####################  #',
      '#     ##############     #',
      '#    #              #    #',
      '##########################',
    ],
  },
  {
    name: 'heart',
    art: [
      '   #####     #####   ',
      ' ##     ## ##     ## ',
      '#         #         #',
      '#                   #',
      ' ##               ## ',
      '   ##           ##   ',
      '     ##       ##     ',
      '       ##   ##       ',
      '         ###         ',
    ],
  },
  {
    name: 'star',
    art: [
      '            #            ',
      '           # #           ',
      '          #   #          ',
      '##########     ##########',
      '  ##                 ##  ',
      '     ##           ##     ',
      '      #           #      ',
      '     #     ###     #     ',
      '    #   ###   ###   #    ',
      '   # ###         ### #   ',
      '   ##               ##   ',
    ],
  },
  {
    name: 'shades',
    art: [
      ' ########################## ',
      '#           ####           #',
      '#          #    #          #',
      ' #        #      #        # ',
      '  #      #        #      #  ',
      '   ######          ######   ',
    ],
  },
  {
    name: 'bolt',
    art: [
      '        #########',
      '       #       # ',
      '      #       #  ',
      '     #       #   ',
      '    #       #####',
      '   #####        #',
      '       #       # ',
      '      #      #   ',
      '     #     #     ',
      '    #    #       ',
      '   #   #         ',
      '   ###           ',
    ],
  },
  {
    name: 'pizza',
    art: [
      '##########################',
      ' #                      # ',
      '  #   ##        ##     #  ',
      '   #  ##   ##   ##    #   ',
      '    #      ##        #    ',
      '     #          ##  #     ',
      '      #   ##    ## #      ',
      '       #  ##      #       ',
      '        #        #        ',
      '         #  ##  #         ',
      '          # ## #          ',
      '           #  #           ',
      '            ##            ',
    ],
  },
  {
    name: 'floppy',
    art: [
      '######################',
      '#   ##########   ##  #',
      '#   #        #   ##  #',
      '#   #        #       #',
      '#   ##########       #',
      '#                    #',
      '#  ################  #',
      '#  #              #  #',
      '#  #              #  #',
      '#  #              #  #',
      '######################',
    ],
  },
  {
    name: 'gamepad',
    art: [
      '   ######################   ',
      ' ##                      ## ',
      '#     #              ##    #',
      '#   #####   ## ##  ##  ##  #',
      '#     #              ##    #',
      ' #         ######         # ',
      '  #      ##      ##      #  ',
      '   ######          ######   ',
    ],
  },
  {
    name: 'ice cream',
    art: [
      '     ######     ',
      '   ##      ##   ',
      '  #          #  ',
      ' #            # ',
      ' #            # ',
      '################',
      ' #            # ',
      '  #          #  ',
      '   #        #   ',
      '    #      #    ',
      '     #    #     ',
      '      #  #      ',
      '       ##       ',
    ],
  },
  {
    name: 'rainbow',
    art: [
      '         ############         ',
      '      ###            ###      ',
      '    ##    ##########    ##    ',
      '   #    ##          ##    #   ',
      '  #   ##   ########   ##   #  ',
      ' #   #   ##        ##   #   # ',
      ' #  #   #            #   #  # ',
      ' #  #   #            #   #  # ',
      ' ############################ ',
    ],
  },
  {
    name: 'cat',
    art: [
      ' #                      # ',
      ' ##                    ## ',
      ' # #                  # # ',
      ' #  ##################  # ',
      ' #                      # ',
      ' #    ##          ##    # ',
      ' #    ##          ##    # ',
      ' #          ##          # ',
      ' #     #    ##    #     # ',
      '  #        ####        #  ',
      '   ####################   ',
    ],
  },
  {
    name: 'alien',
    art: [
      '       ########       ',
      '    ###        ###    ',
      '  ##              ##  ',
      ' #                  # ',
      '#   ######  ######   #',
      '#   #####    #####   #',
      ' #   ###      ###   # ',
      '  #                #  ',
      '   ##            ##   ',
      '     ##   ##   ##     ',
      '       ##    ##       ',
      '         ####         ',
    ],
  },
  {
    name: 'tv',
    art: [
      '       #          #       ',
      '        #        #        ',
      '         #      #         ',
      '##########################',
      '#  ###############       #',
      '#  #             #  ###  #',
      '#  #             #  # #  #',
      '#  #             #  ###  #',
      '#  #             #       #',
      '#  ###############  ###  #',
      '##########################',
      '   ##                ##   ',
    ],
  },
  {
    name: 'music',
    art: [
      '     #########',
      '     #       #',
      '     #########',
      '     #       #',
      '     #       #',
      '     #       #',
      '  ####    ####',
      ' #   #   #   #',
      ' #   #   #   #',
      '  ###     ### ',
    ],
  },
  {
    name: 'butterfly',
    art: [
      '  ####     #  #     ####  ',
      ' #    ##    ##    ##    # ',
      '#       ##  ##  ##       #',
      '#         ######         #',
      '#          ####          #',
      ' #         ####         # ',
      '  ####     ####     ####  ',
      ' #    ##   ####   ##    # ',
      '#        ##    ##        #',
      ' #      #  ####  #      # ',
      '  ######    ##    ######  ',
    ],
  },
]

// The chosen picture's outline cells on a canvas of cw x ch, centred.
function outline(pic: number, cw: number, ch: number): Set<string> {
  const cells = new Set<string>()
  const p = PICS[pic]
  if (!p) return cells
  const ox = Math.floor((cw - p.art[0].length) / 2)
  const oy = Math.max(0, Math.floor((ch - p.art.length) / 2))
  p.art.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#' && ox + x >= 0 && ox + x < cw && oy + y < ch) cells.add(`${ox + x},${oy + y}`)
    }
  })
  return cells
}

// ---- grid helpers ----------------------------------------------------------

const blank = (w: number): Line => Array.from({ length: w }, () => ({ ch: ' ' }))

function put(line: Line, x: number, text: string, style: Omit<Cell, 'ch'> = {}) {
  for (let i = 0; i < text.length; i++) {
    if (x + i >= 0 && x + i < line.length) line[x + i] = { ch: text[i], ...style }
  }
  return x + text.length
}

const same = (a: Cell, b: Cell) => a.color === b.color && a.bg === b.bg && !!a.bold === !!b.bold && !!a.dim === !!b.dim

function drawLine(key: string, line: Line, Box: any, Text: any) {
  const segs: any[] = []
  let i = 0
  while (i < line.length) {
    const c = line[i]
    let text = c.ch
    let j = i + 1
    while (j < line.length && same(line[j], c)) text += line[j++].ch
    segs.push(
      <Text key={`${key}-${i}`} mono color={c.color} backgroundColor={c.bg} bold={c.bold} dimColor={c.dim}>
        {text}
      </Text>,
    )
    i = j
  }
  return (
    <Box key={key} flexDirection="row" flexWrap="nowrap" height={1} overflow="hidden">
      {segs}
    </Box>
  )
}

// ---- the module ------------------------------------------------------------

const Panel: ClientModule<Props, S> = (props, surface) => {
  const { Box, Text } = surface.elements
  const working = !!props?.working
  // Draw exactly the region's size, never bigger: drawing past it makes the
  // pane re-measure, which changes the region again, in a loop.
  const W = surface.columns
  // The desktop sizes the region to what is drawn, so the height comes from
  // the pane (via props), never from the measured region.
  const H = Math.max(MIN_H, props?.rows ?? 26)
  if (W === 0 || H === 0) return <Text> </Text>
  if (W < MIN_W || H < MIN_H) {
    const why = W < MIN_W ? `needs ${MIN_W} wide, has ${W}` : `needs ${MIN_H} tall, has ${H}`
    const msg = `Too small: ${why}`
    return (
      <Text color="subtle" wrap="truncate-end">
        {msg.slice(0, W)}
      </Text>
    )
  }
  const fw = W - 4
  const fh = Math.max(6, H - CHROME_ROWS)

  let s = surface.state
  if (s === undefined) {
    s = fresh()
    s.basket = Math.floor((fw - BW) / 2)
    surface.every(TICK, () => {
      const cur = surface.state
      if (!cur || !cur.working) return
      surface.setState(step(cur, fw, fh))
    })
    surface.setState(s)
  }
  if (s.working !== working) {
    s = { ...s, working }
    surface.setState(s)
  }
  const st = s
  const set = (patch: Partial<S>) => surface.setState({ ...(surface.state ?? st), ...patch })

  // title row
  const title = blank(W)
  put(title, 1, 'Break room', { bold: true })
  const pill = working ? ' ● Claude is working ' : ' Your turn · Claude is done '
  put(title, W - pill.length, pill, working ? { color: 'claude', bold: true } : { color: 'inverseText', bg: 'claude', bold: true })

  // tab row, with click targets
  const tabs = blank(W)
  const tabHits: Hit[] = []
  let x = 1
  for (const t of TABS) {
    const label = ` ${t.n} ${t.label} `
    const on = st.tab === t.id
    const x0 = x
    x = put(tabs, x, label, on ? { color: 'inverseText', bg: 'claude', bold: true } : { color: 'subtle' })
    tabHits.push({ x0, x1: x, act: () => set({ tab: t.id }) })
    x += 1
  }

  // the card
  const live = working || st.tab === 'doodle'
  const frameColor = live ? 'claude' : 'inactive'
  const inner = (st.tab === 'game'
    ? game(st, fw, fh, working)
    : st.tab === 'breathe'
      ? breath(st, fw, fh, working)
      : doodle(st, fw, fh, set))
  const top = blank(W)
  put(top, 0, '╭' + '─'.repeat(W - 2) + '╮', { color: frameColor })
  const bottom = blank(W)
  put(bottom, 0, '╰' + '─'.repeat(W - 2) + '╯', { color: frameColor })
  const framed = [inner.info, ...inner.field].map(l => {
    const line = blank(W)
    line[0] = { ch: '│', color: frameColor }
    line[W - 1] = { ch: '│', color: frameColor }
    for (let i = 0; i < fw; i++) line[FIELD_LEFT + i] = l[i] ?? { ch: ' ' }
    return line
  })
  const hint = blank(W)
  put(hint, 1, inner.hint.slice(0, W - 2), { color: 'subtle' })

  surface.onKey((k: ClientKeyEvent) => {
    const cur = surface.state ?? st
    const t = TABS.find(t => t.n === k.key)
    if (t) return set({ tab: t.id })
    if (cur.tab === 'game') {
      if (k.key === 'left') set({ basket: Math.max(0, cur.basket - 2) })
      if (k.key === 'right') set({ basket: Math.min(fw - BW, cur.basket + 2) })
    }
    if (cur.tab === 'doodle') {
      const brushKeys: Record<string, Brush> = { p: 'pen', b: 'big', s: 'spray', f: 'fill' }
      if (brushKeys[k.key]) set({ brush: brushKeys[k.key] })
      if (k.key === 'c') set(clearInk(cur))
      if (k.key === 'e') set({ color: -1 })
      if (k.key === 'r') set({ color: -2 })
      if (k.key === 'm') set({ mirror: !cur.mirror })
      if (k.key === 'u' || (k.key === 'z' && (k.meta || k.ctrl))) set(undo(cur))
      if (k.key === 'i') set({ idea: newIdea(cur.idea) })
      if (k.key === 'n') set(nextPic(cur))
      if (k.key === 't') set({ picMode: cur.picMode === 'colour' ? 'trace' : 'colour' })
    }
  })

  surface.onPointer((p: ClientPointerEvent) => {
    const cur = surface.state ?? st
    if (p.type === 'down' && p.button === 'left') {
      const hits =
        p.y === ROW_TABS
          ? tabHits
          : inner.hits
              .filter(h => ROW_INFO + (h.row ?? 0) === p.y)
              .map(h => ({ ...h, x0: h.x0 + FIELD_LEFT, x1: h.x1 + FIELD_LEFT }))
      const hit = hits.find(h => p.x >= h.x0 && p.x < h.x1)
      if (hit) return hit.act()
    }
    const fx = p.x - FIELD_LEFT
    const fy = p.y - FIELD_TOP
    if (cur.tab === 'game') {
      if (working && (p.type === 'move' || p.type === 'down')) {
        const b = Math.min(fw - BW, Math.max(0, Math.round(fx - BW / 2)))
        if (b !== cur.basket) set({ basket: b })
      }
      return
    }
    if (cur.tab === 'doodle') {
      if (p.type === 'up' || p.type === 'leave' || !p.button) {
        if (cur.last) set({ last: null })
        return
      }
      const cw = fw
      const ch = fh - DOODLE_TOOLBARS
      const cx = fx
      const cy = fy - DOODLE_TOOLBARS
      const inside = cx >= 0 && cy >= 0 && cx < cw && cy < ch
      if (p.type === 'down') {
        if (!inside) return
        set(stroke({ ...cur, history: [...cur.history, cur.ink].slice(-20), last: null }, cx, cy, cw, ch, p.button === 'right'))
      } else if (p.type === 'move' && cur.last) {
        // the pointer stays held past the edges; clamp so a stroke slides along them
        const x2 = Math.min(cw - 1, Math.max(0, cx))
        const y2 = Math.min(ch - 1, Math.max(0, cy))
        set(stroke(cur, x2, y2, cw, ch, p.button === 'right'))
      }
    }
  })

  const lines = [title, tabs, top, ...framed, bottom, hint]
  return <Box flexDirection="column">{lines.map((l, i) => drawLine(`l${i}`, l, Box, Text))}</Box>
}

// ---- simulation ------------------------------------------------------------

function step(cur: S, fw: number, fh: number): S {
  const tick = cur.tick + 1
  const next: S = { ...cur, tick, breathMs: cur.breathMs + TICK }
  if (next.breathMs >= CYCLE) {
    next.breathMs -= CYCLE
    next.cycles = cur.cycles + 1
  }
  if (cur.tab !== 'game') return next

  const speed = Math.max(1, 3 - Math.floor(cur.score / 15)) // ticks per row: ~3 rows/s, faster as you score
  let stars = cur.stars
  let score = cur.score
  let misses = cur.misses
  let pops = cur.pops
    .map(p => ({ ...p, age: p.age + 1, y: p.y - (p.age % 3 === 0 ? 1 : 0) }))
    .filter(p => p.age < 8)
  if (tick % speed === 0) {
    const kept: Star[] = []
    for (const star of stars) {
      const y = star.y + 1
      if (y === fh - 1 && star.x >= cur.basket && star.x < cur.basket + BW) {
        const pts = star.gold ? 3 : 1
        score += pts
        pops = [...pops, { x: star.x, y: fh - 2, text: `+${pts}`, age: 0 }]
        continue
      }
      if (y >= fh) {
        if (!star.gold) misses += 1
        continue
      }
      kept.push({ ...star, y })
    }
    stars = kept
  }
  if (tick % (speed * 4) === 0 || stars.length === 0) {
    stars = [...stars, { x: Math.floor(Math.random() * fw), y: 0, gold: Math.random() < 0.15 }]
  }
  if (misses >= LIVES) {
    return { ...next, stars: [], pops: [], best: Math.max(cur.best, score), score: 0, misses: 0 }
  }
  return { ...next, stars, pops, score, misses, best: Math.max(cur.best, score) }
}

// ---- the three activities, each as an info line, field lines and a hint ----

type Card = { info: Line; field: Line[]; hint: string; hits: Hit[] }

function pausedLabel(field: Line[], fw: number, row: number) {
  const text = ' ‖ paused · your turn '
  put(field[row], Math.max(0, Math.floor((fw - text.length) / 2)), text, { color: 'inverseText', bg: 'inactive', bold: true })
}

function game(s: S, fw: number, fh: number, working: boolean): Card {
  const sky = (x: number, y: number) => {
    let n = (Math.imul(x + 1, 374761393) + Math.imul(y + 1, 668265263)) | 0
    n = Math.imul(n ^ (n >>> 13), 1274126177)
    return ((n ^ (n >>> 16)) >>> 0) % 31 === 0
  }
  const field: Line[] = Array.from({ length: fh }, (_, y) =>
    Array.from({ length: fw }, (_, x) => (sky(x, y) ? { ch: '·', color: 'subtle', dim: !working } : { ch: ' ' })),
  )
  for (const st of s.stars) {
    if (st.y >= 0 && st.y < fh && st.x >= 0 && st.x < fw) {
      field[st.y][st.x] = st.gold
        ? { ch: '*', color: 'warning', bold: true, dim: !working }
        : { ch: '•', color: 'suggestion', bold: true, dim: !working }
    }
  }
  for (const p of s.pops) if (p.y >= 0 && p.y < fh) put(field[p.y], Math.min(fw - p.text.length, p.x), p.text, { color: 'success', bold: true })
  for (let i = 0; i < BW; i++) {
    // a rainbow paddle; grey while paused
    put(field[fh - 1], s.basket + i, ' ', { bg: working ? PADDLE[i % PADDLE.length] : 'inactive' })
  }
  if (!working) pausedLabel(field, fw, Math.floor(fh / 2))

  const info = blank(fw)
  put(info, 0, `Score ${s.score}`, { bold: true })
  const best = `best ${s.best}`
  put(info, Math.floor((fw - best.length) / 2), best, { color: 'subtle' })
  const hearts = '♥'.repeat(LIVES - s.misses) + '·'.repeat(s.misses)
  put(info, fw - hearts.length, hearts, { color: 'error', bold: true })
  return {
    info,
    field,
    hits: [],
    hint: working ? 'Mouse or ←/→ to move · * = 3 pts' : 'Resumes when Claude starts again',
  }
}

function breath(s: S, fw: number, fh: number, working: boolean): Card {
  let t = s.breathMs
  let i = 0
  while (i < PHASES.length - 1 && t >= PHASES[i].ms) {
    t -= PHASES[i].ms
    i++
  }
  const phase = PHASES[i]
  const ease = (v: number) => 0.5 - Math.cos(Math.PI * v) / 2
  const frac = t / phase.ms
  const fill = i === 0 ? ease(frac) : i === 1 ? 1 : i === 2 ? 1 - ease(frac) : 0
  const secs = Math.max(1, Math.ceil((phase.ms - t) / 1000))

  const orbH = fh - 2
  const maxR = Math.max(2, Math.min((orbH - 1) / 2, fw / 4))
  const r = 1.2 + fill * (maxR - 1.2)
  const cy = (orbH - 1) / 2
  const field: Line[] = []
  for (let y = 0; y < orbH; y++) {
    const line = blank(fw)
    for (let x = 0; x < fw; x++) {
      const dx = (x - (fw - 1) / 2) / 2
      const d = Math.sqrt(dx * dx + (y - cy) ** 2)
      if (d <= r) {
        const q = d / r
        line[x] = { ch: q < 0.45 ? '█' : q < 0.7 ? '▓' : q < 0.88 ? '▒' : '░', color: phase.color, dim: !working }
      }
    }
    field.push(line)
  }
  if (!working) pausedLabel(field, fw, Math.floor(orbH / 2))

  const bar = blank(fw)
  const done = Math.round(((i * 4000 + t) / CYCLE) * fw)
  put(bar, 0, '━'.repeat(done), { color: phase.color, dim: !working })
  put(bar, done, '─'.repeat(fw - done), { color: 'subtle', dim: true })
  field.push(bar)
  const steps = blank(fw)
  let x = 0
  PHASES.forEach((p, k) => {
    x = put(steps, x, k === i ? `● ${p.name}` : '○', k === i ? { color: p.color, bold: true } : { color: 'subtle' }) + 1
  })
  const cyc = `${s.cycles} cycle${s.cycles === 1 ? '' : 's'}`
  put(steps, fw - cyc.length, cyc, { color: 'subtle' })
  field.push(steps)

  const info = blank(fw)
  put(info, 0, working ? phase.name : 'Breathing paused', { color: phase.color, bold: true })
  if (working) put(info, fw - String(secs).length, String(secs), { bold: true })
  return { info, field, hits: [], hint: 'Box breathing · 4 in · 4 hold · 4 out · 4 rest' }
}

// ---- doodle: painting ------------------------------------------------------

const clearInk = (s: S): Partial<S> =>
  Object.keys(s.ink).length ? { ink: {}, history: [...s.history, s.ink].slice(-20) } : {}

const undo = (s: S): Partial<S> =>
  s.history.length ? { ink: s.history[s.history.length - 1], history: s.history.slice(0, -1) } : {}

// blank -> each picture -> blank; a new picture starts on a clean page (undo brings the old one back)
const nextPic = (s: S): Partial<S> => ({
  pic: s.pic + 1 >= PICS.length ? -1 : s.pic + 1,
  ...clearInk(s),
})

function newIdea(cur: number): number {
  let n = Math.floor(Math.random() * IDEAS.length)
  if (n === cur) n = (n + 1) % IDEAS.length
  return n
}

// Paints from the stroke's last point to (x, y), with the brush, the colour
// (or rainbow) and the mirror; a fill only on the first press. In colouring
// mode the picture's outline is a wall: paint and fills stay inside the lines.
function stroke(s: S, x: number, y: number, cw: number, ch: number, erase: boolean): S {
  const ink = { ...s.ink }
  let hue = s.hue
  const rubber = erase || s.color === -1
  const walls = s.picMode === 'colour' ? outline(s.pic, cw, ch) : new Set<string>()
  const colourNow = () => (s.color === -2 ? Math.floor(hue / 2) % PALETTE.length : s.color)
  const paint = (px: number, py: number) => {
    if (px < 0 || py < 0 || px >= cw || py >= ch) return
    const k = `${px},${py}`
    if (walls.has(k)) return
    if (rubber) delete ink[k]
    else ink[k] = colourNow()
  }
  const at = (qx: number, qy: number) => {
    paint(qx, qy)
    if (s.mirror) paint(cw - 1 - qx, qy)
  }
  const dab = (px: number, py: number) => {
    if (s.brush === 'big') {
      for (let dx = -2; dx <= 2; dx++) at(px + dx, py)
      for (let dx = -1; dx <= 1; dx++) {
        at(px + dx, py - 1)
        at(px + dx, py + 1)
      }
    } else if (s.brush === 'spray') {
      for (let n = 0; n < 4; n++) {
        const a = Math.random() * Math.PI * 2
        const r = Math.random() * 3
        at(Math.round(px + Math.cos(a) * r * 2), Math.round(py + Math.sin(a) * r))
      }
    } else at(px, py)
    hue++
  }

  if (s.brush === 'fill') {
    if (s.last === null) {
      const to = rubber ? undefined : colourNow()
      flood(ink, walls, x, y, cw, ch, to)
      if (s.mirror) flood(ink, walls, cw - 1 - x, y, cw, ch, to)
      hue += 2
    }
    return { ...s, ink, hue, last: { x, y } }
  }

  // a line from the last point, so a fast drag leaves no gaps
  const from = s.last ?? { x, y }
  let x0 = from.x
  let y0 = from.y
  const dx = Math.abs(x - x0)
  const dy = -Math.abs(y - y0)
  const sx = x0 < x ? 1 : -1
  const sy = y0 < y ? 1 : -1
  let err = dx + dy
  for (let guard = 0; guard < 400; guard++) {
    if (s.last === null || x0 !== from.x || y0 !== from.y) dab(x0, y0)
    if (x0 === x && y0 === y) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x0 += sx
    }
    if (e2 <= dx) {
      err += dx
      y0 += sy
    }
  }
  return { ...s, ink, hue, last: { x, y } }
}

function flood(
  ink: Record<string, number>,
  walls: Set<string>,
  x: number,
  y: number,
  cw: number,
  ch: number,
  to: number | undefined,
) {
  const start = `${x},${y}`
  if (walls.has(start)) return
  const from = ink[start]
  if (from === to) return
  const stack = [[x, y]]
  let budget = cw * ch
  while (stack.length && budget-- > 0) {
    const [px, py] = stack.pop()!
    if (px < 0 || py < 0 || px >= cw || py >= ch) continue
    const k = `${px},${py}`
    if (walls.has(k) || ink[k] !== from) continue
    if (to === undefined) delete ink[k]
    else ink[k] = to
    stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1])
  }
}

// ---- doodle: drawing -------------------------------------------------------

function doodle(s: S, fw: number, fh: number, set: (p: Partial<S>) => void): Card {
  const hits: Hit[] = []
  const on = { color: 'inverseText', bg: 'claude', bold: true }
  const off = { color: 'subtle' }
  const button = (line: Line, row: number, x: number, label: string, active: boolean, act: () => void) => {
    if (x + label.length + 2 > fw) return x
    const x1 = put(line, x, ` ${label} `, active ? on : off)
    hits.push({ x0: x, x1, act, row })
    return x1 + 1
  }

  // info line: colours, a rainbow swatch, the eraser
  const info = blank(fw)
  let x = 0
  PALETTE.forEach((c, i) => {
    const x0 = x
    x = put(info, x, s.color === i ? '<>' : '  ', { bg: c, color: '#111111', bold: true })
    hits.push({ x0, x1: x, act: () => set({ color: i }), row: 0 })
    x += 1
  })
  if (x + 4 <= fw) {
    const x0 = x
    for (let i = 0; i < 4; i++) {
      const mark = s.color === -2 && i === 1 ? '<' : s.color === -2 && i === 2 ? '>' : ' '
      put(info, x + i, mark, { bg: PALETTE[i * 2], color: '#111111', bold: true })
    }
    x += 4
    hits.push({ x0, x1: x, act: () => set({ color: -2 }), row: 0 })
    x += 1
  }
  button(info, 0, x, 'erase', s.color === -1, () => set({ color: -1 }))

  // toolbar 1: brushes
  const bar1 = blank(fw)
  let bx = 0
  for (const b of ['pen', 'big', 'spray', 'fill'] as Brush[]) bx = button(bar1, 1, bx, b, s.brush === b, () => set({ brush: b }))

  // toolbar 2: mirror, undo, clear, idea
  const bar2 = blank(fw)
  bx = 0
  bx = button(bar2, 2, bx, 'mirror', s.mirror, () => set({ mirror: !s.mirror }))
  bx = button(bar2, 2, bx, 'undo', false, () => set(undo(s)))
  bx = button(bar2, 2, bx, 'clear', false, () => set(clearInk(s)))
  button(bar2, 2, bx, 'idea?', s.idea >= 0, () => set({ idea: newIdea(s.idea) }))

  // toolbar 3: 90s pictures, and colour-in or trace
  const bar3 = blank(fw)
  bx = 0
  bx = button(bar3, 3, bx, `pic: ${s.pic < 0 ? 'none' : PICS[s.pic].name} >`, s.pic >= 0, () => set(nextPic(s)))
  if (s.pic >= 0) {
    bx = button(bar3, 3, bx, 'colour', s.picMode === 'colour', () => set({ picMode: 'colour' }))
    button(bar3, 3, bx, 'trace', s.picMode === 'trace', () => set({ picMode: 'trace' }))
  }

  // the canvas: faint dot grid, the picture, the mirror's centre line, the ink
  const cw = fw
  const ch = fh - DOODLE_TOOLBARS
  const mid = Math.floor(cw / 2)
  const pic = outline(s.pic, cw, ch)
  const field: Line[] = [bar1, bar2, bar3]
  for (let y = 0; y < ch; y++) {
    const line: Line = []
    for (let cx = 0; cx < cw; cx++) {
      const k = `${cx},${y}`
      const c = s.ink[k]
      if (pic.has(k) && s.picMode === 'colour') line.push({ ch: ' ', bg: 'text' })
      else if (c !== undefined) line.push({ ch: ' ', bg: PALETTE[c] })
      else if (pic.has(k)) line.push({ ch: '·', color: 'claude', bold: true })
      else if (s.mirror && cx === mid && y % 2 === 0) line.push({ ch: '¦', color: 'claude', dim: true })
      else line.push({ ch: cx % 4 === 0 && y % 2 === 0 ? '·' : ' ', color: 'subtle', dim: true })
    }
    field.push(line)
  }

  const hint =
    s.idea >= 0
      ? `Draw: ${IDEAS[s.idea]}`
      : s.pic >= 0
        ? s.picMode === 'colour'
          ? 'Pick fill and click inside the lines'
          : 'Draw over the dots to trace it'
        : 'Drag to paint · right-drag erases · u undo'
  return { info, field, hits, hint }
}

export default Panel
