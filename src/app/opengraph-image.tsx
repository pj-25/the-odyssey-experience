import { ImageResponse } from "next/og";

/**
 * Social preview, generated at build time — no binary assets in the repo.
 * A night sea, a moonlit horizon, and honest fan-made framing.
 */

export const alt =
  "The Odyssey Voyage — an unofficial fan-made immersive tribute";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(180deg, #050a14 0%, #0a1830 62%, #071627 63%, #04090f 100%)",
          position: "relative",
        }}
      >
        {/* Moon */}
        <div
          style={{
            position: "absolute",
            top: 90,
            left: 180,
            width: 90,
            height: 90,
            borderRadius: 90,
            background: "#e8eeff",
            boxShadow: "0 0 80px 36px rgba(184, 204, 245, 0.35)",
          }}
        />
        {/* Moon path on the water */}
        <div
          style={{
            position: "absolute",
            top: 400,
            left: 150,
            width: 150,
            height: 200,
            background:
              "linear-gradient(180deg, rgba(207,224,255,0.5), rgba(207,224,255,0))",
            transform: "skewX(-8deg)",
            filter: "blur(18px)",
          }}
        />
        <div
          style={{
            fontSize: 26,
            letterSpacing: 12,
            color: "#97a3bd",
            textTransform: "uppercase",
          }}
        >
          An unofficial fan-made tribute
        </div>
        <div
          style={{
            fontSize: 110,
            letterSpacing: 18,
            color: "#e8ecf6",
            marginTop: 18,
            fontFamily: "serif",
          }}
        >
          THE ODYSSEY
        </div>
        <div
          style={{
            fontSize: 40,
            color: "#c9a86a",
            marginTop: 6,
            fontFamily: "serif",
            fontStyle: "italic",
          }}
        >
          a voyage we cross together
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 44,
            fontSize: 22,
            color: "#5d6a85",
          }}
        >
          By movie lovers, for movie lovers · not affiliated with the film
        </div>
      </div>
    ),
    { ...size },
  );
}
