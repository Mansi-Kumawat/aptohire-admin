type BrandLogoProps = { alt?: string; compactAtRail?: boolean };

export function BrandLogo({ alt = 'AptoHire', compactAtRail = false }: BrandLogoProps) {
  return <picture className="brand-logo-picture">
    {compactAtRail ? <source media="(min-width: 768px)" srcSet="/aptohire-mark.png" /> : null}
    <img className="brand-logo-image" src="/aptohire-logo.png" alt={alt} />
  </picture>;
}
