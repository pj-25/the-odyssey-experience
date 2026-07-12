"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WAVE_GLSL } from "@/lib/waves";
import { shipPose } from "@/lib/store";

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uWaveAmp;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vHeight;

  ${WAVE_GLSL}

  void main() {
    vec3 pos = position;
    vec2 world = (modelMatrix * vec4(pos, 1.0)).xz;

    float h = waveHeight(world, uTime, uWaveAmp);
    pos.z += h; // plane is rotated -90deg on X, local z is world y

    // Analytic-ish normal from finite differences on the height field
    float e = 0.8;
    float hx = waveHeight(world + vec2(e, 0.0), uTime, uWaveAmp)
             - waveHeight(world - vec2(e, 0.0), uTime, uWaveAmp);
    float hz = waveHeight(world + vec2(0.0, e), uTime, uWaveAmp)
             - waveHeight(world - vec2(0.0, e), uTime, uWaveAmp);
    vNormal = normalize(vec3(-hx / (2.0 * e), 1.0, -hz / (2.0 * e)));

    vHeight = h;
    vec4 wp = modelMatrix * vec4(pos, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uWaterColor;
  uniform vec3 uCrestColor;
  uniform vec3 uMoonDir;
  uniform vec3 uMoonColor;
  uniform float uMoonIntensity;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uWaveAmp;
  uniform vec3 uCameraPos;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vHeight;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(uCameraPos - vWorldPos);

    // Base: deep water lifted toward crest colour on wave peaks
    float crest = smoothstep(0.0, 1.4 * max(uWaveAmp, 0.001), vHeight);
    vec3 color = mix(uWaterColor, uCrestColor, crest * 0.35);

    // Fresnel rim toward the horizon
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
    color += uFogColor * fresnel * 0.6;

    // Moon specular — a long glittering path on the water. Attenuated
    // near the camera so the foreground never blows out.
    float dist = length(uCameraPos - vWorldPos);
    float pathAtten = smoothstep(8.0, 60.0, dist);
    vec3 halfDir = normalize(uMoonDir + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 380.0);
    float glitter = pow(max(dot(normal, halfDir), 0.0), 42.0);
    color += uMoonColor * (spec * 0.6 + glitter * 0.05) * uMoonIntensity * pathAtten;

    // Diffuse moonlight
    float diff = max(dot(normal, uMoonDir), 0.0);
    color += uMoonColor * diff * 0.05 * uMoonIntensity;

    // Exponential-squared fog into the horizon
    float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
    color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));

    gl_FragColor = vec4(color, 1.0);
  }
`;

interface OceanProps {
  /** Ref-driven uniforms tweened by the chapter director */
  waveAmpRef: React.MutableRefObject<number>;
  fogDensityRef: React.MutableRefObject<number>;
  moonIntensityRef: React.MutableRefObject<number>;
  waterColorRef: React.MutableRefObject<THREE.Color>;
  fogColorRef: React.MutableRefObject<THREE.Color>;
  moonDirection: THREE.Vector3;
  quality: "high" | "low";
}

export default function Ocean({
  waveAmpRef,
  fogDensityRef,
  moonIntensityRef,
  waterColorRef,
  fogColorRef,
  moonDirection,
  quality,
}: OceanProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const segments = quality === "high" ? 256 : 128;
  // Snap the plane to its own grid spacing as it follows the ship, so
  // wave vertices never appear to swim
  const gridStep = 600 / segments;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWaveAmp: { value: 1 },
      uWaterColor: { value: new THREE.Color("#06121f") },
      uCrestColor: { value: new THREE.Color("#1d4460") },
      uMoonDir: { value: moonDirection.clone().normalize() },
      uMoonColor: { value: new THREE.Color("#cfe0ff") },
      uMoonIntensity: { value: 2.4 },
      uFogColor: { value: new THREE.Color("#0b1526") },
      uFogDensity: { value: 0.011 },
      uCameraPos: { value: new THREE.Vector3() },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame(({ clock, camera }) => {
    const m = matRef.current;
    if (!m) return;
    // The sea is infinite: recentre the plane on the ship, grid-aligned
    if (meshRef.current) {
      meshRef.current.position.x = Math.round(shipPose.x / gridStep) * gridStep;
      meshRef.current.position.z = Math.round(shipPose.z / gridStep) * gridStep;
    }
    m.uniforms.uTime.value = clock.elapsedTime;
    m.uniforms.uWaveAmp.value = waveAmpRef.current;
    m.uniforms.uFogDensity.value = fogDensityRef.current;
    m.uniforms.uMoonIntensity.value = moonIntensityRef.current;
    (m.uniforms.uWaterColor.value as THREE.Color).copy(waterColorRef.current);
    (m.uniforms.uFogColor.value as THREE.Color).copy(fogColorRef.current);
    (m.uniforms.uCameraPos.value as THREE.Vector3).copy(camera.position);
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false}>
      <planeGeometry args={[600, 600, segments, segments]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
      />
    </mesh>
  );
}
