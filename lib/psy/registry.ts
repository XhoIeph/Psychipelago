// Each published scale loads its form only when a visitor starts answering.
export type LoadedAssessment = Record<string, unknown>;

const LOADERS: Record<string, () => Promise<{ default: LoadedAssessment }>> = {
  itq: () => import('./vendor/assessments/itq.js'),
  pcl5: () => import('./vendor/assessments/pcl5.js'),
  des2: () => import('./vendor/assessments/des2.js'),
  cds: () => import('./vendor/assessments/cds.js'),
  bsl23: () => import('./vendor/assessments/bsl23.js'),
  ders16: () => import('./vendor/assessments/ders16.js'),
  lpfsbf: () => import('./vendor/assessments/lpfsbf.js'),
  'pdq4plus': () => import('./vendor/assessments/pdq4plus.js'),
  phq9: () => import('./vendor/assessments/phq9.js'),
  gad7: () => import('./vendor/assessments/gad7.js'),
  isi: () => import('./vendor/assessments/isi.js'),
  pdss: () => import('./vendor/assessments/pdss.js'),
  mspss: () => import('./vendor/assessments/mspss.js'),
};

export async function loadAssessment(id: string): Promise<LoadedAssessment | null> {
  if (!Object.hasOwn(LOADERS, id)) return null;
  return (await LOADERS[id]()).default;
}

export function loadEngine(): Promise<unknown> {
  return import('./vendor/engine.js').then((mod) => mod.default);
}

export const ASSESSMENT_IDS = Object.keys(LOADERS);
