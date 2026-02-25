import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Link,
} from '@mui/material';
import { invitesApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Address } from '../api/client';

export default function InviteSignupPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [address, setAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [first_name, setFirstName] = useState('');
  const [last_name, setLastName] = useState('');
  const [date_of_birth, setDateOfBirth] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { t } = useTranslation();
  useEffect(() => {
    if (!code) {
      setLoading(false);
      setError(t('inviteSignup.invalidLink'));
      return;
    }
    invitesApi
      .validate(code)
      .then(({ data }) => {
        setAddress(data.address);
        if (data.first_name != null) setFirstName(data.first_name);
        if (data.last_name != null) setLastName(data.last_name);
        if (data.date_of_birth != null)
          setDateOfBirth(data.date_of_birth);
      })
      .catch(() => {
        setError(t('inviteSignup.invalidOrExpired'));
      })
      .finally(() => setLoading(false));
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password1 !== password2) {
      setError(t('inviteSignup.passwordsNoMatch'));
      return;
    }
    if (!first_name.trim() && !last_name.trim()) {
      setError(t('inviteSignup.nameRequired'));
      return;
    }
    if (!code) return;
    setSubmitting(true);
    try {
      await invitesApi.register(code, {
        email,
        password1,
        password2,
        first_name: first_name.trim() || undefined,
        last_name: last_name.trim() || undefined,
        date_of_birth: date_of_birth || undefined,
      });
      await refreshUser();
      navigate('/');
    } catch (err: unknown) {
      const res =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: Record<string, string[]> } }).response?.data
          : null;
      const msg = res
        ? (Object.values(res).flat().find(Boolean) as string) || t('inviteSignup.registrationFailed')
        : t('inviteSignup.registrationFailed');
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <Typography>{t('common.loading')}</Typography>
      </Box>
    );
  }

  if (error && !address) {
    return (
      <Box sx={{ maxWidth: 400, mx: 'auto', p: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Alert severity="error">{error}</Alert>
          <Typography sx={{ mt: 2 }}>
            <Link component={RouterLink} to="/login">
              {t('inviteSignup.goToLogin')}
            </Link>
          </Typography>
        </Paper>
      </Box>
    );
  }

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
          {t('inviteSignup.title')}
        </Typography>
        {address && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('inviteSignup.signingUpFor', { address: address.display_address })}
          </Typography>
        )}
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            label={t('login.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label={t('login.password')}
            type="password"
            value={password1}
            onChange={(e) => setPassword1(e.target.value)}
            required
            autoComplete="new-password"
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label={t('inviteSignup.confirmPassword')}
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
            autoComplete="new-password"
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label={t('inviteSignup.firstName')}
            value={first_name}
            onChange={(e) => setFirstName(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label={t('inviteSignup.lastName')}
            value={last_name}
            onChange={(e) => setLastName(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label={t('inviteSignup.dateOfBirth')}
            type="date"
            value={date_of_birth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            sx={{ mb: 2 }}
          />
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={submitting}
          >
            {submitting ? t('inviteSignup.creatingAccount') : t('inviteSignup.createAccount')}
          </Button>
        </Box>
        <Typography sx={{ mt: 2, textAlign: 'center' }}>
          <Link component={RouterLink} to="/login">
            {t('inviteSignup.alreadyHaveAccount')}
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
