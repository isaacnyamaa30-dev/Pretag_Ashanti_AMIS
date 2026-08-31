import Image from "next/image";

/** The PRETAG Ashanti emblem. Sits on its own pale field - give it a white chip on dark surfaces. */
export function Logo({ size = 40, withWordmark = false }: { size?: number; withWordmark?: boolean }) {
  if (withWordmark) {
    return (
      <Image
        src="/assets/pretag-logo.jpg"
        alt="PRETAG - Pre-Tertiary Teachers Association of Ghana, Ashanti"
        width={320}
        height={341}
        priority
        className="h-auto w-full max-w-[320px] rounded-md border border-border"
      />
    );
  }
  return (
    <Image
      src="/assets/pretag-emblem.jpg"
      alt="PRETAG Ashanti"
      width={size}
      height={size}
      priority
      className="rounded-full border border-border bg-white"
      style={{ width: size, height: size }}
    />
  );
}
