# Scholars - Oxford Dating App PRD

## Original Problem Statement
Build a dating app inclusive of Oxford students. These students are usually with colleges and majors.

## User Choices
- Authentication: University email validation (.ox.ac.uk)
- Matching: Algorithm-based + swipe
- Chat: Real-time messaging for matches
- Features: All (profiles, filters, events)
- AI: Claude Sonnet 4.5 for icebreakers

## User Personas
1. **Oxford Student** - Undergraduate/graduate seeking to meet other Oxford students
2. **Event Organizer** - Student creating social gatherings
3. **Admin** - Platform administrator

## Core Requirements (Static)
- Oxford email validation (.ox.ac.uk)
- Profile creation with photos, college, major, interests
- Swipe-based matching with algorithm recommendations
- Real-time chat between matched users
- AI-powered icebreaker suggestions
- Events/social gatherings feature
- Filters by college, major, year

## What's Been Implemented (2026-03-29)
### Backend (FastAPI + MongoDB)
- ✅ JWT authentication with httpOnly cookies
- ✅ Oxford email validation
- ✅ User profile CRUD
- ✅ Photo upload to Emergent Object Storage
- ✅ Swipe/match system
- ✅ Chat messaging
- ✅ AI icebreakers (Claude Sonnet 4.5)
- ✅ Events CRUD
- ✅ College/major filters
- ✅ Demo users seeded

### Frontend (React + Tailwind + Shadcn)
- ✅ Dark academia luxury theme
- ✅ Login/Register with email validation
- ✅ Multi-step onboarding
- ✅ Swipeable profile cards (framer-motion)
- ✅ Matches list
- ✅ Chat with AI icebreaker generation
- ✅ Events page
- ✅ Profile editing
- ✅ Bottom navigation

## Prioritized Backlog
### P0 (Critical) - Done
- User authentication ✅
- Profile creation ✅
- Swipe matching ✅
- Chat messaging ✅

### P1 (High Priority) - Pending
- Push notifications for new matches/messages
- Real-time WebSocket chat
- Profile verification system
- Report/block users

### P2 (Medium Priority) - Pending
- Super likes feature
- Profile boost
- Read receipts in chat
- Typing indicators

## Next Tasks
1. Add WebSocket for real-time chat updates
2. Implement push notifications
3. Add profile verification badges
4. Add report/block functionality
5. Implement super likes with daily limit
