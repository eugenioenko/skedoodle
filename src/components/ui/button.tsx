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
        className={`p-1 rounded hover:bg-default-3 ${
          className ? className : ""
        }`}
        ref={ref}
        {...rest}
      >
        {props.children}
      </button>
    );
  }
);
