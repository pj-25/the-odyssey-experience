"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  environmentAt,
  stormIntensityAt,
  ENV_PRESETS,
  POIS,
  FRAGMENT_COUNT,
} from "@/lib/world";
import { useVoyage, useExploration, fragmentsOf, shipPose } from "@/lib/store";
import { ambience } from "@/lib/ambience";
import Ocean from "./Ocean";
import ShipController from "./ShipController";
import Islands from "./Islands";
import Wildlife from "./Wildlife";
import SkyEvents from "./SkyEvents";
import Underwater from "./Underwater";
import { Stars, Moon, Mist, MOON_POSITION } from "./NightSky";

/**
 * The scene director for an open world. The environment is no longer a
 * chapter script — it is a continuous function of where the ship rides:
 * storms build as you near them, the harbour calms the water, the cave
 * hushes the sky, and a finished chart lets dawn break over the far north.
 */

export interface EnvRefs {
  waveAmp: React.MutableRefObject<number>;
  fogDensity: React.MutableRefObject<number>;
  moonIntensity: React.MutableRefObject<number>;
  ambient: React.MutableRefObject<number>;
  waterColor: React.MutableRefObject<THREE.Color>;
  fogColor: React.MutableRefObject<THREE.Color>;
  skyColor: React.MutableRefObject<THREE.Color>;
  /** transient 0..1 lightning flash factor */
  lightning: React.MutableRefObject<number>;
}

const hiddenCityPoi = POIS.find((p) => p.id === "hiddenCity")!;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Continuously eases the live environment toward the world's answer. */
function EnvironmentDirector({ env }: { env: EnvRefs }) {
  const scene3 = useRef<{ tmpA: THREE.Color; tmpB: THREE.Color }>({
    tmpA: new THREE.Color(),
    tmpB: new THREE.Color(),
  });
  const nextBolt = useRef(4);

  useFrame(({ scene, clock }, dt) => {
    const d = Math.min(dt, 0.05);
    const { x, z } = shipPose;
    const mode = useVoyage.getState().mode;
    const exploration = useExploration.getState();

    let target = environmentAt(x, z);

    // Dawn breaks near the hidden city — but only for a finished chart
    if (fragmentsOf(exploration.discoveries) >= FRAGMENT_COUNT) {
      const cityT = smoothstep(
        320,
        100,
        Math.hypot(x - hiddenCityPoi.x, z - hiddenCityPoi.z),
      );
      if (cityT > 0) {
        const s = ENV_PRESETS.sunrise;
        target = {
          waveAmp: target.waveAmp + (s.waveAmp - target.waveAmp) * cityT,
          fogDensity: target.fogDensity + (s.fogDensity - target.fogDensity) * cityT,
          moonIntensity:
            target.moonIntensity + (s.moonIntensity - target.moonIntensity) * cityT,
          ambientIntensity:
            target.ambientIntensity +
            (s.ambientIntensity - target.ambientIntensity) * cityT,
          fogColor: mixHex(target.fogColor, s.fogColor, cityT),
          waterColor: mixHex(target.waterColor, s.waterColor, cityT),
          skyColor: mixHex(target.skyColor, s.skyColor, cityT),
        };
      }
    }

    if (mode === "underwater") target = ENV_PRESETS.underwater;

    // First-order lag toward the target — the world drifts, never cuts
    const k = 1 - Math.exp(-d * 0.7);
    env.waveAmp.current += (target.waveAmp - env.waveAmp.current) * k;
    env.fogDensity.current += (target.fogDensity - env.fogDensity.current) * k;
    env.moonIntensity.current +=
      (target.moonIntensity - env.moonIntensity.current) * k;
    env.ambient.current += (target.ambientIntensity - env.ambient.current) * k;
    const { tmpA } = scene3.current;
    env.waterColor.current.lerp(tmpA.set(target.waterColor), k);
    env.fogColor.current.lerp(tmpA.set(target.fogColor), k);
    env.skyColor.current.lerp(tmpA.set(target.skyColor), k);

    // Lightning inside the storm
    const stormT = stormIntensityAt(x, z);
    if (stormT > 0.12 && mode === "sailing") {
      nextBolt.current -= d;
      if (nextBolt.current <= 0) {
        env.lightning.current = 0.8 + Math.random() * 0.2;
        nextBolt.current = 2.5 + Math.random() * 6 * (1.2 - stormT);
        ambience.thunder(stormT);
      }
    }
    env.lightning.current = Math.max(0, env.lightning.current - d * 3.2);

    // Apply to scene fog / background (flash tints both). Mesh fog uses
    // the SKY color so distant geometry melts into the sky instead of
    // silhouetting; the ocean keeps its own warmer fog uniform for the
    // horizon glow on the water.
    const flash = env.lightning.current * stormT;
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.density = env.fogDensity.current;
      scene.fog.color
        .copy(env.skyColor.current)
        .lerp(scene3.current.tmpB.set("#4a5a78"), flash * 0.7);
    } else {
      scene.fog = new THREE.FogExp2("#0a1830", env.fogDensity.current);
    }
    if (scene.background instanceof THREE.Color) {
      scene.background
        .copy(env.skyColor.current)
        .lerp(scene3.current.tmpB.set("#3a4a68"), flash * 0.6);
    } else {
      scene.background = env.skyColor.current.clone();
    }

    void clock;
  });

  return null;
}

