import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, KeyRound, Phone } from 'lucide-react';
import { requestOtp, verifyOtp } from '../api';
import type { AuthSession } from '../types';

interface PhoneAuthPanelProps {
  onSuccess: (session: AuthSession) => void;
  heading?: string;
  subheading?: string;
  compact?: boolean;
}

const COUNTRY_CODES = [
  { code: '+1', label: 'US / CA (+1)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+91', label: 'IN (+91)' },
  { code: '+61', label: 'AU (+61)' },
  { code: '+81', label: 'JP (+81)' },
];

export const PhoneAuthPanel: React.FC<PhoneAuthPanelProps> = ({
  onSuccess,
  heading = 'Sign in with Phone',
  subheading = 'Enter your mobile number to receive a one-time 6-digit verification code.',
  compact = false,
}) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneInput, setPhoneInput] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [previewOtp, setPreviewOtp] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const digits = phoneInput.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 14) {
      setError('Enter a valid mobile number (at least 10 digits with area code).');
      return;
    }

    const fullPhone = `${countryCode}${digits}`;
    setLoading(true);
    try {
      const data = await requestOtp(fullPhone);
      setNormalizedPhone(data.phone);
      setMaskedPhone(data.maskedPhone);
      setPreviewOtp(data.previewOtp || null);
      setOtpDigits(['', '', '', '', '', '']);
      setResendSeconds(30);
      setStep('otp');
      window.setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (code: string) => {
    if (code.length !== 6) {
      setError('Enter all 6 digits of your verification code.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const session = await verifyOtp(normalizedPhone, code);
      onSuccess(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, rawValue: string) => {
    const clean = rawValue.replace(/\D/g, '');
    if (!clean) {
      const next = [...otpDigits];
      next[index] = '';
      setOtpDigits(next);
      return;
    }

    if (clean.length > 1) {
      const pasted = clean.slice(0, 6).split('');
      const next = ['', '', '', '', '', ''];
      pasted.forEach((char, idx) => {
        next[idx] = char;
      });
      setOtpDigits(next);
      const focusIdx = Math.min(5, pasted.length - 1);
      inputRefs.current[focusIdx]?.focus();
      return;
    }

    const next = [...otpDigits];
    next[index] = clean;
    setOtpDigits(next);
    setError(null);

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleFillPreviewOtp = () => {
    if (!previewOtp) return;
    const digits = previewOtp.slice(0, 6).split('');
    setOtpDigits(digits);
    setError(null);
    inputRefs.current[5]?.focus();
  };

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      <div className="space-y-1.5">
        <h3 className="font-display text-2xl font-normal tracking-tight text-zinc-100">
          {heading}
        </h3>
        <p className="text-sm text-zinc-400 leading-relaxed">{subheading}</p>
      </div>

      {step === 'phone' ? (
        <form onSubmit={handleRequestOtp} className="space-y-4" noValidate>
          <div className="space-y-2">
            <label htmlFor="nc-phone-input" className="block text-xs font-medium text-zinc-300">
              Mobile Number
            </label>
            <div className="flex gap-2">
              <select
                aria-label="Country calling code"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="h-11 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200 font-mono tabular-nums focus:border-amber-500 focus:outline-none"
              >
                {COUNTRY_CODES.map((entry) => (
                  <option key={entry.code} value={entry.code}>
                    {entry.code}
                  </option>
                ))}
              </select>
              <div className="relative flex-1">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  id="nc-phone-input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="555 019 4821"
                  value={phoneInput}
                  onChange={(e) => {
                    setPhoneInput(e.target.value);
                    setError(null);
                  }}
                  className="h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 pl-10 pr-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 font-mono tabular-nums focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-red-500/30 bg-red-950/30 px-3.5 py-2.5 text-xs text-red-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-amber-500 px-5 text-sm font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition-colors duration-150 cursor-pointer whitespace-nowrap"
          >
            <span>{loading ? 'Sending code...' : 'Send Verification Code'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitOtp(otpDigits.join(''));
          }}
          className="space-y-4"
          noValidate
        >
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
            <span>
              Code sent to <strong className="font-mono text-zinc-200 tabular-nums">{maskedPhone}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setError(null);
              }}
              className="text-amber-400 hover:text-amber-300 underline underline-offset-4 cursor-pointer whitespace-nowrap"
            >
              Change number
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-300">
              6-Digit Verification Code
            </label>
            <div className="grid grid-cols-6 gap-2">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  maxLength={6}
                  aria-label={`Verification digit ${index + 1}`}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="h-12 w-full rounded-md border border-zinc-800 bg-zinc-900 text-center font-mono text-lg font-medium text-zinc-100 tabular-nums focus:border-amber-500 focus:outline-none"
                />
              ))}
            </div>
          </div>

          {previewOtp && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-900/70 px-3.5 py-2.5 text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>
                  Preview code:{' '}
                  <strong className="font-mono text-zinc-100 tracking-wider tabular-nums">
                    {previewOtp}
                  </strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleFillPreviewOtp}
                className="text-amber-400 hover:text-amber-300 font-medium cursor-pointer whitespace-nowrap"
              >
                Autofill
              </button>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-red-500/30 bg-red-950/30 px-3.5 py-2.5 text-xs text-red-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={loading || otpDigits.join('').length !== 6}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-amber-500 px-5 text-sm font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition-colors duration-150 cursor-pointer whitespace-nowrap"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{loading ? 'Verifying...' : 'Verify & Continue'}</span>
            </button>

            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Expires in 5 minutes</span>
              <button
                type="button"
                disabled={resendSeconds > 0 || loading}
                onClick={() => handleRequestOtp()}
                className="text-zinc-300 hover:text-zinc-100 disabled:text-zinc-600 cursor-pointer tabular-nums whitespace-nowrap"
              >
                {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
