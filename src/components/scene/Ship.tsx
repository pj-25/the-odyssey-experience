"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { waveHeight, waveSlope } from "@/lib/waves";
import { hullPoint, halfBeam, sheerHeight, HULL_LENGTH } from "@/lib/hull";
import { sailEfficiency } from "@/lib/sailing";
import { shipPose, useVoyage } from "@/lib/store";

/**
 * The galley, lofted from real hull lines (src/lib/hull.ts) and dressed
 * with canvas-painted planking — still zero binary assets. She rides the
 * wave field, heels with rudder and wind, and her sail breathes.
 */

const SAIL_COLOR = "#d8cdb4";

/** Soft radial glow texture for the lantern halo. */
function useGlowTexture(color: string) {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const c = canvas.getContext("2d")!;
    const grad = c.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2,
    );
    grad.addColorStop(0, color);
    grad.addColorStop(0.4, color.replace(/[\d.]+\)$/, "0.12)"));
    grad.addColorStop(1, color.replace(/[\d.]+\)$/, "0)"));
    c.fillStyle = grad;
    c.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }, [color]);
}

/** Weathered plank texture, painted on a canvas. */
function usePlankTexture(base: string, gap: string, repeat: [number, number]) {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const w = 256;
    const h = 256;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const c = canvas.getContext("2d")!;
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    const plankH = 32;
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let y = 0; y < h; y += plankH) {
      // Grain streaks
      for (let i = 0; i < 46; i++) {
        const gy = y + 2 + rand() * (plankH - 4);
        const gx = rand() * w;
        const len = 12 + rand() * 60;
        const tone = rand();
        c.strokeStyle =
          tone > 0.5
            ? `rgba(0, 0, 0, ${0.05 + rand() * 0.1})`
            : `rgba(255, 225, 180, ${0.03 + rand() * 0.05})`;
        c.lineWidth = 0.8 + rand() * 1.4;
        c.beginPath();
        c.moveTo(gx, gy);
        c.lineTo(gx + len, gy + (rand() - 0.5) * 3);
        c.stroke();
      }
      // Seam between planks
      c.fillStyle = gap;
      c.fillRect(0, y + plankH - 2, w, 2);
      // Butt joints
      for (let j = 0; j < 3; j++) {
        const bx = rand() * w;
        c.fillRect(bx, y, 2, plankH);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [base, gap, repeat]);
}

const STATIONS = 36;
const SKIN_STEPS = 9;

