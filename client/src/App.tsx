import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  ThemeProvider,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  useMediaQuery,
  Tooltip,
  useColorScheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { Link as RouterLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import i18n, { type Language } from './i18n';
import { theme } from './theme';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import InvitePage from './pages/InvitePage';
import InviteSignupPage from './pages/InviteSignupPage';
import MapPage from './pages/MapPage';
import ProfilePage from './pages/ProfilePage';
import AdminMapPage from './pages/AdminMapPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <Typography>{t('common.loading')}</Typography>
      </Box>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function StaffRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <Typography>{t('common.loading')}</Typography>
      </Box>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_staff) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite/:code" element={<InviteSignupPage />} />
      <Route path="/auth/callback/:provider" element={<AuthCallbackPage />} />
      <Route
        path="/invites"
        element={
          <ProtectedRoute>
            <InvitePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MapPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-map"
        element={
          <StaffRoute>
            <AdminMapPage />
          </StaffRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const FLAG_SRC = {
  nl: 'https://flagcdn.com/w40/nl.png',
  en: 'https://flagcdn.com/w40/gb.png',
} as const;

function ThemeToggle() {
  const { t } = useTranslation();
  const { mode, setMode } = useColorScheme();
  const isDark = mode === 'dark';
  const label = isDark ? t('nav.switchToLight') : t('nav.switchToDark');
  return (
    <Tooltip title={label}>
      <IconButton
        color="inherit"
        onClick={() => setMode(isDark ? 'light' : 'dark')}
        aria-label={label}
      >
        {isDark ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  );
}

function LanguageSwitcher() {
  const { t } = useTranslation();
  const switchTo: Language = i18n.language === 'nl' ? 'en' : 'nl';
  const label = i18n.language === 'nl' ? t('nav.switchToEnglish') : t('nav.switchToDutch');
  const flagSrc = FLAG_SRC[i18n.language as Language] ?? FLAG_SRC.en;
  return (
    <Tooltip title={label}>
      <IconButton
        color="inherit"
        onClick={() => i18n.changeLanguage(switchTo)}
        aria-label={label}
        sx={{ p: 0.5 }}
      >
        <Box
          component="img"
          src={flagSrc}
          alt=""
          sx={{ width: 24, height: 18, objectFit: 'cover', display: 'block' }}
        />
      </IconButton>
    </Tooltip>
  );
}

function NavBar() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { mode, setMode } = useColorScheme();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const isNarrow = useMediaQuery(theme.breakpoints.down('sm'));

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setMenuAnchor(e.currentTarget);
  const handleMenuClose = () => setMenuAnchor(null);

  const navLinks = (
    <>
      <Button component={RouterLink} to="/" color="inherit">
        {t('nav.map')}
      </Button>
      <Button component={RouterLink} to="/profile" color="inherit">
        {t('nav.profile')}
      </Button>
      {user && (
        <Button component={RouterLink} to="/invites" color="inherit">
          {t('nav.invites')}
        </Button>
      )}
      {user?.is_staff && (
        <Button component={RouterLink} to="/admin-map" color="inherit">
          {t('nav.adminMap')}
        </Button>
      )}
    </>
  );

  return (
    <AppBar position="static" color="default" sx={{ bgcolor: 'background.paper' }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Typography
          component={RouterLink}
          to="/"
          variant="h6"
          sx={{ fontWeight: 700, color: 'inherit', textDecoration: 'none' }}
        >
          {t('nav.appName')}
        </Typography>
        <Box component="nav" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isNarrow ? (
            <>
              <IconButton
                color="inherit"
                aria-label={t('nav.openMenu')}
                aria-controls="nav-menu"
                aria-haspopup="true"
                onClick={handleMenuOpen}
              >
                <MenuIcon />
              </IconButton>
              <Menu
                id="nav-menu"
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem component={RouterLink} to="/" onClick={handleMenuClose}>
                  {t('nav.map')}
                </MenuItem>
                <MenuItem component={RouterLink} to="/profile" onClick={handleMenuClose}>
                  {t('nav.profile')}
                </MenuItem>
                {user && (
                  <MenuItem component={RouterLink} to="/invites" onClick={handleMenuClose}>
                    {t('nav.invites')}
                  </MenuItem>
                )}
                {user?.is_staff && (
                  <MenuItem component={RouterLink} to="/admin-map" onClick={handleMenuClose}>
                    {t('nav.adminMap')}
                  </MenuItem>
                )}
                {user && (
                  <MenuItem
                    onClick={() => {
                      handleMenuClose();
                      logout();
                    }}
                  >
                    {t('nav.logOut')}
                  </MenuItem>
                )}
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    setMode(mode === 'dark' ? 'light' : 'dark');
                  }}
                  sx={{ justifyContent: 'center', gap: 1 }}
                >
                  {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                  {mode === 'dark' ? t('nav.switchToLight') : t('nav.switchToDark')}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    i18n.changeLanguage(i18n.language === 'nl' ? 'en' : 'nl');
                  }}
                  sx={{ justifyContent: 'center', gap: 1 }}
                >
                  <Box
                    component="img"
                    src={FLAG_SRC[i18n.language as Language] ?? FLAG_SRC.en}
                    alt=""
                    sx={{ width: 24, height: 18, objectFit: 'cover' }}
                  />
                  {i18n.language === 'nl' ? t('nav.switchToEnglish') : t('nav.switchToDutch')}
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              {navLinks}
              <LanguageSwitcher />
              <ThemeToggle />
              <LogoutButton />
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <NavBar />
            <Box component="main" sx={{ flex: 1 }}>
              <AppRoutes />
            </Box>
          </Box>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

function LogoutButton() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  if (!user) return null;
  return (
    <Button variant="outlined" color="inherit" size="small" onClick={() => logout()}>
      {t('nav.logOut')}
    </Button>
  );
}

export default App;
