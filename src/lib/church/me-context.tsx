import { createContext, useContext } from "react";
import type { Me } from "./types";

export const MeContext = createContext<Me | null>(null);

export function useMe() {
  const me = useContext(MeContext);
  if (!me) throw new Error("useMe must be used inside the church app");
  return me;
}
