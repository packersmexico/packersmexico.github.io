import React from 'react';
import '@fontsource/bebas-neue/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/700.css';
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Audio} from '@remotion/media';
import timings from './timings.json';

const C = {
  field: '#081D13',
  green: '#123B31',
  gold: '#FFC62F',
  gold2: '#E3A51A',
  cream: '#F2E8CF',
  red: '#E5483E',
};
const DISPLAY = '"Bebas Neue", sans-serif';
const BODY = 'Montserrat, sans-serif';
const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

type Scene = {
  id: string;
  title: string;
  key?: string;
  caption1: string;
  caption2?: string;
  frames?: number[];
  sticker?: string;
  variant?: 'standard' | 'transition' | 'matchup' | 'pmx' | 'event' | 'close';
  update?: string[];
};

const scenes: Scene[] = [
  {
    id: 'S01',
    title: '¿YA HABÍA TERMINADO EL CHISME?',
    key: 'NO.',
    caption1: '¿Pensabas que ya habíamos terminado con el chisme de offseason de Green Bay?',
    caption2: 'Pues no. Gutekunst decidió mover media casa otra vez.',
    frames: [1, 2, 3, 4],
    sticker: 'OTRO GIRO',
  },
  {
    id: 'S02',
    title: 'TRADE → FIRMA → CORTE → ROSTER',
    key: 'CASI LISTOS.',
    caption1: 'En cuestión de días llegaron caras nuevas, hubo trades, cortes y movimientos.',
    caption2: 'Hasta dejar prácticamente armado el equipo que va a arrancar la temporada.',
    frames: [5, 6, 7, 8, 9],
    sticker: '¿YA ACABÓ? NO.',
  },
  {
    id: 'S03',
    title: 'JONNU SMITH',
    key: 'EXPERIENCIA PARA EL TE ROOM',
    caption1: 'Primero apareció Jonnu Smith. Sí, otro tight end.',
    caption2: 'Veterano, experiencia de sobra y ya conoce el sistema de Matt LaFleur.',
    frames: [10],
    sticker: 'OTRO TE',
  },
  {
    id: 'S04',
    title: 'OTRO TE. PORQUE CLARO.',
    key: 'MARK REDMAN · TRADE',
    caption1: 'Green Bay todavía fue por Mark Redman vía trade con los Rams.',
    caption2: '¿Cuántos tight ends necesitas? Aparentemente la respuesta es: sí.',
    frames: [10, 12],
    sticker: 'SÍ.',
    update: ['MARK REDMAN', 'LAR → GREEN BAY'],
  },
  {
    id: 'S05',
    title: 'KALEB JOHNSON',
    key: 'RB · TRADE CON PITTSBURGH',
    caption1: 'También llegó Kaleb Johnson desde Pittsburgh.',
    caption2: 'Más competencia y profundidad para el backfield.',
    frames: [11],
    sticker: 'NUEVA CARA',
    update: ['KALEB JOHNSON', 'PIT → GREEN BAY'],
  },
  {
    id: 'S06',
    title: 'McCORD OUT → SLOVIS IN',
    key: 'HASTA EL ÚLTIMO DETALLE.',
    caption1: 'Kyle McCord salió rumbo a Miami y Green Bay sumó a Kedon Slovis al practice squad.',
    caption2: 'Y todavía hubo movimientos hasta en equipos especiales.',
    frames: [6, 14],
    sticker: 'OUT / IN',
    update: ['KEDON SLOVIS · PS', 'SCOTT DALY · LENNY KRIEG'],
  },
  {
    id: 'S07',
    title: 'SE ACABARON LAS PRUEBAS.',
    key: 'EL ROSTER TOMÓ FORMA',
    caption1: 'Entre altas, bajas, lesiones y regresos, el roster finalmente tomó forma.',
    caption2: 'Tucker Kraft y MarShawn Lloyd volvieron a meterse de lleno en la conversación.',
    frames: [10, 14],
    sticker: 'YA CUENTA',
    update: ['TUCKER KRAFT', 'MARSHAWN LLOYD'],
  },
  {
    id: 'S08',
    title: 'SE ACABÓ LA OFFSEASON.',
    key: 'WEEK 1',
    caption1: 'Porque ahora sí… se acabó la offseason.',
    caption2: 'Empieza la temporada.',
    variant: 'transition',
  },
  {
    id: 'S09',
    title: 'GREEN BAY @ MINNESOTA',
    key: 'DOM · 13 SEP · 14:25 CDMX',
    caption1: 'Green Bay empieza con cero margen para dormirse. Semana uno. Minnesota.',
    caption2: 'Vikings contra Packers. Rival de división desde el primer domingo.',
    frames: [14],
    variant: 'matchup',
    sticker: 'WEEK 1',
  },
  {
    id: 'S10',
    title: 'AHORA SÍ CUENTA.',
    key: '¿ESTÁ LISTO ESTE EQUIPO?',
    caption1: 'Después de todo lo que cambió durante estos meses, ahora viene la única pregunta que importa.',
    caption2: '¿Este equipo está listo para demostrarlo cuando los partidos ya cuentan?',
    frames: [1, 14],
    sticker: 'SIN EXCUSAS',
  },
  {
    id: 'S11',
    title: 'PACKERS MÉXICO · TEMPORADA 2026',
    key: 'GAME DAY · PODCAST · COMUNIDAD',
    caption1: 'Y nosotros también arrancamos temporada.',
    caption2: 'Game Day, podcast, comunidad… y todo lo que se nos vaya ocurriendo en el camino.',
    variant: 'pmx',
    sticker: 'VAMOS JUNTOS',
  },
  {
    id: 'S12',
    title: 'FOTO OFICIAL · AFICIÓN PACKERS',
    key: 'DOM · 13 SEP · 12:00 h',
    caption1: 'Pero primero queremos arrancar juntos.',
    caption2: 'Este domingo nos vemos para la foto oficial de la afición Packers en Ciudad de México.',
    variant: 'event',
  },
  {
    id: 'S13',
    title: 'MINNESOTA NOS ESPERA.',
    key: 'GO PACK GO.',
    caption1: 'Nos tomamos la foto… y unas horas después empieza lo bueno.',
    caption2: 'Minnesota nos espera. Go Pack Go.',
    frames: [14],
    variant: 'close',
  },
];

