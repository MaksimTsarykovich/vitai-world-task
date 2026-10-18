type InterestSelectProps = {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
  required?: boolean;
  id?: string;
};

const OPTIONS = [
  { value: 'question', label: 'У меня есть вопрос' },
  { value: 'order', label: 'Хочу сделать заказ' },
];

/** Селект «Что интересует»: пустая опция по умолчанию + два режима формы. */
export default function InterestSelect({
  value,
  onChange,
  invalid,
  describedBy,
  required,
  id = 'interest',
}: InterestSelectProps) {
  return (
    <select
      id={id}
      name="interest"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      aria-controls="mode-order comment-field"
      className="w-full min-h-[48px] px-4 py-2 bg-paper text-ink border border-ink/30 rounded-md cursor-pointer focus:border-ink transition-colors duration-200"
    >
      <option value="" disabled>
        Выберите…
      </option>
      {OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
