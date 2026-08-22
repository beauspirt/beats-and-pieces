import { VaultItem } from "@/lib/types";
import rawVault from "@/data/vault.json";

export const vaultService = {
  getAllVaultItems(): VaultItem[] {
    return [...(rawVault as VaultItem[])];
  },

  getItemsByCategory(category: VaultItem["category"]): VaultItem[] {
    return (rawVault as VaultItem[]).filter((item) => item.category === category);
  },

  getItemsByProducer(producerTagOrId: string): VaultItem[] {
    const clean = producerTagOrId.toLowerCase().trim();
    return (rawVault as VaultItem[]).filter(
      (item) =>
        (item.producerId && item.producerId.toLowerCase() === clean) ||
        (item.producerTag && item.producerTag.toLowerCase() === clean)
    );
  },

  getItemById(id: string): VaultItem | undefined {
    return (rawVault as VaultItem[]).find((item) => item.id === id);
  },
};
