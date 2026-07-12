"use client";

import dynamic from "next/dynamic";
import Loader from "./ui/Loader";
import Hero from "./ui/Hero";
import HelmHUD from "./ui/HelmHUD";
import DiscoveryOverlay from "./ui/DiscoveryOverlay";
import Journal from "./ui/Journal";
import PuzzlePanel from "./ui/PuzzlePanel";
import Navigator from "./ui/Navigator";
import AudioToggle from "./ui/AudioToggle";

// The 3D world is the heaviest cargo aboard — split it out and load it
// client-side only, behind a themed loading state.
const OdysseyScene = dynamic(() => import("./scene/OdysseyScene"), {
  ssr: false,
  loading: () => <Loader />,
});

export default function Experience() {
  return (
    <>
      <OdysseyScene />
      <Hero />
      <HelmHUD />
      <DiscoveryOverlay />
      <Journal />
      <PuzzlePanel />
      <Navigator />
      <AudioToggle />
    </>
  );
}
