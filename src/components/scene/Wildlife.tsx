"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { POIS } from "@/lib/world";
import { shipPose, useVoyage } from "@/lib/store";

/**
 * The sea is inhabited. Dolphins race a moving ship, gulls wheel over
 * land, and every couple of minutes — far from shore — something much
 * older surfaces to look at you.
 */

const ISLAND_CENTERS = POIS.filter((p) => p.kind !== "diveSite").map((p) => ({
  x: p.x,
  z: p.z,
}));

function Dolphin({ index }: { index: number }) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    // Pod visits: 18 s of company out of every 55, only with way on
    const cycle = t % 55;
    const active = cycle < 18 && shipPose.speed > 4.5;
    g.visible = active;
    if (!active) return;

    const side = index % 2 === 0 ? 1 : -1;
    const phase = t * 2.1 + index * 1.9;
    const leap = Math.sin(phase);
    const { x, z, heading } = shipPose;
    const fwdX = Math.sin(heading);
    const fwdZ = -Math.cos(heading);
    // Alongside the bow, porpoising
    const ahead = 6 + index * 3.2 + Math.sin(t * 0.7 + index) * 2;
    const abeam = side * (7 + index * 1.4);
    g.position.set(
      x + fwdX * ahead - fwdZ * abeam,
      leap * 2.4 - 1.1,
      z + fwdZ * ahead + fwdX * abeam,
    );
    g.rotation.y = -heading;
    g.rotation.x = -Math.cos(phase) * 0.7; // pitch along the arc
  });

  return (
    <group ref={group} visible={false}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.32, 1.6, 4, 8]} />
        <meshStandardMaterial color="#3a4a5c" roughness={0.4} />
      </mesh>
      {/* Dorsal fin */}
      <mesh position={[0, 0.38, 0.1]} rotation={[0.5, 0, 0]}>
        <coneGeometry args={[0.16, 0.5, 4]} />
        <meshStandardMaterial color="#2e3c4c" roughness={0.4} />
      </mesh>
      {/* Tail flukes */}
      <mesh position={[0, 0, 1.25]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.3, 1]}>
        <coneGeometry args={[0.42, 0.5, 3]} />
        <meshStandardMaterial color="#2e3c4c" roughness={0.4} />
      </mesh>
    </group>
  );
}

function Gull({ index }: { index: number }) {
  const group = useRef<THREE.Group>(null);
  const wingL = useRef<THREE.Mesh>(null);
  const wingR = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    // Gulls keep to land: wheel over the nearest island when one is close
    let nearest: { x: number; z: number } | null = null;
    let bestD = 130;
    for (const c of ISLAND_CENTERS) {
      const d = Math.hypot(shipPose.x - c.x, shipPose.z - c.z);
      if (d < bestD) {
        bestD = d;
        nearest = c;
      }
    }
    g.visible = nearest !== null;
    if (!nearest) return;

    const a = t * (0.35 + index * 0.07) + index * 2.1;
    const r = 18 + index * 6;
    g.position.set(
      nearest.x + Math.cos(a) * r,
      22 + Math.sin(t * 0.6 + index) * 3 + index * 2,
      nearest.z + Math.sin(a) * r,
    );
    g.rotation.y = -a - Math.PI / 2;
    const flap = Math.sin(t * 6 + index * 3) * 0.6;
    if (wingL.current) wingL.current.rotation.z = flap;
    if (wingR.current) wingR.current.rotation.z = -flap;
  });

  return (
    <group ref={group} visible={false}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.14, 0.5, 3, 6]} />
        <meshStandardMaterial color="#b8bcc8" roughness={0.8} />
      </mesh>
      <mesh ref={wingL} position={[-0.55, 0, 0]}>
        <boxGeometry args={[1.1, 0.04, 0.34]} />
        <meshStandardMaterial color="#a8adbc" roughness={0.8} />
      </mesh>
      <mesh ref={wingR} position={[0.55, 0, 0]}>
        <boxGeometry args={[1.1, 0.04, 0.34]} />
        <meshStandardMaterial color="#a8adbc" roughness={0.8} />
      </mesh>
    </group>
  );
}

