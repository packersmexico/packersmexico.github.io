import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Shell} from '../components/Shell';
import {RemoteAsset} from '../components/RemoteAsset';
import {brand} from '../brand';
import type {VideoScene, VideoSpec} from '../types';

const fallbackScene = (spec: VideoSpec): VideoScene => ({
  id: 'fallback',
  start: 0,
  end: spec.durationSeconds,
  type: 'ANALYSIS',
  title: spec.headline,
  kicker: spec.kicker || 'EN LA OPINIÓN DEL DR. PALMA',
  support: spec.subheadline,
  body: spec.body,
  assetUrl: spec.assetUrl,
  assetCredit: spec.assetCredit,
});

export const DrPalma: React.FC<{spec: VideoSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const scenes = spec.scenes?.length ? spec.scenes : [fallbackScene(spec)];
  const scene = scenes.find((item) => t >= item.start && t < item.end) ?? scenes[scenes.length - 1];

  const localFrame = Math.max(0, frame - Math.round(scene.start * fps));
  const sceneFrames = Math.max(1, Math.round((scene.end - scene.start) * fps));
  const enter = interpolate(localFrame, [0, Math.min(sceneFrames * 0.16, fps * 0.55)], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const y = interpolate(enter, [0, 1], [34, 0]);
  const progress = Math.min(1, Math.max(0, (t - scene.start) / Math.max(0.01, scene.end - scene.start)));
  const accent = scene.type === 'PACKERS_NOTE' ? brand.cheeseGold : brand.secondaryGold;
  const asset = scene.assetUrl || spec.assetUrl;

  return (
    <Shell footer={scene.assetCredit ? `CRÉDITO: ${scene.assetCredit}` : 'EN LA OPINIÓN DEL DR. PALMA · PACKERS MÉXICO'}>
      <RemoteAsset src={asset} />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: asset ? '61.8%' : '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          transform: `translateY(${y}px)`,
          opacity: enter,
        }}
      >
        <div style={{fontSize: 27, fontWeight: 900, color: accent, letterSpacing: 1.1, marginBottom: 22}}>
          {scene.kicker || (scene.type === 'PACKERS_NOTE' ? 'APUNTE PACKERS' : 'EN LA OPINIÓN DEL DR. PALMA')}
        </div>

        <div
          style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: scene.type === 'HOOK' ? 134 : scene.type === 'OUTRO' ? 142 : 126,
            lineHeight: 0.92,
            whiteSpace: 'pre-line',
            maxWidth: asset ? 600 : 900,
          }}
        >
          {scene.title}
        </div>

        {scene.support ? (
          <div style={{fontSize: 34, fontWeight: 800, lineHeight: 1.18, marginTop: 28, color: brand.cream, maxWidth: 820}}>
            {scene.support}
          </div>
        ) : null}

        {scene.body ? (
          <div style={{fontSize: 29, lineHeight: 1.4, marginTop: 28, maxWidth: 800, color: brand.muted}}>
            {scene.body}
          </div>
        ) : null}

        {!asset && scene.type !== 'HOOK' && scene.type !== 'OUTRO' ? (
          <div
            style={{
              marginTop: 54,
              borderTop: `3px solid ${accent}`,
              paddingTop: 24,
              color: brand.muted,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 0.8,
            }}
          >
            ANÁLISIS · CONTEXTO · COMUNIDAD
          </div>
        ) : null}
      </div>

      <div style={{position: 'absolute', left: 0, right: 0, bottom: 22, height: 4, background: 'rgba(242,232,207,.18)'}}>
        <div style={{height: '100%', width: `${progress * 100}%`, background: accent}} />
      </div>
    </Shell>
  );
};
