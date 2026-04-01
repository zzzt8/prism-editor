## ADDED Requirements

### Requirement: User Registration
The system SHALL allow users to register with email and password.

#### Scenario: Successful registration
- **WHEN** user submits valid email and password via `POST /api/auth/register`
- **THEN** system creates a new User record with hashed password
- **AND** returns `201 Created` with user object (id, email, name)
- **AND** does NOT return password hash

#### Scenario: Registration with duplicate email
- **WHEN** user submits email that already exists
- **THEN** system returns `409 Conflict` with `{ error: "Email already registered" }`
- **AND** no new user is created

#### Scenario: Registration with invalid email
- **WHEN** user submits invalid email format
- **THEN** system returns `400 Bad Request` with validation error
- **AND** no user is created

#### Scenario: Registration with weak password
- **WHEN** user submits password shorter than 8 characters
- **THEN** system returns `400 Bad Request` with `{ error: "Password must be at least 8 characters" }`
- **AND** no user is created

#### Scenario: Registration with missing fields
- **WHEN** user submits request missing email or password
- **THEN** system returns `400 Bad Request` with validation errors
- **AND** no user is created

---

### Requirement: Password Hashing
The system SHALL hash passwords using bcrypt before storing.

#### Scenario: Password is hashed on registration
- **WHEN** user registers with password "secure123"
- **THEN** stored password is NOT "secure123"
- **AND** stored password is a valid bcrypt hash
- **AND** hash cost factor is 12

#### Scenario: Hash verification succeeds with correct password
- **WHEN** bcrypt.compare("secure123", storedHash) is called
- **THEN** returns `true`

#### Scenario: Hash verification fails with wrong password
- **WHEN** bcrypt.compare("wrongpassword", storedHash) is called
- **THEN** returns `false`

---

### Requirement: User Data Privacy
The system SHALL never return password hashes in API responses.

#### Scenario: Registration response excludes password
- **WHEN** user registers successfully
- **THEN** response does NOT include passwordHash field
- **AND** response does NOT include password field

#### Scenario: GET /api/auth/me excludes password
- **WHEN** authenticated user requests their profile
- **THEN** response does NOT include passwordHash field
