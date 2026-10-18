import type { ReactNode } from 'react';

type SwitchProps = {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
  name?: string;
};

/**
 * Переключатель на настоящем чекбоксе: видимая дорожка — <span>, состояние
 * уходит в onChange. Работает мышью и клавиатурой, как в макете.
 */
export default function Switch({ id, checked, onChange, label, hint, name }: SwitchProps) {
  return (
    <div className="rounded-md border border-ink/25 bg-paper px-4 py-3">
      <label htmlFor={id} className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          id={id}
          name={name}
          className="switch-input sr-only"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span
          className="switch-track relative inline-flex shrink-0 items-center w-12 h-7 mt-0.5 rounded-full border transition-colors duration-200"
          aria-hidden="true"
        >
          <span className="switch-knob inline-block w-5 h-5 rounded-full transition-transform duration-200" />
        </span>
        <span>
          <span className="block text-sm font-semibold text-ink leading-snug">{label}</span>
          {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
        </span>
      </label>
    </div>
  );
}
