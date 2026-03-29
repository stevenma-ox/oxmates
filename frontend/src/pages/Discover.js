import { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Heart, X, Star, MapPin, GraduationCap, Sparkles, Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import BottomNav from '../components/BottomNav';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function ProfileCard({ profile, onSwipe, isTop }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (_, info) => {
    if (info.offset.x > 100) {
      onSwipe('like');
    } else if (info.offset.x < -100) {
      onSwipe('pass');
    }
  };

  const photoUrl = profile.photos?.[0]?.startsWith('http') 
    ? profile.photos[0] 
    : profile.photos?.[0] 
      ? `${API}/files/${profile.photos[0]}` 
      : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400';

  return (
    <motion.div
      className="absolute w-full profile-card cursor-grab active:cursor-grabbing"
      style={{ x, rotate, zIndex: isTop ? 10 : 0 }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ scale: isTop ? 1 : 0.95, y: isTop ? 0 : 20 }}
      animate={{ scale: isTop ? 1 : 0.95, y: isTop ? 0 : 20 }}
      exit={{ x: 500, opacity: 0, transition: { duration: 0.3 } }}
      data-testid={`profile-card-${profile.id}`}
    >
      <img
        src={photoUrl}
        alt={profile.name}
        className="w-full h-full object-cover"
      />
      
      {/* Like/Pass indicators */}
      <motion.div
        className="absolute top-8 right-8 px-4 py-2 border-4 border-green-500 rounded-lg"
        style={{ opacity: likeOpacity }}
      >
        <span className="text-green-500 text-3xl font-bold tracking-wider">LIKE</span>
      </motion.div>
      <motion.div
        className="absolute top-8 left-8 px-4 py-2 border-4 border-red-500 rounded-lg"
        style={{ opacity: passOpacity }}
      >
        <span className="text-red-500 text-3xl font-bold tracking-wider">NOPE</span>
      </motion.div>

      {/* Profile info overlay */}
      <div className="profile-card-gradient" />
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-heading font-semibold">
              {profile.name}{profile.age ? `, ${profile.age}` : ''}
            </h2>
            <div className="flex items-center gap-2 mt-2 text-secondary">
              <MapPin size={16} strokeWidth={1.5} />
              <span className="text-sm">{profile.college}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-secondary">
              <GraduationCap size={16} strokeWidth={1.5} />
              <span className="text-sm">{profile.major}{profile.year ? ` • Year ${profile.year}` : ''}</span>
            </div>
          </div>
        </div>
        
        {profile.bio && (
          <p className="mt-4 text-sm text-white/80 line-clamp-2">{profile.bio}</p>
        )}
        
        {profile.interests?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {profile.interests.slice(0, 4).map(interest => (
              <span key={interest} className="badge-interest">{interest}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Discover() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showMatch, setShowMatch] = useState(null);
  const [colleges, setColleges] = useState([]);
  const [majors, setMajors] = useState([]);
  const [filters, setFilters] = useState({ college: 'all', major: 'all', year: 'all' });

  useEffect(() => {
    fetchProfiles();
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const [collegesRes, majorsRes] = await Promise.all([
        axios.get(`${API}/colleges`),
        axios.get(`${API}/majors`)
      ]);
      setColleges(collegesRes.data);
      setMajors(majorsRes.data);
    } catch (err) {
      console.error('Failed to fetch options');
    }
  };

  const fetchProfiles = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.college && filters.college !== 'all') params.append('college', filters.college);
      if (filters.major && filters.major !== 'all') params.append('major', filters.major);
      if (filters.year && filters.year !== 'all') params.append('year', filters.year);
      
      const { data } = await axios.get(`${API}/discover?${params}`, { withCredentials: true });
      setProfiles(data);
    } catch (err) {
      console.error('Failed to fetch profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (action) => {
    if (profiles.length === 0) return;
    
    const profile = profiles[0];
    try {
      const { data } = await axios.post(`${API}/swipe`, {
        target_user_id: profile.id,
        action
      }, { withCredentials: true });
      
      setProfiles(prev => prev.slice(1));
      
      if (data.matched) {
        setShowMatch(profile);
      } else if (action === 'like') {
        toast('Liked!', { icon: '💛' });
      }
    } catch (err) {
      toast.error('Failed to swipe');
    }
  };

  const applyFilters = () => {
    setShowFilters(false);
    setLoading(true);
    fetchProfiles();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-safe">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-secondary">Finding scholars...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 glass border-b border-white/10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" strokeWidth={1.5} />
            <h1 className="text-2xl font-heading text-white">Discover</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFilters(true)}
            className="text-white hover:bg-white/10"
            data-testid="filter-btn"
          >
            <Filter size={22} strokeWidth={1.5} />
          </Button>
        </div>
      </div>

      {/* Card stack */}
      <div className="pt-24 px-6 pb-32">
        <div className="relative max-w-md mx-auto" style={{ height: '70vh' }}>
          {profiles.length > 0 ? (
            <AnimatePresence>
              {profiles.slice(0, 2).map((profile, i) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  isTop={i === 0}
                  onSwipe={handleSwipe}
                />
              ))}
            </AnimatePresence>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Heart className="w-12 h-12 text-muted" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-heading text-white mb-2">No more profiles</h3>
              <p className="text-secondary text-sm">Check back later for new scholars</p>
              <Button
                onClick={() => {
                  setFilters({ college: 'all', major: 'all', year: 'all' });
                  fetchProfiles();
                }}
                className="mt-6 rounded-full bg-white/10 text-white hover:bg-white/20"
                data-testid="clear-filters-btn"
              >
                Clear filters & refresh
              </Button>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {profiles.length > 0 && (
          <div className="flex justify-center gap-6 mt-6">
            <button
              onClick={() => handleSwipe('pass')}
              className="swipe-btn swipe-btn-pass"
              data-testid="swipe-pass-btn"
            >
              <X size={28} strokeWidth={2} />
            </button>
            <button
              onClick={() => handleSwipe('like')}
              className="swipe-btn swipe-btn-super"
              data-testid="swipe-super-btn"
            >
              <Star size={28} strokeWidth={2} />
            </button>
            <button
              onClick={() => handleSwipe('like')}
              className="swipe-btn swipe-btn-like"
              data-testid="swipe-like-btn"
            >
              <Heart size={28} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      {/* Filters Dialog */}
      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent className="bg-background-surface border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">Filters</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm text-secondary">College</label>
              <Select value={filters.college} onValueChange={(v) => setFilters({ ...filters, college: v })}>
                <SelectTrigger className="bg-background border-white/20 text-white" data-testid="filter-college-select">
                  <SelectValue placeholder="Any college" />
                </SelectTrigger>
                <SelectContent className="bg-background-surface border-white/10 max-h-60">
                  <SelectItem value="all" className="text-white">Any college</SelectItem>
                  {colleges.map(c => (
                    <SelectItem key={c} value={c} className="text-white hover:bg-white/10">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-secondary">Major</label>
              <Select value={filters.major} onValueChange={(v) => setFilters({ ...filters, major: v })}>
                <SelectTrigger className="bg-background border-white/20 text-white" data-testid="filter-major-select">
                  <SelectValue placeholder="Any major" />
                </SelectTrigger>
                <SelectContent className="bg-background-surface border-white/10 max-h-60">
                  <SelectItem value="all" className="text-white">Any major</SelectItem>
                  {majors.map(m => (
                    <SelectItem key={m} value={m} className="text-white hover:bg-white/10">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-secondary">Year</label>
              <Select value={filters.year} onValueChange={(v) => setFilters({ ...filters, year: v })}>
                <SelectTrigger className="bg-background border-white/20 text-white" data-testid="filter-year-select">
                  <SelectValue placeholder="Any year" />
                </SelectTrigger>
                <SelectContent className="bg-background-surface border-white/10">
                  <SelectItem value="all" className="text-white">Any year</SelectItem>
                  {[1, 2, 3, 4, 5, 6].map(y => (
                    <SelectItem key={y} value={String(y)} className="text-white hover:bg-white/10">Year {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={applyFilters}
              className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary-hover mt-4"
              data-testid="apply-filters-btn"
            >
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Match Dialog */}
      <Dialog open={!!showMatch} onOpenChange={() => setShowMatch(null)}>
        <DialogContent className="bg-background-surface border-white/10 text-white text-center">
          <div className="py-8">
            <div className="match-heart">
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 glow-gold">
                <Heart className="w-12 h-12 text-primary fill-primary" />
              </div>
            </div>
            <h2 className="text-3xl font-heading text-white mb-2">It's a Match!</h2>
            <p className="text-secondary">You and {showMatch?.name} liked each other</p>
            <div className="flex gap-4 mt-8 justify-center">
              <Button
                variant="outline"
                onClick={() => setShowMatch(null)}
                className="rounded-full border-white/20 text-white hover:bg-white/10"
                data-testid="keep-swiping-btn"
              >
                Keep Swiping
              </Button>
              <Button
                onClick={() => {
                  setShowMatch(null);
                  window.location.href = '/matches';
                }}
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary-hover"
                data-testid="send-message-btn"
              >
                Send Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
