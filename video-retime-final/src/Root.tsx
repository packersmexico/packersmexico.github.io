import React from 'react';
import {Composition} from 'remotion';
import timings from './timings.json';
import {PMXOffseasonRetime} from './Video';

const fps = timings.fps || 30;
const totalSeconds = timings.scenes.reduce((sum, scene) => sum + scene.seconds, 0);

export const Root: React.FC = () => (
  <Composition
    id="PMXOffseasonRetime"
    component={PMXOffseasonRetime}
    durationInFrames={Math.max(1, Math.round(totalSeconds * fps))}
    fps={fps}
    width={1080}
    height={1920}
  />
);
