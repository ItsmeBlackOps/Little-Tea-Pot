import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '@mui/material/styles';
import { useNotification } from './Notification';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tabs,
  Tab,
  Alert,
  Divider,
} from '@mui/material';
import {
  Package,
  AlertTriangle,
  History,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  FileText,
  Plus,
  Minus,
  Trash2,
} from 'lucide-react';

interface StockLog {
  id: number;
  quantity: number;
  created_at: string;
  created_by: string;
  users?: {
    username: string;
  };
}

interface InventoryManagementProps {
  currentUsername: string | null;
}

const SYSTEM_CUSTOMER_ID = 1;
const LOW_STOCK_THRESHOLD = 10;

export default function InventoryManagement({ currentUsername }: InventoryManagementProps) {
  const theme = useTheme();
  const { Notification, showNotification } = useNotification();
  const [currentStock, setCurrentStock] = useState(0);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'logs'>('inventory');

  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async () => {
    setLoading(true);
    try {
      const { data: logs, error: logsError } = await supabase
        .from('transactions')
        .select(`
          *,
          users:created_by (
            username
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (logsError) throw logsError;

      const totalStock = logs?.reduce((sum, log) => sum + log.quantity, 0) || 0;
      setCurrentStock(totalStock);
      setStockLogs(logs || []);
    } catch (error) {
      console.error('Error:', error);
      showNotification('Failed to load inventory data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStockAdjustment = async (type: 'increase' | 'decrease') => {
    if (!adjustmentAmount || isNaN(Number(adjustmentAmount))) {
      showNotification('Please enter a valid number', 'error');
      return;
    }

    const amount = parseInt(adjustmentAmount);
    if (amount <= 0) {
      showNotification('Please enter a positive number', 'error');
      return;
    }

    if (type === 'decrease' && amount > currentStock) {
      showNotification('Cannot decrease stock below 0', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          customer_id: SYSTEM_CUSTOMER_ID,
          quantity: type === 'increase' ? amount : -amount,
          created_by: currentUsername
        });

      if (error) throw error;

      showNotification(`Stock ${type === 'increase' ? 'increased' : 'decreased'} successfully`, 'success');
      setAdjustmentAmount('');
      await loadInventoryData();
    } catch (error) {
      console.error('Error:', error);
      showNotification('Failed to adjust stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  return (
    <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<Package sx={{ mr: 1 }} />}
            label="Inventory Management"
            value="inventory"
          />
          <Tab
            icon={<FileText sx={{ mr: 1 }} />}
            label="Transaction Logs"
            value="logs"
          />
        </Tabs>
      </Paper>

      {activeTab === 'inventory' && (
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Package color={theme.palette.primary.main} size={24} />
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        Current Stock
                      </Typography>
                      <Typography variant="h4" component="div">
                        {currentStock}
                      </Typography>
                    </Box>
                  </Box>
                  {currentStock < LOW_STOCK_THRESHOLD && (
                    <Alert
                      severity="warning"
                      icon={<AlertTriangle size={16} />}
                      sx={{ mt: 2 }}
                    >
                      Low stock alert
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Adjust Stock
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <TextField
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  label="Enter amount"
                  variant="outlined"
                  fullWidth
                  sx={{ maxWidth: 200 }}
                />
                <Button
                  onClick={() => handleStockAdjustment('increase')}
                  disabled={loading}
                  variant="contained"
                  color="success"
                  startIcon={<TrendingUp size={16} />}
                >
                  Increase
                </Button>
                <Button
                  onClick={() => handleStockAdjustment('decrease')}
                  disabled={loading}
                  variant="contained"
                  color="error"
                  startIcon={<TrendingDown size={16} />}
                >
                  Decrease
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <History size={20} />
            Recent Stock Changes
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Change</TableCell>
                  <TableCell>Updated By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stockLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDate(log.created_at)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {log.quantity > 0 ? (
                          <Plus size={16} color={theme.palette.success.main} />
                        ) : (
                          <Minus size={16} color={theme.palette.error.main} />
                        )}
                        <Typography
                          component="span"
                          sx={{
                            color: log.quantity > 0 ? 'success.main' : 'error.main',
                            fontWeight: 500,
                          }}
                        >
                          {Math.abs(log.quantity)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{log.users?.username || 'System'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
      {Notification}
    </Box>
  );
}