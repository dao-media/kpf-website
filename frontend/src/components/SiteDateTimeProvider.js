import { createContext, useContext } from "react";

const SiteDateTimeContext = createContext(null);

export function SiteDateTimeProvider({ value, children }) {
  return (
    <SiteDateTimeContext.Provider value={value || null}>
      {children}
    </SiteDateTimeContext.Provider>
  );
}

export function useSiteDateTime() {
  return useContext(SiteDateTimeContext);
}
