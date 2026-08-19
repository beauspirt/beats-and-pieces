import { UserProfile } from "@/lib/types";
import rawProducers from "@/data/producers.json";

const producersMap: Record<string, UserProfile> = { ...(rawProducers as Record<string, UserProfile>) };

export const producerService = {
  getAllProducers(): UserProfile[] {
    return Object.values(producersMap);
  },

  getProducersMap(): Record<string, UserProfile> {
    return { ...producersMap };
  },

  getProducerById(id: string): UserProfile | undefined {
    return producersMap[id];
  },

  getProducerByEmail(email: string): UserProfile | undefined {
    const cleanEmail = email.trim().toLowerCase();
    return Object.values(producersMap).find(
      (p) => p.email.toLowerCase() === cleanEmail
    );
  },

  updateProducer(id: string, updates: Partial<UserProfile>): UserProfile | null {
    if (!producersMap[id]) return null;
    producersMap[id] = { ...producersMap[id], ...updates };
    return producersMap[id];
  },
};
