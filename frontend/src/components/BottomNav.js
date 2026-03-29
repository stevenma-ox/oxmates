import { NavLink } from 'react-router-dom';
import { Flame, Heart, Calendar, User } from 'lucide-react';

const navItems = [
  { to: '/discover', icon: Flame, label: 'Discover' },
  { to: '/matches', icon: Heart, label: 'Matches' },
  { to: '/events', icon: Calendar, label: 'Events' },
  { to: '/profile', icon: User, label: 'Profile' }
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          data-testid={`nav-${label.toLowerCase()}`}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 transition-colors ${
              isActive ? 'text-primary' : 'text-muted hover:text-white'
            }`
          }
        >
          <Icon size={24} strokeWidth={1.5} />
          <span className="text-xs">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
