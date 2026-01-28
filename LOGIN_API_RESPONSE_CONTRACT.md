# Login API Response Structure - JSON Contract

## Endpoint
`POST /auth/login/context`

## Response Structure

```json
{
  "access_token": "string",
  "token_type": "bearer",
  "user": {
    "id": 0,
    "email": "string",
    "full_name": "string",
    "role": "user|admin",
    "tenant_id": 0,
    "phone_number": "string",
    "is_active": true
  },
  "roles": [
    "string"
  ],
  "menus": [
    {
      "id": 0,
      "name": "string",
      "path": "string",
      "icon": "string",
      "sort_order": 0,
      "level": 1,
      "features": [
        {
          "code": "string",
          "name": "string",
          "category": "string"
        }
      ],
      "children": [
        {
          "id": 0,
          "name": "string",
          "path": "string",
          "icon": "string",
          "sort_order": 0,
          "level": 2,
          "features": [
            {
              "code": "string",
              "name": "string",
              "category": "string"
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Field Descriptions

### Root Level

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `access_token` | string | Yes | JWT token for authentication |
| `token_type` | string | Yes | Token type, always "bearer" |
| `user` | object | Yes | User profile information |
| `roles` | array[string] | Yes | List of role codes assigned to user |
| `menus` | array[MenuNode] | Yes | Hierarchical menu structure (2 levels) |

---

### User Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | User ID |
| `email` | string (email) | Yes | User email address |
| `full_name` | string | Yes | User's full name |
| `role` | string (enum) | Yes | Legacy role: "user" or "admin" |
| `tenant_id` | integer \| null | No | Tenant ID (null if not assigned) |
| `phone_number` | string \| null | No | User's phone number (null if not set) |
| `is_active` | boolean | Yes | Whether user account is active |

---

### MenuNode Object (Level 1 - Parent)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Menu ID |
| `name` | string | Yes | Menu display name |
| `path` | string \| null | No | Route path (e.g., "/users") |
| `icon` | string \| null | No | Icon identifier/class |
| `sort_order` | integer | Yes | Display order (lower = first) |
| `level` | integer | Yes | Menu level (1 for parent) |
| `features` | array[Feature] | Yes | Features/permissions for this menu |
| `children` | array[MenuNode] | Yes | Child menus (level 2), empty array if none |

---

### MenuNode Object (Level 2 - Child)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Menu ID |
| `name` | string | Yes | Menu display name |
| `path` | string \| null | No | Route path (e.g., "/users/list") |
| `icon` | string \| null | No | Icon identifier/class |
| `sort_order` | integer | Yes | Display order (lower = first) |
| `level` | integer | Yes | Menu level (2 for child) |
| `features` | array[Feature] | Yes | Features/permissions for this menu |

**Note:** Level 2 menus do NOT have `children` array (2-level hierarchy only).

---

### Feature Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | Yes | Feature code (e.g., "USER_VIEW", "USER_EDIT") |
| `name` | string | Yes | Feature display name |
| `category` | string \| null | No | Feature category (e.g., "USER", "ORDER") |

---

## Example Response

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDA0IiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJleHAiOjE3NjkwMDAwMDB9.signature",
  "token_type": "bearer",
  "user": {
    "id": 1004,
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user",
    "tenant_id": 1,
    "phone_number": "+1234567890",
    "is_active": true
  },
  "roles": [
    "ADMIN",
    "USER_MANAGER"
  ],
  "menus": [
    {
      "id": 1,
      "name": "User Management",
      "path": "/users",
      "icon": "users",
      "sort_order": 1,
      "level": 1,
      "features": [
        {
          "code": "USER_VIEW",
          "name": "View Users",
          "category": "USER"
        },
        {
          "code": "USER_EDIT",
          "name": "Edit Users",
          "category": "USER"
        }
      ],
      "children": [
        {
          "id": 2,
          "name": "User List",
          "path": "/users/list",
          "icon": "list",
          "sort_order": 1,
          "level": 2,
          "features": [
            {
              "code": "USER_VIEW",
              "name": "View Users",
              "category": "USER"
            }
          ]
        },
        {
          "id": 3,
          "name": "Create User",
          "path": "/users/create",
          "icon": "plus",
          "sort_order": 2,
          "level": 2,
          "features": [
            {
              "code": "USER_CREATE",
              "name": "Create Users",
              "category": "USER"
            }
          ]
        }
      ]
    },
    {
      "id": 4,
      "name": "Settings",
      "path": "/settings",
      "icon": "settings",
      "sort_order": 2,
      "level": 1,
      "features": [
        {
          "code": "SETTINGS_VIEW",
          "name": "View Settings",
          "category": "SETTINGS"
        }
      ],
      "children": []
    }
  ]
}
```

---

## Response Rules

1. **Menus are sorted** by `sort_order` (ascending) at each level
2. **Level 1 menus** always have a `children` array (may be empty)
3. **Level 2 menus** never have a `children` array (2-level hierarchy only)
4. **Features array** may be empty if no features are assigned to a menu
5. **Roles array** contains role codes (strings), not role objects
6. **Features per menu** represent permissions available for that specific menu item
7. **User profile** includes all user information including tenant and phone
8. **JWT token** is valid for the configured expiration time

---

## Error Responses

### 401 Unauthorized - Invalid Credentials
```json
{
  "detail": "Invalid email or password"
}
```

### 422 Validation Error - Invalid Request
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## Notes

- **Features per menu**: Each menu item (both level 1 and level 2) includes only the features/permissions that are relevant to that specific menu item
- **Menu hierarchy**: Strictly 2 levels - parent menus (level 1) contain child menus (level 2)
- **Role codes**: The `roles` array contains role codes (e.g., "SUPER_ADMIN", "ADMIN", "USER") as strings
- **Empty arrays**: If user has no roles, `roles` will be `[]`. If a menu has no children, `children` will be `[]`
- **Null values**: Optional fields like `path`, `icon`, `phone_number`, `tenant_id` may be `null` if not set
