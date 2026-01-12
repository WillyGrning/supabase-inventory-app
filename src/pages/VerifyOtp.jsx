import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ArrowLeftIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';

export default function VerifyOtp() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timer, setTimer] = useState(600); // 10 menit dalam detik
  const [email, setEmail] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();

  // Get email from location state or localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem('pending_verification_email');
    const locationEmail = location.state?.email;
    
    if (locationEmail) {
      setEmail(locationEmail);
      localStorage.setItem('pending_verification_email', locationEmail);
    } else if (savedEmail) {
      setEmail(savedEmail);
    } else {
      // No email found, redirect to login
      navigate('/login');
    }
  }, [location, navigate]);

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) return;
    
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setError('OTP telah kedaluwarsa. Silakan request OTP baru.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [timer]);

  // Handle OTP input
  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return; // Hanya angka
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    
    // Auto-focus next input
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
    
    // Auto submit jika 6 digit terisi
    if (newCode.every(digit => digit !== '') && index === 5) {
      handleSubmit(newCode.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      // Focus previous input on backspace
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setCode(digits);
      
      // Auto submit
      setTimeout(() => {
        handleSubmit(pastedData);
      }, 100);
    }
  };

  const handleSubmit = async (otpCode = null) => {
    const otp = otpCode || code.join('');
    
    if (otp.length !== 6) {
      setError('Masukkan 6 digit kode OTP');
      return;
    }
    
    if (!email) {
      setError('Email tidak ditemukan. Silakan login ulang.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Verifikasi gagal');
      }
      
      setSuccess('Email berhasil diverifikasi!');
      
      // Clear pending email
      localStorage.removeItem('pending_verification_email');
      localStorage.removeItem(`otp_${email}`);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Email berhasil diverifikasi! Silakan login.' 
          }
        });
      }, 2000);
      
    } catch (err) {
      setError(err.message || 'Verifikasi gagal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengirim ulang OTP');
      }
      
      setSuccess('OTP baru telah dikirim ke email Anda');
      setTimer(600); // Reset timer ke 10 menit
      setCode(['', '', '', '', '', '']); // Clear OTP inputs
      
      // Focus first input
      document.getElementById('otp-0')?.focus();
      
    } catch (err) {
      setError(err.message || 'Gagal mengirim ulang OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 mb-4">
              <CheckCircleIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Verifikasi Email</h1>
            <p className="text-gray-600">
              Masukkan 6-digit kode OTP yang dikirim ke
            </p>
            <p className="text-gray-900 font-medium mt-1">{email || 'loading...'}</p>
          </div>

          {/* Timer */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ClockIcon className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-900">
                  Kode berlaku selama:
                </span>
              </div>
              <div className={`text-lg font-bold ${timer < 60 ? 'text-red-600' : 'text-blue-600'}`}>
                {formatTime(timer)}
              </div>
            </div>
            <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${(timer / 600) * 100}%` }}
              />
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

          {/* OTP Inputs */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              6-Digit Kode OTP
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
                  value={code[index]}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  disabled={isLoading}
                  autoFocus={index === 0}
                />
              ))}
            </div>
            
            <div className="text-center text-sm text-gray-500 mb-4">
              Paste 6-digit kode atau ketik manual
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-4">
            <button
              onClick={() => handleSubmit()}
              disabled={isLoading || code.some(digit => digit === '')}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium py-3 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Memverifikasi...
                </span>
              ) : (
                'Verifikasi Email'
              )}
            </button>

            <div className="flex space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex-1 flex items-center justify-center py-2.5 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Kembali
              </button>
              
              <button
                onClick={handleResendOtp}
                disabled={isLoading || timer > 540} // Bisa resend setelah 1 menit
                className="flex-1 py-2.5 px-4 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
              >
                Kirim Ulang OTP
              </button>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Tidak menerima email?</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Periksa folder <strong>Spam</strong> atau <strong>Promosi</strong></li>
              <li>• Pastikan email yang dimasukkan benar: <strong>{email}</strong></li>
              <li>• Tunggu 1 menit sebelum meminta OTP baru</li>
              <li>• Hubungi support jika masih bermasalah</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Kembali ke{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              halaman login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}