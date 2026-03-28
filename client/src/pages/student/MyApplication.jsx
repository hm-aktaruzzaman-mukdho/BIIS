import { useState, useEffect, useCallback } from 'react';
import api from '../../api';

function CountdownTimer({ deadline }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    function update() {
      const now = new Date();
      const end = new Date(deadline);
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft('EXPIRED');
        setIsUrgent(true);
        return;
      }
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${hrs}h ${mins}m ${secs}s`);
      setIsUrgent(hrs < 2);
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <span style={{
      fontWeight: 700, fontSize: '0.95rem',
      color: isUrgent ? '#C62828' : '#E65100',
      background: isUrgent ? '#FFEBEE' : '#FFF3E0',
      padding: '2px 10px', border: `1px solid ${isUrgent ? '#EF9A9A' : '#FFCC80'}`
    }}>
      ⏱ {timeLeft}
    </span>
  );
}





export default function MyApplications() {
    const [applications, setApplications] = useState([]);
    const [seatChanges, setSeatChanges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('applications');
    const [payModal, setPayModal] = useState(null);
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvc, setCardCvc] = useState('');
    const [processing, setProcessing] = useState(false);
    const [cancelModal, setCancelModal] = useState(null);
  
    const loadData = useCallback(async () => {
      setLoading(true);
      try {
        const [appRes, scRes] = await Promise.all([
          api.get('/applications'),
          api.get('/seat-changes')
        ]);
        setApplications(appRes.data.applications);
        setSeatChanges(scRes.data.seatChanges);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, []);
  
    useEffect(() => {
      loadData();
    }, [loadData]);
  
    async function handlePay(id) {
      if (!cardNumber || !cardExpiry || !cardCvc) {
        alert('Please fill all card details');
        return;
      }
      setProcessing(true);
      try {
        const res = await api.post(`/applications/${id}/pay`);
        alert(res.data.message || 'Payment successful! Seat assigned.');
        setPayModal(null);
        setCardNumber(''); setCardExpiry(''); setCardCvc('');
        loadData();
      } catch (err) {
        alert(err.response?.data?.error || 'Payment failed');
      } finally {
        setProcessing(false);
      }
    }
  
    async function handleCancel(id) {
      setProcessing(true);
      try {
        const res = await api.post(`/applications/${id}/cancel`);
        alert(res.data.message || 'Application cancelled');
        setCancelModal(null);
        loadData();
      } catch (err) {
        alert(err.response?.data?.error || 'Cancellation failed');
      } finally {
        setProcessing(false);
      }
    }
  
    if (loading) {
      return <div className="loading"><div className="spinner"></div></div>;
    }
  
  }