type TextInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function TextInput(props: TextInputProps) {
  return <input type="text" className="app-text-input" {...props} />;
}
