import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {brand} from '../brand';
import type {CaptionCue} from '../types';

export const CaptionLayer: React.FC<{cues?: CaptionCue[]}> = ({cues = []}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const cue = cues.find((c) => t >= c.start && t < c.end);
  if (!cue) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 88,
        right: 88,
        bottom: 248,
        textAlign: 'center',
        fontFamily: 'Montserrat, sans-serif',
        fontSize: 38,
        lineHeight: 1.5,
        fontWeight: 800,
        color: brand.cream,
        textShadow: '0 3px 10px rgba(0,0,0,.8)',
      }}
    >
      <span
        style={{
          background: 'rgba(8,29,19,.9)',
          boxDecorationBreak: 'clone',
          WebkitBoxDecorationBreak: 'clone',
          padding: '12px 16px',
        }}
      >
        {cue.text}
      </span>
    </div>
  );
};
