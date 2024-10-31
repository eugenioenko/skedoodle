"use client";

import { ScriptProps } from "next/script";
import React, { createContext } from "react";

export const AxiosContext = createContext<null>(null);

export const AxiosProvider = ({ children }: ScriptProps) => {
  return <AxiosContext.Provider value={null}>{children}</AxiosContext.Provider>;
};
