import { MapApp } from '@/components/map/MapApp'
import { formatPublishedAt, formatReportSource } from '@/lib/format'
import { mapHospitalInputs } from '@/lib/map-coordinates'
import locationEvidence from '@/data/evidence/locations/amap-2026-11-09.json'
import {
  disorders,
  doctors,
  hospitals,
  provinceStats,
  provinces,
  publicReports,
  reportProvinceMap,
} from '@/lib/data'

export default function MapPage() {
  const mapHospitals = mapHospitalInputs(hospitals, publicReports, locationEvidence.results)

  const mapLeads = Object.fromEntries(
    mapHospitals.map((hospital) => [
      hospital.id,
      publicReports
        .filter((report) => report.hospital_id === hospital.id)
        .map((report) => ({
          id: report.id,
          quote: report.evidence_quote,
          contextNote: report.evidence_context?.parent_excerpt
            ? `该评论回复的原话：「${report.evidence_context.parent_excerpt}」`
            : undefined,
          stage: report.stage,
          publishedAt: formatPublishedAt(report.published_at, report.published_at_precision),
          url: report.source_url,
          fullText: report.evidence_full_text,
          doctorName: report.doctor_name_raw,
          disorders: report.disorders,
        })),
    ]),
  )

  const statMap = Object.fromEntries(
    provinceStats.items.map((item) => [
      item.adcode,
      {
        reports: item.reports_total,
        hospitals: item.hospitals_total,
        withEvidence: item.hospitals_with_service_evidence,
        cptsd: item.reports_by_disorder.cptsd,
        bpd: item.reports_by_disorder.bpd,
      },
    ]),
  )

  const reportCounts = Object.fromEntries(
    hospitals.map((hospital) => [
      hospital.id,
      publicReports.filter((report) => report.hospital_id === hospital.id).length,
    ]),
  )

  return (
    <MapApp
      provinces={provinces}
      mapHospitals={mapHospitals}
      leadsByHospital={mapLeads}
      provinceStats={statMap}
      hospitals={hospitals}
      reports={publicReports}
      disorders={disorders}
      reportProvince={reportProvinceMap()}
      reportCounts={reportCounts}
      doctorProfiles={doctors}
    />
  )
}
