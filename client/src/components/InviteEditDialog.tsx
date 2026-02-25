import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material';
import { useInviteDetail, useUpdateInvite } from '../api/queries';
import type { Invite } from '../api/client';

export interface InviteEditDialogProps {
  inviteId: number | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (invite: Invite) => void;
}

export default function InviteEditDialog({
  inviteId,
  open,
  onClose,
  onSuccess,
}: InviteEditDialogProps) {
  const [first_name, setFirstName] = useState('');
  const [last_name, setLastName] = useState('');
  const [date_of_birth, setDateOfBirth] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [clearPhoto, setClearPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: invite, isLoading: loading, error: loadError } = useInviteDetail(
    open && inviteId ? inviteId : null,
    { enabled: open && inviteId != null }
  );
  const { t } = useTranslation();
  const updateMutation = useUpdateInvite({
    onSuccess: (updated) => {
      onSuccess?.(updated);
      onClose();
    },
    onError: () => setError(t('invites.failedToUpdate')),
  });

  useEffect(() => {
    if (invite) {
      setFirstName(invite.first_name ?? '');
      setLastName(invite.last_name ?? '');
      setDateOfBirth(invite.date_of_birth ?? '');
      setPhoto(null);
      setClearPhoto(false);
    }
  }, [invite]);

  useEffect(() => {
    if (!open) setError(null);
  }, [open]);

  useEffect(() => {
    if (loadError) setError(t('invites.failedToLoad'));
  }, [loadError, t]);

  const handleSave = () => {
    if (!inviteId || !invite) return;
    setError(null);
    const data: { first_name?: string; last_name?: string; date_of_birth?: string; photo?: File | null } = {};
    if (first_name !== (invite.first_name ?? '')) data.first_name = first_name.trim();
    if (last_name !== (invite.last_name ?? '')) data.last_name = last_name.trim();
    if (date_of_birth !== (invite.date_of_birth ?? '')) data.date_of_birth = date_of_birth || undefined;
    if (photo) data.photo = photo;
    else if (clearPhoto && invite.photo_url) data.photo = null;
    if (Object.keys(data).length === 0) {
      onClose();
      return;
    }
    updateMutation.mutate({ id: inviteId, data });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('invites.editInvite')}</DialogTitle>
      <DialogContent>
        {loading ? (
          <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />
        ) : invite ? (
          <>
            <TextField
              label={t('inviteSignup.firstName')}
              value={first_name}
              onChange={(e) => setFirstName(e.target.value)}
              fullWidth
              size="small"
              sx={{ mt: 1, mb: 1 }}
            />
            <TextField
              label={t('inviteSignup.lastName')}
              value={last_name}
              onChange={(e) => setLastName(e.target.value)}
              fullWidth
              size="small"
              sx={{ mb: 1 }}
            />
            <TextField
              label={t('inviteSignup.dateOfBirth')}
              type="date"
              value={date_of_birth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
              sx={{ mb: 1 }}
            />
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button variant="outlined" component="label" fullWidth size="small">
                {photo ? photo.name : invite.photo_url ? t('invites.changePhoto') : t('invites.addPhoto')}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => {
                    setPhoto(e.target.files?.[0] ?? null);
                    setClearPhoto(false);
                  }}
                />
              </Button>
              {invite.photo_url && (
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  onClick={() => {
                    setPhoto(null);
                    setClearPhoto(true);
                  }}
                >
                  {t('common.remove')}
                </Button>
              )}
            </Box>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              fullWidth
            >
              {updateMutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
