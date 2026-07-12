"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  constellationForPoi,
  constellationWorldStars,
} from "@/lib/constellations";
import { nearestSecret } from "@/lib/navigator-brain";
import { bearingTo } from "@/lib/sailing";
import { stormIntensityAt } from "@/lib/world";
import {
  shipPose,
  useVoyage,
  useExploration,
  fragmentsOf,
} from "@/lib/store";

/**
 * The sky as instrument: a constellation that points to the nearest
 * secret when consulted, shooting stars for the patient, and — once the
 * watchfire is answered — the northern lights.
 *
 * Rendered inside the SkyAnchor, so all positions are relative to the ship.
 */

const MAX_STARS = 8;

function GuidingConstellation() {
  const starsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const starGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(MAX_STARS * 3), 3),
    );
    return g;
  }, []);
  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(MAX_STARS * 2 * 3), 3),
    );
    return g;
  }, []);
  const fade = useRef(0);

  useFrame(({ clock }, dt) => {
    const consulting = useVoyage.getState().consultingStars;
    const exploration = useExploration.getState();
    const target = consulting ? 1 : 0;
    fade.current += (target - fade.current) * Math.min(1, dt * 2.5);
    const visible = fade.current > 0.02;
    if (starsRef.current) starsRef.current.visible = visible;
    if (linesRef.current) linesRef.current.visible = visible;
    if (!visible) return;

    const secret = nearestSecret({
      shipX: shipPose.x,
      shipZ: shipPose.z,
      discoveredIds: exploration.discoveries.map((d) => d.poiId),
      fragments: fragmentsOf(exploration.discoveries),
      stormNearby: false,
      beaconLit: exploration.beaconLit,
    });
    const c = secret && constellationForPoi(secret.id);
    if (!c) {
      if (starsRef.current) starsRef.current.visible = false;
      if (linesRef.current) linesRef.current.visible = false;
      return;
    }

    const bearing = bearingTo(shipPose.x, shipPose.z, secret.x, secret.z);
    const pts = constellationWorldStars(c, bearing);

    const sp = starGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < MAX_STARS; i++) {
      const p = pts[Math.min(i, pts.length - 1)];
      sp.setXYZ(i, p[0], p[1], p[2]);
    }
    sp.needsUpdate = true;
    starGeo.setDrawRange(0, pts.length);

    const lp = lineGeo.attributes.position as THREE.BufferAttribute;
    c.lines.forEach(([a, b], i) => {
      lp.setXYZ(i * 2, pts[a][0], pts[a][1], pts[a][2]);
      lp.setXYZ(i * 2 + 1, pts[b][0], pts[b][1], pts[b][2]);
    });
    lp.needsUpdate = true;
    lineGeo.setDrawRange(0, c.lines.length * 2);

    const pulse = 0.65 + Math.sin(clock.elapsedTime * 1.8) * 0.35;
    (starsRef.current!.material as THREE.PointsMaterial).opacity =
      fade.current * pulse;
    (linesRef.current!.material as THREE.LineBasicMaterial).opacity =
      fade.current * 0.5 * pulse;
  });

  return (
    <group>
      <points ref={starsRef} geometry={starGeo} visible={false}>
        <pointsMaterial
          color="#ffe9b8"
          size={7}
          sizeAttenuation={false}
          transparent
          depthWrite={false}
        />
      </points>
      <lineSegments ref={linesRef} geometry={lineGeo} visible={false}>
        <lineBasicMaterial
          color="#e8cf9e"
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

function ShootingStars() {
  const ref = useRef<THREE.Mesh>(null);
  const state = useRef({ next: 8, active: false, t0: 0, from: new THREE.Vector3(), dir: new THREE.Vector3() });

  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const s = state.current;
    if (!s.active && t > s.next) {
      s.active = true;
      s.t0 = t;
      const az = Math.random() * Math.PI * 2;
      const el = 0.5 + Math.random() * 0.5;
      const r = 360;
      s.from.set(
        Math.sin(az) * Math.cos(el) * r,
        Math.sin(el) * r,
        -Math.cos(az) * Math.cos(el) * r,
      );
      s.dir
        .set(Math.cos(az), -0.35 - Math.random() * 0.3, Math.sin(az))
        .normalize()
        .multiplyScalar(150);
    }
    if (s.active) {
      const u = (t - s.t0) / 1.1;
      if (u >= 1) {
        s.active = false;
        s.next = t + 12 + Math.random() * 22;
        m.visible = false;
        return;
      }
      m.visible = true;
      m.position.copy(s.from).addScaledVector(s.dir, u);
      m.lookAt(m.position.clone().add(s.dir));
      (m.material as THREE.MeshBasicMaterial).opacity =
        Math.sin(u * Math.PI) * 0.9;
    }
  });

  return (
    <mesh ref={ref} visible={false}>
      <boxGeometry args={[0.5, 0.5, 26]} />
      <meshBasicMaterial color="#dfe8ff" transparent opacity={0} fog={false} />
    </mesh>
  );
}

const AURORA_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const AURORA_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float bands =
        sin(vUv.x * 14.0 + uTime * 0.35)
      + sin(vUv.x * 23.0 - uTime * 0.21) * 0.5;
    float curtain = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.5, vUv.y);
    float intensity = curtain * (0.5 + 0.5 * bands) * 0.4;
    vec3 color = mix(vec3(0.12, 0.85, 0.55), vec3(0.3, 0.5, 0.9), vUv.y);
    gl_FragColor = vec4(color * intensity, intensity);
  }
`;

function Aurora() {
  const lit = useExploration((s) => s.beaconLit);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock }) => {
    if (matRef.current)
      matRef.current.uniforms.uTime.value = clock.elapsedTime;
  });
  if (!lit) return null;
  return (
    <mesh position={[0, 140, -300]} rotation={[0.25, 0, 0]}>
      <planeGeometry args={[520, 130, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={AURORA_VERTEX}
        fragmentShader={AURORA_FRAGMENT}
        uniforms={{ uTime: { value: 0 } }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        fog={false}
      />
    </mesh>
  );
}

/** Rain streaks that appear as the storm deepens. */
function StormRain({ quality }: { quality: "high" | "low" }) {
  const count = quality === "high" ? 900 : 400;
  const ref = useRef<THREE.Points>(null);
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = Math.random() * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
      speeds[i] = 34 + Math.random() * 26;
    }
    return { positions, speeds };
  }, [count]);

  useFrame((_, dt) => {
    const p = ref.current;
    if (!p) return;
    const stormT = stormIntensityAt(shipPose.x, shipPose.z);
    p.visible = stormT > 0.12;
    if (!p.visible) return;
    (p.material as THREE.PointsMaterial).opacity = Math.min(0.55, stormT);
    const attr = p.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      let y = attr.getY(i) - speeds[i] * dt;
      if (y < 0) y = 55 + Math.random() * 5;
      attr.setY(i, y);
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref} visible={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#8ba3c8"
        size={1.6}
        sizeAttenuation={false}
        transparent
        opacity={0.4}
        depthWrite={false}
      />
    </points>
  );
}

export default function SkyEvents({ quality }: { quality: "high" | "low" }) {
  return (
    <group>
      <GuidingConstellation />
      <ShootingStars />
      <Aurora />
      <StormRain quality={quality} />
    </group>
  );
}
