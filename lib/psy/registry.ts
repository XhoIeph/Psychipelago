// Registry for the vendored PSYMETRA assessments. All scales in lib/psy/vendor/assessments
// get a loader here: the upstream author allowed this project to fuse its compilation and
// scoring logic, so nothing is held back. lib/psy/licensing.ts stays as a factual record of
// what we checked about each scale's rights, not as a publication gate.
// Each scale is a separate dynamic import so the browser only downloads the one being taken.

export type LoadedAssessment = Record<string, unknown>;

const LOADERS: Record<string, () => Promise<{ default: LoadedAssessment }>> = {
  "ace": () => import("./vendor/assessments/ace.js"),
  "aqa": () => import("./vendor/assessments/aqa.js"),
  "asq": () => import("./vendor/assessments/asq.js"),
  "asrm": () => import("./vendor/assessments/asrm.js"),
  "asrs": () => import("./vendor/assessments/asrs.js"),
  "audit": () => import("./vendor/assessments/audit.js"),
  "bes": () => import("./vendor/assessments/bes.js"),
  "bsds": () => import("./vendor/assessments/bsds.js"),
  "bsl23": () => import("./vendor/assessments/bsl23.js"),
  "bss": () => import("./vendor/assessments/bss.js"),
  "cape42": () => import("./vendor/assessments/cape42.js"),
  "catq": () => import("./vendor/assessments/catq.js"),
  "cds": () => import("./vendor/assessments/cds.js"),
  "cssrs": () => import("./vendor/assessments/cssrs.js"),
  "ctqsf": () => import("./vendor/assessments/ctqsf.js"),
  "dass21": () => import("./vendor/assessments/dass21.js"),
  "ders16": () => import("./vendor/assessments/ders16.js"),
  "des2": () => import("./vendor/assessments/des2.js"),
  "eat26": () => import("./vendor/assessments/eat26.js"),
  "edeq": () => import("./vendor/assessments/edeq.js"),
  "epds": () => import("./vendor/assessments/epds.js"),
  "ess": () => import("./vendor/assessments/ess.js"),
  "gad7": () => import("./vendor/assessments/gad7.js"),
  "hcl32": () => import("./vendor/assessments/hcl32.js"),
  "isas": () => import("./vendor/assessments/isas.js"),
  "isi": () => import("./vendor/assessments/isi.js"),
  "itq": () => import("./vendor/assessments/itq.js"),
  "lpfsbf": () => import("./vendor/assessments/lpfsbf.js"),
  "mdq": () => import("./vendor/assessments/mdq.js"),
  "mid": () => import("./vendor/assessments/mid.js"),
  "mmpi": () => import("./vendor/assessments/mmpi.js"),
  "mspss": () => import("./vendor/assessments/mspss.js"),
  "nias": () => import("./vendor/assessments/nias.js"),
  "ocir": () => import("./vendor/assessments/ocir.js"),
  "pcl5": () => import("./vendor/assessments/pcl5.js"),
  "pds": () => import("./vendor/assessments/pds.js"),
  "pdss": () => import("./vendor/assessments/pdss.js"),
  "phq9": () => import("./vendor/assessments/phq9.js"),
  "pid5": () => import("./vendor/assessments/pid5.js"),
  "pqb": () => import("./vendor/assessments/pqb.js"),
  "psqi": () => import("./vendor/assessments/psqi.js"),
  "raadsr": () => import("./vendor/assessments/raadsr.js"),
  "rses": () => import("./vendor/assessments/rses.js"),
  "sas": () => import("./vendor/assessments/sas.js"),
  "sbqr": () => import("./vendor/assessments/sbqr.js"),
  "scl90": () => import("./vendor/assessments/scl90.js"),
  "scoff": () => import("./vendor/assessments/scoff.js"),
  "sds": () => import("./vendor/assessments/sds.js"),
  "ymrs": () => import("./vendor/assessments/ymrs.js"),
};

export async function loadAssessment(id: string): Promise<LoadedAssessment | null> {
  const loader = LOADERS[id];
  if (!loader) return null;
  const mod = await loader();
  return mod.default ?? null;
}

let enginePromise: Promise<unknown> | null = null;

export function loadEngine(): Promise<unknown> {
  if (!enginePromise) {
    enginePromise = import('./vendor/engine.js').then((mod) => (mod as { default: unknown }).default);
  }
  return enginePromise;
}

export const ASSESSMENT_IDS: string[] = ["ace","aqa","asq","asrm","asrs","audit","bes","bsds","bsl23","bss","cape42","catq","cds","cssrs","ctqsf","dass21","ders16","des2","eat26","edeq","epds","ess","gad7","hcl32","isas","isi","itq","lpfsbf","mdq","mid","mmpi","mspss","nias","ocir","pcl5","pds","pdss","phq9","pid5","pqb","psqi","raadsr","rses","sas","sbqr","scl90","scoff","sds","ymrs"];
