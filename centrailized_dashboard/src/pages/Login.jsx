import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import '../styles/Login.css'

const Login = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading]=useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if(token) verifyToken(token);
  }, []);

  const verifyToken = async (token) => {
    try {
      const response = await api.get('/auth/verify');
      if (response.data.user) {
        // If user already connected platforms, go to dashboard, else go to onboarding
        navigate('/dashboard');
      }
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // After login, user might have existing platforms, so go to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
      <h2 className='font-bold text-2xl max-w-[5rem] mx-auto'>Login</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        </div>

        <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
            
        </div>

        <button type="submit" disabled={isLoading}>{isLoading ? 'Logging in...' : 'Login'}</button>
      </form>
      <p className="cursor-pointer hover:text-white/70 duration-200 mt-4">New here? <a href="/signup">Sign Up</a></p>
      </div>
    </div>
  );
};

export default Login;
