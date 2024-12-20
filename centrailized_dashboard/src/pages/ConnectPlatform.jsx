import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/axios';

const ConnectPlatform = () => {
  const { platform } = useParams();
  const navigate = useNavigate();
  const [qrCode, setQrCode] = useState(null);
  const [requiresToken, setRequiresToken] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [status, setStatus] = useState('pending');

  const [isLoading, setIsLoading] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  

  // useEffect(() => {
  //   const initiate = async () => {
  //     setIsLoading(true);
  //     setErrorMessage('');
  //     toast.info(`Initiating ${platform} connection...`);
  //     try {
  //       const res = await api.post(`/connect/${platform}/initiate`);
  //       if (res.data.error) {
  //         setErrorMessage(res.data.error);
  //         setStatus('error');
  //         toast.error(res.data.error);
  //         return;
  //       }
  //       if (res.data.status === 'redirect' && res.data.url) {
  //         window.location.href = res.data.url; // Slack OAuth
  //       } else if (res.data.status === 'connected') {
  //         setStatus('connected');
  //         toast.success(`${platform} connected successfully!`);
  //         navigate('/dashboard');
  //       } else if (res.data.qrCode) {
  //         setQrCode(res.data.qrCode);
  //         setStatus('pending');
  //         toast.info('Scan the QR code with WhatsApp to connect.');
  //       } else if (res.data.requiresToken) {
  //         setRequiresToken(true);
  //         setStatus('pending');
  //         toast.info('Please enter your Telegram Bot Token.');
  //       } else {
  //         setErrorMessage('Unexpected response from server. Please try again.');
  //         setStatus('error');
  //         toast.error('Unexpected server response.');
  //       }
  //     } catch (err) {
  //       console.error('Error initiating connection:', err);
  //       setStatus('error');
  //       if (err.response?.status === 401) {
  //         setErrorMessage('You are not logged in. Redirecting to login...');
  //         toast.warn('Not logged in. Redirecting...');
  //         setTimeout(() => { navigate('/login'); }, 2000);
  //       } else {
  //         setErrorMessage('Failed to initiate connection. Please try again.');
  //         toast.error('Connection initiation failed.');
  //       }
  //     }
  //   };
  //   initiate();
  // }, [platform, navigate]);
  useEffect(() => {
    const initiate = async () => {
      setIsLoading(true);
      setErrorMessage('');
      
      try {
        const res = await api.post(`/connect/${platform}/initiate`);
        
        if (res.data.error) {
          throw new Error(res.data.error);
        }
  
        switch (res.data.status) {
          case 'redirect':
            window.location.href = res.data.url;
            break;
          case 'connected':
            toast.success(`${platform} connected successfully!`);
            navigate('/dashboard');
            break;
          case 'pending':
            if (res.data.qrCode) {
              setQrCode(res.data.qrCode);
              toast.info('Scan QR code with WhatsApp');
            } else if (res.data.requiresToken) {
              setRequiresToken(true);
              toast.info(res.data.instructions || 'Enter your bot token');
            }
            break;
          default:
            throw new Error('Unexpected response');
        }
      } catch (err) {
        handleConnectionError(err);
      } finally {
        setIsLoading(false);
      }
    };
  
    initiate();
  }, [platform, connectionAttempts]);

  useEffect(() => {
    let interval;
    if (qrCode && platform === 'whatsapp') {
      interval = setInterval(async () => {
        try {
          const resp = await api.get(`/connect/${platform}/status`);
          if (resp.data.status === 'connected') {
            clearInterval(interval);
            // Add finalization call here
            const finalizeRes = await api.post(`/connect/${platform}/finalize`);
            if (finalizeRes.data.status === 'connected') {
              toast.success('WhatsApp connected successfully!');
              navigate('/dashboard');
            }
          } else if (resp.data.error) {
            setErrorMessage(resp.data.error);
            setStatus('error');
            toast.error(resp.data.error);
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Error checking WhatsApp status:', err);
          clearInterval(interval);
          handleConnectionError(err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [qrCode, platform, navigate]);
  
  const handleConnectionError = (err) => {
    console.error(`${platform} connection error:`, err);
    
    if (err.response?.status === 401) {
      toast.error('Session expired - please login again');
      setTimeout(() => navigate('/login'), 2000);
    } else {
      setErrorMessage(err.message || `Failed to connect to ${platform}`);
      toast.error(err.message || `Connection to ${platform} failed`);
    }
  };

  const handleFinalizeTelegram = async () => {
    if (!botToken.trim()) {
      toast.info('Please enter a bot token.');
      return;
    }
    toast.info('Finalizing Telegram connection...');
    try {
      const res = await api.post(`/connect/${platform}/finalize`, { botToken });
      if (res.data.status === 'connected') {
        toast.success('Telegram connected successfully!');
        navigate('/dashboard');
      } else if (res.data.error) {
        setErrorMessage(res.data.error);
        setStatus('error');
        toast.error(res.data.error);
      } else {
        setErrorMessage('Unexpected response from server. Please try again.');
        setStatus('error');
        toast.error('Unexpected server response.');
      }
    } catch (err) {
      console.error('Error finalizing Telegram:', err);
      setStatus('error');
      if (err.response?.status === 401) {
        setErrorMessage('You are not authenticated. Please login again.');
        toast.warn('Not authenticated. Redirecting...');
        setTimeout(() => { navigate('/login'); },2000);
      } else {
        setErrorMessage('Failed to finalize Telegram connection. Please try again.');
        toast.error('Finalizing Telegram failed.');
      }
    }
  };

  return (
    <div className="p-6 flex flex-col items-center bg-dark min-h-screen text-white">
      {errorMessage && (
        <div className="text-red-500 mb-4">{errorMessage}</div>
      )}
      {status === 'pending' && !errorMessage && !qrCode && !requiresToken && (
        <div className="text-gray-300 mb-4">
          <p>Connecting to {platform}...</p>
          <div className="loader">Loading...</div>
        </div>
      )}
      {qrCode && (
        <>
          <h2 className="mb-4">Scan this QR code with your WhatsApp</h2>
          <img src={qrCode} alt="QR Code" className="mb-4"/>
          <p className="text-gray-400">Waiting for WhatsApp connection...</p>
        </>
      )}
      {requiresToken && !qrCode && (
        <div className="text-center">
          <h2 className="mb-4">Enter your Telegram Bot Token</h2>
          <input
            className="px-4 py-2 bg-dark-lighter text-white rounded"
            type="text"
            value={botToken}
            onChange={e => setBotToken(e.target.value)}
            placeholder="Bot token..."
          />
          <button
            onClick={handleFinalizeTelegram}
            className="px-4 py-2 bg-primary text-white rounded ml-2 mt-2"
          >
            Connect
          </button>
        </div>
      )}
    </div>
  );
};

export default ConnectPlatform;
