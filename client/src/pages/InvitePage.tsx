import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { QRCodeSVG } from 'qrcode.react';
import { useInvitesList, useDeleteInvite } from '../api/queries';
import InviteForm from '../components/InviteForm';
import InviteEditDialog from '../components/InviteEditDialog';
import type { Invite } from '../api/client';

export default function InvitePage() {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [qrcodeInvite, setQrcodeInvite] = useState<Invite | null>(null);
  const [editInviteId, setEditInviteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: invites = [], isLoading: loading } = useInvitesList();
  const { t } = useTranslation();
  const deleteMutation = useDeleteInvite({
    onMutate: (id) => setDeletingId(id),
    onSettled: () => setDeletingId(null),
    onError: () => setDeleteError(t('invites.failedToDelete')),
  });

  const handleDelete = (id: number) => {
    setDeleteError(null);
    deleteMutation.mutate(id);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', p: 3 }}>
      <Typography variant="h1" gutterBottom>
        {t('invites.createInvite')}
      </Typography>
      <Box sx={{ mb: 2 }}>
        <InviteForm />
      </Box>
      {deleteError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDeleteError(null)}>
          {deleteError}
        </Alert>
      )}
      <Typography variant="h2" gutterBottom>
        {t('invites.yourInvites')}
      </Typography>
      {invites.length > 0 ? (
        <List component={Paper}>
          {invites.map((inv) => (
            <ListItem
              key={inv.id}
              secondaryAction={
                <>
                  <IconButton
                    size="small"
                    onClick={() => setEditInviteId(inv.id)}
                    aria-label={t('invites.editInviteAria')}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => setQrcodeInvite(inv)}
                    aria-label={t('invites.showQrCode')}
                  >
                    <QrCode2Icon fontSize="small" />
                  </IconButton>
                  <Button
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/invite/${inv.code}`
                      );
                    }}
                    sx={{ mr: 1 }}
                  >
                    {t('common.copy')}
                  </Button>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(inv.id)}
                    disabled={deletingId === inv.id}
                    aria-label={t('invites.deleteInviteAria')}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </>
              }
            >
              <ListItemText
                primary={
                  inv.first_name || inv.last_name
                    ? `${[inv.first_name, inv.last_name].filter(Boolean).join(' ')} · ${inv.address?.display_address ?? t('common.unknownAddress')}`
                    : inv.address?.display_address ?? t('common.unknownAddress')
                }
                secondary={`${window.location.origin}/invite/${inv.code}`}
                secondaryTypographyProps={{ sx: { wordBreak: 'break-all' } }}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('invites.noInvitesYet')}
        </Typography>
      )}
      <Dialog
        open={!!qrcodeInvite}
        onClose={() => setQrcodeInvite(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t('invites.inviteQrCode')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          {qrcodeInvite && (
            <>
              <QRCodeSVG
                value={`${window.location.origin}/invite/${qrcodeInvite.code}`}
                size={200}
                level="M"
                includeMargin
              />
              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all', textAlign: 'center' }}>
                {qrcodeInvite.address.display_address}
              </Typography>
            </>
          )}
        </DialogContent>
      </Dialog>
      <InviteEditDialog
        inviteId={editInviteId}
        open={!!editInviteId}
        onClose={() => setEditInviteId(null)}
        onSuccess={(updated) => {
          if (qrcodeInvite?.id === updated.id) setQrcodeInvite(updated);
        }}
      />
    </Box>
  );
}
