# Deployment Readiness Guide

This document outlines the production-ready features and deployment checklist for the application.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Health Checks](#health-checks)
4. [Logging Strategy](#logging-strategy)
5. [Error Handling](#error-handling)
6. [Security Considerations](#security-considerations)
7. [Performance Optimization](#performance-optimization)
8. [Monitoring and Observability](#monitoring-and-observability)
9. [Deployment Steps](#deployment-steps)

## Pre-Deployment Checklist

### Backend (FastAPI)

- [ ] Set `ENVIRONMENT=production` in `.env`
- [ ] Change `SECRET_KEY` to a strong, random value (minimum 32 characters)
- [ ] Set `DEBUG=False`
- [ ] Configure database connection (`DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`)
- [ ] Set appropriate `CORS_ORIGINS` for production domain
- [ ] Configure `LOG_LEVEL` (recommended: `INFO` or `WARNING` for production)
- [ ] Enable file logging: `ENABLE_FILE_LOGGING=true`
- [ ] Run database migrations: `alembic upgrade head`
- [ ] Test health check endpoints: `/health`, `/health/ready`, `/health/live`
- [ ] Verify all environment variables are set correctly

### Frontend (React)

- [ ] Set `VITE_API_BASE_URL` to production API URL
- [ ] Build production bundle: `npm run build`
- [ ] Test production build locally
- [ ] Verify error boundaries are working
- [ ] Configure error reporting service (Sentry, LogRocket, etc.)
- [ ] Test authentication flow in production build
- [ ] Verify CORS settings match backend configuration

## Environment Configuration

### Backend Environment Variables

Create a `.env` file in `apps/fastapi/` with the following variables:

```env
# Application
ENVIRONMENT=production
APP_NAME=Your App Name
APP_VERSION=1.0.0
DEBUG=False

# Database
DB_SERVER=your-db-server
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_DRIVER=ODBC Driver 18 for SQL Server
DB_ECHO=False

# CORS
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CORS_CREDENTIALS=True
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS,PATCH
CORS_HEADERS=Content-Type,Authorization,Accept,X-Requested-With

# JWT Authentication
SECRET_KEY=your-strong-secret-key-minimum-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Logging
LOG_LEVEL=INFO
ENABLE_FILE_LOGGING=True
```

### Frontend Environment Variables

Create a `.env.production` file in `apps/web/`:

```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_APP_NAME=Your App Name
```

## Health Checks

The application provides three health check endpoints:

### 1. Basic Health Check
```
GET /health
```
Returns basic application status. Always returns 200 if the application is running.

### 2. Readiness Probe
```
GET /health/ready
```
Checks if the application is ready to serve traffic. Verifies:
- Database connectivity
- Returns 200 if ready, 503 if not ready

**Use this endpoint for Kubernetes readiness probes and load balancer health checks.**

### 3. Liveness Probe
```
GET /health/live
```
Checks if the application is alive and should be restarted if not.

**Use this endpoint for Kubernetes liveness probes.**

### Example Kubernetes Configuration

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Logging Strategy

### Backend Logging

The application uses a production-ready logging strategy:

- **Console Logging**: Always active for container logs
- **File Logging**: Enabled with `ENABLE_FILE_LOGGING=true`
  - Main log: `logs/app.log` (rotates at 10MB, keeps 5 backups)
  - Error log: `logs/error.log` (only errors, rotates at 10MB, keeps 5 backups)
- **Structured Format**: Includes timestamps, log levels, file locations, and context
- **Log Levels**: Configurable via `LOG_LEVEL` environment variable

### Log Levels

- `DEBUG`: Detailed information for debugging
- `INFO`: General informational messages
- `WARNING`: Warning messages (default for production)
- `ERROR`: Error messages
- `CRITICAL`: Critical errors

### Frontend Error Logging

The frontend includes:
- **Error Boundaries**: Catch React component errors
- **Error Logger**: Centralized error logging utility
- **Console Logging**: Development mode
- **Error Service Integration**: Ready for Sentry, LogRocket, etc.

To integrate with an error reporting service, update `apps/web/src/utils/errorLogger.ts`.

## Error Handling

### Backend

- Custom exception handlers for all error types
- Structured error responses
- Proper HTTP status codes
- Error logging with context

### Frontend

- **Error Boundaries**: Catch and display errors gracefully
- **API Error Handling**: Centralized error handling in Axios interceptors
- **User-Friendly Messages**: Display appropriate error messages to users
- **Error Recovery**: Options to retry or reload

## Security Considerations

### Production Security Checklist

- [ ] **SECRET_KEY**: Changed from default, minimum 32 characters
- [ ] **DEBUG**: Set to `False`
- [ ] **CORS**: Configured with specific origins (not `*`)
- [ ] **HTTPS**: All traffic encrypted
- [ ] **Database**: Secure connection strings, no credentials in code
- [ ] **JWT**: Strong secret key, appropriate expiration time
- [ ] **Environment Variables**: Never committed to version control
- [ ] **Dependencies**: Regularly updated, no known vulnerabilities
- [ ] **Rate Limiting**: Consider adding rate limiting middleware
- [ ] **Input Validation**: All inputs validated on backend

### Security Headers

Consider adding security headers middleware:

```python
from fastapi.middleware.trustedhost import TrustedHostMiddleware

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["yourdomain.com", "*.yourdomain.com"]
)
```

## Performance Optimization

### Already Implemented

- ✅ Lazy loading for React routes
- ✅ Component memoization
- ✅ Database connection pooling (pool_size=10, max_overflow=20)
- ✅ Async route handlers
- ✅ GZip compression middleware
- ✅ Optimized CORS settings

### Additional Recommendations

- **Caching**: Consider adding Redis for session/token caching
- **CDN**: Serve static assets via CDN
- **Database Indexing**: Ensure proper database indexes
- **Query Optimization**: Monitor slow queries
- **Load Balancing**: Use multiple application instances behind a load balancer

## Monitoring and Observability

### Recommended Monitoring Tools

1. **Application Performance Monitoring (APM)**
   - New Relic, Datadog, or similar
   - Monitor response times, error rates, throughput

2. **Error Tracking**
   - Sentry, Rollbar, or similar
   - Track and alert on application errors

3. **Log Aggregation**
   - ELK Stack, Splunk, or cloud logging services
   - Centralized log management

4. **Infrastructure Monitoring**
   - Monitor server resources (CPU, memory, disk)
   - Database performance metrics

### Key Metrics to Monitor

- Request rate and response times
- Error rates (4xx, 5xx)
- Database connection pool usage
- JWT token generation/validation times
- Health check endpoint response times
- Frontend error rates
- User authentication success/failure rates

## Deployment Steps

### Backend Deployment

1. **Prepare Environment**
   ```bash
   cd apps/fastapi
   cp .env.example .env
   # Edit .env with production values
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run Migrations**
   ```bash
   alembic upgrade head
   ```

4. **Start Application**
   ```bash
   # Using uvicorn directly
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   
   # Or using gunicorn with uvicorn workers (recommended for production)
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   ```

5. **Verify Health Checks**
   ```bash
   curl http://localhost:8000/health
   curl http://localhost:8000/health/ready
   curl http://localhost:8000/health/live
   ```

### Frontend Deployment

1. **Build Production Bundle**
   ```bash
   cd apps/web
   npm install
   npm run build
   ```

2. **Serve Static Files**
   - Use a web server (Nginx, Apache) to serve the `dist/` directory
   - Or deploy to a static hosting service (Vercel, Netlify, AWS S3 + CloudFront)

3. **Configure Nginx Example**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       root /path/to/apps/web/dist;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       location /api {
           proxy_pass http://backend:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### Docker Deployment (Optional)

Example `Dockerfile` for backend:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Example `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: ./apps/fastapi
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
    env_file:
      - ./apps/fastapi/.env
    volumes:
      - ./apps/fastapi/logs:/app/logs
  
  frontend:
    build: ./apps/web
    ports:
      - "80:80"
    depends_on:
      - backend
```

## Post-Deployment Verification

1. **Health Checks**
   - Verify all health check endpoints respond correctly
   - Check database connectivity

2. **Functionality Tests**
   - Test user registration
   - Test user login
   - Test protected routes
   - Test CRUD operations

3. **Performance Tests**
   - Load test the application
   - Monitor response times
   - Check database connection pool usage

4. **Security Tests**
   - Verify HTTPS is working
   - Test CORS configuration
   - Verify authentication/authorization

5. **Monitoring Setup**
   - Configure alerts for errors
   - Set up dashboards
   - Configure log aggregation

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify database server is accessible
   - Check connection string format
   - Verify credentials

2. **CORS Errors**
   - Verify `CORS_ORIGINS` includes frontend domain
   - Check browser console for specific CORS errors

3. **Authentication Issues**
   - Verify `SECRET_KEY` is set correctly
   - Check token expiration settings
   - Verify JWT algorithm matches

4. **Logging Issues**
   - Check `logs/` directory permissions
   - Verify `ENABLE_FILE_LOGGING` is set correctly

## Support

For issues or questions:
1. Check application logs: `apps/fastapi/logs/`
2. Review health check endpoints
3. Check error tracking service (if configured)
4. Review monitoring dashboards

---

**Last Updated**: 2024
**Version**: 1.0.0
