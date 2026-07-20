import { ImageResponse } from "next/og";

/** Favicon, generated at build time: a gold star over the night sea. */

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #071120 0%, #04090f 100%)",
          borderRadius: 12,
          color: "#e8cf9e",
          fontSize: 44,
        }}
      >
        ✦
      </div>
    ),
    { ...size },
  );
}
