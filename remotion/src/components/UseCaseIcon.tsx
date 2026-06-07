import { COLORS } from "../theme";
import type { IconKey } from "../data/usecases";

/** Minimal line icons for the use-case cards, drawn in the accent ink tone. */
const PATHS: Record<IconKey, string> = {
  bag: "M6 2 3 6.5V20a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V6.5L18 2zM3 6.5h18M16 10a4 4 0 0 1-8 0",
  card: "M2 6.5A1.5 1.5 0 0 1 3.5 5h17A1.5 1.5 0 0 1 22 6.5v11A1.5 1.5 0 0 1 20.5 19h-17A1.5 1.5 0 0 1 2 17.5zM2 9.5h20M6 15h5",
  truck: "M2 5.5A.5.5 0 0 1 2.5 5h11a.5.5 0 0 1 .5.5V16H2zM14 9h4l3 3.2V16h-7M6 19.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 19.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  ticket: "M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4zM13 6v12",
  layers: "M12 3 2.5 7.5 12 12l9.5-4.5zM2.5 16.5 12 21l9.5-4.5M2.5 12 12 16.5 21.5 12",
  heart: "M20.4 5.3a5 5 0 0 0-7.1 0l-1.3 1.3-1.3-1.3a5 5 0 1 0-7.1 7.1l1.3 1.3 7.1 7.1 7.1-7.1 1.3-1.3a5 5 0 0 0 0-7.1z",
};

export const UseCaseIcon: React.FC<{ icon: IconKey; size?: number }> = ({ icon, size = 26 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={COLORS.accentInk}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={PATHS[icon]} />
  </svg>
);
