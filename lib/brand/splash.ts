// iPhone and iPad launch screens (techspec §12). iOS shows the one whose
// media query matches the device exactly, so each size needs its own
// image. Shared by scripts/generate-icons.mjs (which draws them) and the
// root layout's metadata (which links them). Portrait only, like the app.

export interface SplashScreen {
  /** CSS points */
  deviceWidth: number;
  deviceHeight: number;
  ratio: number;
  /** pixels */
  width: number;
  height: number;
  file: string;
}

const DEVICES: [number, number, number][] = [
  [430, 932, 3], // iPhone 15/16 Pro Max, 15/16 Plus
  [393, 852, 3], // iPhone 15/16, 15/16 Pro
  [402, 874, 3], // iPhone 16 Pro
  [440, 956, 3], // iPhone 16 Pro Max
  [428, 926, 3], // iPhone 12–14 Pro Max, 14 Plus
  [390, 844, 3], // iPhone 12–14, 12–13 Pro
  [375, 812, 3], // iPhone X, XS, 11 Pro, 12–13 mini
  [414, 896, 3], // iPhone XS Max, 11 Pro Max
  [414, 896, 2], // iPhone XR, 11
  [414, 736, 3], // iPhone 6–8 Plus
  [375, 667, 2], // iPhone SE, 6–8
  [1024, 1366, 2], // iPad Pro 12.9"
  [834, 1194, 2], // iPad Pro 11"
  [820, 1180, 2], // iPad Air
  [768, 1024, 2], // iPad, iPad mini
];

export const SPLASH_SCREENS: SplashScreen[] = DEVICES.map(([w, h, r]) => ({
  deviceWidth: w,
  deviceHeight: h,
  ratio: r,
  width: w * r,
  height: h * r,
  file: `launch-${w * r}x${h * r}.png`,
}));

/** The media query iOS matches a launch screen against. */
export const splashMedia = (s: SplashScreen) =>
  `(device-width: ${s.deviceWidth}px) and (device-height: ${s.deviceHeight}px) and (-webkit-device-pixel-ratio: ${s.ratio}) and (orientation: portrait)`;
