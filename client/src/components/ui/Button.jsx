export default function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  const sizeClass = size === 'sm' ? 'btn-sm' : '';
  return <button className={`btn btn-${variant} ${sizeClass} ${className}`.trim()} {...props} />;
}
