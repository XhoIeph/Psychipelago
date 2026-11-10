// 底卡拖拽的手势语义。放在纯模块里，是为了在没有 DOM 的测试里钉住三条规则：
// 按下即进入候选、超过 6px 才算拖动、没超过阈值松手按点击处理。
export const DRAG_THRESHOLD_PX = 6

export type DragOrigin = {
  button: number
  /** 指针落在搜索行里（输入框、行内空白都算） */
  inSearchRow: boolean
  /** 指针落在输入框上：点击只能归还焦点，不能换档 */
  isField: boolean
}

export type DragGesture = {
  tapCycle: boolean
  field: boolean
  moved: number
  active: boolean
}

/** null 表示这次按下不参与拖拽（非主键）。 */
export function beginGesture(origin: DragOrigin): DragGesture | null {
  if (origin.button !== 0) return null
  return {
    tapCycle: !origin.inSearchRow && !origin.isField,
    field: origin.isField,
    moved: 0,
    active: false,
  }
}

/**
 * 记录本次移动并判断是否接管。activated 只在刚好跨过阈值的那一次为 true，
 * 调用方据此停过渡、preventDefault，避免重复处理。
 */
export function advanceGesture(
  gesture: DragGesture,
  deltaY: number,
): { gesture: DragGesture; activated: boolean } {
  const moved = Math.max(gesture.moved, Math.abs(deltaY))
  const activated = !gesture.active && moved >= DRAG_THRESHOLD_PX
  return {
    gesture: { ...gesture, moved, active: gesture.active || activated },
    activated,
  }
}

export type TapOutcome = 'focus' | 'cycle' | 'none'

/** 松手时还没进入拖拽，就按点击处理。 */
export function resolveTap(gesture: DragGesture): TapOutcome {
  if (gesture.active) return 'none'
  if (gesture.field) return 'focus'
  if (gesture.tapCycle) return 'cycle'
  return 'none'
}
