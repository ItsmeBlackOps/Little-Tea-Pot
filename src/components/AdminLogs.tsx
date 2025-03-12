import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
import { useNotification } from './Notification';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  FileText,
  User,
  Package,
  BarChart,
  Users,
  Plus,
  Minus,
} from 'lucide-react';

type FullTransaction = Database['public']['Tables']['transactions']['Row'] & {
  customers: Database['public']['Tables']['customers']['Row']
};

type DashboardStats = {
  totalTransactions: number;
  uniqueCustomers: number;
  totalQuantity: number;
  averageQuantity: number;
};

export default function AdminLogs() {
  const { Notification, showNotification } = useNotification();
  const [transactions, setTransactions] = useState<FullTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [stats, setStats] = useState<DashboardStats>({
    totalTransactions: 0,
    uniqueCustomers: 0,
    totalQuantity: 0,
    averageQuantity: 0
  });

  useEffect(() => {
    loadTransactions();
  }, [filter]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          customers (*)
        `)
        .order('created_at', { ascending: false });

      const now = new Date();
      switch (filter) {
        case '24h':
          query = query.gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());
          break;
        case '7d':
          query = query.gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());
          break;
        case '30d':
          query = query.gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());
          break;
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const transactions = data as FullTransaction[];
      setTransactions(transactions);

      const stats: DashboardStats = {
        totalTransactions: transactions.length,
        uniqueCustomers: new Set(transactions.map(tx => tx.customer_id)).size,
        totalQuantity: transactions.reduce((sum, tx) => sum + tx.quantity, 0),
        averageQuantity: transactions.length > 0 
          ? Math.round(transactions.reduce((sum, tx) => sum + tx.quantity, 0) / transactions.length * 10) / 10
          : 0
      };
      setStats(stats);

    } catch (error) {
      showNotification('Error loading transactions', 'error');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const StatCard = ({ icon: Icon, title, value, color }: { icon: any, title: string, value: number | string, color: string }) => (
    <Card sx={{ height: '100%', bgcolor: 'background.paper' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ 
          p: 1.5, 
          borderRadius: 2, 
          bgcolor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={24} style={{ color }} />
        </Box>
        <Box>
          <Typography color="text.secondary" variant="body2">
            {title}
          </Typography>
          <Typography variant="h5" component="div" fontWeight="bold">
            {value}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <StatCard
            icon={FileText}
            title="Total Transactions"
            value={stats.totalTransactions}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            icon={Users}
            title="Unique Customers"
            value={stats.uniqueCustomers}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            icon={Package}
            title="Total Quantity"
            value={stats.totalQuantity}
            color="#9c27b0"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            icon={BarChart}
            title="Average Quantity"
            value={stats.averageQuantity}
            color="#ed6c02"
          />
        </Grid>
      </Grid>

      <Card sx={{ mb: 4 }}>
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="h2">
            Transaction History
          </Typography>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Time Period</InputLabel>
            <Select
              value={filter}
              label="Time Period"
              onChange={(e) => setFilter(e.target.value as typeof filter)}
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Customer ID</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Created By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{formatDate(tx.created_at!)}</TableCell>
                    <TableCell>{tx.customer_id}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {tx.quantity > 0 ? (
                          <Plus size={16} color="#2e7d32" />
                        ) : (
                          <Minus size={16} color="#d32f2f" />
                        )}
                        <Typography
                          component="span"
                          sx={{
                            color: tx.quantity > 0 ? 'success.main' : 'error.main',
                            fontWeight: 500
                          }}
                        >
                          {Math.abs(tx.quantity)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{tx.created_by || 'System'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
      {Notification}
    </Box>
  );
}