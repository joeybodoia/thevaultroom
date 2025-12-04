import React from 'react';

const DiscordCommunity: React.FC = () => {
  return (
    <section id="discord-community" className="bg-black text-white py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold font-brand mb-6 sm:mb-8">Discord Community</h2>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4 text-sm sm:text-base leading-relaxed font-pokemon">
          <p>
            To get the full experience, we invite you to join our official Discord community — the central hub for everything
            happening at Dread’s Vault.
          </p>
          <div className="space-y-3">
            <p className="font-semibold text-white">Inside the Discord, you’ll find:</p>
            <ul className="space-y-2 text-white/90">
              <li>📅 Stream schedules &amp; early announcements so you always know when events are happening</li>
              <li>🔔 Real-time updates and reminders during each streaming event</li>
              <li>
                💬 A dedicated feedback space where your ideas help influence future features, improvements, and event formats
              </li>
              <li>🤝 A welcoming community of collectors to chat with, share pulls, and connect over the hobby</li>
              <li>🗳️ Community voting &amp; polls that directly shape how Dread’s Vault evolves</li>
            </ul>
          </div>
          <p className="text-white/90">
            Dread’s Vault is built to be a community-driven platform, and joining the Discord ensures you’re not only up-to-date but
            also part of the decision-making process as we grow.
          </p>
          <p className="font-semibold">
            Join the{' '}
            <a
              href="https://discord.gg/dreads-vault"
              target="_blank"
              rel="noreferrer"
              className="text-yellow-300 hover:text-yellow-200 underline underline-offset-4"
            >
              Discord
            </a>{' '}
            to stay connected, participate in shaping the platform, and never miss a stream!
          </p>
        </div>
      </div>
    </section>
  );
};

export default DiscordCommunity;
