import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface EnvContextType {
  currentEnv: string;
  setCurrentEnv: (env: string) => void;
  environments: string[];
}

const EnvContext = createContext<EnvContextType | null>(null);

export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const [currentEnv, setCurrentEnv] = useState("development");
  const environments = ["development", "staging", "production"];

  return (
    <EnvContext.Provider value={{ currentEnv, setCurrentEnv, environments }}>
      {children}
    </EnvContext.Provider>
  );
}

export function useEnvironment(): EnvContextType {
  const ctx = useContext(EnvContext);
  if (!ctx)
    throw new Error("useEnvironment must be used within EnvironmentProvider");
  return ctx;
}
