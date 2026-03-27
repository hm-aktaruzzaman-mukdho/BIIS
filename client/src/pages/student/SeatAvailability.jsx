import { useState, useEffect } from 'react';
import api from '../../api';

export default function SeatAvailability() {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    async function fetchRooms() {
      try {
        const res = await api.get('/seats');
        setRooms(res.data.rooms);
      } catch (err) {
        console.error(err);
      }
    }

    fetchRooms();
  }, []);

  return (
    <div>
      <h2>Seat Availability</h2>

      {rooms.length === 0 ? (
        <p>No rooms available</p>
      ) : (
        <ul>
          {rooms.map(room => (
            <li key={room.room_id}>
              Room {room.room_number} - Floor {room.floor}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}