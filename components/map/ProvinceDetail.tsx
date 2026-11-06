'use client'

import { ArrowLeft, MapPin } from 'lucide-react'
import { hospitalRowMeta } from '@/lib/hospital-row'
import type { MapHospital, MapProvinceStat } from './types'

export function ProvinceDetail({
  provinceName,
  stat,
  hospitals,
  onBackToCountry,
  onZoomToProvince,
  onSelectHospital,
  hideCount = false,
  filteredEmpty = false,
  onClearFilter,
  variant = 'sidebar',
}: {
  provinceName: string
  stat: MapProvinceStat | undefined
  hospitals: MapHospital[]
  onBackToCountry: () => void
  onZoomToProvince: () => void
  onSelectHospital: (id: string) => void
  /** 底卡头部已经报了家数，正文不再重复。 */
  hideCount?: boolean
  /** 该省本来有医院，只是被病症筛选筛掉了：和「没有收录」用不同的话。 */
  filteredEmpty?: boolean
  onClearFilter?: () => void
  /** sheet：手机底卡里的空态用无边框排版；桌面侧栏仍是 .tc-empty。 */
  variant?: 'sidebar' | 'sheet'
}) {
  // 筛选把列表筛空时，省本身的收录数还在，不能据此当成「有数据」。
  const hasData = !filteredEmpty && ((stat?.reports ?? 0) > 0 || hospitals.length > 0)

  return (
    <div className="tc-detail">
      <nav className="tc-breadcrumb" aria-label="位置">
        <button type="button" onClick={onBackToCountry}>全国</button>
        <span className="tc-breadcrumb-sep" aria-hidden="true">›</span>
        <span aria-current="page">{provinceName}</span>
      </nav>
      <button type="button" className="tc-detail-back" onClick={onBackToCountry}><ArrowLeft size={16} aria-hidden="true" />返回 全国</button>
      <h2 className="tc-detail-title">{provinceName}</h2>

      {hasData ? (
        <>
          {!hideCount && <p className="tc-small tc-muted">{hospitals.length} 家医院</p>}

          <div className="tc-hospital-actions"><button type="button" className="tc-button tc-button--active" onClick={onZoomToProvince}>
            <MapPin size={16} aria-hidden="true" />在地图上定位
          </button></div>

          {hospitals.length > 0 && (
            <section className="tc-detail-section">
              <h3>医院</h3>
              <ul className="tc-hospital-list">
                {hospitals.map((hospital) => (
                  <li key={hospital.id}>
                    <button
                      type="button"
                      className="tc-hospital-row"
                      data-hospital-id={hospital.id}
                      onClick={() => onSelectHospital(hospital.id)}
                    >
                      <span className="tc-hospital-row-name">{hospital.name}</span>
                      <span className="tc-hospital-row-meta">{hospitalRowMeta(hospital.city, hospital.leads)}</span>
                    </button>
                  </li>
                ))}
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
              <h3>{provinceName}还没有收录医院</h3>
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
