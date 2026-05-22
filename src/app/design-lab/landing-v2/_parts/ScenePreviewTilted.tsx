import { JourneyScene } from "@/components/JourneyScene";
import { TiltCard } from "@/components/TiltCard";

export function ScenePreviewTilted() {
  return (
    <TiltCard className="will-change-transform">
      <JourneyScene />
    </TiltCard>
  );
}
