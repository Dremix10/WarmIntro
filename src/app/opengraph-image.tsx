import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Alma - email-first recruiting for investment banking";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#1B3B5F",
          color: "#F9F5EB",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(249,245,235,0.18)",
            borderRadius: 28,
            display: "flex",
            flexDirection: "column",
            gap: 28,
            height: 510,
            justifyContent: "center",
            padding: "60px 72px",
            width: 1040,
          }}
        >
          <div
            style={{
              color: "#C86B4F",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 9,
              textTransform: "uppercase",
            }}
          >
            Alma
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 92,
              fontWeight: 700,
              letterSpacing: -3,
              lineHeight: 0.96,
            }}
          >
            <span>Coffee chats,</span>
            <span style={{ color: "#F4D7C2", fontStyle: "italic" }}>not cold sweat.</span>
          </div>
          <div
            style={{
              color: "rgba(249,245,235,0.82)",
              display: "flex",
              flexDirection: "column",
              fontSize: 31,
              lineHeight: 1.28,
              maxWidth: 760,
            }}
          >
            <span>Email-first AI recruiting for students</span>
            <span>breaking into investment banking.</span>
          </div>
          <div
            style={{
              color: "#C86B4F",
              fontSize: 24,
              fontWeight: 700,
              marginTop: 8,
            }}
          >
            alma.careers/request-access
          </div>
        </div>
        <div
          style={{
            border: "3px dashed #C86B4F",
            borderBottom: "0",
            borderLeft: "0",
            borderRadius: "50%",
            height: 390,
            position: "absolute",
            right: 130,
            top: 58,
            transform: "rotate(-11deg)",
            width: 760,
          }}
        />
        <div
          style={{
            background: "#C86B4F",
            borderRadius: "50%",
            height: 30,
            position: "absolute",
            right: 210,
            top: 120,
            width: 30,
          }}
        />
      </div>
    ),
    size,
  );
}
