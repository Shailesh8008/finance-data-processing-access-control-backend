# API Documentation

## Overview

This service is an Express API mounted at the root path `/`.

- Content type: `application/json`
- Authentication: cookie-based JWT using the `token` cookie
- Default port: `5000` unless `PORT` is provided
- CORS: allows the frontend origin from `FRONTEND_URL` with credentials enabled

## Authentication

Protected routes require the `token` cookie set by `POST /login`.

Auth middleware behavior:

- Missing token returns `404` with `{ "role": "guest", "message": "No token provided (Please login)" }`
- Invalid or expired token returns `403` with `{ "message": "Token is invalid or expired (Please re-login)" }`
- Admin-only routes also require `req.user.role === "admin"`
- Failing admin auth returns `401` with `{ "message": "Unauthorized (Please login as admin)" }`

## Data Shapes

### User

```json
{
  "id": "<mongo-id>",
  "username": "john",
  "email": "john@example.com",
  "lastSeen": "2026-04-06T12:00:00.000Z",
  "status": "active"
}
```

### Authenticated User Payload

```json
{
  "id": "<mongo-id>",
  "email": "john@example.com",
  "role": "user"
}
```

### Record

```json
{
  "id": "<mongo-id>",
  "userId": "<mongo-id>",
  "amount": 1500,
  "type": "income",
  "date": "2026-04-06T00:00:00.000Z",
  "category": "salary",
  "description": "Monthly salary",
  "createdBy": "<mongo-id>"
}
```

### Summary

```json
{
  "totalIncome": 5000,
  "totalExpense": 1200,
  "netBalance": 3800,
  "categoryWise": [
    { "category": "salary", "total": 5000 },
    { "category": "food", "total": 200 }
  ],
  "RecentActivity": [
    {
      "_id": "<mongo-id>",
      "userId": "<mongo-id>",
      "amount": 200,
      "type": "expense",
      "category": "food",
      "date": "2026-04-06T00:00:00.000Z",
      "description": "Lunch",
      "createdBy": "<mongo-id>"
    }
  ],
  "monthlyTrends": [{ "month": "Apr", "total": 5200 }],
  "weeklyTrends": [{ "week": 14, "total": 900 }],
  "yearlyTrends": [{ "year": 2026, "total": 5200 }]
}
```

## Endpoints

### Health

#### `GET /health`

Health check endpoint.

Response:

```json
{
  "ok": "true"
}
```

### User Auth

#### `POST /register`

Registers a new user with role `user`.

Request body:

```json
{
  "username": "john",
  "email": "john@example.com",
  "password": "secret123"
}
```

Success response: `201 Created`

```json
{
  "message": "User registered successfully"
}
```

Possible errors:

- `400` if `username`, `email`, or `password` is missing
- `409` if the email already exists
- `500` on server error

#### `POST /login`

Authenticates a user and sets the `token` HTTP-only cookie.

Request body:

