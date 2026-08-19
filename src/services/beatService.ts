import { DiscoveryBeat } from "@/lib/types";
import rawDiscoveryBeats from "@/data/discovery-beats.json";

let discoveryBeatsList: DiscoveryBeat[] = [...(rawDiscoveryBeats as DiscoveryBeat[])];

export const beatService = {
  getAllDiscoveryBeats(): DiscoveryBeat[] {
    return [...discoveryBeatsList];
  },

  getBeatsByProducer(producerTagOrId: string): DiscoveryBeat[] {
    const clean = producerTagOrId.toLowerCase().trim();
    return discoveryBeatsList.filter(
      (b) =>
        b.beatmaker.id.toLowerCase() === clean ||
        b.beatmaker.tag.toLowerCase() === clean
    );
  },

  toggleFavorite(beatId: string): boolean {
    const beat = discoveryBeatsList.find((b) => b.id === beatId);
    if (beat) {
      beat.isFavorite = !beat.isFavorite;
      return beat.isFavorite;
    }
    return false;
  },
};
