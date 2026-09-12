import React from 'react';
import {Composition, type CalculateMetadataFunction} from 'remotion';
import {PMXVideo} from './Video';
import type {VideoSpec} from './types';

const defaultProps: VideoSpec = {
  version: '1.0',
  pmxId: 'PMX-DEMO-001',
  family: 'ANALYSIS',
  mode: 'HERO',
  aspect: '9:16',
  headline: 'PACKERS MÉXICO\nVIDEO FACTORY',
  subheadline: 'Motor reproducible para video vertical.',
  durationSeconds: 15,
};

const calculateMetadata: CalculateMetadataFunction<VideoSpec> = async ({props}) => {
  const aspect = props.aspect ?? '9:16';
  const size = aspect === '4:5' ? {width: 1080, height: 1350} : aspect === '1:1' ? {width: 1080, height: 1080} : {width: 1080, height: 1920};
  return {
    ...size,
    fps: 30,
    durationInFrames: Math.max(90, Math.round((props.durationSeconds || 15) * 30)),
  };
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="PMXVideo"
    component={PMXVideo}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={450}
    defaultProps={defaultProps}
    calculateMetadata={calculateMetadata}
  />
);
