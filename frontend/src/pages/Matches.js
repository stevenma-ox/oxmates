import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Heart, MessageCircle, Sparkles } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import axios from 'axios';
import BottomNav from '../components/BottomNav';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Matches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const { data } = await axios.get(`${API}/matches`, { withCredentials: true });
      setMatches(data);
    } catch (err) {
      console.error('Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  };

  const getPhotoUrl = (photos) => {
    if (!photos || photos.length === 0) return null;
    const photo = photos[0];
    return photo.startsWith('http') ? photo : `${API}/files/${photo}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-safe">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-secondary">Loading matches...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 glass border-b border-white/10">
        <div className="flex items-center gap-2 px-6 py-4">
          <Heart className="w-6 h-6 text-primary" strokeWidth={1.5} />
          <h1 className="text-2xl font-heading text-white">Matches</h1>
        </div>
      </div>

      <div className="pt-20 px-6 pb-24">
        {matches.length > 0 ? (
          <div className="space-y-3">
            {matches.map((match) => (
              <Link
                key={match.match_id}
                to={`/chat/${match.match_id}`}
                className="flex items-center gap-4 p-4 rounded-2xl bg-background-surface border border-white/10 hover:border-primary/50 transition-all"
                data-testid={`match-${match.match_id}`}
              >
                <Avatar className="w-16 h-16 border-2 border-primary/30">
                  <AvatarImage src={getPhotoUrl(match.user.photos)} alt={match.user.name} />
                  <AvatarFallback className="bg-background text-white text-lg">
                    {match.user.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium text-lg">{match.user.name}</h3>
                  <p className="text-secondary text-sm">
                    {match.user.college} • {match.user.major}
                  </p>
                  {match.last_message ? (
                    <p className="text-muted text-sm truncate mt-1">{match.last_message}</p>
                  ) : (
                    <p className="text-primary text-sm mt-1 flex items-center gap-1">
                      <Sparkles size={12} /> New match! Say hello
                    </p>
                  )}
                </div>
                
                <MessageCircle className="w-6 h-6 text-muted" strokeWidth={1.5} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Heart className="w-12 h-12 text-muted" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-heading text-white mb-2">No matches yet</h3>
            <p className="text-secondary text-sm max-w-xs">
              Keep swiping to find your fellow scholars!
            </p>
            <Link
              to="/discover"
              className="mt-6 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary-hover transition-all"
              data-testid="go-discover-btn"
            >
              Start Discovering
            </Link>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
