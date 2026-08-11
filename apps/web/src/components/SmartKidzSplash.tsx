/**
 * SmartKidz Wakad Preschool — branded React splash.
 *
 * Uses only the official brand PNG assets (icon + complete logo).
 * All motion is CSS/React; no generated logo redraws.
 */
import "./SmartKidzSplash.css";

const ICON_SRC = "/brand/smartkidz-icon.png";
const LOGO_SRC = "/brand/smartkidz-logo.png";

export type SmartKidzSplashProps = {
  /** When true, plays the exit fade/scale transition. */
  exiting?: boolean;
  /** Show a soft indeterminate bar when init is still running past the intro. */
  showProgress?: boolean;
};

export default function SmartKidzSplash({
  exiting = false,
  showProgress = false,
}: SmartKidzSplashProps) {
  return (
    <div
      className={`sk-splash${exiting ? " sk-splash--exiting" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="SmartKidz Wakad Preschool loading"
      data-testid="smartkidz-splash"
    >
      <div className="sk-splash__bg" aria-hidden="true">
        <span className="sk-splash__cloud sk-splash__cloud--1" />
        <span className="sk-splash__cloud sk-splash__cloud--2" />
        <span className="sk-splash__cloud sk-splash__cloud--3" />
        <span className="sk-splash__star sk-splash__star--1" />
        <span className="sk-splash__star sk-splash__star--2" />
        <span className="sk-splash__star sk-splash__star--3" />
        <span className="sk-splash__star sk-splash__star--4" />
        <span className="sk-splash__shape sk-splash__shape--1" />
        <span className="sk-splash__shape sk-splash__shape--2" />
        <span className="sk-splash__shape sk-splash__shape--3" />
        <span className="sk-splash__shape--book" />
      </div>

      <div className="sk-splash__content">
        <div className="sk-splash__brand">
          <div className="sk-splash__icon-wrap">
            <img
              className="sk-splash__icon"
              src={ICON_SRC}
              alt=""
              width={160}
              height={160}
              draggable={false}
              decoding="async"
            />
          </div>

          <div className="sk-splash__logo-wrap">
            <img
              className="sk-splash__logo"
              src={LOGO_SRC}
              alt="SmartKidz Wakad Preschool"
              width={320}
              height={183}
              draggable={false}
              decoding="async"
            />
          </div>
        </div>

        <p className="sk-splash__tagline">
          <span className="sk-splash__word sk-splash__word--learn">Learn</span>
          <span className="sk-splash__dot" aria-hidden="true">
            •
          </span>
          <span className="sk-splash__word sk-splash__word--play">Play</span>
          <span className="sk-splash__dot" aria-hidden="true">
            •
          </span>
          <span className="sk-splash__word sk-splash__word--grow">Grow</span>
        </p>

        {showProgress ? (
          <div className="sk-splash__progress" aria-hidden="true">
            <div className="sk-splash__progress-bar" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
