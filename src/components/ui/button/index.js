import { cva } from 'class-variance-authority';

export { default as Button } from './Button.vue';

export const buttonVariants = cva(
    "vrcx-liquid-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[1.15rem] text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:opacity-100 aria-disabled:pointer-events-none aria-disabled:bg-muted aria-disabled:text-muted-foreground aria-disabled:shadow-none aria-disabled:opacity-100 data-[disabled]:pointer-events-none data-[disabled]:bg-muted data-[disabled]:text-muted-foreground data-[disabled]:shadow-none data-[disabled]:opacity-100 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer",
    {
        variants: {
            variant: {
                default:
                    'border border-white/20 bg-[linear-gradient(135deg,var(--primary),color-mix(in_oklch,var(--primary)_58%,var(--chart-3)))] text-primary-foreground shadow-[0_14px_34px_color-mix(in_oklch,var(--primary)_24%,transparent),inset_0_1px_0_color-mix(in_oklch,white_42%,transparent)] hover:brightness-110',
                destructive:
                    'border border-white/20 bg-[linear-gradient(135deg,var(--destructive),color-mix(in_oklch,var(--destructive)_70%,black))] text-white shadow-[0_14px_34px_color-mix(in_oklch,var(--destructive)_24%,transparent),inset_0_1px_0_color-mix(in_oklch,white_34%,transparent)] hover:brightness-110 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
                outline:
                    'border border-white/20 bg-[color-mix(in_oklch,var(--card)_62%,transparent)] text-foreground shadow-[inset_0_1px_0_color-mix(in_oklch,white_26%,transparent)] backdrop-blur-xl hover:bg-accent hover:text-accent-foreground',
                secondary:
                    'border border-white/14 bg-[color-mix(in_oklch,var(--secondary)_72%,transparent)] text-secondary-foreground shadow-[inset_0_1px_0_color-mix(in_oklch,white_20%,transparent)] backdrop-blur-xl hover:bg-secondary/90',
                Secondary:
                    'border border-white/14 bg-[color-mix(in_oklch,var(--secondary)_72%,transparent)] text-secondary-foreground shadow-[inset_0_1px_0_color-mix(in_oklch,white_20%,transparent)] backdrop-blur-xl hover:bg-secondary/90',
                ghost: 'rounded-full text-foreground/80 hover:bg-[color-mix(in_oklch,var(--accent)_52%,transparent)] hover:text-foreground hover:shadow-[0_10px_24px_color-mix(in_oklch,var(--primary)_12%,transparent)]',
                link: 'text-primary underline-offset-4 hover:underline'
            },
            size: {
                default: 'h-10 px-4 py-2 has-[>svg]:px-3',
                sm: 'h-8 rounded-[0.95rem] gap-1.5 px-3 has-[>svg]:px-2.5',
                lg: 'h-12 rounded-[1.35rem] px-7 text-[0.95rem] has-[>svg]:px-5',
                icon: 'size-10',
                'icon-sm': 'size-8',
                'icon-lg': 'size-11'
            }
        },
        defaultVariants: {
            variant: 'default',
            size: 'default'
        }
    }
);