const WHALE_CYCLE = 130;
const WHALE_WINDOW = 24;

function Whale() {
  const group = useRef<THREE.Group>(null);
  const anchor = useRef<{ x: number; z: number; cycle: number }>({
    x: 0,
    z: 0,
    cycle: -1,
  });
  const spout = useRef<THREE.Sprite>(null);

  const spoutTex = useMemo(() => {
    if (typeof document === "undefined") return null;
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const c = canvas.getContext("2d")!;
    const grad = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(200, 220, 240, 0.5)");
    grad.addColorStop(1, "rgba(200, 220, 240, 0)");
    c.fillStyle = grad;
    c.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const cycleIndex = Math.floor(t / WHALE_CYCLE);
    const local = t % WHALE_CYCLE;
    const homeDist = Math.hypot(shipPose.x, shipPose.z - 60);
    const surfaced =
      local < WHALE_WINDOW &&
      homeDist > 120 &&
      useVoyage.getState().mode === "sailing";
    g.visible = surfaced;
    if (!surfaced) return;

    // Pin the surfacing spot when this cycle begins
    if (anchor.current.cycle !== cycleIndex) {
      const side = cycleIndex % 2 === 0 ? 1 : -1;
      anchor.current = {
        x: shipPose.x + Math.cos(shipPose.heading) * side * 42,
        z: shipPose.z + Math.sin(shipPose.heading) * side * 42,
        cycle: cycleIndex,
      };
    }

    // Rise, breathe, dive
    const u = local / WHALE_WINDOW;
    const envelope = Math.sin(u * Math.PI);
    g.position.set(anchor.current.x, -5.4 + envelope * 5.2, anchor.current.z);
    g.rotation.x = (0.5 - u) * 0.28;
    g.rotation.y = t * 0.02;

    if (spout.current) {
      const puff = Math.max(0, Math.sin((u - 0.18) * Math.PI * 3));
      spout.current.scale.setScalar(2 + puff * 5);
      (spout.current.material as THREE.SpriteMaterial).opacity =
        u > 0.15 && u < 0.55 ? puff * 0.7 : 0;
    }
  });

  return (
    <group ref={group} visible={false}>
      {/* Back */}
      <mesh scale={[1, 0.62, 3.4]}>
        <sphereGeometry args={[3.4, 12, 10]} />
        <meshStandardMaterial color="#1f2833" roughness={0.5} />
      </mesh>
      {/* Dorsal */}
      <mesh position={[0, 2, -2.5]} rotation={[-0.5, 0, 0]}>
        <coneGeometry args={[0.7, 1.7, 5]} />
        <meshStandardMaterial color="#1a222c" roughness={0.5} />
      </mesh>
      {/* Flukes lifting as she sounds */}
      <mesh position={[0, 0.4, 9]} rotation={[0.5, 0, 0]} scale={[1, 0.24, 1]}>
        <coneGeometry args={[2.4, 2.6, 3]} />
        <meshStandardMaterial color="#1a222c" roughness={0.5} />
      </mesh>
      {spoutTex && (
        <sprite ref={spout} position={[0, 3.4, 5]}>
          <spriteMaterial map={spoutTex} transparent depthWrite={false} opacity={0} />
        </sprite>
      )}
    </group>
  );
}

export default function Wildlife({ quality }: { quality: "high" | "low" }) {
  const dolphins = quality === "high" ? 3 : 2;
  const gulls = quality === "high" ? 4 : 2;
  return (
    <group>
      {Array.from({ length: dolphins }, (_, i) => (
        <Dolphin key={i} index={i} />
      ))}
      {Array.from({ length: gulls }, (_, i) => (
        <Gull key={i} index={i} />
      ))}
      <Whale />
    </group>
  );
}
