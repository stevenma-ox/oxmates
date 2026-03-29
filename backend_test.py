import requests
import sys
import json
from datetime import datetime

class OxfordDatingAPITester:
    def __init__(self, base_url="https://oxford-matches.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None
        self.match_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url)
            elif method == 'POST':
                response = self.session.post(url, json=data)
            elif method == 'PUT':
                response = self.session.put(url, json=data)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test("Root API", "GET", "", 200)
        return success

    def test_oxford_email_registration(self):
        """Test registration with Oxford email"""
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@ox.ac.uk"
        success, response = self.run_test(
            "Oxford Email Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": "TestPass123!",
                "name": "Test User"
            }
        )
        if success:
            self.user_id = response.get('id')
        return success

    def test_non_oxford_email_rejection(self):
        """Test that non-Oxford emails are rejected"""
        success, response = self.run_test(
            "Non-Oxford Email Rejection",
            "POST",
            "auth/register",
            400,
            data={
                "email": "test@gmail.com",
                "password": "TestPass123!",
                "name": "Test User"
            }
        )
        return success

    def test_demo_user_login(self):
        """Test login with demo user"""
        url = f"{self.base_url}/auth/login"
        
        self.tests_run += 1
        print(f"\n🔍 Testing Demo User Login...")
        
        try:
            response = self.session.post(url, json={
                "email": "emma@ox.ac.uk",
                "password": "demo123"
            })
            
            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                # Debug: Print cookies received
                print(f"   Cookies received: {dict(response.cookies)}")
                print(f"   Session cookies: {dict(self.session.cookies)}")
                try:
                    response_data = response.json()
                    self.user_id = response_data.get('id')
                    print(f"   Logged in as: {response_data.get('name')} ({response_data.get('email')})")
                    return True
                except:
                    return True
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        success, response = self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data={
                "email": "emma@ox.ac.uk",
                "password": "wrongpassword"
            }
        )
        return success

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_discover_profiles(self):
        """Test discover endpoint"""
        success, response = self.run_test(
            "Discover Profiles",
            "GET",
            "discover",
            200
        )
        return success

    def test_get_colleges(self):
        """Test colleges endpoint"""
        success, response = self.run_test(
            "Get Colleges",
            "GET",
            "colleges",
            200
        )
        return success

    def test_get_majors(self):
        """Test majors endpoint"""
        success, response = self.run_test(
            "Get Majors",
            "GET",
            "majors",
            200
        )
        return success

    def test_swipe_functionality(self):
        """Test swiping on profiles"""
        # First get profiles to swipe on
        success, profiles = self.run_test("Get Profiles for Swipe", "GET", "discover", 200)
        if not success or not profiles:
            print("❌ No profiles available for swiping test")
            return False
            
        target_user_id = profiles[0]['id']
        success, response = self.run_test(
            "Swipe Like",
            "POST",
            "swipe",
            200,
            data={
                "target_user_id": target_user_id,
                "action": "like"
            }
        )
        return success

    def test_get_matches(self):
        """Test getting matches"""
        success, response = self.run_test(
            "Get Matches",
            "GET",
            "matches",
            200
        )
        if success and response:
            # Store match_id for chat testing
            if len(response) > 0:
                self.match_id = response[0].get('match_id')
        return success

    def test_profile_update(self):
        """Test profile update"""
        success, response = self.run_test(
            "Update Profile",
            "PUT",
            "profile",
            200,
            data={
                "name": "Emma Watson Updated",
                "bio": "Updated bio for testing",
                "college": "Balliol",
                "major": "PPE",
                "year": 3,
                "interests": ["Reading", "Theatre", "Testing"],
                "age": 21,
                "gender": "female",
                "looking_for": "male"
            }
        )
        return success

    def test_events_endpoint(self):
        """Test events functionality"""
        success, response = self.run_test(
            "Get Events",
            "GET",
            "events",
            200
        )
        return success

    def test_create_event(self):
        """Test creating an event"""
        success, response = self.run_test(
            "Create Event",
            "POST",
            "events",
            200,
            data={
                "title": "Test Event",
                "description": "A test event for API testing",
                "location": "Oxford Union",
                "date": "2025-09-01T19:00:00Z",
                "college": "Balliol"
            }
        )
        return success

    def test_ai_icebreaker(self):
        """Test AI icebreaker generation"""
        if not self.match_id:
            print("❌ No match available for icebreaker test")
            return False
            
        success, response = self.run_test(
            "AI Icebreaker",
            "POST",
            "ai/icebreaker",
            200,
            data={
                "match_id": self.match_id
            }
        )
        if success:
            print(f"   Generated icebreakers: {response.get('icebreakers', [])}")
        return success

    def test_logout(self):
        """Test logout"""
        success, response = self.run_test(
            "Logout",
            "POST",
            "auth/logout",
            200
        )
        return success

def main():
    print("🚀 Starting Oxford Dating App API Tests")
    print("=" * 50)
    
    tester = OxfordDatingAPITester()
    
    # Test sequence
    tests = [
        tester.test_root_endpoint,
        tester.test_non_oxford_email_rejection,
        tester.test_oxford_email_registration,
        tester.test_demo_user_login,
        tester.test_invalid_login,
        tester.test_get_current_user,
        tester.test_get_colleges,
        tester.test_get_majors,
        tester.test_discover_profiles,
        tester.test_swipe_functionality,
        tester.test_get_matches,
        tester.test_profile_update,
        tester.test_events_endpoint,
        tester.test_create_event,
        tester.test_ai_icebreaker,
        tester.test_logout
    ]
    
    failed_tests = []
    
    for test in tests:
        try:
            if not test():
                failed_tests.append(test.__name__)
        except Exception as e:
            print(f"❌ {test.__name__} crashed: {str(e)}")
            failed_tests.append(test.__name__)
    
    # Print summary
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if failed_tests:
        print(f"❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print("✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())