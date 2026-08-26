import Image from "next/image";

/**
 * next/image wrapper for Faust scaffolds. Remote DreamHost URLs go through
 * the optimizer; local `/media/` paths stay same-origin.
 *
 * Home hero cutouts use fill so CSS mask-image still targets the img box.
 */
export default function KpfImage({
  src,
  alt = "",
  width,
  height,
  fill = false,
  sizes,
  className,
  priority = false,
  loading,
  style,
  ...rest
}) {
  if (!src) return null;

  const safeAlt = alt || "";
  const lazy = priority ? undefined : loading || "lazy";

  if (fill) {
    return (
      <Image
        src={src}
        alt={safeAlt}
        fill
        sizes={sizes}
        className={className}
        priority={priority}
        loading={lazy}
        style={style}
        {...rest}
      />
    );
  }

  if (width && height) {
    return (
      <Image
        src={src}
        alt={safeAlt}
        width={width}
        height={height}
        sizes={sizes}
        className={className}
        priority={priority}
        loading={lazy}
        style={style}
        {...rest}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={safeAlt}
      className={className}
      loading={lazy || "lazy"}
      decoding="async"
      style={style}
      {...rest}
    />
  );
}
