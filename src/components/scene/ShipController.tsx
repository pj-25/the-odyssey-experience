"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  stepShip,
  windAt,
  type ShipState,
} from "@/lib/sailing";
import { POIS, stormIntensityAt, FRAGMENT_COUNT, getPoi } from "@/lib/world";
import {
  useVoyage,
  useExploration,
  useMemoryBoard,
  fragmentsOf,
  shipPose,
} from "@/lib/store";
import Ship from "./Ship";
import type { EnvRefs } from "./OdysseyScene";

/**
 * The visitor's hands on the helm. Steers the ship through the pure
 * sailing model, follows it with a damped chase camera, and asks the
 * world "is anything happening here?" every frame — discoveries,
 * interactions, and the storm trial all trigger from position, not script.
 */

const POSE_KEY = "odyssey-ship-pose";
const DIVE_POI = getPoi("diveSite")!;

/** What E would do right now — mirrored into the store for the HUD. */
export function computeAction(
  x: number,
  z: number,
  s: {
    templeSolved: boolean;
    caveSolved: boolean;
    beaconLit: boolean;
    artifactFound: boolean;
  },
  mode: string,
): { id: string; label: string } | null {
  if (mode === "underwater") return { id: "surface", label: "Surface" };
  const near = (id: string, r: number) => {
    const p = getPoi(id)!;
    return Math.hypot(x - p.x, z - p.z) < r;
  };
  if (near("beacon", 34) && !s.beaconLit)
    return { id: "light-beacon", label: "Light the watchfire" };
  if (near("temple", 38) && !s.templeSolved)
    return { id: "temple-puzzle", label: "Read the glyphs" };
  if (near("cave", 32) && !s.caveSolved)
    return { id: "cave-puzzle", label: "Join the cavern stars" };
  if (near("diveSite", 30) && !s.artifactFound)
    return { id: "dive", label: "Dive to the sunken city" };
  return null;
}

/** Session-level interaction state shared with the HUD via zustand-lite. */
export const helmAction: { current: { id: string; label: string } | null } = {
  current: null,
};

function loadPose(): ShipState {
  try {
    const raw = localStorage.getItem(POSE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as ShipState;
      if (
        Number.isFinite(p.x) &&
        Number.isFinite(p.z) &&
        Number.isFinite(p.heading)
      ) {
        return { x: p.x, z: p.z, heading: p.heading, speed: 0 };
      }
    }
  } catch {
    // fresh voyage
  }
  return { x: 0, z: 20, heading: 0, speed: 0 };
}

