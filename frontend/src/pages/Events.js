import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Calendar, MapPin, Users, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import BottomNav from '../components/BottomNav';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [colleges, setColleges] = useState([]);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
    college: '',
    image_url: ''
  });

  useEffect(() => {
    fetchEvents();
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      const { data } = await axios.get(`${API}/colleges`);
      setColleges(data);
    } catch (err) {
      console.error('Failed to fetch colleges');
    }
  };

  const fetchEvents = async () => {
    try {
      const { data } = await axios.get(`${API}/events`, { withCredentials: true });
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async () => {
    if (!newEvent.title || !newEvent.location || !newEvent.date) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      await axios.post(`${API}/events`, newEvent, { withCredentials: true });
      toast.success('Event created!');
      setShowCreate(false);
      setNewEvent({ title: '', description: '', location: '', date: '', college: '', image_url: '' });
      fetchEvents();
    } catch (err) {
      toast.error('Failed to create event');
    }
  };

  const toggleAttendance = async (eventId) => {
    try {
      const { data } = await axios.post(`${API}/events/${eventId}/attend`, {}, { withCredentials: true });
      toast.success(data.attending ? 'You\'re going!' : 'Removed from event');
      fetchEvents();
    } catch (err) {
      toast.error('Failed to update attendance');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-safe">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-secondary">Loading events...</p>
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
            <Calendar className="w-6 h-6 text-primary" strokeWidth={1.5} />
            <h1 className="text-2xl font-heading text-white">Events</h1>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button
                size="icon"
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary-hover"
                data-testid="create-event-btn"
              >
                <Plus size={20} />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-background-surface border-white/10 text-white max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl">Create Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-secondary">Title *</Label>
                  <Input
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="e.g., Formal Hall Dinner"
                    className="bg-background border-white/20 text-white"
                    data-testid="event-title-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-secondary">Description</Label>
                  <Textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Describe your event..."
                    className="bg-background border-white/20 text-white min-h-[80px]"
                    data-testid="event-description-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-secondary">Location *</Label>
                  <Input
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder="e.g., Balliol College Hall"
                    className="bg-background border-white/20 text-white"
                    data-testid="event-location-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-secondary">Date & Time *</Label>
                  <Input
                    type="datetime-local"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="bg-background border-white/20 text-white"
                    data-testid="event-date-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-secondary">College</Label>
                  <Select value={newEvent.college} onValueChange={(v) => setNewEvent({ ...newEvent, college: v })}>
                    <SelectTrigger className="bg-background border-white/20 text-white" data-testid="event-college-select">
                      <SelectValue placeholder="Select college" />
                    </SelectTrigger>
                    <SelectContent className="bg-background-surface border-white/10 max-h-60">
                      {colleges.map(c => (
                        <SelectItem key={c} value={c} className="text-white hover:bg-white/10">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-secondary">Cover Image URL</Label>
                  <Input
                    value={newEvent.image_url}
                    onChange={(e) => setNewEvent({ ...newEvent, image_url: e.target.value })}
                    placeholder="https://..."
                    className="bg-background border-white/20 text-white"
                    data-testid="event-image-input"
                  />
                </div>
                <Button
                  onClick={createEvent}
                  className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary-hover mt-4"
                  data-testid="submit-event-btn"
                >
                  Create Event
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="pt-20 px-6 pb-24">
        {events.length > 0 ? (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="event-card overflow-hidden"
                data-testid={`event-${event.id}`}
              >
                {event.image_url ? (
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="event-card-image"
                  />
                ) : (
                  <div className="event-card-image bg-gradient-to-br from-primary/20 to-accent-oxford/20 flex items-center justify-center">
                    <Calendar className="w-12 h-12 text-primary/50" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-lg font-heading text-white mb-2">{event.title}</h3>
                  {event.description && (
                    <p className="text-secondary text-sm mb-3 line-clamp-2">{event.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(event.date).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {event.location}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-secondary">
                      <Users size={14} />
                      <span>{event.attendees?.length || 0} attending</span>
                    </div>
                    <Button
                      onClick={() => toggleAttendance(event.id)}
                      variant={event.attendees?.includes(user?._id) ? "default" : "outline"}
                      className={`rounded-full text-sm ${
                        event.attendees?.includes(user?._id)
                          ? 'bg-primary text-primary-foreground'
                          : 'border-white/20 text-white hover:bg-white/10'
                      }`}
                      data-testid={`attend-${event.id}`}
                    >
                      {event.attendees?.includes(user?._id) ? "Going" : "Attend"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Calendar className="w-12 h-12 text-muted" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-heading text-white mb-2">No events yet</h3>
            <p className="text-secondary text-sm max-w-xs">
              Be the first to create a social gathering!
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
