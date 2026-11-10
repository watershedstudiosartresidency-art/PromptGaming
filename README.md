# Break room

A little side panel for Claude Code that gives you something to do while Claude works. It runs while Claude is busy and pauses with a **"Your turn"** badge the moment Claude finishes, so you always know when to look back.

## What's inside

**★ Starfall:** catch falling stars with a rainbow paddle. Move it with the mouse or ←/→. Gold `*` stars are worth 3 points, and you have three lives. Stars speed up as your score climbs, and your best score is kept.

**◯ Breathe:** guided box breathing (4 in, 4 hold, 4 out, 4 rest). An orb grows and shrinks with your breath, with a countdown, a progress bar and a cycle counter.

**✎ Doodle:** a pixel drawing pad you can use anytime, even while it's your turn.
- Brushes: pen, big, spray and fill (paint bucket)
- 8 colours, plus a rainbow brush and an eraser
- Mirror mode for symmetrical drawings
- Undo (20 steps) and clear
- An "idea?" button that suggests something to draw
- 90s pictures (smiley, cassette tape, heart, star, shades, lightning bolt, pizza) to **colour in** (paint stays inside the lines) or **trace**

Keys in Doodle (click the canvas first): `p` `b` `s` `f` brushes · `r` rainbow · `e` eraser · `m` mirror · `u` undo · `c` clear · `i` idea · `n` next picture · `t` colour or trace.

Starfall and Breathe pause whenever Claude is not working. That's the point: when the game stops, it's your turn.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install break-room --marketplace watershedstudiosartresidency-art/PromptGaming
```

Answer `y` to add the marketplace, then press Enter to pick the scope.

From a shell:

```
claude plugin install break-room --marketplace watershedstudiosartresidency-art/PromptGaming
```

In the Claude desktop app: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `watershedstudiosartresidency-art/PromptGaming`, then **Add plugin**.

The panel opens beside the chat when a session starts. If you close it, type `/break-room` to open it again.

## Requirements

The games draw in the Claude Code desktop app and in the terminal. Other surfaces show a short text status instead.

## License

MIT. See [LICENSE](LICENSE).
