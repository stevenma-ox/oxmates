import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ChevronRight, ChevronLeft, Sparkles, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INTERESTS = [
  'Reading', 'Sports', 'Music', 'Art', 'Theatre', 'Cooking', 'Travel', 'Photography',
  'Science', 'Philosophy', 'History', 'Politics', 'Gaming', 'Fitness', 'Dancing',
  'Writing', 'Film', 'Nature', 'Technology', 'Fashion', 'Wine', 'Coffee', 'Rowing',
  'Hiking', 'Chess', 'Debating', 'Volunteering', 'Languages'
];

export default function Onboarding() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [colleges, setColleges] = useState([]);
  const [majors, setMajors] = useState([]);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
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
      console.error('Failed to fetch options:', err);
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

  const handleSubmit = async () => {
    if (!formData.college || !formData.major) {
      toast.error('Please select your college and major');
      return;
    }
    
    setLoading(true);
    try {
      await axios.put(`${API}/profile`, {
        ...formData,
        year: formData.year ? parseInt(formData.year) : null,
        age: formData.age ? parseInt(formData.age) : null
      }, { withCredentials: true });
      updateUser({ profile_complete: true });
      toast.success('Profile complete! Start discovering.');
      navigate('/discover');
    } catch (err) {
      toast.error('Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Sparkles className="w-6 h-6 text-primary" strokeWidth={1.5} />
          <h1 className="text-3xl font-heading text-white">Complete Your Profile</h1>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-all ${s <= step ? 'bg-primary' : 'bg-white/10'}`}
            />
          ))}
        </div>

        <div className="bg-background-surface rounded-2xl p-6 border border-white/10">
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-xl font-heading text-white mb-4">Basic Info</h2>
              
              <div className="space-y-2">
                <Label className="text-secondary">Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your name"
                  data-testid="onboarding-name-input"
                  className="bg-background border-white/20 text-white rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-secondary">Age</Label>
                  <Input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="Age"
                    min={18}
                    max={99}
                    data-testid="onboarding-age-input"
                    className="bg-background border-white/20 text-white rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-secondary">Year</Label>
                  <Select value={formData.year} onValueChange={(v) => setFormData({ ...formData, year: v })}>
                    <SelectTrigger className="bg-background border-white/20 text-white rounded-xl" data-testid="onboarding-year-select">
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
                    <SelectTrigger className="bg-background border-white/20 text-white rounded-xl" data-testid="onboarding-gender-select">
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
                    <SelectTrigger className="bg-background border-white/20 text-white rounded-xl" data-testid="onboarding-looking-for-select">
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
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-xl font-heading text-white mb-4">Oxford Details</h2>
              
              <div className="space-y-2">
                <Label className="text-secondary">College</Label>
                <Select value={formData.college} onValueChange={(v) => setFormData({ ...formData, college: v })}>
                  <SelectTrigger className="bg-background border-white/20 text-white rounded-xl" data-testid="onboarding-college-select">
                    <SelectValue placeholder="Select your college" />
                  </SelectTrigger>
                  <SelectContent className="bg-background-surface border-white/10 max-h-60">
                    {colleges.map(c => (
                      <SelectItem key={c} value={c} className="text-white hover:bg-white/10">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-secondary">Major/Course</Label>
                <Select value={formData.major} onValueChange={(v) => setFormData({ ...formData, major: v })}>
                  <SelectTrigger className="bg-background border-white/20 text-white rounded-xl" data-testid="onboarding-major-select">
                    <SelectValue placeholder="Select your major" />
                  </SelectTrigger>
                  <SelectContent className="bg-background-surface border-white/10 max-h-60">
                    {majors.map(m => (
                      <SelectItem key={m} value={m} className="text-white hover:bg-white/10">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-secondary">Bio</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell others about yourself..."
                  maxLength={300}
                  data-testid="onboarding-bio-input"
                  className="bg-background border-white/20 text-white rounded-xl min-h-[100px] resize-none"
                />
                <p className="text-xs text-muted text-right">{formData.bio.length}/300</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-xl font-heading text-white mb-4">Your Interests</h2>
              <p className="text-secondary text-sm mb-4">Select up to 8 interests</p>
              
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(interest => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    data-testid={`interest-${interest.toLowerCase().replace(' ', '-')}`}
                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                      formData.interests.includes(interest)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              
              <p className="text-xs text-muted">{formData.interests.length}/8 selected</p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-xl font-heading text-white mb-4">Add Photos</h2>
              <p className="text-secondary text-sm mb-4">Add up to 6 photos to your profile</p>
              
              <div className="grid grid-cols-3 gap-3">
                {formData.photos.map((photo, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-white/10">
                    <img
                      src={photo.startsWith('http') ? photo : `${API}/files/${photo}`}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
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
                    <Upload className="w-6 h-6 text-muted mb-1" />
                    <span className="text-xs text-muted">Add photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      data-testid="photo-upload-input"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <Button
                onClick={prevStep}
                variant="ghost"
                className="text-white hover:bg-white/10"
                data-testid="onboarding-prev-btn"
              >
                <ChevronLeft size={20} /> Back
              </Button>
            ) : <div />}
            
            {step < 4 ? (
              <Button
                onClick={nextStep}
                className="bg-primary text-primary-foreground hover:bg-primary-hover rounded-full px-6"
                data-testid="onboarding-next-btn"
              >
                Next <ChevronRight size={20} />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading || !formData.college || !formData.major}
                className="bg-primary text-primary-foreground hover:bg-primary-hover rounded-full px-8 shadow-gold"
                data-testid="onboarding-complete-btn"
              >
                {loading ? 'Saving...' : 'Complete Profile'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
