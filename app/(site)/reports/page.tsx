import { Suspense } from 'react'
import { ReportExplorer } from '@/components/ReportExplorer'
import { disorders, provinces, publicReports, reportProvinceMap } from '@/lib/data'
import Link from 'next/link'

export const metadata = {
  title: '就诊线索｜TraumaCompass',
  description: '《就诊地图10.25》中的就诊线索、机构与医生条目，附来源供核对。',
}

export default function ReportsPage() {
  return (
    <div>
      <header className="tc-page-heading">
        <h1>就诊线索</h1>
        <Link href="/submit/" className="tc-button">提交线索 ↗</Link>
      </header>
      <Suspense fallback={<p className="tc-muted">加载筛选中……</p>}>
        <ReportExplorer
          reports={publicReports}
          disorders={disorders}
          provinces={provinces}
          reportProvince={reportProvinceMap()}
        />
      </Suspense>
    </div>
  )
}

