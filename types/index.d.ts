export type Activity = { working: boolean; since: number }

declare module 'claude-code' {
  interface PluginState {
    'break-room': { activity: Shaped<Activity> }
  }
}
