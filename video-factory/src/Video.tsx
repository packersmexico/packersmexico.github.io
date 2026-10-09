import React from 'react';
import {AbsoluteFill, staticFile} from 'remotion';
import {Audio} from '@remotion/media';
import {Analysis} from './templates/Analysis';
import {Breaking} from './templates/Breaking';
import {Matchup} from './templates/Matchup';
import {DrPalma} from './templates/DrPalma';
import {CaptionLayer} from './components/CaptionLayer';
import type {VideoSpec} from './types';

const resolveAudio = (src?: string) => {
  if (!src) return undefined;
  if (src.startsWith('static:')) return staticFile(src.slice('static:'.length));
  return src;
};

export const PMXVideo: React.FC<VideoSpec> = (spec) => {
  const Template =
    spec.family === 'DR_PALMA'
      ? DrPalma
      : spec.family === 'BREAKING'
        ? Breaking
        : spec.family === 'MATCHUP'
          ? Matchup
          : Analysis;

  const audioSrc = resolveAudio(spec.audioUrl);
  const musicSrc = resolveAudio(spec.musicUrl);

  return (
    <AbsoluteFill>
      <Template spec={spec} />
      {musicSrc ? <Audio src={musicSrc} volume={0.07} loop /> : null}
      {audioSrc ? <Audio src={audioSrc} volume={1} /> : null}
      <CaptionLayer cues={spec.captions} />
    </AbsoluteFill>
  );
};
