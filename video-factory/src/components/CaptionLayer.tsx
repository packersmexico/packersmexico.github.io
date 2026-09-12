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
    <div style={{position: 'absolute', left: 70, right: 70, bottom: 175, textAlign: 'center', fontSize: 42, lineHeight: 1.18, fontWeight: 800, color: brand.cream, textShadow: '0 3px 10px rgba(0,0,0,.8)'}}>
      <span style={{background: 'rgba(8,29,19,.86)', padding: '10px 14px'}}>{cue.text}</span>
    </div>
  );
};
