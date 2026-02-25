import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Button, Alert } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.DEV ? '' : 'http://127.0.0.1:8000';

export default function AuthCallbackPage() {
  const { t } = useTranslation();
  const { provider } = useParams<{ provider: string }>();
  const [error, setError] = useState<string | null>(null);
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');

    if (errorParam) {
      setError(errorParam === 'access_denied' ? t('authCallback.accessDenied') : errorParam);
      return;
    }

    if (!code || !provider) {
      setError(t('authCallback.missingCode'));
      return;
    }

    const completeLogin = async () => {
      try {
        const endpoint = `${API_BASE}/dj-rest-auth/${provider}/`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
          credentials: 'include',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || data.error || t('login.failed'));
        }
        await refreshUser();
        navigate('/');
      } catch (err) {
        setError(err instanceof Error ? err.message : t('login.failed'));
      }
    };

    completeLogin();
  }, [provider, navigate, refreshUser, t]);

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button component={RouterLink} to="/login" variant="contained">
          {t('authCallback.backToLogin')}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography>{t('authCallback.completing')}</Typography>
    </Box>
  );
}
