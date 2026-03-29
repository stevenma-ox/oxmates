import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, formatApiErrorDetail } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Sparkles, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const isOxfordEmail = email.toLowerCase().endsWith('@ox.ac.uk') || email.toLowerCase().endsWith('.ox.ac.uk');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOxfordEmail) {
      toast.error('Please use your Oxford University email (@ox.ac.uk)');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name);
      toast.success('Account created! Let\'s set up your profile.');
      navigate('/onboarding');
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen auth-background flex items-center justify-center p-6">
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-primary" strokeWidth={1.5} />
            <h1 className="text-5xl font-heading text-white tracking-tight">Scholars</h1>
          </div>
          <p className="text-secondary text-lg font-light">Join the exclusive Oxford dating community</p>
        </div>

        <div className="bg-background-surface/80 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-2xl font-heading text-white mb-6 text-center">Create Account</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-secondary text-sm">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                data-testid="register-name-input"
                className="bg-background border-white/20 text-white placeholder:text-white/30 focus:border-primary rounded-xl py-3"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-secondary text-sm">Oxford Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@ox.ac.uk"
                  required
                  data-testid="register-email-input"
                  className={`bg-background border-white/20 text-white placeholder:text-white/30 focus:border-primary rounded-xl py-3 pr-10 ${isOxfordEmail ? 'border-green-500' : ''}`}
                />
                {isOxfordEmail && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 w-5 h-5" />
                )}
              </div>
              <p className="text-xs text-muted">Must be an @ox.ac.uk email address</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-secondary text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  data-testid="register-password-input"
                  className="bg-background border-white/20 text-white placeholder:text-white/30 focus:border-primary rounded-xl py-3 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                  data-testid="toggle-password-visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-muted">Minimum 6 characters</p>
            </div>

            <Button
              type="submit"
              disabled={loading || !isOxfordEmail}
              data-testid="register-submit-btn"
              className="w-full rounded-full bg-primary text-primary-foreground py-6 font-medium hover:bg-primary-hover transition-all shadow-gold disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center mt-6 text-secondary text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-primary-hover transition-colors" data-testid="login-link">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center mt-6 text-muted text-xs">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
