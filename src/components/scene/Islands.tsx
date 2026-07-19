"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getPoi, FRAGMENT_COUNT } from "@/lib/world";
import { useExploration, fragmentsOf } from "@/lib/store";

/**
 * Every place on the chart, built from primitives. Rocks are deliberately
 * chunky — silhouettes against a moonlit sea, not portfolio sculptures.
 */

const ROCK = "#1d232e";
const ROCK_DARK = "#141922";
const MARBLE = "#7e8496";

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A cone knocked about until it reads as rock: vertices jittered
 * radially and vertically, faces kept flat-shaded. Weathering, cheaply.
 */
function makeCraggyCone(
  radius: number,
  height: number,
  seed: number,
): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(radius, height, 7, 3);
  const rand = seeded(seed);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  // Jitter shared positions consistently: key vertices by location
  const moved = new Map<string, [number, number, number]>();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    let d = moved.get(key);
    if (!d) {
      const rr = Math.hypot(x, z);
      const amp = rr > 0.01 ? 1 : 0.25; // keep the summit tighter
      d = [
        (rand() - 0.5) * radius * 0.42 * amp,
        (rand() - 0.5) * height * 0.14,
        (rand() - 0.5) * radius * 0.42 * amp,
      ];
      moved.set(key, d);
    }
    pos.setXYZ(i, x + d[0], y + d[1], z + d[2]);
  }
  geo.computeVertexNormals();
  return geo;
}

function CraggyRock({
  radius,
  height,
  seed,
  color,
  ...meshProps
}: {
  radius: number;
  height: number;
  seed: number;
  color: string;
} & Omit<React.ComponentProps<"mesh">, "color">) {
  const geo = useMemo(
    () => makeCraggyCone(radius, height, seed),
    [radius, height, seed],
  );
  return (
    <mesh geometry={geo} {...meshProps}>
      <meshStandardMaterial color={color} roughness={1} flatShading />
    </mesh>
  );
}