const timeline = timings.scenes.map((t, i) => ({
  ...t,
  start: timings.scenes.slice(0, i).reduce((sum, x) => sum + x.seconds, 0),
}));

const Logo: React.FC = () => (
  <div style={{position: 'absolute', left: 46, top: 42, zIndex: 50, width: 310}}>
    <Img src={staticFile('assets/pmx-logo.png')} style={{width: '100%', height: 'auto'}} />
  </div>
);

const SlideMontage: React.FC<{frames: number[]; duration: number}> = ({frames, duration}) => {
  const frame = useCurrentFrame();
  const each = duration / Math.max(1, frames.length);
  return (
    <AbsoluteFill style={{backgroundColor: C.field}}>
      {frames.map((n, i) => {
        const local = frame - i * each;
        const on = frame >= i * each && frame < (i + 1) * each;
        const fade = on ? interpolate(local, [0, 5, Math.max(6, each - 5), each], [0, 1, 1, 0], clamp) : 0;
        const zoom = interpolate(Math.max(0, local), [0, Math.max(1, each)], [1.01, 1.075], clamp);
        const pan = interpolate(Math.max(0, local), [0, Math.max(1, each)], [i % 2 ? 10 : -10, i % 2 ? -10 : 10], clamp);
        return (
          <Img
            key={`${n}-${i}`}
            src={staticFile(`assets/old_${String(n).padStart(2, '0')}.jpg`)}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
              opacity: fade, transform: `translateX(${pan}px) scale(${zoom})`,
            }}
          />
        );
      })}
      <AbsoluteFill style={{background: 'linear-gradient(180deg,rgba(8,29,19,.08),rgba(8,29,19,.12) 42%,rgba(8,29,19,.86) 100%)'}} />
    </AbsoluteFill>
  );
};

