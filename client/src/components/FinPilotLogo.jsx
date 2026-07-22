const LOGO_SRC = "/finpilot-logo.png";

export default function FinPilotLogo({
  variant = "full",
  className = "",
  height,
  title = "FinPilot AI",
}) {
  const classes = ["finpilot-logo", `finpilot-logo--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <img
      src={LOGO_SRC}
      alt={title}
      className={classes}
      {...(height != null ? { height } : {})}
      decoding="async"
    />
  );
}