export default function ShipController({ env }: { env: EnvRefs }) {
  const { camera } = useThree();
  const shipGroup = useRef<THREE.Group>(null);
  const ship = useRef<ShipState>({ x: 0, z: 20, heading: 0, speed: 0 });
  const keys = useRef<Set<string>>(new Set());
  const trim = useRef(1);
  const saveTimer = useRef(0);
  const stormDepth = useRef(0);
  const camPos = useRef(new THREE.Vector3(0, 7, 62));
  const camLook = useRef(new THREE.Vector3(0, 3, 0));
  const diveAngle = useRef(0);

  // Restore the previous voyage's position
  useEffect(() => {
    ship.current = loadPose();
    shipPose.x = ship.current.x;
    shipPose.z = ship.current.z;
    shipPose.heading = ship.current.heading;
  }, []);

  // Keyboard: the helm
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      keys.current.add(k);
      const st = useVoyage.getState();
      if (k === " ") {
        e.preventDefault();
        if (st.embarked && st.mode === "sailing") st.setSailsUp(!st.sailsUp);
      }
      if (k === "c" && st.embarked) st.setConsultingStars(!st.consultingStars);
      if (k === "e" && st.embarked) performAction();
      if (k === "escape") {
        st.setOverlay(null);
        st.setPuzzle(null);
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    const voyage = useVoyage.getState();
    const exploration = useExploration.getState();

    /* ---------------- Sail the ship ---------------- */
    const wind = windAt(t);
    shipPose.windDirection = wind.direction;
    shipPose.windStrength = wind.strength;

    if (voyage.embarked && voyage.mode === "sailing") {
      const k = keys.current;
      const rudder =
        (k.has("a") || k.has("arrowleft") ? -1 : 0) +
        (k.has("d") || k.has("arrowright") ? 1 : 0);
      if (k.has("w") || k.has("arrowup"))
        trim.current = Math.min(1.25, trim.current + dt * 0.8);
      if (k.has("s") || k.has("arrowdown"))
        trim.current = Math.max(0.25, trim.current - dt * 0.9);

      ship.current = stepShip(
        ship.current,
        { rudder, sailsUp: voyage.sailsUp },
        { direction: wind.direction, strength: wind.strength * trim.current },
        dt,
      );
    }

    const { x, z, heading, speed } = ship.current;
    shipPose.x = x;
    shipPose.z = z;
    shipPose.heading = heading;
    shipPose.speed = speed;

    if (shipGroup.current) {
      shipGroup.current.position.set(x, 0, z);
      shipGroup.current.rotation.y = -heading;
    }

    // Persist the pose occasionally so returning travellers resume at sea
    saveTimer.current += dt;
    if (saveTimer.current > 5) {
      saveTimer.current = 0;
      try {
        localStorage.setItem(
          POSE_KEY,
          JSON.stringify({ x, z, heading, speed: 0 }),
        );
      } catch {
        // storage unavailable — the sea forgets
      }
    }

    /* ---------------- World triggers ---------------- */
    if (voyage.embarked && voyage.mode === "sailing") {
      // Discoveries by proximity
      for (const poi of POIS) {
        if (poi.hidden && fragmentsOf(exploration.discoveries) < FRAGMENT_COUNT)
          continue;
        if (
          !exploration.hasDiscovered(poi.id) &&
          Math.hypot(x - poi.x, z - poi.z) < poi.radius
        ) {
          exploration.discover(poi.id);
          voyage.setOverlay(poi.id);
          if (poi.id === "hiddenCity") exploration.completeHomecoming();
        }
      }
      // The storm trial: sail deep enough and it marks you
      const stormT = stormIntensityAt(x, z);
      stormDepth.current = Math.max(stormDepth.current, stormT);
      if (stormT > 0.72 && !exploration.stormBraved) {
        exploration.braveStorm();
        voyage.setOverlay("storm");
      }
    }

    // Available action for the HUD
    helmAction.current = computeAction(x, z, exploration, voyage.mode);

    /* ---------------- Camera ---------------- */
    let targetPos: THREE.Vector3;
    let targetLook: THREE.Vector3;
    if (voyage.mode === "underwater") {
      diveAngle.current += dt * 0.07;
      const a = diveAngle.current;
      targetPos = new THREE.Vector3(
        DIVE_POI.x + Math.cos(a) * 26,
        -7 - Math.sin(a * 0.7) * 2,
        DIVE_POI.z + Math.sin(a) * 26,
      );
      targetLook = new THREE.Vector3(DIVE_POI.x, -10, DIVE_POI.z);
    } else {
      // Chase camera: behind and above, craned up while reading an overlay
      const crane = voyage.overlay ? 1 : 0;
      const back = 26 + crane * 10 + speed * 0.5;
      const height = 8.5 + crane * 5;
      const bx = x - Math.sin(heading) * back;
      const bz = z + Math.cos(heading) * back;
      targetPos = new THREE.Vector3(bx, height, bz);
      targetLook = new THREE.Vector3(
        x + Math.sin(heading) * 14,
        2.5 + Math.sin(t * 0.2) * 0.4,
        z - Math.cos(heading) * 14,
      );
      // Consulting the stars lifts the gaze
      if (voyage.consultingStars) {
        targetLook.y = 60;
      }
    }
    const ck = 1 - Math.exp(-dt * 1.8);
    camPos.current.lerp(targetPos, ck);
    camLook.current.lerp(targetLook, ck);
    camera.position.copy(camPos.current);
    camera.lookAt(camLook.current);
  });

  return (
    <group ref={shipGroup}>
      <Ship waveAmpRef={env.waveAmp} />
    </group>
  );
}

/** Perform the currently-available E action. */
function performAction() {
  const action = helmAction.current;
  if (!action) return;
  const voyage = useVoyage.getState();
  const exploration = useExploration.getState();
  switch (action.id) {
    case "light-beacon":
      exploration.lightBeacon();
      voyage.setOverlay("beacon-lit");
      break;
    case "temple-puzzle":
      voyage.setPuzzle("temple");
      break;
    case "cave-puzzle":
      voyage.setPuzzle("cave");
      break;
    case "dive":
      voyage.setMode("underwater");
      voyage.setSailsUp(false);
      break;
    case "surface":
      voyage.setMode("sailing");
      break;
  }
  useMemoryBoard.getState().unlock("embarked");
}
