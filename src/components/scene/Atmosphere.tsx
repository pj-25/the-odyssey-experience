"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getPoi, FRAGMENT_COUNT } from "@/lib/world";
import { shipPose, useExploration, fragmentsOf } from "@/lib/store";
import { proximityGlow, breathe } from "@/lib/glow";

/**
 * Living light: the particles that make the world feel inhabited even
 * when the ship lies still. Fireflies gather over the water at the
 * mysterious places, embers climb from the watchfire once it is lit, and
 * faint motes drift through the moonlight around the ship. All procedural,
 * all additive light — no textures, no assets.
 */

/* One soft round additive point, sized in world space, alpha driven per
   particle from the CPU so each can twinkle, rise, and fade on its own. */
const POINT_VERTEX = /* glsl */ `
  attribute float aScale;
  attribute float aAlpha;
  uniform float uSize;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // Size attenuation, but capped so a particle near the lens stays a
    // glimmer, never a screen-filling blob.
    gl_PointSize = min(uSize * aScale * (180.0 / max(-mv.z, 1.0)), 60.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const POINT_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

/** Build a glow-points buffer geometry + additive shader material pair. */
function makeGlow(count: number, color: string, size: number) {
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const alphas = new Float32Array(count);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
  geo.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uSize: { value: size } },
    vertexShader: POINT_VERTEX,
    fragmentShader: POINT_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  return { geo, mat, positions, scales, alphas };
}

/* ------------------------------------------------------------------ */
/* Fireflies — gather at the mysterious places, brighter as you near   */
/* ------------------------------------------------------------------ */

interface Haunt {
  x: number;
  z: number;
  /** local drift extents */
  spread: number;
  top: number;
  color: string;
}

function Fireflies({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const { geo, mat, positions, scales, alphas } = useMemo(
    () => makeGlow(count, "#c8e878", 4.4),
    [count],
  );

  // Per-firefly drift parameters (stable across frames)
  const swarm = useMemo(() => {
    let s = 90142;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: count }, () => ({
      bx: (rand() - 0.5) * 2,
      by: rand(),
      bz: (rand() - 0.5) * 2,
      ax: 1.5 + rand() * 3,
      az: 1.5 + rand() * 3,
      wx: 0.2 + rand() * 0.5,
      wz: 0.2 + rand() * 0.5,
      wy: 0.3 + rand() * 0.6,
      seed: rand() * 100,
      phase: rand() * Math.PI * 2,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    const pts = ref.current;
    if (!pts) return;
    const t = clock.elapsedTime;
    const fragments = fragmentsOf(useExploration.getState().discoveries);

    // Nearest active haunt to the ship (city only once the chart is whole)
    const cave = getPoi("cave")!;
    const temple = getPoi("temple")!;
    const city = getPoi("hiddenCity")!;
    const haunts: Haunt[] = [
      { x: cave.x, z: cave.z + 14, spread: 26, top: 12, color: "#8fe0c4" },
      { x: temple.x, z: temple.z, spread: 22, top: 9, color: "#d6e88a" },
    ];
    if (fragments >= FRAGMENT_COUNT)
      haunts.push({ x: city.x, z: city.z, spread: 40, top: 20, color: "#ffd98a" });

    let best: Haunt | null = null;
    let bestD = Infinity;
    for (const h of haunts) {
      const d = Math.hypot(shipPose.x - h.x, shipPose.z - h.z);
      if (d < bestD) {
        bestD = d;
        best = h;
      }
    }
    const glow = best ? proximityGlow(bestD, 34, 150) : 0;
    pts.visible = glow > 0.015;
    if (!pts.visible || !best) return;

    (mat.uniforms.uColor.value as THREE.Color).set(best.color);
    for (let i = 0; i < count; i++) {
      const f = swarm[i];
      const px = best.x + f.bx * best.spread + Math.sin(t * f.wx + f.phase) * f.ax;
      const py = 1.5 + f.by * best.top + Math.sin(t * f.wy + f.seed) * 1.4;
      const pz = best.z + f.bz * best.spread + Math.cos(t * f.wz + f.phase) * f.az;
      positions[i * 3] = px;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = pz;
      const twinkle = 0.35 + 0.65 * Math.max(0, Math.sin(t * (1.1 + f.wx * 2) + f.seed));
      scales[i] = 0.5 + f.by * 0.7;
      alphas[i] = glow * twinkle * 0.85;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aScale.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
  });

  return <points ref={ref} geometry={geo} material={mat} visible={false} frustumCulled={false} />;
}

/* ------------------------------------------------------------------ */
/* Embers — climb from the watchfire once it burns                     */
/* ------------------------------------------------------------------ */

function Embers({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const { geo, mat, positions, scales, alphas } = useMemo(
    () => makeGlow(count, "#ff9a4d", 3.4),
    [count],
  );
  const beacon = useMemo(() => getPoi("beacon")!, []);
  // Each ember: birth time offset, lateral wander, lifetime, rise speed
  const specs = useMemo(() => {
    let s = 4471;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: count }, () => ({
      off: rand(),
      ax: (rand() - 0.5) * 3.2,
      az: (rand() - 0.5) * 3.2,
      wob: 0.6 + rand() * 1.2,
      life: 3.2 + rand() * 2.6,
      rise: 5 + rand() * 4,
      seed: rand() * 100,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    const pts = ref.current;
    if (!pts) return;
    const lit = useExploration.getState().beaconLit;
    // Fade the whole swarm with distance so far embers cost nothing visually
    const d = Math.hypot(shipPose.x - beacon.x, shipPose.z - beacon.z);
    const near = proximityGlow(d, 60, 320);
    pts.visible = lit && near > 0.02;
    if (!pts.visible) return;

    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const e = specs[i];
      const age = ((t / e.life + e.off) % 1); // 0..1 loop
      const y = 20.4 + age * e.rise * e.life;
      const fade = Math.sin(age * Math.PI); // in and out over the life
      positions[i * 3] = beacon.x + e.ax + Math.sin(t * e.wob + e.seed) * (0.6 + age * 1.4);
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = beacon.z + e.az + Math.cos(t * e.wob * 0.8 + e.seed) * (0.6 + age * 1.4);
      scales[i] = 0.5 + (1 - age) * 0.8;
      alphas[i] = near * fade * 0.9;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aScale.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
  });

  return <points ref={ref} geometry={geo} material={mat} visible={false} frustumCulled={false} />;
}

/* ------------------------------------------------------------------ */
/* Motes — faint dust in the moonlight, always drifting near the ship  */
/* ------------------------------------------------------------------ */

function Motes({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const { geo, mat, positions, scales, alphas } = useMemo(
    () => makeGlow(count, "#acc4e6", 2.4),
    [count],
  );
  const specs = useMemo(() => {
    let s = 20260717;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: count }, () => ({
      x: (rand() - 0.5) * 90,
      y: 2 + rand() * 26,
      z: (rand() - 0.5) * 90,
      wx: 0.1 + rand() * 0.3,
      wy: 0.15 + rand() * 0.25,
      amp: 1 + rand() * 3,
      seed: rand() * 100,
      scale: 0.4 + rand() * 0.8,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    const pts = ref.current;
    if (!pts) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const m = specs[i];
      positions[i * 3] = shipPose.x + m.x + Math.sin(t * m.wx + m.seed) * m.amp;
      positions[i * 3 + 1] = m.y + Math.sin(t * m.wy + m.seed * 1.3) * 1.5;
      positions[i * 3 + 2] = shipPose.z + m.z + Math.cos(t * m.wx * 0.8 + m.seed) * m.amp;
      scales[i] = m.scale;
      alphas[i] = 0.16 * breathe(t, 0.4, 0.5, m.seed);
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aScale.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
  });

  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}

export default function Atmosphere({ quality }: { quality: "high" | "low" }) {
  const high = quality === "high";
  return (
    <group>
      <Fireflies count={high ? 46 : 24} />
      <Embers count={high ? 34 : 18} />
      <Motes count={high ? 54 : 26} />
    </group>
  );
}
