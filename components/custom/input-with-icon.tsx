import * as React from "react";
import { cva, VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  cn(
    "border-input flex flex-row items-center gap-2 text-base",
    "transition-[color,box-shadow,border]",
    "[&>input]:placeholder:text-muted-foreground [&>input]:focus:outline-0",
    "[&>input]:file:text-foreground/50 [&>input]:file:mr-2 [&>input]:file:inline-flex [&>input]:file:text-sm [&>input]:file:font-medium",
    "[&>svg]:text-muted-foreground",
    "selection:bg-primary selection:text-primary-foreground",
  ),
  {
    variants: {
      variant: {
        outline: cn(
          "rounded-md",
          "has-focus:border-ring has-focus-visible:border-ring has-focus-visible:ring-ring/50 has-focus-visible:ring-[3px]",
          "has-aria-invalid:ring-destructive/20 has-aria-invalid:border-destructive dark:has-aria-invalid:ring-destructive/40 has-aria-invalid:border-1",
        ),
      },
      size: {
        default: "px-2 py-1",
        sm: "px-2 text-sm py-1",
        lg: "px-3 text-lg py-2",
        xl: "px-3 text-xl py-2",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "default",
    },
  },
);

function InputWithIcon({
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputVariants>) {
  return (
    <div className={cn(inputVariants({ variant, size }), className)} {...props}>
      {children}
    </div>
  );
}

export { InputWithIcon };

/*
usage : 
(
    <label>
      <Input>
        <Search size={16} />
        <input type="search" data-slot="search" placeholder="Search" />
      </Input>
    </label>
)
*/