```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

Success response: `200 OK`

```json
{
  "message": "Login Successfully!",
  "user": {
    "id": "<mongo-id>",
    "email": "john@example.com",
    "role": "user"
  }
}
```

For admin users, the message becomes:

```json
{
  "message": "Welcome Admin!"
}
```

Cookie details:

- Name: `token`
- `httpOnly: true`
- `secure: true` only when `ENV === "production"`
- `sameSite: "none"` in production, otherwise `"lax"`
- `maxAge: 7 days`

Possible errors:

- `400` if email or password is missing
- `404` if email is not found
- `401` if password is invalid
- `500` if `JWT_SECRET_KEY` is missing or another server error occurs

#### `POST /logout`

Requires authentication. Clears the auth cookie and marks the user as inactive.

Success response:

```json
{
  "message": "Logged out successfully!"
}
```

### Current User

#### `GET /current-user`

Requires authentication.

Returns the decoded JWT payload attached by the auth middleware.

Response:

```json
{
  "user": {
    "id": "<mongo-id>",
    "email": "john@example.com",
    "role": "user"
  }
}
```

### Record Access For Users

#### `GET /record/:recordId`

Requires authentication.

Returns a single record by id.

Path params:

- `recordId`: 24-character MongoDB ObjectId string

Response:

```json
{
  "record": {
    "id": "<mongo-id>",
    "userId": "<mongo-id>",
    "amount": 1500,
    "type": "income",
    "date": "2026-04-06T00:00:00.000Z",
    "category": "salary",
    "description": "Monthly salary",
    "createdBy": "<mongo-id>"
  }
}
```

Possible errors:

- `400` if `recordId` length is not 24
- `404` if the record does not exist
- `500` on server error

#### `GET /my-records`

Requires authentication.

Returns all records for the logged-in user, sorted by newest first.

Supported query params:

- `page`: intended page number, default `1`
- `limit`: intended page size, default `10`, max `100`

Response:

```json
{
  "records": [
    {
      "id": "<mongo-id>",
      "amount": 1500,
      "type": "income",
      "date": "2026-04-06T00:00:00.000Z",
      "category": "salary",
      "description": "Monthly salary",
      "createdBy": "<mongo-id>"
    }
  ]
}
```

Possible errors:

- `404` if no records are found for the authenticated user
- `500` on server error

Implementation note:

- The current code calculates `page` and `limit`, but appends pagination objects to the returned array instead of applying them in MongoDB. Consumers should expect the full record list plus two extra objects until this logic is corrected.

#### `GET /my-summary`

Requires authentication.

Returns the saved summary document for the logged-in user.

Response:

```json
{
  "summary": {
    "totalIncome": 5000,
    "totalExpense": 1200,
    "netBalance": 3800,
    "categoryWise": [],
    "RecentActivity": [],
    "monthlyTrends": [],
    "weeklyTrends": [],
    "yearlyTrends": []
  }
}
```

Possible errors:

- `404` if no summary exists for the authenticated user
- `500` on server error

### Admin Endpoints

All endpoints in this section require both authentication and admin role.

#### `GET /users`

Returns all users with role `user`.

Response:

```json
{
  "users": [
    {
      "id": "<mongo-id>",
      "username": "john",
      "email": "john@example.com",
      "lastSeen": "2026-04-06T12:00:00.000Z",
      "status": "active"
    }
  ]
}
```

#### `GET /admins`

Returns all users with role `admin`.

Response:

```json
{
  "admins": [
    {
      "id": "<mongo-id>",
      "username": "admin",
      "email": "admin@example.com",
      "lastSeen": "2026-04-06T12:00:00.000Z",
      "status": "active"
    }
  ]
}
```

#### `GET /records`

Returns records across all users, sorted by newest first.

Supported query params:

- `date`: `YYYY-MM-DD`
- `type`: record type string
- `category`: category string
- `page`: intended page number, default `1`
- `limit`: intended page size, default `10`, max `100`

Filtering behavior:

- `date` filters records between the start and end of the provided day
- `type` and `category` are exact string matches

Response:

```json
{
  "records": [
    {
      "id": "<mongo-id>",
      "userId": "<mongo-id>",
      "amount": 250,
      "type": "expense",
      "date": "2026-04-06T00:00:00.000Z",
      "category": "food",
      "description": "Lunch",
      "createdBy": "<mongo-id>"
    }
  ]
}
```

Possible errors:

- `400` if `date` is not a valid `YYYY-MM-DD`
- `500` on server error

Implementation note:

- As with `GET /my-records`, pagination is not currently applied correctly. The code appends `{ "$skip": ... }` and `{ "$limit": ... }` objects into the response array.

#### `POST /create-record`

Creates a record for a user and triggers summary regeneration.

Request body:

```json
{
  "userId": "<mongo-id>",
  "amount": 1500,
  "type": "income",
  "date": "2026-04-06",
  "category": "salary",
  "description": "Monthly salary"
}
```

Required fields according to the controller:

- `userId`
- `amount`
- `type`
- `category`
- `description`

Notes:

- The error message says `date` is required, but the implementation only validates `date` when it is provided
- `userId` must be 24 characters long
- `date`, if provided, must be in `YYYY-MM-DD` format
- `createdBy` is set from the authenticated admin id

Success response: `201 Created`

```json
{
  "message": "Record created successfully!"
}
```

Possible errors:

- `400` for missing required fields
- `400` for invalid `userId` length
- `400` for invalid date format
- `404` if the target user does not exist
- `500` on server error

#### `POST /update-record/:id`

Updates a record by id.

Path params:

- `id`: 24-character MongoDB ObjectId string

Request body:

```json
{
  "amount": 1800,
  "type": "income",
  "date": "2026-04-07T00:00:00.000Z",
  "category": "salary",
  "description": "Adjusted salary",
  "userId": "<mongo-id>"
}
```

Behavior:

- Any provided field among `amount`, `type`, `date`, `category`, `description`, `userId` is updated
- `createdBy` is overwritten with the authenticated admin id
- Returns `201` on success

Success response:

```json
{
  "message": "Record updated successfully!"
}
```

Possible errors:

- `400` if the path id length is not 24
- `400` if the body is missing
- `404` if the record does not exist
- `500` on server error

Implementation note:

- Summary regeneration uses `createOrUpdateSummary(userId, record)`. If `userId` is omitted from the request body, the function receives `undefined`, which may leave summary data inconsistent.

#### `DELETE /delete-record/:id`

Deletes a record by id.

Path params:

- `id`: 24-character MongoDB ObjectId string

Success response:

```json
{
  "message": "Deleted Successfully!"
}
```

Possible errors:

- `400` if the path id length is not 24
- `404` if the record does not exist
- `500` on server error

Implementation note:

- Deleting a record does not trigger summary regeneration.

#### `GET /summary/:userId`

Returns the saved summary for a specific user.

Path params:

- `userId`: 24-character MongoDB ObjectId string

Response:

```json
{
  "summary": {
    "totalIncome": 5000,
    "totalExpense": 1200,
    "netBalance": 3800,
    "categoryWise": [],
    "RecentActivity": [],
    "monthlyTrends": [],
    "weeklyTrends": [],
    "yearlyTrends": []
  }
}
```

Possible errors:

- `400` if `userId` length is not 24
- `404` if no summary exists for that user
- `500` on server error

## Summary Generation Rules

Summary documents are created or updated when an admin creates a record and are intended to update when an admin updates a record.

Computed fields:

- `totalIncome`: sum of record amounts where `type === "income"`
- `totalExpense`: sum of record amounts where `type === "expense"`
- `netBalance`: `totalIncome - totalExpense`
- `categoryWise`: totals grouped by category
- `RecentActivity`: 3 most recent records by `date`
- `monthlyTrends`: totals grouped by month abbreviation, such as `Jan`, `Feb`, `Mar`
- `weeklyTrends`: totals grouped by week number
- `yearlyTrends`: totals grouped by year

## Environment Variables

The current code depends on these environment variables:

- `PORT`: API port, optional
- `FRONTEND_URL`: allowed CORS origin
- `JWT_SECRET_KEY`: secret used to sign and verify JWTs
- `ENV`: affects cookie `secure` and `sameSite` behavior
