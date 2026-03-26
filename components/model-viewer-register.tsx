"use client";

import { useEffect } from "react";

export function ModelViewerRegister() {
  useEffect(() => {
    void import("@google/model-viewer");
  }, []);

  return null;
}
