# Redis Setup Guide for Property Management POS

## Quick Setup Instructions

### Option 1: Manual Installation (Recommended)

1. **Download Redis for Windows:**
   - Go to: <https://github.com/microsoftarchive/redis/releases>
   - Download: `Redis-x64-3.0.504.zip`

2. **Extract and Install:**

   ```powershell
   # Create directory
   New-Item -ItemType Directory -Path "C:\Redis" -Force
   
   # Extract the downloaded zip to C:\Redis
   # Add C:\Redis to your system PATH
   ```

3. **Install as Service:**

   ```powershell
   cd C:\Redis
   .\redis-server.exe --service-install redis.conf --service-name Redis
   Start-Service Redis
   ```

4. **Test Installation:**

   ```powershell
   redis-cli ping
   # Should return: PONG
   ```

### Option 2: Docker (Alternative)

```bash
docker run --name redis -p 6379:6379 -d redis:latest
```

## Environment Configuration

Add to your `backend/.env` file:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_ENABLED=true
```

## Redis Configuration (C:\Redis\redis.conf)

```conf
bind 127.0.0.1
port 6379
timeout 300
save 900 1
save 300 10
save 60 10000
dbfilename dump.rdb
dir "C:\Redis\data"
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
maxmemory 512mb
maxmemory-policy allkeys-lru
```

## Management Commands

```powershell
# Start Redis
Start-Service Redis

# Stop Redis
Stop-Service Redis

# Check Status
Get-Service Redis

# Test Connection
redis-cli ping

# Monitor Redis
redis-cli monitor
```

## Production Notes

- Set a secure password with `requirepass` in production
- Configure `maxmemory` based on available RAM
- Enable persistence with both RDB and AOF
- Monitor memory usage and slow logs
- Consider Redis Cluster for high availability

Once Redis is installed and running, proceed with the database migrations.
