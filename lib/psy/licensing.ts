// Record of what we checked about each vendored PSYMETRA scale. This is a factual log,
// not a publication gate: the catalogue and the registry publish all 49 scales.
//
// Rights chain for the bundle: the scoring logic and the 49 assessment modules are copied
// from PSYMETRA, which ships no licence of its own. Each scale's item text belongs to its
// original author or publisher, which is why the public footer credits them and why this
// table records, per scale, what its rights holder says about reuse:
//
//   'public-domain'       no rights holder to credit
//   'free-with-citation'  publisher permits non-commercial use with attribution
//   'permission-required' publisher must be asked per item text
//   'proprietary'         distributed by a commercial publisher
//
// The statuses below are an operational reading, not legal advice. They let a
// later review or a takedown request be answered with the source we already found.

export type LicenseStatus =
  | 'public-domain'
  | 'free-with-citation'
  | 'permission-required'
  | 'proprietary'

export type ScaleLicense = {
  status: LicenseStatus
  holder: string
  note?: string
}

/** Recorded statuses. They describe what each rights holder says, not what we publish. */

export const SCALE_LICENSES: Record<string, ScaleLicense> = {
  ace: { status: 'free-with-citation', holder: 'CDC / Kaiser Permanente' },
  aqa: {
    status: 'permission-required',
    holder: 'Autism Research Centre, University of Cambridge',
    note: 'ARC 只许非商业使用并要求署名、禁止未经许可改写；vendor 中文与 ARC 官方中文版 0/50 相同，属改写',
  },
  asq: { status: 'free-with-citation', holder: 'Nock et al.' },
  asrm: { status: 'free-with-citation', holder: 'Columbia University' },
  asrs: { status: 'free-with-citation', holder: 'WHO' },
  audit: { status: 'free-with-citation', holder: 'WHO' },
  bes: { status: 'free-with-citation', holder: '原始作者' },
  bsds: { status: 'free-with-citation', holder: '原始作者' },
  bsl23: { status: 'free-with-citation', holder: '原始作者' },
  bss: { status: 'permission-required', holder: 'Beck Institute', note: 'Beck 量表题面按份授权' },
  cssrs: { status: 'free-with-citation', holder: 'Columbia University' },
  cape42: { status: 'free-with-citation', holder: '原始作者' },
  catq: { status: 'free-with-citation', holder: '原始作者' },
  cds: { status: 'free-with-citation', holder: '原始作者' },
  ctqsf: { status: 'proprietary', holder: 'Bernstein / Pearson', note: 'Pearson 经销' },
  dass21: { status: 'free-with-citation', holder: 'Lovibond & Lovibond' },
  ders16: { status: 'free-with-citation', holder: 'Gratz & Roemer' },
  des2: { status: 'free-with-citation', holder: 'Carlson & Putnam' },
  eat26: { status: 'free-with-citation', holder: 'Garner et al.' },
  edeq: { status: 'permission-required', holder: 'Fairburn / CBMI', note: '题面由 CBMI 管理' },
  epds: { status: 'permission-required', holder: 'Royal College of Psychiatrists' },
  ess: { status: 'permission-required', holder: 'MAPI Research Trust' },
  gad7: { status: 'free-with-citation', holder: 'Spitzer et al.' },
  hcl32: { status: 'free-with-citation', holder: '原始作者' },
  isas: { status: 'free-with-citation', holder: '原始作者' },
  isi: { status: 'free-with-citation', holder: 'Morin' },
  itq: { status: 'free-with-citation', holder: '原始作者' },
  lpfsbf: { status: 'free-with-citation', holder: '原始作者' },
  mdq: { status: 'free-with-citation', holder: 'Hirschfeld et al.' },
  mid: { status: 'permission-required', holder: 'Paul F. Dell', note: 'mid.js 自带 © 2004 Paul F. Dell' },
  mmpi: { status: 'proprietary', holder: 'University of Minnesota / Pearson', note: 'MMPI-2 567 题原文' },
  mspss: { status: 'free-with-citation', holder: 'Zimet et al.' },
  nias: { status: 'free-with-citation', holder: '原始作者' },
  ocir: { status: 'free-with-citation', holder: '原始作者' },
  pcl5: { status: 'free-with-citation', holder: 'National Center for PTSD' },
  pds: { status: 'proprietary', holder: 'Foa et al. / Pearson' },
  pdss: { status: 'free-with-citation', holder: '原始作者' },
  phq9: { status: 'free-with-citation', holder: 'Spitzer et al.' },
  pid5: {
    status: 'permission-required',
    holder: 'American Psychiatric Association',
    note: 'APA 免费用的是原版；vendor 里是中文译本，译者不明，署名走不通',
  },
  pqb: { status: 'free-with-citation', holder: '原始作者' },
  psqi: { status: 'permission-required', holder: 'University of Pittsburgh' },
  raadsr: { status: 'free-with-citation', holder: '原始作者' },
  rses: { status: 'free-with-citation', holder: 'Rosenberg' },
  sas: { status: 'free-with-citation', holder: 'Zung' },
  sbqr: { status: 'free-with-citation', holder: '原始作者' },
  scl90: { status: 'proprietary', holder: 'Derogatis / Pearson' },
  scoff: { status: 'free-with-citation', holder: '原始作者' },
  sds: { status: 'free-with-citation', holder: 'Zung' },
  ymrs: { status: 'permission-required', holder: 'Young et al.' },
}

export function licenseOf(id: string): ScaleLicense {
  const entry = SCALE_LICENSES[id]
  if (!entry) {
    throw new Error(
      `量表 ${id} 没有在 lib/psy/licensing.ts 里登记；新增量表请补一条记录，方便以后核对`,
    )
  }
  return entry
}
