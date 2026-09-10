# Storage Setup - What We Built & How Photos Are Added

## Current Setup
**Storage Provider**: Backblaze B2 (set in `.env`: `STORAGE_PROVIDER=backblaze`)  
**Bucket**: `aaditech-erp-test-v2`  
**Backend**: FastAPI Python

---

## How Photos/Files Are Added to Storage

### 1. **Sidebar Icons (Auto-Upload on App Startup)**
When your FastAPI app starts:
- `icon_auto_uploader.py` runs automatically
- Reads 5 PNG files from: `apps/web/public/assets/icons/`
- Uploads each to: `sidebar-icons/<filename>.png` in Backblaze
- No manual action needed - happens once per app start

**Files uploaded**:
- academics.png
- attendance.png
- communication.png
- dashboard.png
- settings.png

**Code flow**:
```python
# In main.py (app startup)
from app.services.icon_auto_uploader import auto_upload_icons_to_storage
auto_upload_icons_to_storage()  # Runs once

# In icon_auto_uploader.py
storage = get_storage_service()  # Gets Backblaze B2 service
storage.upload_bytes(
    blob_name="sidebar-icons/academics.png",
    content=file_bytes,
    content_type="image/png"
)
```

---

### 2. **User Uploads (Homework, Notices, Photos, etc.)**
When user uploads a file:

**Frontend** → POST `/api/v1/homework/{id}/attach` with file

**Backend flow**:
```python
# Router receives file
@router.post("/{homework_id}/attach")
async def upload_attachment(file: UploadFile):
    # 1. Read file bytes
    content = await file.read()
    
    # 2. Get storage service (automatically uses Backblaze or Azure based on .env)
    storage = get_storage_service()
    
    # 3. Upload to storage
    blob_name = f"homework/attachment_12345.pdf"
    storage.upload_bytes(
        blob_name=blob_name,
        content=content,
        content_type="application/pdf"
    )
    
    # 4. Save path to database
    # 5. Return download URL to frontend
    return {"url": storage.get_blob_url(blob_name)}
```

**Result**: File stored in Backblaze under path like `homework/attachment_12345.pdf`

---

## Storage Organization (Virtual Folders)

Both Azure & Backblaze use **prefix-based organization** (no real folders):

```
aaditech-erp-test-v2/  (Backblaze bucket)

├── sidebar-icons/              ← Icons auto-uploaded on startup
│   ├── academics.png
│   ├── attendance.png
│   ├── communication.png
│   ├── dashboard.png
│   └── settings.png
│
├── homework/                   ← User uploads (homework attachments)
│   ├── attachment_12345.pdf
│   ├── attachment_12346.docx
│   └── attachment_12347.png
│
├── activity-gallery/           ← Activity photos
│   ├── event_001.jpg
│   ├── event_002.jpg
│   └── event_003.jpg
│
├── notices/                    ← Notice attachments
│   ├── notice_001.pdf
│   └── notice_002.png
│
└── temp/                       ← Temporary uploads
    └── processing_file.tmp
```

When you look in Backblaze B2 console under bucket `aaditech-erp-test-v2`, you'll see files organized like this.

---

## Key Components (What We Built)

| File | Purpose |
|------|---------|
| `blob_storage_factory.py` | Single entry point - switches between Azure/Backblaze based on `STORAGE_PROVIDER` |
| `backblaze_blob_service.py` | B2 SDK wrapper - handles upload/download/delete operations |
| `icon_auto_uploader.py` | Auto-uploads sidebar icons on app startup |
| `app/routers/icons.py` | API endpoint to retrieve icon URLs |
| `config.py` | Stores B2 credentials and settings from `.env` |

---

## Switching Providers

To switch from Backblaze back to Azure:

1. **Edit `.env`**:
   ```env
   STORAGE_PROVIDER=azure
   ```

2. **Restart app** - that's it!

3. All future uploads go to Azure
4. No code changes needed
5. Backblaze files remain where they are

---

## What's Currently Staged (Ready to Commit)

✓ `app/services/backblaze_blob_service.py` - B2 integration  
✓ `app/services/blob_storage_factory.py` - Storage factory  
✓ `app/services/icon_auto_uploader.py` - Auto-upload icons  
✓ `app/routers/icons.py` - Icons API endpoint  
✓ `app/core/config.py` - B2 config (modified)  
✓ `app/main.py` - Added icon auto-upload (modified)  
✓ `requirements.txt` - Added b2sdk (modified)  
✓ 5 sidebar PNG files in `apps/web/public/assets/icons/`  
✓ Demo & test scripts  

---

## Current Issue

B2 authentication is returning `bad_auth_token` error. This could be:
- Typo in credentials
- Key not yet active in Backblaze account
- Account/bucket configuration issue

**Next step**: Verify exact keyID and applicationKey from Backblaze console match `.env`

---

## Testing Connection

Once B2 auth is working, test with:

```bash
cd apps/fastapi
python test_b2_simple.py
```

Expected output:
```
✓ Credentials found
✓ Authorization successful
✓ Bucket found: aaditech-erp-test-v2
✓ Test file uploaded successfully
✓ Successfully uploaded 5 icons
```

Then icons will be accessible at:
```
https://f003.backblazeb2.com/file/aaditech-erp-test-v2/sidebar-icons/academics.png
```

---

## Cost Comparison

| Provider | Storage | Bandwidth | Total/month (1GB) |
|----------|---------|-----------|-------------------|
| Azure | $0.05/GB | $0.01-0.02/GB | ~$0.05 |
| Backblaze B2 | $0.006/GB | Free (limits) | ~$0.006 |
| **Savings** | - | - | **~90%** |

---

## Files Ready to Commit

```bash
git commit -m "feat: Add Backblaze B2 integration with auto-upload sidebar icons"
```

All staging complete. Auth troubleshooting in progress.
