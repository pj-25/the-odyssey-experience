"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { waveHeight, waveSlope } from "@/lib/waves";
import { shipPose, useVoyage } from "@/lib/store";

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

/**
 * A stylized ancient galley, built procedurally — no model files to load.
 * She rides the exact wave field the ocean shader displaces, so hull and
 * water never disagree.
 */

const WOOD_DARK = "#2a2015";
const WOOD_MID = "#3a2c1d";
const SAIL_COLOR = "#d8cdb4";

function useHullGeometry() {
  return useMemo(() => {
    // Hull profile: a pointed, upswept bow and stern via a lofted shape
    const points: THREE.Vector2[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20; // 0 = keel, 1 = gunwale
      const r = 1.6 * Math.sin(t * Math.PI * 0.5); // belly curve
      points.push(new THREE.Vector2(Math.max(r, 0.01), t * 1.7));
    }
    const lathe = new THREE.LatheGeometry(points, 24);
    lathe.scale(1, 1, 3.6); // stretch into a hull
    return lathe;
  }, []);
}

interface ShipProps {
  waveAmpRef: React.MutableRefObject<number>;
}

export default function Ship({ waveAmpRef }: ShipProps) {
  const group = useRef<THREE.Group>(null);
  const sailRef = useRef<THREE.Mesh>(null);
  const hullGeo = useHullGeometry();
  const lanternRef = useRef<THREE.PointLight>(null);
  const glowTexture = useGlowTexture("rgba(255, 165, 90, 0.5)");

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const amp = waveAmpRef.current;
    const { x, z, sailsUp } = {
      ...shipPose,
      sailsUp: useVoyage.getState().sailsUp,
    };

    // Ride the swell at the ship's world position
    const y = waveHeight(x, z, t, amp);
    const slope = waveSlope(x, z, t, amp);
    g.position.y = y + 0.35;
    // Smooth toward the surface tilt so she rolls, not jitters
    const targetRx = Math.atan(slope.dz) * 0.6;
    const targetRz = -Math.atan(slope.dx) * 0.6;
    g.rotation.x += (targetRx - g.rotation.x) * 0.04;
    g.rotation.z += (targetRz - g.rotation.z) * 0.04;

    // Sails draw or furl
    if (sailRef.current) {
      const targetScale = sailsUp ? 1 : 0.08;
      const s = sailRef.current.scale;
      s.y += (targetScale - s.y) * 0.06;
      sailRef.current.position.y = 3.6 + (1 - s.y) * 1.85;
    }

    // Lantern flicker
    if (lanternRef.current) {
      lanternRef.current.intensity =
        6 + Math.sin(t * 9.3) * 0.9 + Math.sin(t * 23.7) * 0.5;
    }
  });

  return (
    <group ref={group}>
      {/* Hull: lathe profile is widest at the gunwale (top), keel below water */}
      <mesh geometry={hullGeo} position={[0, -1.55, 0]}>
        <meshStandardMaterial color={WOOD_DARK} roughness={0.85} metalness={0.05} />
      </mesh>
      {/* Deck: an ellipse matching the hull's waterline plan */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.45, 5.1, 1]}>
        <circleGeometry args={[1, 24]} />
        <meshStandardMaterial color={WOOD_MID} roughness={0.95} />
      </mesh>

      {/* Stem & stern posts — the upswept silhouette of an ancient galley */}
      {[1, -1].map((dir) => (
        <group key={dir} position={[0, -0.4, dir * 5.4]} rotation={[dir * -0.5, 0, 0]}>
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.13, 0.22, 2.6, 8]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
          </mesh>
          <mesh position={[0, 2.4, 0]}>
            <sphereGeometry args={[0.24, 10, 10]} />
            <meshStandardMaterial color={WOOD_MID} roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Mast */}
      <mesh position={[0, 3.1, 0]}>
        <cylinderGeometry args={[0.09, 0.14, 7.4, 10]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
      </mesh>
      {/* Yard (crossbeam) */}
      <mesh position={[0, 5.6, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 5.6, 8]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
      </mesh>

      {/* Square sail, gently bellied; furls when the visitor strikes it */}
      <Sail meshRef={sailRef} />

      {/* Rigging */}
      {[[-2.6, 5.5, 0, -1.1, 0.05, 4.9] as const, [2.6, 5.5, 0, 1.1, 0.05, 4.9] as const].map(
        ([x1, y1, z1, x2, y2, z2], i) => (
          <RiggingLine key={i} from={[x1, y1, z1]} to={[x2, y2, z2]} />
        ),
      )}
      <RiggingLine from={[0, 6.7, 0]} to={[0, 1.4, 5.3]} />
      <RiggingLine from={[0, 6.7, 0]} to={[0, 1.4, -5.3]} />

      {/* Stern lantern — the one warm point in a cold world */}
      <group position={[0, 1.5, -4.9]}>
        <mesh>
          <sphereGeometry args={[0.14, 10, 10]} />
          <meshStandardMaterial
            color="#ffb45e"
            emissive="#ff9d3d"
            emissiveIntensity={3.2}
          />
        </mesh>
        <pointLight
          ref={lanternRef}
          color="#ff9d4d"
          intensity={6}
          distance={16}
          decay={2}
        />
        {glowTexture && (
          <sprite scale={[2.6, 2.6, 1]}>
            <spriteMaterial
              map={glowTexture}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        )}
      </group>
    </group>
  );
}

function Sail({ meshRef }: { meshRef: React.RefObject<THREE.Mesh | null> }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(4.9, 3.9, 12, 8);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // belly the sail toward the bow
      const belly =
        Math.cos((x / 4.9) * Math.PI) * Math.cos((y / 3.9) * Math.PI) * 0.7;
      pos.setZ(i, belly);
    }
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
