import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { ArrowLeft, Send, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Chat() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [matchUser, setMatchUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [generatingIcebreaker, setGeneratingIcebreaker] = useState(false);
  const [icebreakers, setIcebreakers] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchChat();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [matchId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChat = async () => {
    try {
      const [messagesRes, matchesRes] = await Promise.all([
        axios.get(`${API}/messages/${matchId}`, { withCredentials: true }),
        axios.get(`${API}/matches`, { withCredentials: true })
      ]);
      
      setMessages(messagesRes.data);
      const match = matchesRes.data.find(m => m.match_id === matchId);
      if (match) {
        setMatchUser(match.user);
      }
    } catch (err) {
      toast.error('Failed to load chat');
      navigate('/matches');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data } = await axios.get(`${API}/messages/${matchId}`, { withCredentials: true });
      setMessages(data);
    } catch (err) {
      console.error('Failed to fetch messages');
    }
  };

  const sendMessage = async (content) => {
    if (!content.trim()) return;
    
    setSending(true);
    try {
      await axios.post(`${API}/messages`, {
        match_id: matchId,
        content: content.trim()
      }, { withCredentials: true });
      
      setNewMessage('');
      setIcebreakers([]);
      fetchMessages();
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const generateIcebreaker = async () => {
    setGeneratingIcebreaker(true);
    try {
      const { data } = await axios.post(`${API}/ai/icebreaker`, {
        match_id: matchId
      }, { withCredentials: true });
      setIcebreakers(data.icebreakers);
    } catch (err) {
      toast.error('Failed to generate icebreakers');
    } finally {
      setGeneratingIcebreaker(false);
    }
  };

  const getPhotoUrl = (photos) => {
    if (!photos || photos.length === 0) return null;
    const photo = photos[0];
    return photo.startsWith('http') ? photo : `${API}/files/${photo}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Sparkles className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 glass border-b border-white/10">
        <div className="flex items-center gap-4 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/matches')}
            className="text-white hover:bg-white/10"
            data-testid="back-btn"
          >
            <ArrowLeft size={24} strokeWidth={1.5} />
          </Button>
          
          <Avatar className="w-10 h-10 border border-primary/30">
            <AvatarImage src={getPhotoUrl(matchUser?.photos)} alt={matchUser?.name} />
            <AvatarFallback className="bg-background text-white">
              {matchUser?.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h2 className="text-white font-medium">{matchUser?.name}</h2>
            <p className="text-secondary text-xs">{matchUser?.college}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pt-20 pb-32 px-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-lg font-heading text-white mb-2">Start the conversation!</h3>
            <p className="text-secondary text-sm mb-6 max-w-xs">
              You matched with {matchUser?.name}. Say something memorable!
            </p>
            <Button
              onClick={generateIcebreaker}
              disabled={generatingIcebreaker}
              className="rounded-full bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
              data-testid="generate-icebreaker-btn"
            >
              {generatingIcebreaker ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate AI Icebreaker
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const myId = user._id || user.id;
              const isMine = msg.sender_id === myId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-3 ${
                      isMine ? 'message-sent' : 'message-received'
                    }`}
                    data-testid={`message-${msg.id}`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-xs mt-1 ${isMine ? 'text-black/50' : 'text-white/50'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Icebreaker suggestions */}
        {icebreakers.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-xs text-muted text-center mb-3">AI-generated icebreakers</p>
            {icebreakers.map((icebreaker, i) => (
              <button
                key={i}
                onClick={() => {
                  setNewMessage(icebreaker);
                  setIcebreakers([]);
                }}
                className="w-full p-3 rounded-xl bg-white/5 text-left text-sm text-white hover:bg-white/10 transition-colors border border-white/10"
                data-testid={`icebreaker-${i}`}
              >
                {icebreaker}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="fixed bottom-0 left-0 right-0 glass border-t border-white/10 p-4">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={generateIcebreaker}
            disabled={generatingIcebreaker}
            className="text-primary hover:bg-primary/10 shrink-0"
            data-testid="icebreaker-btn"
          >
            {generatingIcebreaker ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </Button>
          
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === 'Enter' && !sending && sendMessage(newMessage)}
            className="flex-1 bg-white/5 border-white/10 text-white rounded-full px-4"
            data-testid="message-input"
          />
          
          <Button
            onClick={() => sendMessage(newMessage)}
            disabled={!newMessage.trim() || sending}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary-hover shrink-0"
            size="icon"
            data-testid="send-message-btn"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
