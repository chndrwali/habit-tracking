"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";

type IconElement = React.ReactElement<{ className?: string }>;

type ButtonWithIconProps = {
  className?: string;
  startIcon?: IconElement;
  endIcon?: IconElement;
} & ButtonProps;

const ButtonWithIcon = React.forwardRef<HTMLButtonElement, ButtonWithIconProps>(
  ({ className, startIcon, endIcon, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          "relative flex items-center select-none",
          startIcon && "pl-10",
          endIcon && "pr-10",
          className
        )}
        {...props}
      >
        {startIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            {React.cloneElement(startIcon, {
              className: cn("h-[18px] w-[18px]", startIcon.props.className)
            })}
          </div>
        )}
        {children}
        {endIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {React.cloneElement(endIcon, {
              className: cn("h-[18px] w-[18px]", endIcon.props.className)
            })}
          </div>
        )}
      </Button>
    );
  }
);

ButtonWithIcon.displayName = "ButtonWithIcon";

export { ButtonWithIcon };