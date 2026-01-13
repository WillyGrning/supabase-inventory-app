import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  EnvelopeIcon,
  KeyIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { forgotPasswordApi, verifyResetOtpApi, resetPasswordApi, resendResetOtpApi } from '../api/auth';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timer, setTimer] = useState(600); // 10 minutes
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const navigate = useNavigate();

  // Step 1: Request reset (send OTP)
  const handleRequestReset = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await forgotPasswordApi(email);
      
      setSuccess(result.message);
      setTimer(600); // Reset timer
      setStep(2); // Move to OTP step
      
      // For development, show OTP
      if (result.otp) {
        console.log(`🔐 Reset OTP for ${email}: ${result.otp}`);
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    const code = otp.join('');
    
    if (code.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await verifyResetOtpApi(email, code);
      
      setResetToken(result.resetToken);
      setSuccess('Code verified! Now set your new password');
      setStep(3); // Move to password reset step
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await resetPasswordApi(resetToken, newPassword);
      
      setSuccess(result.message);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Password reset successful! Please login with your new password.' 
          }
        });
      }, 3000);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await resendResetOtpApi(email);
      
      setSuccess(result.message);
      setTimer(600); // Reset timer
      setOtp(['', '', '', '', '', '']); // Clear OTP inputs
      
      // For development
      if (result.otp) {
        console.log(`🔐 New reset OTP: ${result.otp}`);
      }
      
      // Focus first OTP input
      document.getElementById('otp-0')?.focus();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // OTP input handlers
  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
    
    if (newOtp.every(digit => digit !== '') && index === 5) {
      handleVerifyOtp();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      
      setTimeout(() => {
        handleVerifyOtp();
      }, 100);
    }
  };

  // Timer countdown
  // (Add useEffect for timer similar to VerifyOtp.jsx)

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Password strength checker
  const passwordStrength = {
    minLength: newPassword.length >= 8,
    hasUppercase: /[A-Z]/.test(newPassword),
    hasLowercase: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
  };

  const allChecksPassed = Object.values(passwordStrength).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && newPassword !== '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-600 to-amber-600 mb-4">
              <LockClosedIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {step === 1 && 'Reset Password'}
              {step === 2 && 'Verify Code'}
              {step === 3 && 'New Password'}
            </h1>
            <p className="text-gray-600">
              {step === 1 && 'Enter your email to receive a reset code'}
              {step === 2 && 'Enter the 6-digit code sent to your email'}
              {step === 3 && 'Create a new password for your account'}
            </p>
            
            {/* Progress Steps */}
            <div className="flex items-center justify-center mt-6">
              {[1, 2, 3].map((stepNum) => (
                <div key={stepNum} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step >= stepNum 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {stepNum}
                  </div>
                  {stepNum < 3 && (
                    <div className={`w-12 h-1 mx-2 ${
                      step > stepNum ? 'bg-orange-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <p className="text-green-600 text-sm">{success}</p>
              </div>
            </div>
          )}

          {/* Step 1: Email Input */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              <button
                onClick={handleRequestReset}
                disabled={isLoading || !email}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium py-3 px-4 rounded-lg hover:from-orange-700 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending reset code...
                  </span>
                ) : (
                  'Send Reset Code'
                )}
              </button>
            </div>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Timer */}
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ClockIcon className="h-5 w-5 text-orange-600 mr-2" />
                    <span className="text-sm font-medium text-orange-900">
                      Code expires in:
                    </span>
                  </div>
                  <div className={`text-lg font-bold ${timer < 60 ? 'text-red-600' : 'text-orange-600'}`}>
                    {formatTime(timer)}
                  </div>
                </div>
              </div>

              {/* OTP Inputs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  6-Digit Verification Code
                </label>
                <div className="flex justify-between space-x-2 mb-6" onPaste={handlePaste}>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength="1"
                      value={otp[index]}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                      disabled={isLoading}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otp.some(digit => digit === '')}
                  className="w-full bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium py-3 px-4 rounded-lg hover:from-orange-700 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </button>

                <button
                  onClick={handleResendOtp}
                  disabled={isLoading || timer > 540}
                  className="w-full py-2.5 px-4 border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50 disabled:opacity-50"
                >
                  Resend Code
                </button>

                <button
                  onClick={() => setStep(1)}
                  className="w-full py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Use Different Email
                </button>
              </div>
            </div>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <div className="space-y-6">
              {/* New Password */}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all pr-12"
                    placeholder="Enter new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showPassword ? (
                      <KeyIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <LockClosedIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                
                {/* Password Requirements */}
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Password must contain:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(passwordStrength).map(([key, passed]) => (
                      <div key={key} className="flex items-center">
                        {passed ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-gray-300 mr-2" />
                        )}
                        <span className={`text-xs ${passed ? 'text-green-600' : 'text-gray-500'}`}>
                          {key === 'minLength' && '8+ characters'}
                          {key === 'hasUppercase' && 'Uppercase letter'}
                          {key === 'hasLowercase' && 'Lowercase letter'}
                          {key === 'hasNumber' && 'Number'}
                          {key === 'hasSpecialChar' && 'Special character'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all pr-12 ${
                      confirmPassword
                        ? passwordsMatch
                          ? 'border-green-300 bg-green-50'
                          : 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    }`}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showConfirmPassword ? (
                      <KeyIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <LockClosedIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="mt-2 text-sm text-red-600">Passwords do not match</p>
                )}
              </div>

              <button
                onClick={handleResetPassword}
                disabled={isLoading || !allChecksPassed || !passwordsMatch}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium py-3 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Resetting password...
                  </span>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>
          )}

          {/* Back to Login */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center justify-center w-full text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Login
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <a href="mailto:support@example.com" className="text-orange-600 hover:text-orange-500">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}