const Sticker: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const p = spring({frame: frame - 12, fps: 30, config: {damping: 13, stiffness: 180, mass: .7}});
  return (
    <div style={{display: 'inline-block', padding: '12px 18px 10px', background: C.gold, color: C.field,
      fontFamily: BODY, fontSize: 25, fontWeight: 700, letterSpacing: 1,
      transform: `rotate(-3deg) scale(${.78 + .22 * p})`, opacity: p, boxShadow: '0 12px 28px rgba(0,0,0,.28)'}}>
      {text}
    </div>
  );
};

const Caption: React.FC<{a: string; b?: string; duration: number}> = ({a, b, duration}) => {
  const frame = useCurrentFrame();
  const second = Boolean(b) && frame >= duration * .5;
  const text = second ? b! : a;
  const local = second ? frame - duration * .5 : frame;
  const opacity = interpolate(local, [0, 5], [0, 1], clamp);
  return (
    <div style={{position: 'absolute', left: 46, right: 46, bottom: 92, zIndex: 60,
      background: 'rgba(8,29,19,.88)', borderLeft: `8px solid ${C.gold}`, padding: '18px 22px 20px',
      color: C.cream, fontFamily: BODY, fontWeight: 700, fontSize: 31, lineHeight: 1.18, opacity,
      boxShadow: '0 14px 36px rgba(0,0,0,.28)'}}>{text}</div>
  );
};

const Standard: React.FC<{scene: Scene; duration: number}> = ({scene, duration}) => {
  const frame = useCurrentFrame();
  const enter = spring({frame: frame - 5, fps: 30, config: {damping: 16, stiffness: 150}});
  return (
    <AbsoluteFill style={{backgroundColor: C.field}}>
      <SlideMontage frames={scene.frames ?? [14]} duration={duration} />
      <Logo />
      <div style={{position: 'absolute', left: 46, right: 46, top: 250, zIndex: 30,
        transform: `translateY(${(1 - enter) * 58}px)`, opacity: enter}}>
        <div style={{fontFamily: DISPLAY, fontSize: scene.title.length > 28 ? 96 : 118, lineHeight: .9,
          color: C.cream, textShadow: '0 7px 26px rgba(0,0,0,.55)'}}>{scene.title}</div>
        {scene.key ? <div style={{fontFamily: DISPLAY, fontSize: 51, lineHeight: .95, color: C.gold, marginTop: 18,
          textShadow: '0 6px 20px rgba(0,0,0,.45)'}}>{scene.key}</div> : null}
        {scene.sticker ? <div style={{marginTop: 22}}><Sticker text={scene.sticker} /></div> : null}
      </div>
      {scene.update?.length ? (
        <div style={{position: 'absolute', left: 46, right: 46, top: 760, zIndex: 40, display: 'flex', flexDirection: 'column', gap: 10}}>
          {scene.update.map((x, i) => {
            const p = spring({frame: frame - 16 - i * 6, fps: 30, config: {damping: 16, stiffness: 160}});
            return <div key={x} style={{alignSelf: i % 2 ? 'flex-end' : 'flex-start', padding: '12px 18px',
              background: i % 2 ? C.cream : C.gold, color: C.field, fontFamily: BODY, fontSize: 27, fontWeight: 700,
              transform: `translateX(${(1-p) * (i % 2 ? 80 : -80)}px)`, opacity: p}}>{x}</div>;
          })}
        </div>
      ) : null}
      <Caption a={scene.caption1} b={scene.caption2} duration={duration} />
    </AbsoluteFill>
  );
};

const TransitionScene: React.FC<{scene: Scene; duration: number}> = ({scene, duration}) => {
  const frame = useCurrentFrame();
  const cut = duration * .52;
  const after = frame >= cut;
  const flash = interpolate(frame, [cut - 3, cut, cut + 3], [0, 1, 0], clamp);
  const p = spring({frame: after ? frame - cut : frame, fps: 30, config: {damping: 17, stiffness: 130}});
  return (
    <AbsoluteFill style={{backgroundColor: after ? C.field : C.cream}}>
      <Logo />
      <div style={{position: 'absolute', left: 46, right: 46, top: 650, zIndex: 20, color: after ? C.cream : C.field}}>
        <div style={{fontFamily: DISPLAY, fontSize: after ? 220 : 162, lineHeight: .86,
          transform: `scale(${.9 + p * .1})`, transformOrigin: 'left center'}}>
          {after ? 'WEEK 1' : scene.title}
        </div>
      </div>
      <AbsoluteFill style={{backgroundColor: C.gold, opacity: flash}} />
      <Caption a={scene.caption1} b={scene.caption2} duration={duration} />
    </AbsoluteFill>
  );
};

