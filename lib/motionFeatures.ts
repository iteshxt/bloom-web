// Motion's animation, gesture, drag and layout features, loaded after the
// page by <LazyMotion> in app/providers.tsx. Components use the light `m`
// elements, so the first paint doesn't wait for this code.
import { domMax } from "motion/react";

export default domMax;
