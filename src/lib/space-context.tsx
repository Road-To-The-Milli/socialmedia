import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSpaces } from "./store";

// Clé localStorage pour persister l'espace actif entre sessions.
const LS_KEY = "nc_active_space";

interface SpaceCtx {
  activeSpaceId: string;
  setActiveSpaceId: (id: string) => void;
}

const Ctx = createContext<SpaceCtx>({ activeSpaceId: "", setActiveSpaceId: () => {} });

export function SpaceProvider({ children }: { children: ReactNode }) {
  const [activeSpaceId, _setActive] = useState<string>(
    () => (typeof localStorage !== "undefined" ? localStorage.getItem(LS_KEY) : null) ?? "",
  );
  const spacesQuery = useSpaces();

  // Dès que les espaces sont chargés, sélectionne le premier si aucun n'est actif.
  useEffect(() => {
    if (!spacesQuery.data?.length) return;
    const stored = localStorage.getItem(LS_KEY) ?? "";
    const valid = spacesQuery.data.some((s) => s.id === stored);
    if (!valid) {
      const first = spacesQuery.data[0].id;
      _setActive(first);
      localStorage.setItem(LS_KEY, first);
    }
  }, [spacesQuery.data]);

  const setActiveSpaceId = useCallback((id: string) => {
    _setActive(id);
    localStorage.setItem(LS_KEY, id);
  }, []);

  return (
    <Ctx.Provider value={{ activeSpaceId, setActiveSpaceId }}>
      {children}
    </Ctx.Provider>
  );
}

export function useActiveSpace() {
  return useContext(Ctx);
}

export function useActiveSpaceId(): string {
  return useContext(Ctx).activeSpaceId;
}