/** Loft the hull skin from the pure hull-line functions. */
function useHullGeometry() {
  return useMemo(() => {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (const side of [1, -1] as const) {
      const base = positions.length / 3;
      for (let i = 0; i <= STATIONS; i++) {
        const t = i / STATIONS;
        for (let j = 0; j <= SKIN_STEPS; j++) {
          const u = j / SKIN_STEPS;
          const [x, y, z] = hullPoint(t, u, side);
          positions.push(x, y, z);
          uvs.push(t * 4, u);
        }
      }
      const row = SKIN_STEPS + 1;
      for (let i = 0; i < STATIONS; i++) {
        for (let j = 0; j < SKIN_STEPS; j++) {
          const a = base + i * row + j;
          const b = a + row;
          if (side === 1) indices.push(a, b, a + 1, b, b + 1, a + 1);
          else indices.push(a, a + 1, b, b, a + 1, b + 1);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, []);
}

/** Deck planked to the hull's actual plan view. */
function useDeckGeometry() {
  return useMemo(() => {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const N = 24;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const w = Math.max(halfBeam(t) * 0.92, 0.02);
      const z = HULL_LENGTH / 2 - t * HULL_LENGTH;
      const y = sheerHeight(t) - 0.28;
      positions.push(-w, y, z, w, y, z);
      uvs.push(0, t * 6, 1, t * 6);
      if (i < N) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, []);
}

interface ShipProps {
  waveAmpRef: React.MutableRefObject<number>;
}

export default function Ship({ waveAmpRef }: ShipProps) {
  const group = useRef<THREE.Group>(null);
  const sailRef = useRef<THREE.Mesh>(null);
  const hullGeo = useHullGeometry();
  const deckGeo = useDeckGeometry();
  const lanternRef = useRef<THREE.PointLight>(null);
  const glowTexture = useGlowTexture("rgba(255, 165, 90, 0.5)");
  const hullTex = usePlankTexture("#241a12", "#0e0a06", [4, 1]);
  const deckTex = usePlankTexture("#3a2c1e", "#171008", [2, 6]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const amp = waveAmpRef.current;
    const { x, z, lean } = shipPose;
    const sailsUp = useVoyage.getState().sailsUp;

    // Ride the swell at the ship's world position
    const y = waveHeight(x, z, t, amp);
    const slope = waveSlope(x, z, t, amp);
    g.position.y = y + 0.35;
    // Smooth toward surface tilt + sailing heel, so she rolls, not jitters
    const targetRx = Math.atan(slope.dz) * 0.6;
    const targetRz = -Math.atan(slope.dx) * 0.6 + lean;
    g.rotation.x += (targetRx - g.rotation.x) * 0.04;
    g.rotation.z += (targetRz - g.rotation.z) * 0.04;

    // Sails draw or furl; the cloth breathes while drawing
    const sail = sailRef.current;
    if (sail) {
      const targetScale = sailsUp ? 1 : 0.08;
      const s = sail.scale;
      s.y += (targetScale - s.y) * 0.06;
      sail.position.y = 3.6 + (1 - s.y) * 1.85;
      const pos = sail.geometry.attributes.position as THREE.BufferAttribute;
      const base = (sail.geometry as THREE.BufferGeometry).userData
        .belly as Float32Array;
      // The belly follows the wind: full and taut running before it,
      // slack and rippling when pinched against it
      const draw = sailEfficiency(shipPose.heading, {
        direction: shipPose.windDirection,
        strength: shipPose.windStrength,
      });
      const fullness = 0.35 + draw * 0.75;
      const luff = (1.1 - draw) * 0.09; // slack cloth shivers
      for (let i = 0; i < pos.count; i++) {
        const bx = pos.getX(i);
        const by = pos.getY(i);
        pos.setZ(
          i,
          base[i] * fullness * (0.92 + Math.sin(t * 1.7) * 0.08) +
            Math.sin(t * 2.8 + bx * 2.1 + by * 1.3) * luff,
        );
      }
      pos.needsUpdate = true;
    }

    // Lantern flicker
    if (lanternRef.current) {
      lanternRef.current.intensity =
        6 + Math.sin(t * 9.3) * 0.9 + Math.sin(t * 23.7) * 0.5;
    }
  });

  return (
    <group ref={group}>
      {/* Hull, lofted from the hull lines and planked */}
      <mesh geometry={hullGeo}>
        <meshStandardMaterial
          map={hullTex ?? undefined}
          color={hullTex ? "#ffffff" : "#241a12"}
          roughness={0.88}
          metalness={0.04}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Deck */}
      <mesh geometry={deckGeo}>
        <meshStandardMaterial
          map={deckTex ?? undefined}
          color={deckTex ? "#ffffff" : "#3a2c1e"}
          roughness={0.95}
        />
      </mesh>

      {/* Stem & stern posts — the upswept silhouette of an ancient galley */}
      {[1, -1].map((dir) => (
        <group key={dir} position={[0, 0.6, dir * 5.5]} rotation={[dir * -0.42, 0, 0]}>
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.13, 0.24, 2.8, 8]} />
            <meshStandardMaterial color="#1a1410" roughness={0.85} />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <sphereGeometry args={[0.24, 10, 10]} />
            <meshStandardMaterial color="#2b2118" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Mast */}
      <mesh position={[0, 3.1, 0]}>
        <cylinderGeometry args={[0.09, 0.14, 7.4, 10]} />
        <meshStandardMaterial color="#1a1410" roughness={0.85} />
      </mesh>
      {/* Yard (crossbeam) */}
      <mesh position={[0, 5.6, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 5.6, 8]} />
        <meshStandardMaterial color="#1a1410" roughness={0.85} />
      </mesh>

      {/* Square sail, gently bellied, animated in useFrame */}
      <Sail meshRef={sailRef} />

      {/* Rigging */}
      {[[-2.6, 5.5, 0, -1.1, 0.35, 4.9] as const, [2.6, 5.5, 0, 1.1, 0.35, 4.9] as const].map(
        ([x1, y1, z1, x2, y2, z2], i) => (
          <RiggingLine key={i} from={[x1, y1, z1]} to={[x2, y2, z2]} />
        ),
      )}
      <RiggingLine from={[0, 6.7, 0]} to={[0, 1.7, 5.4]} />
      <RiggingLine from={[0, 6.7, 0]} to={[0, 1.7, -5.4]} />

      {/* Stern lantern — the one warm point in a cold world */}
      <group position={[0, 1.9, -4.9]}>
        <mesh>
          <sphereGeometry args={[0.14, 10, 10]} />
          <meshStandardMaterial
            color="#ffb45e"
            emissive="#ff9d3d"
            emissiveIntensity={3.2}
          />
        </mesh>
        {glowTexture && (
          <sprite scale={[2.4, 2.4, 1]}>
            <spriteMaterial
              map={glowTexture}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        )}
        <pointLight
          ref={lanternRef}
          color="#ff9d4d"
          intensity={6}
          distance={16}
          decay={2}
        />
      </group>
    </group>
  );
}

function Sail({ meshRef }: { meshRef: React.RefObject<THREE.Mesh | null> }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(4.9, 3.9, 12, 8);
    const pos = g.attributes.position;
    const belly = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      belly[i] =
        Math.cos((x / 4.9) * Math.PI) * Math.cos((y / 3.9) * Math.PI) * 0.7;
      pos.setZ(i, belly[i]);
    }
    g.userData.belly = belly;
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <mesh ref={meshRef} geometry={geo} position={[0, 3.6, 0.4]}>
      <meshStandardMaterial
        color={SAIL_COLOR}
        roughness={0.9}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function RiggingLine({
  from,
  to,
}: {
  from: readonly [number, number, number];
  to: readonly [number, number, number];
}) {
  const { position, rotation, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a);
    const len = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize(),
    );
    const euler = new THREE.Euler().setFromQuaternion(quat);
    return { position: mid, rotation: euler, length: len };
  }, [from, to]);

  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[0.015, 0.015, length, 4]} />
      <meshStandardMaterial color="#0e0b08" roughness={1} />
    </mesh>
  );
}