/** A cluster of jagged rock cones — the basic island unit. */
function RockPile({
  seed,
  count,
  spread,
  height,
  color = ROCK,
}: {
  seed: number;
  count: number;
  spread: number;
  height: number;
  color?: string;
}) {
  const rocks = useMemo(() => {
    const rand = seeded(seed);
    return Array.from({ length: count }, () => ({
      x: (rand() - 0.5) * spread,
      z: (rand() - 0.5) * spread,
      h: height * (0.4 + rand() * 0.6),
      r: spread * (0.14 + rand() * 0.18),
      rot: rand() * Math.PI,
      tilt: (rand() - 0.5) * 0.25,
    }));
  }, [seed, count, spread, height]);

  return (
    <group>
      {rocks.map((r, i) => (
        <CraggyRock
          key={i}
          radius={r.r}
          height={r.h}
          seed={seed * 100 + i}
          color={color}
          position={[r.x, r.h * 0.32 - 1, r.z]}
          rotation={[r.tilt, r.rot, r.tilt * 0.7]}
        />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */

function HomeShore() {
  const p = getPoi("harbor")!;
  return (
    <group position={[p.x, 0, p.z + 30]}>
      <RockPile seed={11} count={9} spread={70} height={10} />
      {/* The lamp in the window — it burns until you return */}
      <group position={[6, 4.5, -6]}>
        <mesh>
          <boxGeometry args={[3, 4, 3]} />
          <meshStandardMaterial color={ROCK_DARK} roughness={1} />
        </mesh>
        <mesh position={[0, 3, 0]}>
          <coneGeometry args={[2.6, 2.4, 4]} />
          <meshStandardMaterial color="#242c3a" roughness={1} flatShading />
        </mesh>
        <mesh position={[0, 0.4, -1.55]}>
          <planeGeometry args={[0.8, 1.1]} />
          <meshStandardMaterial
            color="#ffb45e"
            emissive="#ff9d3d"
            emissiveIntensity={2.6}
          />
        </mesh>
        <pointLight color="#ffab55" intensity={10} distance={40} decay={2} position={[0, 0.5, -3]} />
      </group>
    </group>
  );
}

function SirenGates() {
  const p = getPoi("cliffs")!;
  return (
    <group position={[p.x, 0, p.z]}>
      {/* Twin towers with a sailable gap between */}
      <group position={[-16, 0, 0]}>
        <RockPile seed={21} count={5} spread={20} height={16} color={ROCK_DARK} />
        <CraggyRock
          radius={7.5}
          height={42}
          seed={210}
          color={ROCK_DARK}
          position={[0, 17, 0]}
          rotation={[0.06, 0.4, 0.08]}
        />
      </group>
      <group position={[16, 0, 2]}>
        <RockPile seed={22} count={5} spread={20} height={14} color={ROCK_DARK} />
        <CraggyRock
          radius={6.8}
          height={38}
          seed={220}
          color={ROCK_DARK}
          position={[0, 15, 0]}
          rotation={[-0.05, 1.2, -0.07]}
        />
      </group>
    </group>
  );
}

function DrownedTemple() {
  const p = getPoi("temple")!;
  const solved = useExploration((s) => s.templeSolved);
  const statue = useRef<THREE.Group>(null);
  const eyeMat = useRef<THREE.MeshStandardMaterial>(null);
  const rise = useRef(0);

  useFrame(({ clock }, dt) => {
    const target = solved ? 1 : 0;
    rise.current += (target - rise.current) * Math.min(1, dt * 0.6);
    if (statue.current) statue.current.position.y = -1.5 + rise.current * 2.4;
    if (eyeMat.current) {
      eyeMat.current.emissiveIntensity =
        rise.current * (3 + Math.sin(clock.elapsedTime * 2.1) * 0.8);
    }
  });

  const columns = useMemo(() => {
    const rand = seeded(31);
    return Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return {
        x: Math.cos(a) * 16,
        z: Math.sin(a) * 16,
        h: 7 + rand() * 5,
        broken: rand() > 0.55,
      };
    });
  }, []);

  return (
    <group position={[p.x, 0, p.z]}>
      <RockPile seed={32} count={7} spread={52} height={5} />
      {/* Column ring */}
      {columns.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]}>
          <mesh position={[0, c.h / 2 - 1.5, 0]}>
            <cylinderGeometry args={[0.9, 1.05, c.h, 10]} />
            <meshStandardMaterial color={MARBLE} roughness={0.85} />
          </mesh>
          {!c.broken && (
            <mesh position={[0, c.h - 1.1, 0]}>
              <boxGeometry args={[2.4, 0.8, 2.4]} />
              <meshStandardMaterial color={MARBLE} roughness={0.85} />
            </mesh>
          )}
        </group>
      ))}
      {/* The Watcher — a colossal seated figure */}
      <group ref={statue} position={[0, -1.5, 0]}>
        <mesh position={[0, 3, 0]}>
          <boxGeometry args={[5.4, 6, 4]} />
          <meshStandardMaterial color={MARBLE} roughness={0.9} flatShading />
        </mesh>
        <mesh position={[0, 7.4, 0]}>
          <sphereGeometry args={[1.7, 10, 8]} />
          <meshStandardMaterial color={MARBLE} roughness={0.9} flatShading />
        </mesh>
        {/* Eyes */}
        {[-0.6, 0.6].map((ex) => (
          <mesh key={ex} position={[ex, 7.5, 1.5]}>
            <sphereGeometry args={[0.22, 8, 8]} />
            <meshStandardMaterial
              ref={ex < 0 ? eyeMat : undefined}
              color="#ffd98e"
              emissive="#ffb84d"
              emissiveIntensity={0}
            />
          </mesh>
        ))}
        {solved && (
          <pointLight color="#ffc266" intensity={14} distance={50} decay={2} position={[0, 8, 3]} />
        )}
      </group>
    </group>
  );
}

function GlowingCave() {
  const p = getPoi("cave")!;
  const solved = useExploration((s) => s.caveSolved);
  const glow = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (glow.current) {
      const base = solved ? 26 : 10;
      glow.current.intensity = base + Math.sin(clock.elapsedTime * 1.7) * base * 0.25;
    }
  });

  return (
    <group position={[p.x, 0, p.z]}>
      {/* The massif — a mountain, not a dome */}
      <CraggyRock
        radius={30}
        height={34}
        seed={330}
        color={ROCK_DARK}
        position={[0, 12, -14]}
        scale={[1.5, 1, 1.25]}
      />
      <CraggyRock
        radius={22}
        height={24}
        seed={331}
        color={ROCK_DARK}
        position={[-18, 8, -26]}
        rotation={[0, 1.1, 0]}
      />
      <CraggyRock
        radius={18}
        height={20}
        seed={332}
        color={ROCK_DARK}
        position={[20, 6, -24]}
        rotation={[0, 2.3, 0]}
      />
      {/* Mouth flanks + lintel */}
      <CraggyRock
        radius={6}
        height={20}
        seed={310}
        color={ROCK}
        position={[-11, 4, 8]}
        rotation={[0, 0.4, 0.15]}
      />
      <CraggyRock
        radius={6}
        height={18}
        seed={320}
        color={ROCK}
        position={[11, 4, 8]}
        rotation={[0, -0.5, -0.13]}
      />
      <mesh position={[0, 12.5, 8]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[3.4, 3.4, 18, 6]} />
        <meshStandardMaterial color={ROCK} roughness={1} flatShading />
      </mesh>
      {/* Crystals inside — the sea's own stars */}
      {[
        [-6, 2, -4], [5, 3.5, -7], [0, 6, -10], [-3, 9, -6], [7, 7, -2],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[x, y, z]}>
          <icosahedronGeometry args={[1.1 + (i % 3) * 0.5]} />
          <meshStandardMaterial
            color="#6fd8d0"
            emissive="#3fc8c0"
            emissiveIntensity={solved ? 2.4 : 0.9}
            roughness={0.3}
          />
        </mesh>
      ))}
      <pointLight ref={glow} color="#49d8cc" intensity={10} distance={70} decay={2} position={[0, 4, -4]} />
    </group>
  );
}

