export default function InputField({ id, label, error, as = 'input', className = '', ...props }) {
  const Comp = as;
  return (
    <div className={`form-group ${className}`.trim()}>
      {label ? <label htmlFor={id}>{label}</label> : null}
      <Comp id={id} {...props} />
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
