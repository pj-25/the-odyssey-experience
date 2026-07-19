"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WAVE_GLSL } from "@/lib/waves";
import { KEEP_OUTS } from "@/lib/world";
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
  uniform float uTime;
  uniform vec3 uWaterColor;
  uniform vec3 uCrestColor;
  uniform vec3 uMoonDir;
  uniform vec3 uMoonColor;
  uniform float uMoonIntensity;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uWaveAmp;
  uniform vec3 uCameraPos;
  // Ship: x, z, heading, speed — for the wake
  uniform vec4 uShip;
  // Island cores: xy = centre, z = radius — for shore foam
  uniform vec3 uShores[7];

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vHeight;

  /* --- cheap value-noise FBM for surface detail and foam breakup --- */
  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
      f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * vnoise(p);
      p = p * 2.03 + vec2(17.0, 9.2);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    float dist = length(uCameraPos - vWorldPos);
    vec2 wp = vWorldPos.xz;

    /* Micro-surface: two drifting FBM layers perturb the normal.
       Fades with distance so the horizon stays calm, not shimmery. */
    float detailFade = 1.0 - smoothstep(40.0, 190.0, dist);
    if (detailFade > 0.001) {
      float de = 0.55;
      vec2 dp = wp * 0.55 + vec2(uTime * 0.07, uTime * -0.05);
      float n0 = fbm(dp);
      float nx = fbm(dp + vec2(de, 0.0)) - n0;
      float nz = fbm(dp + vec2(0.0, de)) - n0;
      vec2 dp2 = wp * 0.16 - vec2(uTime * 0.03, uTime * 0.02);
      float m0 = fbm(dp2);
      float mx = fbm(dp2 + vec2(de, 0.0)) - m0;
      float mz = fbm(dp2 + vec2(0.0, de)) - m0;
      float bump = (0.55 + 0.45 * uWaveAmp) * detailFade;
      normal = normalize(normal + vec3(
        -(nx * 0.9 + mx * 1.4) * bump, 0.0, -(nz * 0.9 + mz * 1.4) * bump));
    }

    // Base: deep water lifted toward crest colour on wave peaks
    float crest = smoothstep(0.0, 1.4 * max(uWaveAmp, 0.001), vHeight);
    vec3 color = mix(uWaterColor, uCrestColor, crest * 0.35);

    // Fresnel rim toward the horizon
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
    color += uFogColor * fresnel * 0.6;

    // Moon specular — long glittering path, attenuated near the camera
    vec3 halfDir = normalize(uMoonDir + viewDir);
    float distAtten = smoothstep(8.0, 55.0, dist);
    float spec = pow(max(dot(normal, halfDir), 0.0), 380.0);
    float glitter = pow(max(dot(normal, halfDir), 0.0), 40.0);
    color += uMoonColor * (spec * 0.9 + glitter * 0.05) * uMoonIntensity * distAtten;

    // Diffuse moonlight
    float diff = max(dot(normal, uMoonDir), 0.0);
    color += uMoonColor * diff * 0.05 * uMoonIntensity;

    /* --- Foam ---------------------------------------------------- */
    float foam = 0.0;
    float foamNoise = fbm(wp * 0.4 + vec2(uTime * 0.1, uTime * -0.08));

    // Whitecaps: crests shed foam only once the sea is actually up —
    // calm harbour water stays glassy, the storm froths
    float windGate = smoothstep(0.75, 1.6, uWaveAmp);
    float capMask = smoothstep(0.55, 0.95, vHeight / max(uWaveAmp * 1.2, 0.35));
    foam += capMask * smoothstep(0.5, 0.74, foamNoise) * (0.25 + 0.4 * uWaveAmp) * windGate;

    // Ship wake: a spreading, fading V astern of the hull
    float speedF = clamp(uShip.w / 7.0, 0.0, 1.0);
    if (speedF > 0.02) {
      vec2 rel = wp - uShip.xy;
      float sinH = sin(uShip.z);
      float cosH = cos(uShip.z);
      // astern > 0, abeam = lateral offset
      float astern = -(rel.x * sinH - rel.y * cosH);
      float abeam = rel.x * cosH + rel.y * sinH;
      if (astern > -6.0 && astern < 46.0) {
        float spread = 1.7 + max(astern, 0.0) * 0.24;
        float lat = 1.0 - smoothstep(spread * 0.55, spread, abs(abeam));
        float along = exp(-max(astern, 0.0) * 0.075)
                    * smoothstep(-6.0, -1.5, astern);
        float churn = smoothstep(0.45, 0.75, fbm(wp * 0.9 + vec2(0.0, uTime * 0.25)));
        foam += lat * along * churn * speedF * 0.75;
      }
    }

    // Shore foam: surf breathing against every island core
    for (int i = 0; i < 7; i++) {
      float d = length(wp - uShores[i].xy) - uShores[i].z;
      float band = 1.0 - smoothstep(0.0, 3.6, abs(d - sin(uTime * 0.9 + float(i)) * 0.8));
      foam += band * smoothstep(0.4, 0.62, foamNoise) * 0.8;
    }

    foam = clamp(foam, 0.0, 1.0) * detailFade;
    color = mix(color, vec3(0.78, 0.84, 0.9), foam * 0.85);

    // Exponential-squared fog into the horizon
    float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
    color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));

    gl_FragColor = vec4(color, 1.0);
  }
`;

interface OceanProps {
  /** Ref-driven uniforms tweened by the environment director */
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
      uShip: { value: new THREE.Vector4(0, 20, 0, 0) },
      uShores: {
        value: KEEP_OUTS.map((k) => new THREE.Vector3(k.x, k.z, k.r)),
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame(({ clock, camera }) => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uTime.value = clock.elapsedTime;
    m.uniforms.uWaveAmp.value = waveAmpRef.current;
    m.uniforms.uFogDensity.value = fogDensityRef.current;
    m.uniforms.uMoonIntensity.value = moonIntensityRef.current;
    (m.uniforms.uWaterColor.value as THREE.Color).copy(waterColorRef.current);
    (m.uniforms.uFogColor.value as THREE.Color).copy(fogColorRef.current);
    (m.uniforms.uCameraPos.value as THREE.Vector3).copy(camera.position);
    (m.uniforms.uShip.value as THREE.Vector4).set(
      shipPose.x,
      shipPose.z,
      shipPose.heading,
      shipPose.speed,
    );
    // Follow the ship on the grid
    if (meshRef.current) {
      meshRef.current.position.x =
        Math.round(shipPose.x / gridStep) * gridStep;
      meshRef.current.position.z =
        Math.round(shipPose.z / gridStep) * gridStep;
    }
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
