# Activity Gallery API Documentation

Module: **Activity Management**  
Feature: **Photo / Video Gallery**  
Menu path (RBAC): `/activity-management/photo-video-gallery`

Base URL prefix: `/api/activity-galleries`

All endpoints require authentication unless noted. Admin and Teacher flows use menu-path RBAC. Parent/student access is scoped to published galleries mapped to the child's class and division.

---

## 1. List Activity Galleries

| | |
|---|---|
| **API Name** | List Activity Galleries |
| **Endpoint** | `GET /api/activity-galleries` |
| **HTTP Method** | GET |
| **Description** | Returns paginated gallery records ordered by `updated_at` descending. Photo tab uses `gallery_type=Photo`; Video tab uses `gallery_type=Video`. Parents see only published galleries for their child's class/division. Teachers see galleries for assigned class/division. Admins see all galleries. |

**Query parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | int | Zero-based page index (default `0`) |
| `size` | int | Page size (default `10`, max `100`) |
| `search` | string | Filter by gallery name |
| `gallery_type` | string | `Photo` or `Video` |

**Sample response**

```json
{
  "data": [
    {
      "id": 1,
      "tenant_id": 10,
      "gallery_name": "Annual Sports Day 2026",
      "gallery_type": "Photo",
      "activity_date": "2026-06-10",
      "description": "Sports Day Celebration",
      "is_published": true,
      "created_at": "2026-06-10T08:00:00",
      "updated_at": "2026-06-10T09:30:00",
      "class_id": 5,
      "class_name": "Grade 5",
      "division_id": 2,
      "division_name": "A",
      "photo_count": 15,
      "video_count": 0,
      "media_count": 15
    }
  ],
  "total": 1,
  "page": 0,
  "size": 10,
  "pages": 1
}
```

---

## 2. Get Activity Gallery Details

| | |
|---|---|
| **API Name** | Get Activity Gallery |
| **Endpoint** | `GET /api/activity-galleries/{gallery_id}` |
| **HTTP Method** | GET |
| **Description** | Returns gallery metadata, class/division mapping, and media items for slideshow or video playback. |

**Sample response**

```json
{
  "id": 1,
  "tenant_id": 10,
  "gallery_name": "Annual Sports Day 2026",
  "gallery_type": "Photo",
  "description": "Sports Day Celebration",
  "activity_date": "2026-06-10",
  "created_by": 42,
  "is_published": true,
  "status": 1,
  "created_at": "2026-06-10T08:00:00",
  "updated_at": "2026-06-10T09:30:00",
  "class_id": 5,
  "class_name": "Grade 5",
  "division_id": 2,
  "division_name": "A",
  "photo_count": 15,
  "video_count": 0,
  "media_count": 15,
  "class_mappings": [
    {
      "id": 1,
      "gallery_id": 1,
      "class_id": 5,
      "division_id": 2,
      "class_name": "Grade 5",
      "division_name": "A",
      "created_at": "2026-06-10T08:00:00"
    }
  ],
  "media_items": [
    {
      "id": 101,
      "gallery_id": 1,
      "media_type": "Photo",
      "file_name": "10_1_20260610093000_a1b2c3d4.jpg",
      "original_file_name": "sports-day-1.jpg",
      "file_path": "/api/activity-galleries/1/media/101/content",
      "file_size": 245760,
      "display_order": 1,
      "uploaded_at": "2026-06-10T09:30:00"
    }
  ]
}
```

---

## 3. Create Activity Gallery

| | |
|---|---|
| **API Name** | Create Activity Gallery |
| **Endpoint** | `POST /api/activity-galleries` |
| **HTTP Method** | POST |
| **Permission** | `create` on menu path |
| **Description** | Creates a gallery shell. Media is uploaded in separate calls. Requires active academic year. Teachers may only create for assigned class/division. |

**Request body**

```json
{
  "gallery_name": "Annual Sports Day 2026",
  "gallery_type": "Photo",
  "activity_date": "2026-06-10",
  "description": "Sports Day Celebration",
  "class_id": 5,
  "division_id": 2
}
```

**Sample response** — same shape as **Get Activity Gallery Details** (`201 Created`).

**Validation messages**