const Matchup: React.FC<{scene: Scene; duration: number}> = ({scene, duration}) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, duration], [1.02, 1.09], clamp);
  return (
    <AbsoluteFill style={{backgroundColor: C.field}}>
      <Img src={staticFile('assets/old_14.jpg')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg,rgba(8,29,19,.18),rgba(8,29,19,.82) 58%,#081D13 100%)'}} />
      <Logo />
      <div style={{position: 'absolute', left: 46, right: 46, top: 670, zIndex: 30}}>
        <div style={{fontFamily: DISPLAY, fontSize: 128, lineHeight: .85, color: C.cream}}>GREEN BAY</div>
        <div style={{fontFamily: DISPLAY, fontSize: 88, lineHeight: .8, color: C.gold}}>@</div>
        <div style={{fontFamily: DISPLAY, fontSize: 128, lineHeight: .85, color: C.cream}}>MINNESOTA</div>
        <div style={{display: 'inline-block', marginTop: 28, background: C.gold, color: C.field, padding: '12px 17px',
          fontFamily: BODY, fontSize: 31, fontWeight: 700}}>DOM · 13 SEP · 14:25 CDMX</div>
      </div>
      <Caption a={scene.caption1} b={scene.caption2} duration={duration} />
    </AbsoluteFill>
  );
};

const PMXScene: React.FC<{scene: Scene; duration: number}> = ({scene, duration}) => {
  const frame = useCurrentFrame();
  const words = ['GAME DAY', 'PODCAST', 'COMUNIDAD', 'ANÁLISIS'];
  return (
    <AbsoluteFill style={{background: `linear-gradient(145deg,${C.field},${C.green})`}}>
      <Logo />
      <div style={{position: 'absolute', left: 46, right: 46, top: 350}}>
        <div style={{fontFamily: DISPLAY, color: C.cream, fontSize: 120, lineHeight: .9}}>PACKERS MÉXICO</div>
        <div style={{fontFamily: DISPLAY, color: C.gold, fontSize: 94, lineHeight: .9, marginTop: 12}}>TEMPORADA 2026</div>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 45}}>
          {words.map((w, i) => {
            const p = spring({frame: frame - 8 - i * 5, fps: 30, config: {damping: 16, stiffness: 150}});
            return <div key={w} style={{padding: '14px 20px', background: i % 2 ? C.cream : C.gold, color: C.field,
              fontFamily: BODY, fontWeight: 700, fontSize: 31, transform: `scale(${.82 + .18 * p})`, opacity: p}}>{w}</div>;
          })}
        </div>
        <div style={{marginTop: 48}}><Sticker text="VAMOS JUNTOS" /></div>
      </div>
      <Caption a={scene.caption1} b={scene.caption2} duration={duration} />
    </AbsoluteFill>
  );
};

