import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Container,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Trash2,
  AlertCircle,
  ShoppingCart,
  LogOut,
  LayoutDashboard,
  ClipboardList,
  Users,
  Package,
  FileText,
  Menu as MenuIcon,
} from 'lucide-react';
import type { Database } from './types/supabase';
import Login from './components/Login';
import AdminLogs from './components/AdminLogs';
import InventoryManagement from './components/InventoryManagement';
import { getCurrentUser, signOut } from './lib/auth';
import PurchaseManager from './components/PurchaseManager';
import { useNotification } from './components/Notification';

type Transaction = Database['public']['Tables']['transactions']['Row'];

function App() {
  const { Notification, showNotification } = useNotification();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'inventory' | 'customer' | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'purchases' | 'users' | 'inventory' | 'logs'>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    const user = await getCurrentUser();
    if (user) {
      setIsAuthenticated(true);
      const { data: userData, error } = await supabase
        .from('users')
        .select('role, username')
        .eq('id', user.id)
        .single();
      
      if (!error && userData) {
        setUserRole(userData.role as 'admin' | 'inventory' | 'customer');
        setCurrentUsername(userData.username);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setIsAuthenticated(false);
      setUserRole(null);
      setCurrentUsername(null);
      showNotification('Logged out successfully', 'success');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to logout', 'error');
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={checkUserStatus} />;
  }

  const renderContent = () => {
    if (userRole === 'inventory') {
      return <InventoryManagement currentUsername={currentUsername} />;
    }

    if (userRole === 'admin') {
      switch (activeTab) {
        case 'dashboard':
          return <AdminLogs />;
        case 'inventory':
          return <InventoryManagement currentUsername={currentUsername} />;
        case 'purchases':
          return <PurchaseManager currentUsername={currentUsername} />;
        case 'logs':
          return <AdminLogs />;
        case 'users':
          return (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h5" gutterBottom>
                User Management
              </Typography>
              <Typography color="text.secondary">
                User management interface coming soon...
              </Typography>
            </Paper>
          );
        default:
          return <AdminLogs />;
      }
    }

    return <PurchaseManager currentUsername={currentUsername} />;
  };

  const drawer = (
    <Drawer
      anchor="left"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      PaperProps={{
        sx: { width: 240, bgcolor: 'background.default' }
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" color="primary">
          Little Tea Pot
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {currentUsername}
        </Typography>
      </Box>
      <List>
        {userRole === 'admin' && (
          <>
            <ListItem button onClick={() => { setActiveTab('dashboard'); setDrawerOpen(false); }}>
              <ListItemIcon>
                <LayoutDashboard />
              </ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItem>
            <ListItem button onClick={() => { setActiveTab('inventory'); setDrawerOpen(false); }}>
              <ListItemIcon>
                <Package />
              </ListItemIcon>
              <ListItemText primary="Inventory" />
            </ListItem>
            <ListItem button onClick={() => { setActiveTab('purchases'); setDrawerOpen(false); }}>
              <ListItemIcon>
                <ShoppingCart />
              </ListItemIcon>
              <ListItemText primary="Purchases" />
            </ListItem>
            <ListItem button onClick={() => { setActiveTab('users'); setDrawerOpen(false); }}>
              <ListItemIcon>
                <Users />
              </ListItemIcon>
              <ListItemText primary="Users" />
            </ListItem>
          </>
        )}
      </List>
    </Drawer>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {drawer}
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {userRole === 'admin' ? 'Admin Dashboard' : 
             userRole === 'inventory' ? 'Inventory Management' : 
             'Purchase System'}
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {currentUsername}
          </Typography>
          <Button
            onClick={handleLogout}
            startIcon={<LogOut />}
            variant="outlined"
            color="inherit"
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          bgcolor: 'background.default',
        }}
      >
        {renderContent()}
      </Box>
      {Notification}
    </Box>
  );
}

export default App;