| Condition | Message |
|-----------|---------|
| Empty gallery name | Please enter gallery name |
| Missing class | Please select class |
| Missing division | Please select division |
| Missing activity date | Please select activity date |
| Unauthorized class/division | You are not authorized for this activity |

---

## 4. Update Activity Gallery

| | |
|---|---|
| **API Name** | Update Activity Gallery |
| **Endpoint** | `PUT /api/activity-galleries/{gallery_id}` |
| **HTTP Method** | PUT |
| **Permission** | `edit` on menu path |
| **Description** | Updates gallery metadata and class/division mapping. |

**Request body** (all fields optional)

```json
{
  "gallery_name": "Annual Sports Day 2026 - Updated",
  "activity_date": "2026-06-10",
  "description": "Updated description",
  "class_id": 5,
  "division_id": 2
}
```

**Sample response** — same shape as **Get Activity Gallery Details**.

---

## 5. Delete Activity Gallery

| | |
|---|---|
| **API Name** | Delete Activity Gallery |
| **Endpoint** | `DELETE /api/activity-galleries/{gallery_id}` |
| **HTTP Method** | DELETE |
| **Permission** | `delete` on menu path |
| **Description** | Soft-deletes the gallery (`status = 0`). Cascade removes mappings and media rows per DB constraints. |

**Sample response**

```json
{
  "message": "Gallery deleted successfully"
}
```

---

## 6. Publish Activity Gallery

| | |
|---|---|
| **API Name** | Publish Activity Gallery |
| **Endpoint** | `POST /api/activity-galleries/{gallery_id}/publish` |
| **HTTP Method** | POST |
| **Permission** | `edit` on menu path |
| **Description** | Sets `is_published = 1` so parents can view the gallery. Requires at least one media item matching the gallery type. |

**Sample response**

```json
{
  "message": "Gallery published successfully",
  "gallery": { }
}
```

**Validation messages**

| Condition | Message |
|-----------|---------|
| No media | Please upload at least one file |
| Publish failure | Unable to publish gallery. |

---

## 7. Upload Gallery Media (Single)

| | |
|---|---|
| **API Name** | Upload Gallery Media |
| **Endpoint** | `POST /api/activity-galleries/{gallery_id}/media` |
| **HTTP Method** | POST |
| **Content-Type** | `multipart/form-data` |
| **Permission** | `create` or `edit` on menu path |
| **Description** | Uploads one photo. Bytes are stored in `activity_gallery_media.file_content`; `file_path` is the API content URL (no JPG files on disk). Photo galleries accept JPG, JPEG, PNG, JFIF (max 20 photos, **10 MB combined**). Video galleries use YouTube links only (see endpoint 7b). |

**Form field**

| Field | Type |
|-------|------|
| `file` | file |

**Sample response** (`201 Created`)

```json
{
  "id": 101,
  "gallery_id": 1,
  "media_type": "Photo",
  "file_name": "10_1_20260610093000_a1b2c3d4.jpg",
  "original_file_name": "sports-day-1.jpg",
  "file_path": "/api/activity-galleries/1/media/101/content",
  "file_size": 245760,
  "display_order": 1,
  "uploaded_at": "2026-06-10T09:30:00"
}
```

**Validation messages**

| Condition | Message |
|-----------|---------|
| More than 20 files | Maximum 20 files allowed |
| Photo total size > 10 MB | Total photo size cannot exceed 10 MB for all images |
| Upload failure | Unable to upload file. Please try again. |

---

## 7b. Add YouTube Video (Video galleries)

| | |
|---|---|
| **API Name** | Add YouTube Video |
| **Endpoint** | `POST /api/activity-galleries/{gallery_id}/youtube-videos` |
| **HTTP Method** | POST |
| **Permission** | `create` or `edit` on menu path |
| **Description** | Adds a YouTube video link to a video gallery (max 20 videos). Local video file upload is not supported. |

**Request body**

