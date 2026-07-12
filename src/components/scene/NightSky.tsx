"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export const MOON_POSITION = new THREE.Vector3(-60, 55, -140);

/** Deterministic PRNG (mulberry32) — the same sky for every visitor. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Star field: a single Points cloud on a far dome, twinkling via shader. */
export function Stars({ count = 2400 }: { count?: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, seeds, sizes } = useMemo(() => {
    const rand = mulberry32(1184); // Homer's harbour number, why not
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    const radius = 400;
    for (let i = 0; i < count; i++) {
      // Upper hemisphere only, biased away from the horizon haze
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(rand() * 0.92 + 0.08);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      seeds[i] = rand() * 100;
      sizes[i] = 0.7 + Math.pow(rand(), 3) * 2.4;
    }
    return { positions, seeds, sizes };
  }, [count]);

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        uniforms={{ uTime: { value: 0 } }}
        vertexShader={/* glsl */ `
          attribute float aSeed;
          attribute float aSize;
          uniform float uTime;
          varying float vAlpha;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float twinkle = 0.65 + 0.35 * sin(uTime * (0.6 + fract(aSeed) * 1.8) + aSeed);
            vAlpha = twinkle;
            gl_PointSize = aSize * twinkle * 2.2;
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={/* glsl */ `
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.05, d) * vAlpha;
            gl_FragColor = vec4(0.82, 0.87, 1.0, a);
          }
        `}
      />
    </points>
  );
}

/** The moon: emissive disc + soft sprite halo + the scene's key light. */
export function Moon({
  intensityRef,
  lightningRef,
}: {
  intensityRef: React.MutableRefObject<number>;
  lightningRef?: React.MutableRefObject<number>;
}) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  // The moon rides with the sky anchor (the ship), so the light needs an
  // explicit target at the anchor's centre to keep its direction constant.
  const lightTarget = useMemo(() => new THREE.Object3D(), []);

  const haloTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const c = canvas.getContext("2d")!;
    const grad = c.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2,
    );
    grad.addColorStop(0, "rgba(210, 225, 255, 0.55)");
    grad.addColorStop(0.35, "rgba(180, 205, 255, 0.16)");
    grad.addColorStop(1, "rgba(160, 190, 255, 0)");
    c.fillStyle = grad;
    c.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useFrame(() => {
    if (lightRef.current) {
      lightRef.current.intensity =
        intensityRef.current + (lightningRef?.current ?? 0) * 4;
    }
  });

  return (
    <group position={MOON_POSITION}>
      <primitive
        object={lightTarget}
        position={[-MOON_POSITION.x, -MOON_POSITION.y, -MOON_POSITION.z]}
      />
      {/* fog=false: the moon must burn through the sea haze */}
      <mesh>
        <sphereGeometry args={[7, 32, 32]} />
        <meshBasicMaterial color="#e8eeff" fog={false} />
      </mesh>
      {haloTexture && (
        <sprite scale={[46, 46, 1]}>
          <spriteMaterial
            map={haloTexture}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            fog={false}
          />
        </sprite>
      )}
      <directionalLight
        ref={lightRef}
        color="#b8ccf5"
        intensity={2.4}
        target={lightTarget}
      />
    </group>
  );
}

/** Low drifting mist: soft billboards skimming the water. */
export function Mist({ count = 14 }: { count?: number }) {
  const group = useRef<THREE.Group>(null);

  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const c = canvas.getContext("2d")!;
    const grad = c.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2,
    );
    grad.addColorStop(0, "rgba(150, 175, 210, 0.13)");
    grad.addColorStop(0.6, "rgba(140, 165, 200, 0.05)");
    grad.addColorStop(1, "rgba(130, 155, 190, 0)");
    c.fillStyle = grad;
    c.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }, []);

  const puffs = useMemo(() => {
    const rand = mulberry32(773);
    return Array.from({ length: count }, (_, i) => ({
      x: (rand() - 0.5) * 160,
      z: (rand() - 0.5) * 160,
      scale: 18 + rand() * 30,
      speed: 0.14 + rand() * 0.3,
      phase: i * 2.3,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.children.forEach((child, i) => {
      const p = puffs[i];
      child.position.x = p.x + Math.sin(t * p.speed + p.phase) * 9;
      child.position.z = p.z + Math.cos(t * p.speed * 0.8 + p.phase) * 7;
      child.position.y = 1.6 + Math.sin(t * 0.24 + p.phase) * 0.7;
    });
  });

  if (!texture) return null;

  return (
    <group ref={group}>
      {puffs.map((p, i) => (
        <sprite key={i} position={[p.x, 1.5, p.z]} scale={[p.scale, p.scale * 0.4, 1]}>
          <spriteMaterial
            map={texture}
            transparent
            depthWrite={false}
            blending={THREE.NormalBlending}
          />
        </sprite>
      ))}
    </group>
  );
}
