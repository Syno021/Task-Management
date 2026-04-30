import { useState } from 'react';
import { KeyRound, UserPlus, X } from 'lucide-react';

interface AuthScreenProps {
  onAuthenticated: () => void;
  onClose: () => void;
}

export default function AuthScreen({ onAuthenticated, onClose }: AuthScreenProps) {
  const [mode, setMode] = useState<'signIn' | 'signUp' | 'forgotPassword'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSent, setResetSent] = useState(false);

  function handleSignInSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      return;
    }
    onAuthenticated();
    onClose();
  }

  function handleSignUpSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim() || password !== confirmPassword) {
      return;
    }
    onAuthenticated();
    onClose();
  }

  function handleForgotPasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) {
      return;
    }
    setResetSent(true);
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <section className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-stone-200 p-5 sm:p-8 max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'Syne, sans-serif' }}>
            {mode === 'signIn' && 'Sign in'}
            {mode === 'signUp' && 'Sign up'}
            {mode === 'forgotPassword' && 'Forgot password'}
          </h1>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in"
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        {mode === 'signIn' && (
          <>
            <p className="text-stone-600 text-sm mb-6">
              Enter your account details to continue.
            </p>

            <form onSubmit={handleSignInSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm text-stone-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm text-stone-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="********"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-3 transition-colors"
              >
                Sign in
              </button>
            </form>

            <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <button
                type="button"
                onClick={() => setMode('signUp')}
                className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <UserPlus size={14} />
                Sign up
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetSent(false);
                  setMode('forgotPassword');
                }}
                className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900 font-medium"
              >
                <KeyRound size={14} />
                Forgot password
              </button>
            </div>
          </>
        )}

        {mode === 'signUp' && (
          <>
            <p className="text-stone-600 text-sm mb-6">
              Create a new account to sync your planner.
            </p>

            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm text-stone-700 mb-1">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="Your full name"
                  required
                />
              </div>
              <div>
                <label htmlFor="signup-email" className="block text-sm text-stone-700 mb-1">
                  Email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="signup-password" className="block text-sm text-stone-700 mb-1">
                  Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="********"
                  required
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-sm text-stone-700 mb-1">
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="********"
                  required
                />
              </div>

              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600">Passwords do not match.</p>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-3 transition-colors"
              >
                Create account
              </button>
            </form>

            <button
              type="button"
              onClick={() => setMode('signIn')}
              className="mt-5 text-sm text-stone-600 hover:text-stone-900 font-medium"
            >
              Back to sign in
            </button>
          </>
        )}

        {mode === 'forgotPassword' && (
          <>
            <p className="text-stone-600 text-sm mb-6">
              Enter your email and we will send password reset instructions.
            </p>

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-sm text-stone-700 mb-1">
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-3 transition-colors"
              >
                Send reset link
              </button>
            </form>

            {resetSent && (
              <p className="mt-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                Reset link sent. Please check your email.
              </p>
            )}

            <button
              type="button"
              onClick={() => setMode('signIn')}
              className="mt-5 text-sm text-stone-600 hover:text-stone-900 font-medium"
            >
              Back to sign in
            </button>
          </>
        )}
      </section>
    </div>
  );
}
