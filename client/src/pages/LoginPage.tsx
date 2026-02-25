import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Alert,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.DEV ? '' : 'http://127.0.0.1:8000';

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (
              err as {
                response?: { data?: { non_field_errors?: string[] } };
              }
            ).response?.data?.non_field_errors?.[0]
          : t('login.failed');
      setError(msg || t('login.failed'));
    }
  };

  const socialLogin = async (provider: string) => {
    const redirectUri = `${window.location.origin}/auth/callback/${provider}`;
    const res = await fetch(
      `${API_BASE}/dj-rest-auth/oauth/${provider}/url/?redirect_uri=${encodeURIComponent(redirectUri)}`
    );
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      setError(t('login.socialNotConfigured', { provider }));
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        p: 3,
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h1" gutterBottom>
          {t('login.title')}
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            label={t('login.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            sx={{ mb: 2 }}
            fullWidth
          />
          <TextField
            label={t('login.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            sx={{ mb: 2 }}
            fullWidth
          />
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Button type="submit" variant="contained" fullWidth size="large">
            {t('login.submit')}
          </Button>
        </Box>
        <Divider sx={{ my: 3 }}>{t('common.or')}</Divider>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button variant="outlined" onClick={() => socialLogin('google')}>
            Google
          </Button>
          <Button variant="outlined" onClick={() => socialLogin('github')}>
            GitHub
          </Button>
          <Button variant="outlined" onClick={() => socialLogin('facebook')}>
            Facebook
          </Button>
          <Button variant="outlined" onClick={() => socialLogin('twitter')}>
            Twitter
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {t('login.socialHint')}
        </Typography>
        <Typography sx={{ mt: 2, textAlign: 'center' }} variant="body2" color="text.secondary">
          {t('login.inviteOnlySignup')}
        </Typography>
      </Paper>
    </Box>
  );
}
