import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
  href?: string | null;
  variant?: 'wordmark' | 'contained';
}

const logoAlt = 'অনন্যা MART - আপনার পছন্দ, আমাদের যত্ন';

export function Logo({
  width = 192,
  height = 84,
  className,
  href = '/',
  variant = 'wordmark',
}: LogoProps) {
  const image = (
    <Image
      src="/logo.png"
      alt={logoAlt}
      width={width}
      height={variant === 'wordmark' ? width : height}
      className={
        variant === 'wordmark'
          ? 'absolute left-0 top-1/2 h-auto w-full max-w-none -translate-y-1/2'
          : 'h-full w-full object-contain'
      }
    />
  );

  const classNames = cn(
    'relative inline-flex shrink-0 overflow-hidden',
    className
  );
  const style = { width, height };

  if (href === null) {
    return (
      <span className={classNames} style={style}>
        {image}
      </span>
    );
  }

  return (
    <Link href={href} className={classNames} style={style}>
      {image}
    </Link>
  );
}
