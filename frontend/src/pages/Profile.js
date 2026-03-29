import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { User, LogOut, Camera, Save, Sparkles, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import BottomNav from '../components/BottomNav';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INTERESTS = [
  'Reading', 'Sports', 'Music', 'Art', 'Theatre', 'Cooking', 'Travel', 'Photography',
  'Science', 'Philosophy', 'History', 'Politics', 'Gaming', 'Fitness', 'Dancing',
  'Writing', 'Film', 'Nature', 'Technology', 'Fashion', 'Wine', 'Coffee', 'Rowing',
  'Hiking', 'Chess', 'Debating', 'Volunteering', 'Languages'
];

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [colleges, setColleges] = useState([]);
  const [majors, setMajors] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    college: '',
    major: '',
    year: '',
    age: '',
    gender: '',
    looking_for: '',
    interests: [],
    photos: []
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        college: user.college || '',
        major: user.major || '',
        year: user.year ? String(user.year) : '',
        age: user.age ? String(user.age) : '',
        gender: user.gender || '',
        looking_for: user.looking_for || '',
        interests: user.interests || [],
        photos: user.photos || []
      });
    }
    fetchOptions();
  }, [user]);

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

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (formData.photos.length + files.length > 6) {
      toast.error('Maximum 6 photos allowed');
      return;
    }
    
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const { data } = await axios.post(`${API}/upload/photo`, fd, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, data.path]
        }));
        toast.success('Photo uploaded!');
      } catch (err) {
        toast.error('Failed to upload photo');
      }
    }
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const toggleInterest = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest].slice(0, 8)
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.put(`${API}/profile`, {
        ...formData,
        year: formData.year ? parseInt(formData.year) : null,
        age: formData.age ? parseInt(formData.age) : null
      }, { withCredentials: true });
      updateUser(formData);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('Logged out');
  };

  const getPhotoUrl = (photo) => {
    return photo.startsWith('http') ? photo : `${API}/files/${photo}`;
  };

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 glass border-b border-white/10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <User className="w-6 h-6 text-primary" strokeWidth={1.5} />
            <h1 className="text-2xl font-heading text-white">Profile</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-white hover:bg-white/10"
            data-testid="logout-btn"
          >
            <LogOut size={22} strokeWidth={1.5} />
          </Button>
        </div>
      </div>

      <div className="pt-20 px-6 pb-24">
        {/* Profile photo */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <Avatar className="w-28 h-28 border-4 border-primary/30">
              <AvatarImage src={formData.photos[0] ? getPhotoUrl(formData.photos[0]) : null} alt={formData.name} />
              <AvatarFallback className="bg-background-surface text-white text-3xl">
                {formData.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <label className="absolute bottom-0 right-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-hover transition-colors">
              <Camera size={18} className="text-primary-foreground" />
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Photo gallery */}
        <div className="mb-6">
          <Label className="text-secondary text-sm mb-2 block">Photos ({formData.photos.length}/6)</Label>
          <div className="grid grid-cols-3 gap-2">
            {formData.photos.map((photo, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-white/10">
                <img src={getPhotoUrl(photo)} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                  data-testid={`remove-photo-${i}`}
                >
                  <X size={14} className="text-white" />
                </button>
              </div>
            ))}
            {formData.photos.length < 6 && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                <Upload className="w-5 h-5 text-muted mb-1" />
                <span className="text-xs text-muted">Add</span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="space-y-5 bg-background-surface rounded-2xl p-6 border border-white/10">
          <div className="space-y-2">
            <Label className="text-secondary">Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-background border-white/20 text-white rounded-xl"
              data-testid="profile-name-input"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-secondary">Bio</Label>
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell others about yourself..."
              maxLength={300}
              className="bg-background border-white/20 text-white rounded-xl min-h-[80px] resize-none"
              data-testid="profile-bio-input"
            />
            <p className="text-xs text-muted text-right">{formData.bio.length}/300</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-secondary">College</Label>
              <Select value={formData.college} onValueChange={(v) => setFormData({ ...formData, college: v })}>
                <SelectTrigger className="bg-background border-white/20 text-white rounded-xl" data-testid="profile-college-select">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-background-surface border-white/10 max-h-60">
                  {colleges.map(c => (
                    <SelectItem key={c} value={c} className="text-white hover:bg-white/10">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-secondary">Major</Label>
              <Select value={formData.major} onValueChange={(v) => setFormData({ ...formData, major: v })}>
                <SelectTrigger className="bg-background border-white/20 text-white rounded-xl" data-testid="profile-major-select">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-background-surface border-white/10 max-h-60">
                  {majors.map(m => (
                    <SelectItem key={m} value={m} className="text-white hover:bg-white/10">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-secondary">Age</Label>
              <Input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                min={18}
                max={99}
                className="bg-background border-white/20 text-white rounded-xl"
                data-testid="profile-age-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-secondary">Year</Label>
              <Select value={formData.year} onValueChange={(v) => setFormData({ ...formData, year: v })}>
                <SelectTrigger className="bg-background border-white/20 text-white rounded-xl" data-testid="profile-year-select">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-background-surface border-white/10">
                  {[1, 2, 3, 4, 5, 6].map(y => (
                    <SelectItem key={y} value={String(y)} className="text-white hover:bg-white/10">Year {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-secondary">I am</Label>
              <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                <SelectTrigger className="bg-background border-white/20 text-white rounded-xl" data-testid="profile-gender-select">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-background-surface border-white/10">
                  <SelectItem value="male" className="text-white hover:bg-white/10">Male</SelectItem>
                  <SelectItem value="female" className="text-white hover:bg-white/10">Female</SelectItem>
                  <SelectItem value="non-binary" className="text-white hover:bg-white/10">Non-binary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-secondary">Looking for</Label>
              <Select value={formData.looking_for} onValueChange={(v) => setFormData({ ...formData, looking_for: v })}>
                <SelectTrigger className="bg-background border-white/20 text-white rounded-xl" data-testid="profile-looking-for-select">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-background-surface border-white/10">
                  <SelectItem value="male" className="text-white hover:bg-white/10">Men</SelectItem>
                  <SelectItem value="female" className="text-white hover:bg-white/10">Women</SelectItem>
                  <SelectItem value="everyone" className="text-white hover:bg-white/10">Everyone</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-secondary">Interests ({formData.interests.length}/8)</Label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(interest => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  data-testid={`profile-interest-${interest.toLowerCase().replace(' ', '-')}`}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                    formData.interests.includes(interest)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full mt-6 rounded-full bg-primary text-primary-foreground py-6 font-medium hover:bg-primary-hover transition-all shadow-gold"
          data-testid="save-profile-btn"
        >
          {loading ? 'Saving...' : <><Save size={18} className="mr-2" /> Save Profile</>}
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
