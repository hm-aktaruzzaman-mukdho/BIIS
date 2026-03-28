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