import { Release } from "@/lib/types";
import rawReleases from "@/data/releases.json";

export const releaseService = {
  getAllReleases(): Release[] {
    return [...(rawReleases as Release[])];
  },

  getReleaseById(idOrSlug: string): Release | undefined {
    return (rawReleases as Release[]).find(
      (r) => r.id === idOrSlug || r.slug === idOrSlug
    );
  },
};
