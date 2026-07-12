import {
  createBrowserEquipmentCheckRepository,
  type EquipmentCheckResult,
} from "./vivaSession";

export function useEquipmentCheck() {
  return async (): Promise<EquipmentCheckResult> => {
    const repository = createBrowserEquipmentCheckRepository();
    return repository.checkMicrophone();
  };
}
