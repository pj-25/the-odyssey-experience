"use client";

import { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Loader from "./ui/Loader";
import Hero from "./ui/Hero";
import HelmHUD from "./ui/HelmHUD";
import DiscoveryOverlay from "./ui/DiscoveryOverlay";
import Journal from "./ui/Journal";
import PuzzlePanel from "./ui/PuzzlePanel";
import Navigator from "./ui/Navigator";
import AudioToggle from "./ui/AudioToggle";
import HelmGestures from "./ui/HelmGestures";
import FallbackSea from "./ui/FallbackSea";
import { useSupportsWebGL } from "@/lib/device";

// The 3D world is the heaviest cargo aboard — split it out and load it
// client-side only, behind a themed loading state.
const OdysseyScene = dynamic(() => import("./scene/OdysseyScene"), {
  ssr: false,
  loading: () => <Loader />,
});

/**
 * If the 3D sea ever fails to raise — driver loss, context loss, an
 * unexpected wreck — fall back to the lightweight harbour rather than a
 * broken screen. The community features never depend on WebGL.
 */
class SceneBoundary extends Component<
  { children: ReactNode },
  { wrecked: boolean }
> {
  state = { wrecked: false };
  static getDerivedStateFromError() {
    return { wrecked: true };
  }
  render() {
    return this.state.wrecked ? <FallbackSea /> : this.props.children;
  }
}

export default function Experience() {
  const webgl = useSupportsWebGL();

  return (
    <>
      {webgl ? (
        <SceneBoundary>
          <OdysseyScene />
          <HelmGestures />
          <HelmHUD />
          <DiscoveryOverlay />
          <PuzzlePanel />
        </SceneBoundary>
      ) : (
        <FallbackSea />
      )}
      <Hero />
      <Journal />
      <Navigator />
      <AudioToggle />
    </>
  );
}
