type DirectoryReport = {
  hospital_name_raw?: string
  department?: string
  doctor_name_raw?: string
  evidence_quote: string
  evidence_full_text?: string
}

export function isDirectoryOnlyReport(report: DirectoryReport): boolean {
  const hospital = report.hospital_name_raw?.trim()
  const doctor = report.doctor_name_raw?.trim()
  if (!hospital || !doctor || report.evidence_full_text) return false

  const department = report.department?.trim()
  const normalize = (value: string) => value.trim().replace(/\s+/gu, ' ')
  const quotes = [
    [hospital, department, doctor].filter(Boolean).join(' · '),
    [hospital, doctor].join(' · '),
  ]
  return quotes.some((quote) => normalize(quote) === normalize(report.evidence_quote))
}