function WatchfireIsle() {
  const p = getPoi("beacon")!;
  const lit = useExploration((s) => s.beaconLit);
  const fire = useRef<THREE.PointLight>(null);
  const flame = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (fire.current) {
      fire.current.intensity = lit
        ? 30 + Math.sin(t * 11.3) * 5 + Math.sin(t * 27.1) * 3
        : 0;
    }
    if (flame.current) {
      const s = lit ? 1 + Math.sin(t * 9.7) * 0.14 : 0.001;
      flame.current.scale.set(s, s * (1 + Math.sin(t * 13.7) * 0.2), s);
    }
  });

  return (
    <group position={[p.x, 0, p.z]}>
      <RockPile seed={41} count={8} spread={44} height={7} />
      {/* The tower */}
      <mesh position={[0, 8, 0]}>
        <cylinderGeometry args={[2.2, 3.4, 20, 8]} />
        <meshStandardMaterial color="#2c2620" roughness={1} />
      </mesh>
      <mesh position={[0, 18.4, 0]}>
        <cylinderGeometry args={[3.2, 2.4, 1.4, 8]} />
        <meshStandardMaterial color="#241f1a" roughness={1} />
      </mesh>
      {/* The flame */}
      <mesh ref={flame} position={[0, 20.4, 0]}>
        <coneGeometry args={[1.6, 3.6, 7]} />
        <meshStandardMaterial
          color="#ffb545"
          emissive="#ff8c1f"
          emissiveIntensity={3.4}
          transparent
          opacity={0.92}
        />
      </mesh>
      <pointLight ref={fire} color="#ff9a3d" intensity={0} distance={130} decay={1.8} position={[0, 21, 0]} />
    </group>
  );
}

function SunkenCityMarkers() {
  const p = getPoi("diveSite")!;
  const tips = useMemo(() => {
    const rand = seeded(51);
    return Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2;
      return {
        x: Math.cos(a) * (12 + rand() * 5),
        z: Math.sin(a) * (12 + rand() * 5),
        h: 1.6 + rand() * 2.4,
        rot: rand() * Math.PI,
      };
    });
  }, []);

  return (
    <group position={[p.x, 0, p.z]}>
      {tips.map((t, i) => (
        <mesh key={i} position={[t.x, t.h * 0.2, t.z]} rotation={[0.14, t.rot, -0.1]}>
          <boxGeometry args={[1.4, t.h, 1.4]} />
          <meshStandardMaterial color={MARBLE} roughness={0.95} />
        </mesh>
      ))}
      {/* The glow of the kept promise, from fathoms down */}
      <pointLight color="#3fc8c0" intensity={9} distance={45} decay={2} position={[0, -4, 0]} />
    </group>
  );
}

function HiddenCity() {
  const p = getPoi("hiddenCity")!;
  const towers = useMemo(() => {
    const rand = seeded(61);
    return Array.from({ length: 16 }, () => {
      const a = rand() * Math.PI * 2;
      const r = 4 + rand() * 24;
      return {
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        // Terraced skyline: taller toward the heart of the city
        h: 5 + rand() * 10 + (26 - r) * 0.5,
        w: 2.2 + rand() * 2.6,
      };
    });
  }, []);

  return (
    <group position={[p.x, 0, p.z]}>
      <RockPile seed={62} count={10} spread={90} height={6} />
      {towers.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <mesh position={[0, t.h / 2 - 1, 0]}>
            <boxGeometry args={[t.w, t.h, t.w]} />
            <meshStandardMaterial
              color="#2e2a20"
              emissive="#b87d26"
              emissiveIntensity={0.3}
              roughness={0.85}
              flatShading
            />
          </mesh>
          <mesh position={[0, t.h - 0.6, 0]}>
            <coneGeometry args={[t.w * 0.72, t.w * 0.9, 4]} />
            <meshStandardMaterial color="#6e5522" emissive="#e0a938" emissiveIntensity={0.9} roughness={0.6} />
          </mesh>
        </group>
      ))}
      <pointLight color="#ffb95e" intensity={50} distance={180} decay={1.7} position={[0, 30, 0]} />
    </group>
  );
}

export default function Islands() {
  const fragments = useExploration((s) => fragmentsOf(s.discoveries));
  return (
    <group>
      <HomeShore />
      <SirenGates />
      <DrownedTemple />
      <GlowingCave />
      <WatchfireIsle />
      <SunkenCityMarkers />
      {fragments >= FRAGMENT_COUNT && <HiddenCity />}
    </group>
  );
}