const EventScene: React.FC<{scene: Scene; duration: number}> = ({scene, duration}) => {
  const frame = useCurrentFrame();
  const p = spring({frame: frame - 6, fps: 30, config: {damping: 16, stiffness: 140}});
  return (
    <AbsoluteFill style={{backgroundColor: C.field}}>
      <Img src={staticFile('assets/foto-oficial.png')} style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: .52}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg,rgba(8,29,19,.35),#081D13 78%)'}} />
      <Logo />
      <div style={{position: 'absolute', left: 46, right: 46, top: 370, zIndex: 30, transform: `translateY(${(1-p)*60}px)`, opacity: p}}>
        <div style={{fontFamily: DISPLAY, fontSize: 110, color: C.cream, lineHeight: .9}}>FOTO OFICIAL</div>
        <div style={{fontFamily: DISPLAY, fontSize: 77, color: C.gold, lineHeight: .9}}>AFICIÓN PACKERS</div>
        <div style={{marginTop: 42, background: C.cream, color: C.field, padding: '30px 30px 28px', maxWidth: 830}}>
          <div style={{fontFamily: DISPLAY, fontSize: 76, lineHeight: .9}}>DOM · 13 SEP</div>
          <div style={{fontFamily: DISPLAY, fontSize: 112, lineHeight: .9, color: C.green}}>12:00 h</div>
          <div style={{fontFamily: BODY, fontSize: 34, fontWeight: 700, marginTop: 20}}>PALACIO DE BELLAS ARTES</div>
          <div style={{height: 5, background: C.gold2, margin: '24px 0'}} />
          <div style={{fontFamily: BODY, fontSize: 28, fontWeight: 700, lineHeight: 1.3}}>Costado izquierdo · pasillo</div>
          <div style={{fontFamily: BODY, fontSize: 27, lineHeight: 1.3, marginTop: 10}}>Recomendamos llegar 30 min antes</div>
        </div>
      </div>
      <Caption a={scene.caption1} b={scene.caption2} duration={duration} />
    </AbsoluteFill>
  );
};

const CloseScene: React.FC<{scene: Scene; duration: number}> = ({scene, duration}) => {
  const frame = useCurrentFrame();
  const cut = duration * .52;
  const final = frame >= cut;
  const p = spring({frame: frame - cut, fps: 30, config: {damping: 18, stiffness: 125}});
  return (
    <AbsoluteFill style={{backgroundColor: C.field}}>
      {!final ? <SlideMontage frames={[14]} duration={duration} /> : null}
      <Logo />
      {!final ? (
        <div style={{position: 'absolute', left: 46, right: 46, top: 560, zIndex: 30}}>
          <div style={{fontFamily: DISPLAY, fontSize: 144, color: C.cream, lineHeight: .86}}>MINNESOTA</div>
          <div style={{fontFamily: DISPLAY, fontSize: 144, color: C.gold, lineHeight: .86}}>NOS ESPERA.</div>
          <div style={{marginTop: 24}}><Sticker text="GO PACK GO" /></div>
        </div>
      ) : (
        <div style={{position: 'absolute', left: 46, right: 46, top: 570, zIndex: 30, opacity: p,
          transform: `translateY(${(1-p)*65}px)`}}>
          <div style={{fontFamily: DISPLAY, fontSize: 146, lineHeight: .86, color: C.cream}}>MÁS QUE NOTICIAS.</div>
          <div style={{fontFamily: DISPLAY, fontSize: 146, lineHeight: .86, color: C.gold, marginTop: 18}}>VIVIMOS GREEN BAY.</div>
          <div style={{fontFamily: BODY, fontSize: 28, fontWeight: 700, letterSpacing: 2, color: C.cream, marginTop: 42}}>PACKERS MÉXICO · DESDE 2013</div>
        </div>
      )}
      <Caption a={scene.caption1} b={scene.caption2} duration={duration} />
    </AbsoluteFill>
  );
};

const RenderScene: React.FC<{scene: Scene; duration: number}> = ({scene, duration}) => {
  if (scene.variant === 'transition') return <TransitionScene scene={scene} duration={duration} />;
  if (scene.variant === 'matchup') return <Matchup scene={scene} duration={duration} />;
  if (scene.variant === 'pmx') return <PMXScene scene={scene} duration={duration} />;
  if (scene.variant === 'event') return <EventScene scene={scene} duration={duration} />;
  if (scene.variant === 'close') return <CloseScene scene={scene} duration={duration} />;
  return <Standard scene={scene} duration={duration} />;
};

export const PMXOffseasonRetime: React.FC = () => {
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{backgroundColor: C.field}}>
      {scenes.map((scene, i) => {
        const t = timeline.find((x) => x.id === scene.id) ?? timeline[i];
        const from = Math.round(t.start * fps);
        const duration = Math.max(1, Math.round(t.seconds * fps));
        return (
          <Sequence key={scene.id} from={from} durationInFrames={duration} name={`${scene.id} · ${scene.title}`}>
            <RenderScene scene={scene} duration={duration} />
            <Audio src={staticFile(`audio/${scene.id}.mp3`)} volume={1} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
