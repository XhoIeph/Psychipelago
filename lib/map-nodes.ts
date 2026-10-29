import type { MapHospital } from '../components/map/types'

export const NODE_SPACING = 76

export type MapNodeGroup = {
  x: number
  y: number
  members: MapHospital[]
}

/** 合并距离过近的中心，避免固定网格边界把邻近图钉分开。 */
export function groupMapNodes(hospitals: MapHospital[], project: (hospital: MapHospital) => { x: number; y: number }): MapNodeGroup[] {
  const groups = [...hospitals].sort((a, b) => a.id.localeCompare(b.id)).map((hospital) => ({ ...project(hospital), members: [hospital] }))
  for (;;) {
    let pair: [number, number] | undefined
    let distance = NODE_SPACING
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const next = Math.hypot(groups[i].x - groups[j].x, groups[i].y - groups[j].y)
        if (next < distance) { distance = next; pair = [i, j] }
      }
    }
    if (!pair) return groups
    const [i, j] = pair
    const a = groups[i]
    const b = groups[j]
    const total = a.members.length + b.members.length
    groups[i] = {
      x: (a.x * a.members.length + b.x * b.members.length) / total,
      y: (a.y * a.members.length + b.y * b.members.length) / total,
      members: [...a.members, ...b.members],
    }
    groups.splice(j, 1)
  }
}

/** 单点使用原坐标；聚合中心只由成员坐标决定，不做屏幕避让。 */
export function mapNodeLayout(hospitals: MapHospital[], project: (hospital: MapHospital) => { x: number; y: number }) {
  return groupMapNodes(hospitals, project).map(({ members }) => ({
    key: members.length === 1 ? `hospital:${members[0].id}` : `cluster:${members.map(hospital => hospital.id).sort().join(':')}`,
    lat: members.length === 1 ? members[0].lat : members.reduce((sum, hospital) => sum + hospital.lat, 0) / members.length,
    lng: members.length === 1 ? members[0].lng : members.reduce((sum, hospital) => sum + hospital.lng, 0) / members.length,
    members,
  }))
}
