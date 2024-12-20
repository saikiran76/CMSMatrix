// frontend/src/pages/Signup.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';

const Signup = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]  = useState('');
  const [email, setEmail]        = useState('');
  const [password, setPassword]  = useState('');
  const [error, setError]        = useState('');
  const [isLoading, setIsLoading]= useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/signup', { firstName, lastName, email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      // After signup, take them to onboarding (platform selection)
      navigate('/onboarding');
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
        <div className="login-card">
      <h2 className='font-bold text-2xl max-w-[6rem] mx-auto'>Sign Up</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
      <div className="form-group">
        <input type="text" placeholder="First Name" value={firstName} onChange={e=>setFirstName(e.target.value)} required/>
      </div>

      <div className="form-group">
        <input type="text" placeholder="Last Name" value={lastName} onChange={e=>setLastName(e.target.value)} required/>
        </div>

        <div className="form-group">
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/>
        </div>

        <div className="form-group">
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required/>
        </div>
        <button type="submit" disabled={isLoading}>{isLoading ? 'Signing up...' : 'Sign Up'}</button>
      </form>
      <p className="cursor-pointer hover:text-white/70 duration-200 mt-4">Already have an account? <a href="/login">Login</a></p>
      </div>
    </div>
  );
};

export default Signup;
