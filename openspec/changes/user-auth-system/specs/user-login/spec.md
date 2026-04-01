## ADDED Requirements

### Requirement: User Login
The system SHALL authenticate users with email and password, returning JWT tokens.

#### Scenario: Successful login
- **WHEN** user submits valid email and password via `POST /api/auth/login`
- **THEN** system verifies credentials against stored hash
- **AND** returns `200 OK` with user object
- **AND** sets httpOnly cookie with refreshToken
- **AND** response body includes accessToken (for API calls)

#### Scenario: Login with wrong password
- **WHEN** user submits correct email but wrong password
- **THEN** system returns `401 Unauthorized` with `{ error: "Invalid credentials" }`
- **AND** no token is issued

#### Scenario: Login with non-existent email
- **WHEN** user submits email that does not exist
- **THEN** system returns `401 Unauthorized` with `{ error: "Invalid credentials" }`
- **AND** no token is issued (prevents user enumeration)

#### Scenario: Login sets Refresh Token cookie
- **WHEN** user logs in successfully
- **THEN** response includes `Set-Cookie: refreshToken=<token>`
- **AND** cookie has `HttpOnly` flag
- **AND** cookie has `Secure` flag (in production)
- **AND** cookie has `SameSite=Strict`

---

### Requirement: JWT Token Structure
The system SHALL use JWT for access tokens with appropriate claims.

#### Scenario: Access token payload
- **WHEN** access token is issued
- **THEN** payload contains `sub` (user id)
- **AND** payload contains `email`
- **AND** payload contains `iat` (issued at)
- **AND** payload contains `exp` (expires in 15 minutes)

#### Scenario: Access token signing
- **WHEN** access token is created
- **THEN** it is signed with `HS256` algorithm
- **AND** secret is from `JWT_SECRET` environment variable

#### Scenario: Access token is short-lived
- **WHEN** access token is created
- **THEN** it expires in 15 minutes
- **AND** after expiration, it cannot be used for API requests

---

### Requirement: Token Refresh
The system SHALL allow refreshing expired access tokens using refresh tokens.

#### Scenario: Successful token refresh
- **WHEN** user sends `POST /api/auth/refresh` with valid refreshToken cookie
- **THEN** system validates refresh token
- **AND** issues new accessToken
- **AND** issues new refreshToken (token rotation)
- **AND** returns `200 OK` with user object
- **AND** sets new httpOnly cookie

#### Scenario: Refresh with expired token
- **WHEN** refresh token has expired
- **THEN** system returns `401 Unauthorized` with `{ error: "Refresh token expired" }`
- **AND** user must log in again

#### Scenario: Refresh without token
- **WHEN** user sends `POST /api/auth/refresh` without refreshToken cookie
- **THEN** system returns `401 Unauthorized` with `{ error: "No refresh token" }`

---

### Requirement: Logout
The system SHALL invalidate refresh tokens on logout.

#### Scenario: Successful logout
- **WHEN** user sends `POST /api/auth/logout` with valid refreshToken cookie
- **THEN** system clears the refreshToken cookie
- **AND** token is added to blacklist (if implemented)
- **AND** returns `200 OK`

#### Scenario: Logout without token
- **WHEN** user sends `POST /api/auth/logout` without refreshToken cookie
- **THEN** system returns `200 OK` (idempotent)
- **AND** clears any existing cookie

---

### Requirement: Get Current User
The system SHALL return current user information for authenticated requests.

#### Scenario: Get current user with valid token
- **WHEN** user sends `GET /api/auth/me` with valid accessToken
- **THEN** system returns `200 OK` with user object (id, email, name)
- **AND** response does NOT include password

#### Scenario: Get current user without token
- **WHEN** user sends `GET /api/auth/me` without accessToken
- **THEN** system returns `401 Unauthorized`
