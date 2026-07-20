"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  stepShip,
  windAt,
  bearingTo,
  type ShipState,
} from "@/lib/sailing";
import { nearestSecret } from "@/lib/navigator-brain";
import { waveHeight } from "@/lib/waves";
import {
  POIS,
  stormIntensityAt,
  resolveCollision,
  FRAGMENT_COUNT,
  getPoi,
} from "@/lib/world";
import {
  useVoyage,
  useExploration,
  useMemoryBoard,
  fragmentsOf,
  shipPose,
  helmInput,
} from "@/lib/store";
import { haptic, prefersReducedMotion } from "@/lib/device";
import { camOrbit, decayOrbit } from "@/lib/camera";
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
  const orbit = useRef(0);

  // Restore the previous voyage's position; open on a high, wide frame
  // so taking the helm reads as a descent down to the water
  useEffect(() => {
    ship.current = loadPose();
    shipPose.x = ship.current.x;
    shipPose.z = ship.current.z;
    shipPose.heading = ship.current.heading;
    const { x, z, heading } = ship.current;
    camPos.current.set(
      x - Math.sin(heading) * 85,
      34,
      z + Math.cos(heading) * 85,
    );
    camLook.current.set(x, 3, z);
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
      if (k === "v" && st.embarked) st.toggleCameraView();
      if (k === "escape") {
        st.setOverlay(null);
        st.setPuzzle(null);
        st.setJournalOpen(false);
        st.setNavigatorOpen(false);
        st.setConsultingStars(false);
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
      const rudder = Math.max(
        -1,
        Math.min(
          1,
          (k.has("a") || k.has("arrowleft") ? -1 : 0) +
            (k.has("d") || k.has("arrowright") ? 1 : 0) +
            helmInput.touchRudder,
        ),
      );
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
      // Rock is rock: slide along island cores rather than through them
      const solid = resolveCollision(ship.current.x, ship.current.z);
      if (solid.hit) {
        ship.current = {
          ...ship.current,
          x: solid.x,
          z: solid.z,
          speed: ship.current.speed * 0.94,
        };
      }
    }

    const { x, z, heading, speed } = ship.current;
    shipPose.x = x;
    shipPose.z = z;
    shipPose.heading = heading;
    shipPose.speed = speed;

    // Heel: rudder pressure in a turn plus crosswind on a drawing sail
    {
      const k = keys.current;
      const rudder =
        (k.has("a") || k.has("arrowleft") ? -1 : 0) +
        (k.has("d") || k.has("arrowright") ? 1 : 0) +
        helmInput.touchRudder;
      const crosswind = voyage.sailsUp
        ? Math.sin(wind.direction - heading) * wind.strength
        : 0;
      const targetLean =
        -rudder * Math.min(1, speed / 9) * 0.055 - crosswind * 0.05;
      shipPose.lean += (targetLean - shipPose.lean) * Math.min(1, dt * 1.4);
    }

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
          haptic([30, 60, 30]); // land ho — a double pulse in the palm
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
    let camStiffness = 1.8;
    if (voyage.mode === "underwater") {
      diveAngle.current += dt * 0.07;
      const a = diveAngle.current;
      targetPos = new THREE.Vector3(
        DIVE_POI.x + Math.cos(a) * 26,
        -7 - Math.sin(a * 0.7) * 2,
        DIVE_POI.z + Math.sin(a) * 26,
      );
      targetLook = new THREE.Vector3(DIVE_POI.x, -10, DIVE_POI.z);
    } else if (voyage.cameraView === "deck" && !voyage.overlay) {
      // On deck: standing at the prow — forward of the sail, so the sea
      // ahead stays open — eyes riding the actual swell. Local offset
      // (abeam, along-keel) rotated into the world by heading.
      const lx = 0.55;
      const lz = -3.5; // forward of the mast, just aft of the stem post
      const wx = x + lx * Math.cos(heading) - lz * Math.sin(heading);
      const wz = z + lx * Math.sin(heading) + lz * Math.cos(heading);
      const deckY =
        waveHeight(x, z, t, env.waveAmp.current) + 0.35 + 2.05;
      targetPos = new THREE.Vector3(wx, deckY, wz);
      // Gaze past the mast at the sea ahead, with a slow natural sway;
      // dragging turns the head, and it drifts back forward when idle
      const gazeAngle = heading + camOrbit.azimuth;
      const sway = Math.sin(t * 0.35) * 1.6;
      targetLook = new THREE.Vector3(
        wx + Math.sin(gazeAngle) * 40 + Math.cos(gazeAngle) * sway,
        deckY - 0.6 + Math.sin(t * 0.5) * 0.35 - camOrbit.pitch * 30,
        wz - Math.cos(gazeAngle) * 40 + Math.sin(gazeAngle) * sway,
      );
      // The head tracks the deck tightly — a soft camera here reads as
      // floating off the ship, not standing on it
      camStiffness = 7;
    } else {
      // Chase camera: behind and above, craned up while reading an overlay.
      // Portrait screens get more distance and height so the ship sits
      // composed in the taller, narrower frame instead of filling it.
      const aspect =
        (camera as THREE.PerspectiveCamera).aspect ?? 1.6;
      const portrait = Math.max(0, Math.min(1, (1.0 - aspect) * 2.2));
      const crane = voyage.overlay ? 1 : 0;
      // A discovery is a moment: the camera slowly circles the ship
      // while the card is open, then eases back astern (unless the
      // visitor asked for reduced motion — then the frame holds still)
      if (voyage.overlay && !prefersReducedMotion()) orbit.current += dt * 0.09;
      else orbit.current *= Math.max(0, 1 - dt * 1.2);
      // The visitor's own hand on the camera: orbit, zoom, pan
      const viewAngle = heading + orbit.current + camOrbit.azimuth;
      const back =
        (26 + crane * 10 + speed * 0.5 + portrait * 9) * camOrbit.zoom;
      const height = Math.max(
        2.2,
        (8.5 + crane * 5 + portrait * 3) * (0.5 + 0.5 * camOrbit.zoom) +
          back * Math.tan(camOrbit.pitch),
      );
      const bx = x - Math.sin(viewAngle) * back;
      const bz = z + Math.cos(viewAngle) * back;
      // Pan shifts camera and target together, in view space
      const panWX = Math.cos(viewAngle) * camOrbit.panX;
      const panWZ = Math.sin(viewAngle) * camOrbit.panX;
      targetPos = new THREE.Vector3(
        bx + panWX,
        height + camOrbit.panY,
        bz + panWZ,
      );
      targetLook = new THREE.Vector3(
        x + Math.sin(heading) * 14 + panWX,
        2.5 + Math.sin(t * 0.2) * 0.4 + camOrbit.panY,
        z - Math.cos(heading) * 14 + panWZ,
      );
    }
    // Consulting the stars turns the gaze to the guiding constellation
    // from either viewpoint (deck or chase)
    if (voyage.mode !== "underwater" && voyage.consultingStars) {
      const secret = nearestSecret({
        shipX: x,
        shipZ: z,
        discoveredIds: exploration.discoveries.map((d) => d.poiId),
        fragments: fragmentsOf(exploration.discoveries),
        stormNearby: false,
        beaconLit: exploration.beaconLit,
      });
      if (secret) {
        const b = bearingTo(x, z, secret.x, secret.z);
        targetLook.set(x + Math.sin(b) * 90, 62, z - Math.cos(b) * 90);
      } else {
        targetLook.y = 60;
      }
    }
    // Manual framing eases home after a few idle seconds; zoom persists
    decayOrbit(camOrbit, dt, performance.now());

    const ck = 1 - Math.exp(-dt * camStiffness);
    camPos.current.lerp(targetPos, ck);
    camLook.current.lerp(targetLook, ck);
    camera.position.copy(camPos.current);
    // The storm gets into the camera: a tremor with each bolt, and a
    // constant low shudder in heavy seas
    const stormT = stormIntensityAt(x, z);
    const shake = prefersReducedMotion()
      ? 0
      : env.lightning.current * stormT * 0.4 + stormT * 0.06;
    if (shake > 0.005 && voyage.mode !== "underwater") {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake * 0.6;
      camera.position.z += (Math.random() - 0.5) * shake;
    }
    camera.lookAt(camLook.current);
  });

  return (
    <group ref={shipGroup}>
      <Ship waveAmpRef={env.waveAmp} />
    </group>
  );
}

/** Perform the currently-available E action (key, or tap on the HUD pill). */
export function performAction() {
  const action = helmAction.current;
  if (!action) return;
  haptic(24);
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
