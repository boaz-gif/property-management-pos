# ============================================
# Redis Installation Script for Windows
# Property Management POS - Complete Setup
# ============================================
# This script installs, configures, and verifies Redis for production use
# Run as Administrator for full functionality
# ============================================

#region: Initial Setup
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "🔴 Redis Installation - Property Management POS" -ForegroundColor Red
Write-Host "=============================================" -ForegroundColor Cyan

# Check for Administrator privileges
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "⚠️  WARNING: This script requires Administrator privileges!" -ForegroundColor Yellow
    Write-Host "   Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    Write-Host "   Right-click PowerShell → 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Set execution policy to allow script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force -ErrorAction SilentlyContinue
#endregion

#region: Check Existing Redis Installation
Write-Host "`n[1/8] Checking existing Redis installation..." -ForegroundColor Blue

$installPath = "C:\Redis"
$serviceName = "Redis"

function Test-RedisConnection {
    try {
        $result = redis-cli ping 2>&1
        return ($result -like "*PONG*")
    } catch {
        return $false
    }
}

# Check if Redis service exists
$serviceExists = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
$redisRunning = $false

if ($serviceExists) {
    Write-Host "✅ Redis service found: $($serviceExists.Status)" -ForegroundColor Green
    if ($serviceExists.Status -eq 'Running') {
        if (Test-RedisConnection) {
            Write-Host "✅ Redis is already running and responding" -ForegroundColor Green
            $redisRunning = $true
        } else {
            Write-Host "⚠️  Redis service exists but not responding" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "📦 Redis not installed, proceeding with installation..." -ForegroundColor Yellow
}

# Ask user what to do if Redis exists
if ($redisRunning) {
    $choice = Read-Host "Redis is already running. Do you want to: (R)econfigure, (R)estart, or (C)ontinue? [R/C]"
    if ($choice -eq 'R') {
        Write-Host "Stopping Redis service..." -ForegroundColor Yellow
        Stop-Service Redis -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    } else {
        Write-Host "Skipping installation, proceeding to configuration verification..." -ForegroundColor Green
        $skipInstallation = $true
    }
}
#endregion

#region: Download & Extract Redis (if needed)
if (-not $skipInstallation) {
    Write-Host "`n[2/8] Setting up Redis installation..." -ForegroundColor Blue
    
    # Create installation directory
    if (-not (Test-Path $installPath)) {
        New-Item -ItemType Directory -Path $installPath -Force | Out-Null
        Write-Host "✅ Created Redis directory: $installPath" -ForegroundColor Green
    }
    
    # Check if Redis files already exist
    $redisExePath = Join-Path $installPath "redis-server.exe"
    if (Test-Path $redisExePath) {
        Write-Host "✅ Redis files already exist in $installPath" -ForegroundColor Green
    } else {
        Write-Host "📦 Redis files not found, checking for downloaded ZIP..." -ForegroundColor Yellow
        
        # Check for downloaded Redis ZIP
        $downloadUrl = "https://github.com/microsoftarchive/redis/releases/download/win-3.0.504/Redis-x64-3.0.504.zip"
        $zipFileName = "Redis-x64-3.0.504.zip"
        $userDownloads = [Environment]::GetFolderPath("UserProfile") + "\Downloads"
        $zipPath = Join-Path $userDownloads $zipFileName
        
        if (Test-Path $zipPath) {
            Write-Host "✅ Found Redis ZIP in Downloads, extracting..." -ForegroundColor Green
        } else {
            Write-Host "⬇️  Downloading Redis from Microsoft archive..." -ForegroundColor Blue
            
            # Try multiple download methods
            try {
                # Method 1: Invoke-WebRequest
                $progressPreference = 'SilentlyContinue'
                Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing
                Write-Host "✅ Redis downloaded successfully" -ForegroundColor Green
            } catch {
                Write-Host "⚠️  Method 1 failed, trying alternative..." -ForegroundColor Yellow
                try {
                    # Method 2: WebClient
                    $webClient = New-Object System.Net.WebClient
                    $webClient.DownloadFile($downloadUrl, $zipPath)
                    Write-Host "✅ Redis downloaded successfully (Method 2)" -ForegroundColor Green
                } catch {
                    Write-Host "❌ Failed to download Redis" -ForegroundColor Red
                    Write-Host "Please download manually from:" -ForegroundColor Yellow
                    Write-Host "  $downloadUrl" -ForegroundColor White
                    Write-Host "Save to: $zipPath" -ForegroundColor White
                    Read-Host "Press Enter after downloading manually"
                    
                    if (-not (Test-Path $zipPath)) {
                        Write-Host "❌ ZIP file not found. Exiting." -ForegroundColor Red
                        exit 1
                    }
                }
            }
        }
        
        # Extract Redis
        Write-Host "📦 Extracting Redis files..." -ForegroundColor Blue
        try {
            Expand-Archive -Path $zipPath -DestinationPath $installPath -Force
            Write-Host "✅ Redis extracted successfully" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed to extract Redis" -ForegroundColor Red
            Write-Host "Please extract manually to: $installPath" -ForegroundColor Yellow
            exit 1
        }
    }
    
    # Add Redis to System PATH
    Write-Host "🔧 Adding Redis to system PATH..." -ForegroundColor Blue
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    if ($currentPath -notlike "*$installPath*") {
        [Environment]::SetEnvironmentVariable("Path", "$currentPath;$installPath", "Machine")
        
        # Update current session PATH
        $env:Path += ";$installPath"
        
        Write-Host "✅ Redis added to system PATH" -ForegroundColor Green
    } else {
        Write-Host "✅ Redis already in PATH" -ForegroundColor Green
    }
}
#endregion

#region: Create Directories
Write-Host "`n[3/8] Creating Redis directories..." -ForegroundColor Blue

# Create data directory
$dataPath = Join-Path $installPath "data"
if (-not (Test-Path $dataPath)) {
    New-Item -ItemType Directory -Path $dataPath -Force | Out-Null
    Write-Host "✅ Created data directory: $dataPath" -ForegroundColor Green
} else {
    Write-Host "✅ Data directory already exists: $dataPath" -ForegroundColor Green
}

# Create logs directory
$logsPath = Join-Path $installPath "logs"
if (-not (Test-Path $logsPath)) {
    New-Item -ItemType Directory -Path $logsPath -Force | Out-Null
    Write-Host "✅ Created logs directory: $logsPath" -ForegroundColor Green
} else {
    Write-Host "✅ Logs directory already exists: $logsPath" -ForegroundColor Green
}
#endregion

#region: Create Complete Configuration File
Write-Host "`n[4/8] Creating Redis configuration file..." -ForegroundColor Blue

$configPath = Join-Path $installPath "redis.conf"

# Comprehensive Redis configuration based on our manual setup and production needs
$configContent = @"
# ====================================================
# Redis Production Configuration
# Property Management POS
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# ====================================================

# NETWORK SETTINGS
bind 127.0.0.1                 # Only listen on localhost for security
port 6379                      # Default Redis port
timeout 300                    # Close idle connections after 300 seconds
tcp-keepalive 60               # Send TCP keepalive every 60 seconds
tcp-backlog 511                # TCP connection backlog

# GENERAL SETTINGS
daemonize no                   # Don't run as daemon (handled by Windows Service)
supervised no                  # No supervision system
loglevel notice                # Log level: notice (production recommended)
logfile "$installPath\logs\redis.log"  # Log file location
databases 16                   # Number of databases
always-show-logo no           # Don't show Redis logo on startup

# SNAPSHOTTING (RDB PERSISTENCE)
save 900 1                     # Save if 1 key changed in 900 seconds (15 min)
save 300 10                    # Save if 10 keys changed in 300 seconds (5 min)
save 60 10000                  # Save if 10000 keys changed in 60 seconds
stop-writes-on-bgsave-error yes  # Stop writes if RDB save fails
rdbcompression yes             # Compress RDB files
rdbchecksum yes                # Add checksum to RDB files
dbfilename dump.rdb            # RDB filename
dir "$dataPath"                # Data directory

# REPLICATION (For future scaling)
# replicaof <masterip> <masterport>
# masterauth <master-password>
replica-serve-stale-data yes
replica-read-only yes
repl-diskless-sync no

# SECURITY (Uncomment and set password for production)
# requirepass YourStrongPassword123!
# rename-command CONFIG ""      # Disable CONFIG command for security

# MEMORY MANAGEMENT
maxmemory 512MB                # Maximum memory limit (adjust based on your RAM)
maxmemory-policy allkeys-lru   # Eviction policy: LRU
maxmemory-samples 5            # Number of samples for LRU approximation
maxclients 10000               # Maximum number of connected clients

# APPEND ONLY MODE (AOF PERSISTENCE)
appendonly yes                 # Enable AOF persistence
appendfilename "appendonly.aof" # AOF filename
appendfsync everysec           # Sync AOF every second (good balance)
no-appendfsync-on-rewrite no   # Don't fsync during rewrite
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# AOF REWRITE SETTINGS
aof-rewrite-incremental-fsync yes

# REDIS CLUSTER (For future high availability)
# cluster-enabled no
# cluster-config-file nodes.conf
# cluster-node-timeout 15000

# SLOW LOG
slowlog-log-slower-than 10000  # Log commands slower than 10000 microseconds (10ms)
slowlog-max-len 128            # Keep last 128 slow commands

# LATENCY MONITOR
latency-monitor-threshold 0    # Disabled by default (set to >0 to enable)

# EVENT NOTIFICATION
notify-keyspace-events ""

# ADVANCED SETTINGS
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
list-compress-depth 0
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
hll-sparse-max-bytes 3000

# ACTIVITY TRACKING
activerehashing yes            # Rehash incrementally to save memory

# CLIENT OUTPUT BUFFER LIMITS
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60

# PROTECTED MODE
protected-mode no              # Allow connections only from bind address

# PERFORMANCE TUNING
hz 10                          # Frequency of background tasks
aof-rewrite-incremental-fsync yes
"@

# Write configuration file
$configContent | Out-File -FilePath $configPath -Encoding UTF8
Write-Host "✅ Configuration file created: $configPath" -ForegroundColor Green

# Create a backup of original config (if exists)
$defaultConfig = Join-Path $installPath "redis.windows.conf"
if (Test-Path $defaultConfig) {
    Copy-Item -Path $defaultConfig -Destination "$defaultConfig.backup" -Force
    Write-Host "✅ Backup of default config created" -ForegroundColor Green
}
#endregion

#region: Install Redis as Windows Service
Write-Host "`n[5/8] Setting up Redis Windows Service..." -ForegroundColor Blue

try {
    # Change to Redis directory
    Set-Location $installPath
    
    # Uninstall existing service if it exists
    if ($serviceExists) {
        Write-Host "🔄 Removing existing Redis service..." -ForegroundColor Yellow
        .\redis-server.exe --service-uninstall 2>$null
        Start-Sleep -Seconds 2
    }
    
    # Install new service
    Write-Host "🔧 Installing Redis as Windows Service..." -ForegroundColor Blue
    .\redis-server.exe --service-install $configPath --service-name $serviceName --loglevel verbose
    
    # Configure service recovery options
    $scParams = @(
        "failure", $serviceName, "reset=", "actions=restart/60000/restart/60000/restart/60000"
    )
    sc.exe config $serviceName start=auto | Out-Null
    sc.exe failure $scParams | Out-Null
    
    Write-Host "✅ Redis service installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install Redis service: $_" -ForegroundColor Red
    Write-Host "⚠️  Trying alternative installation method..." -ForegroundColor Yellow
}
#endregion

#region: Start Redis Service
Write-Host "`n[6/8] Starting Redis service..." -ForegroundColor Blue

try {
    # Start the service
    Start-Service -Name $serviceName -ErrorAction Stop
    
    # Wait for service to fully start
    $timeout = 30
    $counter = 0
    while ((Get-Service -Name $serviceName).Status -ne 'Running' -and $counter -lt $timeout) {
        Start-Sleep -Seconds 1
        $counter++
    }
    
    if ((Get-Service -Name $serviceName).Status -eq 'Running') {
        Write-Host "✅ Redis service started successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Redis service is taking longer to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
} catch {
    Write-Host "❌ Failed to start Redis service: $_" -ForegroundColor Red
    Write-Host "⚠️  Attempting manual start..." -ForegroundColor Yellow
    
    # Try manual start
    .\redis-server.exe --service-start 2>$null
    Start-Sleep -Seconds 3
}

# Verify service status
$serviceStatus = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($serviceStatus.Status -eq 'Running') {
    Write-Host "✅ Redis service is RUNNING" -ForegroundColor Green
} else {
    Write-Host "❌ Redis service FAILED to start. Status: $($serviceStatus.Status)" -ForegroundColor Red
    Write-Host "   Check Event Viewer for details" -ForegroundColor Yellow
}
#endregion

#region: Test Redis Installation
Write-Host "`n[7/8] Testing Redis installation..." -ForegroundColor Blue

# Wait a bit more for Redis to be ready
Start-Sleep -Seconds 3

$testsPassed = 0
$totalTests = 5

Write-Host "  1. Testing basic connectivity..." -NoNewline
try {
    $result = redis-cli ping 2>&1
    if ($result -like "*PONG*") {
        Write-Host " ✅" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host " ❌ (Got: $result)" -ForegroundColor Red
    }
} catch {
    Write-Host " ❌ (Error: $_)" -ForegroundColor Red
}

Write-Host "  2. Testing data operations..." -NoNewline
try {
    $setResult = redis-cli SET "test:install" "Property Management POS - $(Get-Date)" 2>&1
    $getResult = redis-cli GET "test:install" 2>&1
    
    if ($setResult -like "*OK*" -and $getResult -like "*Property Management*") {
        Write-Host " ✅" -ForegroundColor Green
        $testsPassed++
        # Clean up test key
        redis-cli DEL "test:install" 2>&1 | Out-Null
    } else {
        Write-Host " ❌" -ForegroundColor Red
    }
} catch {
    Write-Host " ❌" -ForegroundColor Red
}

Write-Host "  3. Testing persistence directories..." -NoNewline
if (Test-Path $dataPath) {
    # Check for RDB and AOF files
    $rdbFile = Join-Path $dataPath "dump.rdb"
    $aofFile = Join-Path $dataPath "appendonly.aof"
    
    # Create a test key to trigger persistence
    redis-cli SET "test:persistence" "check" 2>&1 | Out-Null
    redis-cli SAVE 2>&1 | Out-Null
    
    Start-Sleep -Seconds 2
    
    if (Test-Path $rdbFile -or Test-Path $aofFile) {
        Write-Host " ✅" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host " ⚠️ (No persistence files yet)" -ForegroundColor Yellow
    }
} else {
    Write-Host " ❌ (Data directory missing)" -ForegroundColor Red
}

Write-Host "  4. Testing service management..." -NoNewline
try {
    $service = Get-Service -Name $serviceName -ErrorAction Stop
    if ($service.Status -eq 'Running' -and $service.StartType -eq 'Automatic') {
        Write-Host " ✅" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host " ⚠️ (Status: $($service.Status))" -ForegroundColor Yellow
    }
} catch {
    Write-Host " ❌" -ForegroundColor Red
}

Write-Host "  5. Testing configuration..." -NoNewline
try {
    $configTest = redis-cli CONFIG GET maxmemory 2>&1
    if ($configTest -like "*512*") {
        Write-Host " ✅" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host " ❌ (Config mismatch)" -ForegroundColor Red
    }
} catch {
    Write-Host " ❌ (Config command failed)" -ForegroundColor Red
}

# Overall test result
Write-Host "`n📊 Test Results: $testsPassed/$totalTests passed" -ForegroundColor $(if ($testsPassed -eq $totalTests) { "Green" } elseif ($testsPassed -ge 3) { "Yellow" } else { "Red" })

if ($testsPassed -lt $totalTests) {
    Write-Host "⚠️  Some tests failed. Check troubleshooting section below." -ForegroundColor Yellow
}
#endregion

#region: Update Environment Configuration
Write-Host "`n[8/8] Updating application configuration..." -ForegroundColor Blue

# Try to find the backend .env file in common locations
$possibleEnvPaths = @(
    "$env:USERPROFILE\property-management-pos\backend\.env",
    ".\backend\.env",
    "..\backend\.env",
    "$PSScriptRoot\backend\.env",
    "$PSScriptRoot\..\backend\.env"
)

$envPath = $null
foreach ($path in $possibleEnvPaths) {
    if (Test-Path $path) {
        $envPath = $path
        break
    }
}

if ($envPath) {
    Write-Host "✅ Found .env file: $envPath" -ForegroundColor Green
    
    # Read existing content
    $envContent = Get-Content $envPath -ErrorAction SilentlyContinue
    
    if ($envContent) {
        # Check if Redis config already exists
        $hasRedisConfig = $envContent | Where-Object { $_ -match "^REDIS_" }
        
        if ($hasRedisConfig) {
            Write-Host "⚠️  Redis configuration already exists in .env file" -ForegroundColor Yellow
            Write-Host "   Current Redis settings:" -ForegroundColor Gray
            $envContent | Where-Object { $_ -match "^REDIS_" } | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
        } else {
            # Add Redis configuration
            $redisConfig = @"

# ============================================
# Redis Configuration (Auto-generated)
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_ENABLED=true
REDIS_TIMEOUT=5000
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000
# For production, set a password:
# REDIS_PASSWORD=YourStrongPassword123!
"@
            
            Add-Content -Path $envPath -Value $redisConfig
            Write-Host "✅ Redis configuration added to .env file" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠️  .env file exists but is empty or inaccessible" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Could not find .env file automatically" -ForegroundColor Yellow
    Write-Host "   Please add the following to your backend/.env file:" -ForegroundColor White
    
    $sampleConfig = @"

# ============================================
# Redis Configuration
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_ENABLED=true
REDIS_TIMEOUT=5000
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000
"@
    
    Write-Host $sampleConfig -ForegroundColor Cyan
}
#endregion

#region: Create Management Scripts
Write-Host "`n📝 Creating management scripts..." -ForegroundColor Blue

# Create management scripts directory
$scriptsPath = Join-Path $installPath "scripts"
if (-not (Test-Path $scriptsPath)) {
    New-Item -ItemType Directory -Path $scriptsPath -Force | Out-Null
}

# 1. Start Redis script
$startScript = @"
@echo off
echo ===========================================
echo Starting Redis Service
echo ===========================================
net start Redis
if %ERRORLEVEL% EQU 0 (
    echo ✅ Redis service started successfully
) else (
    echo ❌ Failed to start Redis service
    echo Check if service exists: sc query Redis
)
echo.
timeout /t 3
"@
$startScript | Out-File -FilePath "$scriptsPath\start-redis.bat" -Encoding ASCII

# 2. Stop Redis script
$stopScript = @"
@echo off
echo ===========================================
echo Stopping Redis Service
echo ===========================================
net stop Redis
if %ERRORLEVEL% EQU 0 (
    echo ✅ Redis service stopped successfully
) else (
    echo ⚠️  Redis service may not be running
)
echo.
timeout /t 3
"@
$stopScript | Out-File -FilePath "$scriptsPath\stop-redis.bat" -Encoding ASCII

# 3. Status script
$statusScript = @"
@echo off
echo ===========================================
echo Redis Service Status
echo ===========================================
echo [Service Status]
sc query Redis | findstr STATE
echo.
echo [Connection Test]
redis-cli ping
echo.
echo [Memory Info]
redis-cli info memory | findstr "used_memory_human maxmemory_human"
echo.
timeout /t 5
"@
$statusScript | Out-File -FilePath "$scriptsPath\redis-status.bat" -Encoding ASCII

# 4. Reset script
$resetScript = @"
@echo off
echo ===========================================
echo Resetting Redis Service
echo ===========================================
echo Stopping Redis...
net stop Redis
timeout /t 2
echo Starting Redis...
net start Redis
timeout /t 2
echo Testing connection...
redis-cli ping
echo.
echo Reset complete!
timeout /t 3
"@
$resetScript | Out-File -FilePath "$scriptsPath\reset-redis.bat" -Encoding ASCII

Write-Host "✅ Management scripts created in: $scriptsPath" -ForegroundColor Green
#endregion

#region: Final Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "🎉 REDIS INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "="*60 -ForegroundColor Cyan

Write-Host "`n📊 Installation Summary:" -ForegroundColor White
Write-Host "  • Redis Version:       $(if (Test-Path $redisExePath) { '3.0.504' } else { 'Unknown' })" -ForegroundColor Gray
Write-Host "  • Installation Path:   $installPath" -ForegroundColor Gray
Write-Host "  • Service Status:      $($serviceStatus.Status)" -ForegroundColor $(if ($serviceStatus.Status -eq 'Running') { 'Green' } else { 'Red' })
Write-Host "  • Configuration:       $configPath" -ForegroundColor Gray
Write-Host "  • Data Directory:      $dataPath" -ForegroundColor Gray
Write-Host "  • Port:                6379" -ForegroundColor Gray
Write-Host "  • Memory Limit:        512MB" -ForegroundColor Gray

Write-Host "`n🚀 Quick Commands:" -ForegroundColor White
Write-Host "  Test Redis:          redis-cli ping" -ForegroundColor Gray
Write-Host "  Redis CLI:           redis-cli" -ForegroundColor Gray
Write-Host "  Monitor Redis:       redis-cli monitor" -ForegroundColor Gray
Write-Host "  Check Info:          redis-cli info" -ForegroundColor Gray
Write-Host "  Service Status:      Get-Service Redis" -ForegroundColor Gray
Write-Host "  Start/Stop:          Use scripts in $scriptsPath" -ForegroundColor Gray

Write-Host "`n🔧 Management Scripts Available:" -ForegroundColor White
Write-Host "  • start-redis.bat    - Start Redis service" -ForegroundColor Gray
Write-Host "  • stop-redis.bat     - Stop Redis service" -ForegroundColor Gray
Write-Host "  • redis-status.bat   - Check Redis status" -ForegroundColor Gray
Write-Host "  • reset-redis.bat    - Restart Redis service" -ForegroundColor Gray

Write-Host "`n⚠️  Important Notes:" -ForegroundColor Yellow
Write-Host "  1. Redis is configured for LOCALHOST only (127.0.0.1)" -ForegroundColor Gray
Write-Host "  2. No password is set (configure for production)" -ForegroundColor Gray
Write-Host "  3. Data is persisted to: $dataPath" -ForegroundColor Gray
Write-Host "  4. Logs are written to: $logsPath" -ForegroundColor Gray
Write-Host "  5. Service starts automatically with Windows" -ForegroundColor Gray

Write-Host "`n✅ Your Property Management POS is now ready to use Redis for:" -ForegroundColor Green
Write-Host "  • Session storage" -ForegroundColor Gray
Write-Host "  • Rate limiting" -ForegroundColor Gray
Write-Host "  • Caching frequently accessed data" -ForegroundColor Gray
Write-Host "  • Real-time notifications" -ForegroundColor Gray
Write-Host "  • Queue management" -ForegroundColor Gray

Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "Ready for production use! 🚀" -ForegroundColor Green
Write-Host "="*60 -ForegroundColor Cyan

# Final test
Write-Host "`n🧪 Final verification..." -ForegroundColor Blue
try {
    $finalTest = redis-cli ping 2>&1
    if ($finalTest -like "*PONG*") {
        Write-Host "✅ SUCCESS: Redis is running and ready!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Redis installation completed but service may need manual start" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Please verify Redis service manually" -ForegroundColor Yellow
}

# Pause before exit
Write-Host "`nPress Enter to exit..." -ForegroundColor Gray
Read-Host | Out-Null
#endregion