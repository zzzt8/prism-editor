/**
 * Input Component
 *
 * @package @prism/shared-ui
 * @description Text input with label, error, and helper text support.
 */

import React from 'react';
import styles from './Input.module.css';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label displayed above the input */
  label?: string;
  /** Helper text below the input */
  helperText?: string;
  /** Error message — highlights the input in red */
  error?: string;
  /** Input size */
  size?: InputSize;
  /** Leading icon/element */
  startAdornment?: React.ReactNode;
  /** Trailing icon/element */
  endAdornment?: React.ReactNode;
  /** Full-width */
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  error,
  size = 'md',
  startAdornment,
  endAdornment,
  fullWidth = false,
  className = '',
  id,
  disabled,
  ...rest
}) => {
  const inputId = id ?? `input-${Math.random().toString(36).slice(2, 9)}`;
  const hasError = Boolean(error);

  const containerClass = [
    styles.container,
    fullWidth ? styles.fullWidth : '',
    className,
  ].filter(Boolean).join(' ');

  const inputWrapperClass = [
    styles.inputWrapper,
    styles[size],
    hasError ? styles.hasError : '',
    disabled ? styles.disabled : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClass}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}

      <div className={inputWrapperClass}>
        {startAdornment && (
          <span className={styles.prefix} aria-hidden="true">
            {startAdornment}
          </span>
        )}

        <input
          id={inputId}
          className={styles.input}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...rest}
        />

        {endAdornment && (
          <span className={styles.suffix} aria-hidden="true">
            {endAdornment}
          </span>
        )}
      </div>

      {error && (
        <span id={`${inputId}-error`} className={styles.errorText} role="alert">
          {error}
        </span>
      )}

      {!error && helperText && (
        <span id={`${inputId}-helper`} className={styles.helperText}>
          {helperText}
        </span>
      )}
    </div>
  );
};
