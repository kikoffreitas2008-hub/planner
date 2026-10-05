// react-dom ships with Expo for the web build but without types, and the only
// API the app uses is createPortal (components/ui/Overlay.web.tsx). Declaring
// it here avoids a dev dependency for one function.
declare module "react-dom" {
  import type { ReactNode, ReactPortal } from "react";

  export function createPortal(children: ReactNode, container: Element): ReactPortal;
}
