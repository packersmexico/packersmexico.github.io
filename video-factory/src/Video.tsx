import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Audio} from '@remotion/media';
import {Analysis} from './templates/Analysis';
import {Breaking} from './templates/Breaking';
import {Matchup} from './templates/Matchup';
import {CaptionLayer} from './components/CaptionLayer';
import type {VideoSpec} from './types';

export const PMXVideo: React.FC<VideoSpec> = (spec) => {
  const Template = spec.family === 'BREAKING' ? Breaking : spec.family === 'MATCHUP' ? Matchup : Analysis;
  return (
    <AbsoluteFill>
      <Template spec={spec} />
      {spec.audioUrl ? <Audio src={spec.audioUrl} /> : null}
      <CaptionLayer cues={spec.captions} />
    </AbsoluteFill>
  );
};
