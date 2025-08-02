import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users } from 'lucide-react';

const StreamCountdown: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    // Set next stream to 2 days from now for demo
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    targetDate.setHours(19, 0, 0, 0); // 7 PM

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-black mb-8 font-pokemon">
          Next Live Stream
        </h2>
        
        <div className="bg-white rounded-2xl p-8 border border-gray-200 mb-8 shadow-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            {[
              { label: 'Days', value: timeLeft.days },
              { label: 'Hours', value: timeLeft.hours },
              { label: 'Minutes', value: timeLeft.minutes },
              { label: 'Seconds', value: timeLeft.seconds }
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="bg-red-600 text-white rounded-xl p-4 mb-2">
                  <span className="text-3xl md:text-4xl font-bold">
                    {String(item.value).padStart(2, '0')}
                  </span>
                </div>
                <span className="text-gray-600 text-sm uppercase tracking-wider">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-center space-x-6 text-gray-500">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Friday, 7:00 PM EST</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Expected: 2,500+ viewers</span>
            </div>
          </div>
        </div>

        <button className="bg-red-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-red-700 transition-all transform hover:scale-105">
          Set Reminder
        </button>
      </div>
    </section>
  );
};

export default StreamCountdown;