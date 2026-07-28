# Google OAuth is the initial login surface

BirdNerd's initial login surface will be Google OAuth through Supabase Auth,
using only basic identity scopes. The app maps the authenticated external
identity to its own User Account and Workspace Membership, which remain the
authorization source; other login methods can be added behind this boundary
later. This avoids password and email-delivery management for the closed
initial pilot.
