import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  isIcon?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (props: ButtonProps, ref: React.Ref<HTMLButtonElement>) => {
    const { className, ...rest } = props;

    return (
      <button
        type="button"
        className={`p-1 flex items-center justify-center rounded hover:bg-default-3 ${className ? className : ""
          }`}
        ref={ref}
        {...rest}
      >
        {props.children}
      </button>
    );
  }
);

Button.displayName = "Button";

interface ButtonGroupProps {
  children: React.ReactNode;
}

export const ButtonGroup = ({ children }: ButtonGroupProps) => {
  return (
    <div className="flex border border-default-4 rounded overflow-hidden min-h-[26px]">
      {children}
    </div>
  );
};

interface ToggleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isSelected?: boolean;
}

export const ToggleButton = (props: ToggleButtonProps) => {
  const { isSelected, children, ...rest } = props;
  const isPressed = !!isSelected;

  return (
    <button
      type="button"
      className={`p-0.5 flex items-center justify-center hover:bg-default-4 ${isPressed ? "bg-default-3" : ""}`}
      aria-pressed={isPressed}
      {...rest}
    >
      {children}
    </button>
  );
};
