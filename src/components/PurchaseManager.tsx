import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNotification } from './Notification';
import {
  Box,
  Card,
  CardContent,
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
  Alert,
  Grid,
  Divider,
} from '@mui/material';
import {
  Trash2,
  AlertCircle,
  ShoppingCart,
  Plus,
  Minus,
} from 'lucide-react';
import type { Database } from '../types/supabase';

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  users?: {
    username: string;
  };
};

interface PurchaseManagerProps {
  currentUsername: string | null;
}

const PURCHASE_LIMIT = 5;
const RESERVED_CUSTOMER_ID = 1;

export default function PurchaseManager({ currentUsername }: PurchaseManagerProps) {
  const { Notification, showNotification } = useNotification();
  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState<'allowed' | 'denied' | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [nextTime, setNextTime] = useState<Date | null>(null);
  const [countdownTime, setCountdownTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  React.useEffect(() => {
    if (status === 'denied' && nextTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const timeLeft = Math.max(
          0,
          Math.floor((nextTime.getTime() - now.getTime()) / 1000)
        );

        if (timeLeft === 0) {
          clearInterval(interval);
          checkPurchase();
          showNotification('Customer can now purchase again!', 'info');
        }

        setCountdownTime(timeLeft);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [status, nextTime]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
      2,
      '0'
    )}:${String(secs).padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const checkPurchase = async () => {
    if (!customerId) {
      showNotification('Please enter a customer ID', 'error');
      return;
    }

    // Check if customer ID is exactly 4 digits
    if (!/^\d{4}$/.test(customerId)) {
      showNotification('Customer ID must be exactly 4 digits', 'error');
      return;
    }

    const customerIdNum = parseInt(customerId, 10);

    // Check if the ID is the reserved system ID
    if (customerIdNum === RESERVED_CUSTOMER_ID) {
      showNotification('This ID is reserved for inventory management', 'error');
      return;
    }

    setLoading(true);
    setStatus(null);
    setNextTime(null);
    setEligible(false);
    setTransactions([]);

    try {
      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerIdNum);

      if (customerError) {
        showNotification('Error checking customer', 'error');
        return;
      }

      if (!customers || customers.length === 0) {
        const { data: newCustomer, error: insertError } = await supabase
          .from('customers')
          .insert({ id: customerIdNum, name: null })
          .select()
          .single();

        if (insertError) {
          showNotification('Error creating new customer', 'error');
          return;
        }

        setStatus('allowed');
        setRemaining(PURCHASE_LIMIT);
        setEligible(true);
        showNotification('New customer! They can purchase up to 5 items.', 'success');
        return;
      }

      const { data, error } = await supabase
        .from('transactions')
        .select(
          `
          *,
          users:created_by (
            username
          )
        `
        )
        .eq('customer_id', customerIdNum)
        .gte(
          'created_at',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        )
        .order('created_at', { ascending: false });

      if (error) {
        showNotification('Error fetching transactions', 'error');
        return;
      }

      setTransactions(data);
      const totalBought = data.reduce(
        (acc, tx) => acc + Math.abs(tx.quantity),
        0
      );

      if (totalBought >= PURCHASE_LIMIT) {
        const oldestTransaction = new Date(
          Math.min(...data.map((tx) => new Date(tx.created_at!).getTime()))
        );
        const nextAllowedTime = new Date(
          oldestTransaction.getTime() + 24 * 60 * 60 * 1000
        );

        setNextTime(nextAllowedTime);
        setStatus('denied');
        setEligible(false);
      } else {
        setRemaining(PURCHASE_LIMIT - totalBought);
        setStatus('allowed');
        setEligible(true);
      }
    } catch (err) {
      console.error('Error:', err);
      showNotification('An error occurred while checking purchase eligibility', 'error');
    } finally {
      setLoading(false);
    }
  };

  const makePurchase = async (quantity: number) => {
    if (!eligible) {
      showNotification('Purchase not allowed yet!', 'warning');
      return;
    }

    if (quantity > remaining) {
      showNotification(
        `Cannot purchase ${quantity} items. Only ${remaining} remaining.`,
        'error'
      );
      return;
    }

    const customerIdNum = parseInt(customerId, 10);
    if (isNaN(customerIdNum)) {
      showNotification('Invalid customer ID format', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        customer_id: customerIdNum,
        quantity: -quantity,
        created_by: currentUsername
      });

      if (error) {
        showNotification('Purchase failed!', 'error');
        return;
      }

      showNotification(
        `Successfully purchased ${quantity} item${quantity > 1 ? 's' : ''}!`,
        'success'
      );
      await checkPurchase();
    } catch (err) {
      console.error('Error:', err);
      showNotification('An error occurred while making the purchase', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Card elevation={3}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Purchase System
          </Typography>
          
          <TextField
            fullWidth
            type="text"
            label="Customer ID"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            sx={{ mb: 2 }}
            helperText="Please enter a 4-digit customer ID"
            inputProps={{
              maxLength: 4,
              pattern: '[0-9]*'
            }}
          />

          <Button
            fullWidth
            variant="contained"
            onClick={checkPurchase}
            disabled={loading}
            sx={{ mb: 3 }}
          >
            {loading ? 'Processing...' : 'Check Limit'}
          </Button>

          {status === 'allowed' && (
            <Box sx={{ mt: 3 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                Available Purchases: {remaining}
              </Alert>

              <Grid container spacing={1}>
                {[1, 2, 3, 4, 5].map((quantity) => (
                  <Grid item xs={2.4} key={quantity}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => makePurchase(quantity)}
                      disabled={quantity > remaining || !eligible || loading}
                      color={quantity <= remaining && eligible ? 'primary' : 'inherit'}
                      startIcon={<ShoppingCart size={16} />}
                    >
                      {quantity}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {status === 'denied' && nextTime && (
            <Alert
              severity="error"
              icon={<AlertCircle />}
              sx={{ mt: 2 }}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                Purchase Limit Reached
              </Typography>
              <Typography variant="body2">
                Next purchase available in:
              </Typography>
              <Typography variant="h6" color="error">
                {formatTime(countdownTime)}
              </Typography>
            </Alert>
          )}

          {transactions.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Recent Transactions
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell>Created By</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {formatDate(transaction.created_at!)}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {transaction.quantity > 0 ? (
                              <Plus size={16} color="green" />
                            ) : (
                              <Minus size={16} color="red" />
                            )}
                            <Typography
                              component="span"
                              sx={{
                                color: transaction.quantity > 0 ? 'success.main' : 'error.main',
                                fontWeight: 500
                              }}
                            >
                              {Math.abs(transaction.quantity)} items
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {transaction.users?.username || 'System'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </CardContent>
      </Card>
      {Notification}
    </Box>
  );
}