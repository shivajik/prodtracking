import { useQuery } from "@tanstack/react-query";
import type { Crop, Variety } from "@shared/schema";

type CropWithVarieties = Crop & { varieties: Variety[] };

export function useCropsAndVarieties() {
  return useQuery<CropWithVarieties[]>({
    queryKey: ["/api/crops"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Helper function to get crop names for dropdown
export function useCropNames() {
  const { data: cropsWithVarieties, ...rest } = useCropsAndVarieties();
  
  return {
    ...rest,
    data: cropsWithVarieties?.map((crop: CropWithVarieties) => crop.name) || [],
  };
}

// Helper function to get varieties for a specific crop
export function useVarietiesForCrop(cropName: string) {
  const { data: cropsWithVarieties, ...rest } = useCropsAndVarieties();
  
  const crop = cropsWithVarieties?.find((c: CropWithVarieties) => c.name === cropName);
  
  return {
    ...rest,
    data: crop?.varieties?.map((v: Variety) => v.code) || [],
  };
}