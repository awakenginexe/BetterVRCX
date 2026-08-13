import { cva } from 'class-variance-authority';

export { default as Badge } from './Badge.vue';

export const badgeVariants = cva(
    'inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,background-color,border-color,box-shadow] duration-150 ease-out overflow-hidden',
    {
        variants: {
            variant: {
                default:
                    'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
                secondary:
                    'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
                destructive:
                    'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
                outline:
                    'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
                accent: 'border-primary/30 bg-primary/10 text-primary [a&]:hover:bg-primary/20',
                success:
                    'border-[var(--bv-status-online)]/30 bg-[var(--bv-status-online)]/10 text-[var(--bv-status-online)]',
                warning:
                    'border-[var(--bv-status-askme)]/30 bg-[var(--bv-status-askme)]/10 text-[var(--bv-status-askme)]',
                danger: 'border-[var(--bv-status-busy)]/30 bg-[var(--bv-status-busy)]/10 text-[var(--bv-status-busy)]'
            }
        },
        defaultVariants: {
            variant: 'default'
        }
    }
);
