import AsyncStorage from "@react-native-async-storage/async-storage";

import { INITIAL_STATE } from "@/data/seed";
import { AppState } from "@/types";

const STORAGE_KEY = "pdp-mobile-prototype-state";

export async function loadState(): Promise<AppState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return INITIAL_STATE;
  }

  try {
    return JSON.parse(raw) as AppState;
  } catch {
    return INITIAL_STATE;
  }
}

export async function saveState(state: AppState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
