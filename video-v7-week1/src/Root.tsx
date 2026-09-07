import React from 'react';
import {Composition} from 'remotion';
import timings from './timings.json';
import {PMXOffseasonV7Week1} from './Video';

const FPS = timings.fps || 30;
const totalSeconds = timings.scenes.reduce((sum, scene) => sum + scene.seconds, 0);
const durationInFrames = Math.max(1, Math.round(totalSeconds * FPS));

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PMXOffseasonV7Week1"
      component={PMXOffseasonV7Week1}
      durationInFrames={durationInFrames}
      fps={FPS}
      width={1080}
      height={1920}
    />
  );
};
