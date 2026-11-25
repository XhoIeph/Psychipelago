'use client'

import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { DisorderChips } from '@/components/DisorderChips'
import { knownText } from '@/lib/hospital-row'
import type { DisorderGroup } from '@/components/HospitalExplorer'
import type { MapHospital } from './types'

type Props = {
  /** 省名用简称：卡头标题与地图上的省名保持一致。 */
  provinceName: string
  /** 空态那句「天津市还没有收录医院」仍用全称，断言按全称查。 */
  provinceFullName?: string
  stat?: { reports: number }
  hospitals: MapHospital[]
  onBackToCountry: () => void
  onZoomToProvince: () => void
  onSelectHospital: (id: string) => void
  /** 该省本来有医院，只是被病症筛选筛掉了：和「没有收录」用不同的话。 */
  filteredEmpty?: boolean
  onClearFilter?: () => void
  /** 侧栏顶部有筛选条，底卡里由 MapSheet 自己渲染一份。 */
  disorderGroups?: DisorderGroup[]
  selectedDisorders?: string[]
  onToggleDisorder?: (id: string) => void
  /** sheet：手机底卡里的空态用无边框排版；桌面侧栏仍是 .tc-empty。 */
  variant?: 'sidebar' | 'sheet'
}

export function ProvinceDetail({
  provinceName,
  provinceFullName,
  stat,
  hospitals,
  onBackToCountry,
  onZoomToProvince,
  onSelectHospital,
  filteredEmpty,
  onClearFilter,
  disorderGroups,
  selectedDisorders,
  onToggleDisorder,
  variant,
}: Props) {
  // 筛选把列表筛空时，省本身的收录数还在，不能据此当成「有数据」。
  const hasData = !filteredEmpty && ((stat?.reports ?? 0) > 0 || hospitals.length > 0)

  return (
    <div className="tc-detail">
      {variant !== 'sheet' && disorderGroups && (
        <DisorderChips
          groups={disorderGroups}
          selected={selectedDisorders ?? []}
          onToggle={onToggleDisorder ?? (() => {})}
        />
      )}

      <header className="tc-level-head tc-level-head--province">
        <button type="button" className="tc-detail-back" aria-label="返回 全国" onClick={onBackToCountry}>
          <ChevronLeft aria-hidden="true" />
          <span>全国</span>
        </button>
        <h2 className="tc-detail-title" tabIndex={-1}>{provinceName}</h2>
      </header>

      {hasData ? (
        <>
          <div className="tc-hospital-actions"><button type="button" className="tc-button tc-button--active" onClick={onZoomToProvince}>
            <MapPin size={16} aria-hidden="true" />在地图上定位
          </button></div>

          {hospitals.length > 0 && (
            <section className="tc-detail-section">
              <ul className="tc-hospital-list">
                {hospitals.map((hospital) => {
                  const city = knownText(hospital.city)
                  return (
                    <li key={hospital.id}>
                      <button
                        type="button"
                        className="tc-hospital-row"
                        data-hospital-id={hospital.id}
                        onClick={() => onSelectHospital(hospital.id)}
                      >
                        <span className="tc-row-text">
                          <span className="tc-hospital-row-name">{hospital.name}</span>
                          {city && <span className="tc-hospital-row-meta">{city}</span>}
                        </span>
                        <ChevronRight className="tc-row-chev" size={16} aria-hidden="true" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </>
      ) : variant === 'sheet' ? (
        <div className="empty">
          {filteredEmpty ? (
            <>
              <h3>这次筛选没有匹配的医院</h3>
              <div className="acts">
                <button type="button" className="btn acc" onClick={onClearFilter}>清除病症筛选</button>
              </div>
            </>
          ) : (
            <>
              <h3>{provinceFullName ?? provinceName}还没有收录医院</h3>
              <p>空着说明还没采到线索，不代表当地没有。</p>
              <div className="acts">
                <button type="button" className="btn acc" aria-disabled="true">补充一条线索</button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="tc-empty">
          {filteredEmpty ? (
            <>
              <h3>这次筛选没有匹配的医院</h3>
              <div className="tc-empty-acts">
                <button type="button" className="tc-button tc-button--active" onClick={onClearFilter}>清除病症筛选</button>
              </div>
            </>
          ) : (
            <p>该省暂无已收录的线索与医院记录。</p>
          )}
        </div>
      )}
    </div>
  )
}
