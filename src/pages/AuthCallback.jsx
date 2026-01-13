import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    const error = searchParams.get('error');

    if (error) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('error');
      setMessage('Google authentication failed. Please try again.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (token && email) {
      // Save token to sessionStorage
      sessionStorage.setItem('session', token);
      sessionStorage.setItem('user_email', decodeURIComponent(email));
      sessionStorage.setItem('login_time', new Date().toISOString());

      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
      
      setStatus('success');
      setMessage(`Successfully logged in as ${decodeURIComponent(email)}`);
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        console.log('🚀 Redirecting to dashboard...');
        navigate("/", { replace: true });
      }, 2000);
    } else {
      setStatus('error');
      setMessage('Invalid authentication response');
      setTimeout(() => navigate('/login'), 3000);
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {status === 'loading' ? (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
              <h2 className="mt-6 text-xl font-semibold text-gray-900">Completing Sign In...</h2>
              <p className="mt-2 text-gray-600">Please wait while we complete your sign in.</p>
            </>
          ) : status === 'success' ? (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                <CheckCircleIcon className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="mt-6 text-xl font-semibold text-gray-900">Sign In Successful!</h2>
              <p className="mt-2 text-gray-600">{message}</p>
              <p className="mt-4 text-sm text-gray-500">Redirecting to dashboard...</p>
            </>
          ) : (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                <XCircleIcon className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="mt-6 text-xl font-semibold text-gray-900">Sign In Failed</h2>
              <p className="mt-2 text-gray-600">{message}</p>
              <button
                onClick={() => navigate('/login')}
                className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                Back to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}