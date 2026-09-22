export type VideoFamily = 'ANALYSIS' | 'BREAKING' | 'MATCHUP' | 'DR_PALMA';
export type VideoMode = 'HERO' | 'TEASER' | 'HOOK' | 'STORY' | 'WEEKLY_PREVIEW' | 'AUDIOGRAM';
export type Aspect = '9:16' | '4:5' | '1:1';
export type RenderPurpose = 'TEST' | 'PRODUCTION';
export type FamilyStatus = 'DEV' | 'PILOT' | 'ACTIVE' | 'HOLD';

export type CaptionCue = {
  start: number;
  end: number;
  text: string;
};

export type InsightItem = {
  label: string;
  text: string;
};

export type VideoScene = {
  id: string;
  start: number;
  end: number;
  type: 'HOOK' | 'MATCHUP' | 'PACKERS_NOTE' | 'OUTRO' | 'ANALYSIS';
  title: string;
  kicker?: string;
  support?: string;
  body?: string;
  insights?: InsightItem[];
  assetUrl?: string;
  assetCredit?: string;
};

export type VideoSpec = {
  version: '1.0';
  purpose?: RenderPurpose;
  familyStatus?: FamilyStatus;
  canonicalMaster?: string;
  pmxId: string;
  family: VideoFamily;
  mode: VideoMode;
  aspect: Aspect;
  headline: string;
  kicker?: string;
  subheadline?: string;
  body?: string;
  cta?: string;
  sourceLabel?: string;
  destinationLabel?: string;
  durationSeconds: number;
  audioUrl?: string;
  assetUrl?: string;
  assetCredit?: string;
  captions?: CaptionCue[];
  scenes?: VideoScene[];
  theme?: {
    accent?: string;
  };
};
