import { useLayoutEffect, useRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

type AutoGrowTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'>;

// A <textarea> that grows to fit its content instead of scrolling or
// truncating — swap in wherever feature/description text was squeezed into
// a single-line <input>. Controlled, so it re-measures on every value change
// (typing, undo, switching which record is selected).
export default function AutoGrowTextarea(props: AutoGrowTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [props.value]);

  return <textarea ref={ref} rows={1} {...props} />;
}
