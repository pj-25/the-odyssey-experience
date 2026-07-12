"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getPoi } from "@/lib/world";
import { useVoyage, useExploration } from "@/lib/store";

/**
 * The sunken city, fathoms beneath the dive site. Only rendered while
 * diving — streets, arches, a slow swirl of glowfish, and one amphora
 * that still keeps its promise. Click it to bring the memory home.
 */

const SITE = getPoi("diveSite")!;
const MARBLE_DEEP = "#4a5468";

function Ruins() {
  const buildings = useMemo(() => {
    let s = 91;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    return Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + rand() * 0.5;
      const r = 6 + rand() * 16;
      return {
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        w: 2 + rand() * 3,
        h: 3 + rand() * 7,
        rot: rand() * Math.PI,
        arch: rand() > 0.6,
      };
    });
  }, []);

  return (
    <group>
      {buildings.map((b, i) => (
        <group key={i} position={[b.x, -14, b.z]} rotation={[0, b.rot, 0]}>
          <mesh position={[0, b.h / 2, 0]}>
            <boxGeometry args={[b.w, b.h, b.w]} />
            <meshStandardMaterial color={MARBLE_DEEP} roughness={0.95} />
          </mesh>
          {b.arch && (
            <mesh position={[0, b.h + 1, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[b.w * 0.6, 0.35, 6, 10, Math.PI]} />
              <meshStandardMaterial color={MARBLE_DEEP} roughness={0.95} />
            </mesh>
          )}
        </group>
      ))}
      {/* A drowned avenue */}
      {[-3, 0, 3].map((x) => (
        <mesh key={x} position={[x, -13.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.2, 40]} />
          <meshStandardMaterial color="#3c4658" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Glowfish({ count = 80 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const seedsRef = useRef<Float32Array | null>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      seeds[i * 2] = Math.random() * Math.PI * 2;
      seeds[i * 2 + 1] = 4 + Math.random() * 14;
    }
    seedsRef.current = seeds;
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    const p = ref.current;
    const seeds = seedsRef.current;
    if (!p || !seeds) return;
    const t = clock.elapsedTime;
    const attr = p.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const phase = seeds[i * 2];
      const radius = seeds[i * 2 + 1];
      const a = t * 0.22 + phase;
      attr.setXYZ(
        i,
        Math.cos(a) * radius,
        -9 + Math.sin(t * 0.5 + phase * 3) * 2.5,
        Math.sin(a) * radius,
      );
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#7de8de"
        size={2.4}
        sizeAttenuation={false}
        transparent
        opacity={0.8}
        depthWrite={false}
      />
    </points>
  );
}

function Amphora() {
  const found = useExploration((s) => s.artifactFound);
  const findArtifact = useExploration((s) => s.findArtifact);
  const setOverlay = useVoyage((s) => s.setOverlay);
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (group.current) {
      group.current.rotation.y = clock.elapsedTime * 0.4;
      group.current.position.y =
        -12.2 + Math.sin(clock.elapsedTime * 0.9) * 0.3;
    }
  });

  if (found) return null;

  return (
    <group
      ref={group}
      position={[0, -12.2, 0]}
      onClick={(e) => {
        e.stopPropagation();
        findArtifact();
        setOverlay("artifact");
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      {/* Body */}
      <mesh>
        <sphereGeometry args={[0.9, 12, 12]} />
        <meshStandardMaterial
          color="#c8952e"
          emissive="#e8a93d"
          emissiveIntensity={1.6}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.32, 0.5, 0.9, 10]} />
        <meshStandardMaterial
          color="#c8952e"
          emissive="#e8a93d"
          emissiveIntensity={1.6}
          roughness={0.4}
        />
      </mesh>
      <pointLight color="#ffb84d" intensity={12} distance={26} decay={2} />
      {/* A generous click target (transparent, not invisible — raycasts
          skip invisible objects) */}
      <mesh>
        <sphereGeometry args={[3.4, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function Underwater() {
  const mode = useVoyage((s) => s.mode);
  if (mode !== "underwater") return null;
  return (
    <group position={[SITE.x, 0, SITE.z]}>
      <Ruins />
      <Glowfish />
      <Amphora />
      {/* Drowned light — cool from above, warm memory below */}
      <pointLight color="#2e8fa8" intensity={30} distance={80} decay={1.6} position={[0, 6, 0]} />
    </group>
  );
}
