export const NODE_ZOOM_THRESHOLD = 7

/** 在临界级别之前开始过渡；回程留一点间隔，避免小幅换向反复切换。 */
export function showMapNodes(zoom: number, currentlyVisible: boolean): boolean {
  return currentlyVisible ? zoom > NODE_ZOOM_THRESHOLD - 0.45 : zoom >= NODE_ZOOM_THRESHOLD - 0.15
}
