## ADDED Requirements

### Requirement: Auth Middleware Protection
All API routes (except auth routes) SHALL require valid JWT authentication.

#### Scenario: Request without token
- **WHEN** request to `/api/workflows` does not include accessToken
- **THEN** system returns `401 Unauthorized` with `{ error: "Authentication required" }`

#### Scenario: Request with invalid token
- **WHEN** request to `/api/workflows` includes malformed JWT
- **THEN** system returns `401 Unauthorized` with `{ error: "Invalid token" }`

#### Scenario: Request with expired token
- **WHEN** request to `/api/workflows` includes expired JWT
- **THEN** system returns `401 Unauthorized` with `{ error: "Token expired" }`

#### Scenario: Request with valid token
- **WHEN** request to `/api/workflows` includes valid accessToken
- **THEN** request proceeds to handler
- **AND** handler can access `request.user` with user info

---

### Requirement: Auth Middleware Excludes Public Routes
Auth middleware SHALL NOT block public routes.

#### Scenario: Auth routes are public
- **WHEN** request to `/api/auth/login` is made
- **THEN** request proceeds without authentication
- **AND** no 401 is returned

#### Scenario: Auth routes are public
- **WHEN** request to `/api/auth/register` is made
- **THEN** request proceeds without authentication

#### Scenario: Auth routes are public
- **WHEN** request to `/api/auth/refresh` is made
- **THEN** request proceeds (cookie-based validation happens separately)

---

### Requirement: User ID Injection
The system SHALL inject user ID into request context for protected routes.

#### Scenario: Handler accesses user ID
- **WHEN** authenticated request reaches handler
- **THEN** `request.user.id` contains the user's database ID
- **AND** `request.user.email` contains the user's email

#### Scenario: Workflow creation uses user ID
- **WHEN** authenticated user creates a workflow via `POST /api/workflows`
- **THEN** workflow is associated with the authenticated user
- **AND** other users cannot see this workflow in their list

#### Scenario: Workflow list is filtered by user
- **WHEN** authenticated user requests `GET /api/workflows`
- **THEN** response includes ONLY workflows created by that user
- **AND** other users' workflows are NOT included

---

### Requirement: Frontend Auth State Management
The frontend SHALL maintain authentication state and automatically attach tokens to API requests.

#### Scenario: Store access token on login
- **WHEN** user logs in successfully
- **THEN** authStore stores `accessToken` in memory
- **AND** authStore stores `user` object

#### Scenario: API request includes token
- **WHEN** ApiStorageAdapter makes a request
- **THEN** it includes `Authorization: Bearer <accessToken>` header
- **AND** it includes credentials: 'include' for cookie handling

#### Scenario: Token auto-refresh on 401
- **WHEN** API request returns `401 Unauthorized`
- **THEN** system attempts to refresh token via `POST /api/auth/refresh`
- **AND** on success, retries the original request
- **AND** on failure, redirects to login page

#### Scenario: Store clears on logout
- **WHEN** user logs out
- **THEN** authStore clears `accessToken`
- **AND** authStore clears `user` object
- **AND** user is redirected to login page

---

### Requirement: Auth Route Guard
The frontend SHALL protect routes that require authentication.

#### Scenario: Unauthenticated user visits protected route
- **WHEN** user navigates to `/editor` without being logged in
- **THEN** user is redirected to `/login`
- **AND** URL is preserved for post-login redirect

#### Scenario: Authenticated user visits login page
- **WHEN** user navigates to `/login` while already authenticated
- **THEN** user is redirected to `/editor`

#### Scenario: Auth check is automatic
- **WHEN** app initializes
- **THEN** system checks for existing token in authStore
- **AND** if valid, user stays logged in
- **AND** if expired, attempts refresh
- **AND** if refresh fails, clears auth state