function AmbientRig({ env }: { env: EnvRefs }) {
  const ref = useRef<THREE.AmbientLight>(null);
  useFrame(() => {
    if (ref.current) {
      ref.current.intensity =
        env.ambient.current + env.lightning.current * 1.6;
    }
  });
  return <ambientLight ref={ref} color="#4a5f8a" intensity={0.34} />;
}

/** Sky (stars, moon, mist) rides with the ship so it reads as infinite. */
function SkyAnchor({ env, quality }: { env: EnvRefs; quality: "high" | "low" }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current) group.current.position.set(shipPose.x, 0, shipPose.z);
  });
  return (
    <group ref={group}>
      <Stars count={quality === "high" ? 2400 : 1100} />
      <Moon intensityRef={env.moonIntensity} lightningRef={env.lightning} />
      <Mist count={quality === "high" ? 14 : 7} />
      <SkyEvents quality={quality} />
    </group>
  );
}

function useQuality(): "high" | "low" {
  return useMemo(() => {
    if (typeof navigator === "undefined") return "high";
    const cores = navigator.hardwareConcurrency ?? 8;
    const mobile = /Mobi|Android/i.test(navigator.userAgent);
    return mobile || cores <= 4 ? "low" : "high";
  }, []);
}

export default function OdysseyScene() {
  const quality = useQuality();
  const first = ENV_PRESETS.harbor;

  const waveAmp = useRef(first.waveAmp);
  const fogDensity = useRef(first.fogDensity);
  const moonIntensity = useRef(first.moonIntensity);
  const ambient = useRef(first.ambientIntensity);
  const waterColor = useRef(new THREE.Color(first.waterColor));
  const fogColor = useRef(new THREE.Color(first.fogColor));
  const skyColor = useRef(new THREE.Color(first.skyColor));
  const lightning = useRef(0);
  const env: EnvRefs = {
    waveAmp,
    fogDensity,
    moonIntensity,
    ambient,
    waterColor,
    fogColor,
    skyColor,
    lightning,
  };

  const moonDir = useMemo(() => MOON_POSITION.clone().normalize(), []);

  return (
    <div className="fixed inset-0" aria-hidden="true">
      <Canvas
        dpr={quality === "high" ? [1, 2] : 1}
        camera={{ position: [0, 7, 42], fov: 55, near: 0.1, far: 1100 }}
        gl={{ antialias: quality === "high", powerPreference: "high-performance" }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
          scene.fog = new THREE.FogExp2(first.fogColor, first.fogDensity);
          scene.background = new THREE.Color(first.skyColor);
        }}
      >
        <EnvironmentDirector env={env} />
        <AmbientRig env={env} />
        {/* Sky bounce so the ship reads as form, not silhouette */}
        <hemisphereLight args={["#2b3f66", "#0a0e16", 0.55]} />
        <SkyAnchor env={env} quality={quality} />
        <Ocean
          waveAmpRef={env.waveAmp}
          fogDensityRef={env.fogDensity}
          moonIntensityRef={env.moonIntensity}
          waterColorRef={env.waterColor}
          fogColorRef={env.fogColor}
          moonDirection={moonDir}
          quality={quality}
        />
        <ShipController env={env} />
        <Islands />
        <Wildlife quality={quality} />
        <Underwater />
      </Canvas>
    </div>
  );
}

function mixHex(ha: string, hb: string, t: number): string {
  const pa = parseInt(ha.slice(1), 16);
  const pb = parseInt(hb.slice(1), 16);
  const l = (a: number, b: number) => Math.round(a + (b - a) * t);
  const r = l((pa >> 16) & 255, (pb >> 16) & 255);
  const g = l((pa >> 8) & 255, (pb >> 8) & 255);
  const b = l(pa & 255, pb & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
