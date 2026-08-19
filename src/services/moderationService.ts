import { ModerationFlag } from "@/lib/types";
import rawModerationFlags from "@/data/moderation-flags.json";

let moderationFlagsList: ModerationFlag[] = [...(rawModerationFlags as ModerationFlag[])];

export const moderationService = {
  getAllFlags(): ModerationFlag[] {
    return [...moderationFlagsList];
  },

  updateFlagStatus(flagId: string, status: "approved" | "discarded" | "pending"): ModerationFlag | null {
    const flag = moderationFlagsList.find((f) => f.id === flagId);
    if (flag) {
      flag.status = status;
      return flag;
    }
    return null;
  },
};