```json
{
  "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Sample response** — same shape as **Upload Gallery Media** (`201 Created`).

**Validation messages**

| Condition | Message |
|-----------|---------|
| Invalid URL | Please enter a valid YouTube video URL |
| More than 20 videos | Maximum 20 files allowed |

---

## 8. Upload Gallery Media (Bulk)

| | |
|---|---|
| **API Name** | Bulk Upload Gallery Media |
| **Endpoint** | `POST /api/activity-galleries/{gallery_id}/media/bulk` |
| **HTTP Method** | POST |
| **Content-Type** | `multipart/form-data` |
| **Permission** | `edit` on menu path |
| **Description** | Uploads multiple files in one request. Each file counts toward the 20-item limit. |

**Form field**

| Field | Type |
|-------|------|
| `files` | file[] |

**Sample response** — array of media objects (`201 Created`).

---

## 9. Delete Gallery Media

| | |
|---|---|
| **API Name** | Delete Gallery Media |
| **Endpoint** | `DELETE /api/activity-galleries/{gallery_id}/media/{media_id}` |
| **HTTP Method** | DELETE |
| **Permission** | `edit` on menu path |
| **Description** | Soft-deletes a media record and removes the file from disk. |

**Sample response**

```json
{
  "message": "Media deleted successfully"
}
```

---

## 10. Download Gallery Media

| | |
|---|---|
| **API Name** | Download Gallery Media |
| **Endpoint** | `GET /api/activity-galleries/{gallery_id}/media/{media_id}/download` |
| **HTTP Method** | GET |
| **Description** | Streams the media file as a download. Parents must have access to the published gallery. |

**Response** — binary file stream (`Content-Disposition: attachment`).

---

## 11. Teacher Classes Dropdown

| | |
|---|---|
| **API Name** | Get Teacher Classes |
| **Endpoint** | `GET /api/activity-galleries/teacher-classes` |
| **HTTP Method** | GET |
| **Permission** | `view` on menu path |
| **Description** | Reuses teacher assignment logic. Teachers receive assigned classes; admins receive all active classes. |

**Sample response**

```json
[
  { "id": 5, "name": "Grade 5" }
]
```

---

## 12. Divisions Dropdown

| | |
|---|---|
| **API Name** | Get Divisions for Class |
| **Endpoint** | `GET /api/activity-galleries/divisions?class_id=5` |
| **HTTP Method** | GET |
| **Permission** | `view` on menu path |
| **Description** | Returns divisions for the selected class, scoped to teacher assignments when applicable. |

**Sample response**

```json
[
  { "id": 2, "division_name": "A" }
]
```

---

## Access Control Summary

| Role | Create / Edit / Delete / Publish | View |
|------|----------------------------------|------|
| Admin | Any class and division | All galleries |
| Teacher | Assigned class and division only | Assigned class/division galleries |
| Parent | — | Published galleries for child's class/division |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `activity_gallery` | Gallery master record |
| `activity_gallery_media` | Photo/video files |
| `activity_gallery_class_mapping` | Class and division visibility mapping |

---

## Implementation Files

| Layer | Path |
|-------|------|
| Router | `app/routers/activity_gallery_router.py` |
| Service | `app/services/activity_gallery_service.py` |
| Access | `app/services/activity_gallery_access.py` |
| Storage | `app/services/activity_gallery_media_storage.py` |
| Repository | `app/repositories/activity_gallery_repository.py` |
| Schemas | `app/schemas/activity_gallery_schema.py` |
| Models | `app/models/activity_gallery.py` |

Static media URL prefix (legacy uploads only): `/activity-gallery-media/{filename}`

New photo uploads store content in the database and expose it at:

`GET /api/activity-galleries/{gallery_id}/media/{media_id}/content`

Run `scripts/add_activity_gallery_media_content.sql` once to add the `file_content` column.

---

## Add Gallery Screen Workflow

The **Add Photo / Video Gallery** screen uses a multi-step API flow aligned with other upload features (e.g. homework):

| UI Action | API Sequence |
|-----------|--------------|
| **Save** | `POST /api/activity-galleries` → `POST /api/activity-galleries/{id}/media/bulk` |
| **Save & Publish** | Same as Save, then `POST /api/activity-galleries/{id}/publish` |
| **Cancel** | No API call; navigate back to list |

Frontend validates gallery type, name, class, division, and at least one file before calling the APIs. Publish requires at least one uploaded file matching the gallery type.
