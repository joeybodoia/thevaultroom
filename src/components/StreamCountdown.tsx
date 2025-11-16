import React, { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Stream {
  id: string;
  title: string;
  scheduled_date: string | null;
  created_at: string;
}

interface StreamCountdownProps {
  onStreamChange?: (streamId: string | null) => void;
}

const StreamCountdown: React.FC<StreamCountdownProps> = ({ onStreamChange }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [nextStream, setNextStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the next upcoming stream
  const fetchNextStream = async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('streams')
        .select('*')
        .gte('scheduled_date', now)
        .order('scheduled_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      setNextStream(data ?? null);
    } catch (err: any) {
      console.error('Error fetching next stream:', err);
      setError(err.message || 'Failed to fetch stream data');
      setNextStream(null);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchNextStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent of active stream id
  useEffect(() => {
    if (onStreamChange) {
      onStreamChange(nextStream?.id || null);
    }
  }, [nextStream, onStreamChange]);

  // Countdown timer
  useEffect(() => {
    if (!nextStream?.scheduled_date) return;

    const targetDate = new Date(nextStream.scheduled_date);

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance <= 0) {
        // Stream has started or passed — reset & fetch next
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        fetchNextStream();
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor(
        (distance % (1000 * 60 * 60)) / (1000 * 60)
      );
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, [nextStream]);

  const formatStreamDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    };
    return date.toLocaleDateString('en-US', options);
  };

  if (loading) {
    return (
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Clock className="h-8 w-8 animate-spin text-red-600" />
            <span className="text-xl font-pokemon text-black">
              Loading Stream Info...
            </span>
          </div>
        </div>
      </section>
    );
  }

  if (error || !nextStream?.scheduled_date) {
    return (
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-8 font-pokemon">
            Next Live Stream
          </h2>
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
            <div className="text-center">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-600 font-pokemon mb-2">
                {error ? 'Unable to Load Stream' : 'No Upcoming Streams'}
              </h3>
              <p className="text-gray-500 font-pokemon">
                {error
                  ? error
                  : 'Check back soon for new stream announcements!'}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-6 sm:mb-8 font-pokemon">
          {nextStream.title}
        </h2>

        <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-200 mb-6 sm:mb-8 shadow-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
            {[
              { label: 'Days', value: timeLeft.days },
              { label: 'Hours', value: timeLeft.hours },
              { label: 'Minutes', value: timeLeft.minutes },
              { label: 'Seconds', value: timeLeft.seconds },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="bg-red-600 text-white rounded-xl p-2 sm:p-3 lg:p-4 mb-2">
                  <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold">
                    {String(item.value).padStart(2, '0')}
                  </span>
                </div>
                <span className="text-gray-600 text-xs sm:text-sm uppercase tracking-wider">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center text-gray-500">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span className="font-pokemon text-sm sm:text-base">
                {formatStreamDate(nextStream.scheduled_date)}
              </span>
            </div>
          </div>
        </div>

        <button className="bg-red-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg hover:bg-red-700 transition-all transform hover:scale-105 font-pokemon">
          Set Reminder
        </button>
      </div>
    </section>
  );
};

export default StreamCountdown;
