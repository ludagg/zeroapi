import { Config } from "@remotion/cli/config";

// Promo render configuration.
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setCodec("h264");

// If chrome-headless-shell cannot be downloaded in your environment (offline /
// locked-down sandbox), point Remotion at a system Chrome instead, e.g.:
//   Config.setBrowserExecutable("/usr/bin/google-chrome");
// or pass --browser-executable=<path> on the CLI. FFmpeg ships with Remotion.
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
