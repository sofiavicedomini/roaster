import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all duration-200 ease-out outline-none select-none focus-visible:border-orange-500/50 focus-visible:ring-[3px] focus-visible:ring-orange-500/30 active:not-aria-[haspopup]:translate-y-px active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:from-orange-400 hover:to-orange-500 hover:shadow-[0_0_24px_oklch(0.837_0.128_66.29_/_0.5)] hover:scale-[1.02] active:scale-[0.98]",
        outline:
          "border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/15 hover:text-orange-200 hover:border-orange-400/50 hover:shadow-[0_0_16px_oklch(0.837_0.128_66.29_/_0.3)] aria-expanded:bg-orange-500/10 aria-expanded:text-orange-100",
        secondary:
          "bg-zinc-800 text-white hover:bg-zinc-700 hover:shadow-[0_0_16px_oklch(0.56_0.021_213.5_/_0.4)] aria-expanded:bg-zinc-700 aria-expanded:text-white",
        ghost:
          "hover:bg-orange-500/10 hover:text-orange-200 hover:shadow-[0_0_12px_oklch(0.837_0.128_66.29_/_0.2)] aria-expanded:bg-orange-500/10 aria-expanded:text-orange-100",
        destructive:
          "bg-red-500/15 text-red-200 hover:bg-red-500/25 hover:shadow-[0_0_16px_oklch(0.646_0.222_41.116_/_0.4)] focus-visible:border-red-500/50 focus-visible:ring-red-500/20",
        link: "text-orange-400 underline-offset-4 hover:underline hover:shadow-[0_0_12px_oklch(0.837_0.128_66.29_/_0.3)]",
      },
      size: {
        default:
          "h-11 gap-2 px-5 has-data-[icon=inline-end]:pe-3 has-data-[icon=inline-start]:ps-3",
        xs: "h-7 gap-1 px-2.5 text-xs font-medium has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pe-2.5 has-data-[icon=inline-start]:ps-2.5",
        lg: "h-12 gap-2.5 px-6 text-base has-data-[icon=inline-end]:pe-4 has-data-[icon=inline-start]:ps-4",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button }
