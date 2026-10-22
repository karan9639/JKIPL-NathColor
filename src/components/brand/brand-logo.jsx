import { cn } from '@/utils/format';

export const BRAND_NAME = 'Jasmine';

export function BrandMark({ className, decorative = false }) {
    return (<img src="/brand/jasmine-mark.svg" alt={decorative ? '' : `${BRAND_NAME} logo`} aria-hidden={decorative || undefined} width={190} height={178} className={cn('h-8 w-auto shrink-0 select-none', className)} draggable={false}/>);
}

export function BrandWordmark({ className, decorative = false }) {
    return (<img src="/brand/jasmine-wordmark.svg" alt={decorative ? '' : BRAND_NAME} aria-hidden={decorative || undefined} width={199} height={46} className={cn('h-5 w-auto shrink-0 select-none', className)} draggable={false}/>);
}

export function BrandLogo({ className, markClassName, wordmarkClassName }) {
    return (<span className={cn('inline-flex items-center gap-2.5', className)} role="img" aria-label={`${BRAND_NAME} logo`}>
      <BrandMark decorative className={markClassName}/>
      <BrandWordmark decorative className={wordmarkClassName}/>
    </span>);
}
