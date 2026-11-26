export type PsyOption = { label: string; value: number };

export type PsyQuestion = {
  id: number;
  text: string;
  displayNumber?: string;
  groupPrompt?: string;
  dimension?: string;
  instruction?: string;
  reversed?: boolean;
  options?: PsyOption[];
};

export type PsyLevel = {
  label: string;
  type: string;
  badgeClass?: string;
  min: number;
  max: number;
  summary?: string;
  advice?: string[];
};

export type PsyDimensionScore = {
  id?: string;
  key?: string;
  number?: string;
  name: string;
  desc?: string;
  score?: number;
  raw?: number;
  itemCount?: number;
  level?: string;
  levelType?: string;
  badgeClass?: string;
  interp?: string;
  max?: number;
};

export type PsyMetric = { label: string; value: number | string; unit?: string; min?: number; max?: number };

export type PsyAnswer = { id: number; text: string; value: number; scored: number; label?: string };

export type PsyResult = {
  scaleId: string;
  scaleName: string;
  scaleFullName: string;
  scaleEnglishName: string;
  scaleCategory: string;
  scaleDescription?: string;
  scaleTimeframe?: string;
  primaryScore: number;
  primaryMetric: PsyMetric;
  scoringVersion?: string;
  secondaryMetrics?: PsyMetric[];
  level: string;
  levelType?: string;
  badgeClass?: string;
  summary?: string | string[];
  advice?: string | string[];
  dimensionScores?: PsyDimensionScore[] | null;
  subscales?: unknown;
  gender?: number;
  genderLabel?: string;
  validityConclusion?: string;
  codeInterpretation?: string;
  answers?: PsyAnswer[];
  timestamp?: number;
  completedTimeFormatted?: string;
  durationSeconds?: number;
};

export type PsyAssessment = {
  meta: {
    id: string;
    name: string;
    fullName: string;
    englishName: string;
    category: string;
    description?: string;
    instructions?: string;
    duration?: number;
    timeframe?: string;
    targetGroups?: string[];
  };
  defaultOptions?: PsyOption[];
  questions: PsyQuestion[];
  scoring: {
    method?: string;
    primaryMetricLabel?: string;
    primaryMetricUnit?: string;
    minScore?: number;
    maxScore?: number;
    levels?: PsyLevel[];
    dimensions?: { name: string; desc?: string; items?: number[] }[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type PsyEngine = {
  gender?: number;
  setAnswer(questionId: number, value: number): void;
  computeResult(): PsyResult;
};

export type PsyEngineConstructor = new (assessment: PsyAssessment) => PsyEngine;

export type PsyCatalogueItem = {
  id: string;
  name: string;
  fullName: string;
  englishName: string;
  category: string;
  duration: number;
  timeframe: string;
  description: string;
  instructions: string;
  questionCount: number;
  requiresGender: boolean;
  crisis: boolean;
  formVersion?: string;
  attribution?: { label: string; url: string };
  validationStudy?: { label: string; url: string };
};
