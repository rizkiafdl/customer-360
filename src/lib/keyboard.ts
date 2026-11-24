export function isApplePlatform(platform: string): boolean {
  return /Mac|iPhone|iPad/.test(platform)
}

export function shortcutLabel(platform: string): string {
  return isApplePlatform(platform) ? '⌘K' : 'Ctrl K'
}

export function isSpotlightShortcut(
  event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey'>,
): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
}

export function wrapIndex(index: number, count: number): number {
  if (count <= 0) {
    return 0
  }
  return ((index % count) + count) % count
}
