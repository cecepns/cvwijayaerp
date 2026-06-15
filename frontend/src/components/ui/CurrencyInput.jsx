import Input from './Input';
import { formatCurrencyInput, parseCurrencyInput } from '../../utils/currencyInput';

export default function CurrencyInput({ label, value, onChange, error, className = '', ...props }) {
  const displayValue = formatCurrencyInput(value);

  const handleChange = (e) => {
    onChange(parseCurrencyInput(e.target.value));
  };

  return (
    <Input
      label={label}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      error={error}
      className={className}
      {...props}
    />
  );
}
