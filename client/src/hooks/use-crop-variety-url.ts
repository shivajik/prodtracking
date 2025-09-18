import { useQuery } from "@tanstack/react-query";
import type { CropVarietyUrl } from "@shared/schema";

export function useCropVarietyUrl(cropName: string, varietyCode: string) {
  return useQuery<CropVarietyUrl>({
    queryKey: ["/api/crop-variety-urls/by-names", cropName, varietyCode],
    enabled: !!(cropName && varietyCode), // Only fetch when both are provided
    retry: false, // Don't retry on 404 (no URL configured)
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}