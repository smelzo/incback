# incback

A space-efficient incremental backup tool using rsync with hard-link support. Supports both local and remote (SSH) backup scenarios.

## Features

- **Incremental backups** - Only changed files are copied; unchanged files are hard-linked to previous backups, saving disk space
- **Timestamped snapshots** - Each backup is stored in a separate directory with ISO 8601 timestamp
- **Remote support** - Backup to/from remote servers via SSH
- **Flexible configuration** - Configure via CLI arguments or JSON file
- **Space efficient** - Uses rsync's `--link-dest` feature for hard-linking unchanged files
- **Exclude patterns** - Skip files and directories using exclude pattern files
- **Logging** - Write backup logs to file with timestamps for auditing
- **Customizable prefixes** - Set custom directory name prefixes for backups
- **Docker support** - Run in containers for isolated and reproducible backups

## Installation

```bash
npm install -g incback
```

### Quick Install (Linux & macOS)

You can install the standalone binary directly using curl:

```bash
curl -o- https://raw.githubusercontent.com/smelzo/incback/main/install.sh | sudo bash
```

Or run locally:

```bash
git clone https://github.com/yourusername/incback.git
cd incback
npm install
npm run build
```

## Standalone Binaries

After running the build scripts, standalone binaries (which do not require Node.js installed) are available in the `dist/` directory:

- **macOS (Apple Silicon)**: `dist/mac/arm64/incback` (Generate with `npm run build:mac`)
- **Linux (x64)**: `dist/linux/x64/incback` (Generate with `npm run build:linux`)

## Usage

### Configuration File (Recommended)

Create a `.incback` file in your project directory:

```json
{
  "src": "/path/to/source",
  "dest": "/path/to/backup",
  "excludeFrom": "./exclude-patterns.txt",
  "logFile": "./backup.log",
  "backupPrefix": "BACKUP-"
}
```

Then run:

```bash
incback
```

### Command Line Arguments

```bash
incback -s /path/to/source -d /path/to/backup
```

### Remote Backups

**Backup from remote source to local destination:**

```json
{
  "src": "/var/www/html",
  "dest": "/home/user/backups",
  "remoteRole": "src",
  "remoteUser": "root",
  "remoteHost": "example.com"
}
```

**Backup from local source to remote destination:**

```json
{
  "src": "/home/user/documents",
  "dest": "/backups/documents",
  "remoteRole": "dest",
  "remoteUser": "backup",
  "remoteHost": "backup-server.com"
}
```

### Custom Configuration File Path

```bash
incback -c /path/to/custom-config.json
```

## Command Line Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--config <path>` | `-c` | Path to JSON configuration file |
| `--src <path>` | `-s` | Source directory path |
| `--dest <path>` | `-d` | Destination directory path |
| `--remote-role <role>` | `-R` | Which path is remote: `src` or `dest` |
| `--remote-user <user>` | `-U` | SSH username for remote connection |
| `--remote-host <host>` | `-H` | SSH hostname or IP address |
| `--exclude-from <file>` | `-e` | Path to file containing exclude patterns (one per line) |
| `--log-file <file>` | `-l` | Path to log file for backup operations |
| `--backup-prefix <prefix>` | `-p` | Custom prefix for backup directories (default: `BACKUP-`) |

## How It Works

incback creates timestamped backup directories using the format `{prefix}{timestamp}` (default prefix: `BACKUP-`):

```
/backup/destination/
├── BACKUP-2025-11-23T080000/
├── BACKUP-2025-11-23T120000/
└── BACKUP-2025-11-23T160000/
```

### Initial Backup

The first backup creates a complete copy of the source directory.

### Incremental Backups

Subsequent backups use rsync's `--link-dest` option to:
- Copy only files that have changed
- Hard-link unchanged files to the previous backup

This means each backup appears as a complete snapshot, but unchanged files don't consume additional disk space.

### Example

```bash
# Initial backup: 1GB
BACKUP-2025-11-23T080000/  # 1GB disk usage

# Incremental backup: 100MB of changes
BACKUP-2025-11-23T120000/  # Only 100MB additional disk usage
                           # But appears as complete 1.1GB snapshot

# Another incremental: 50MB of changes
BACKUP-2025-11-23T160000/  # Only 50MB additional disk usage
                           # But appears as complete 1.15GB snapshot
```

Total disk usage: ~1.15GB instead of 3.25GB for three full backups.

## Requirements

- Node.js 18+ (uses ES modules)
- rsync installed on your system
- SSH access (for remote backups)
- SSH key-based authentication configured (password authentication not supported)

## SSH Configuration

For remote backups, ensure:

1. **SSH key-based authentication is set up**:
   ```bash
   ssh-copy-id user@remote-host
   ```

2. **Test SSH connection**:
   ```bash
   ssh user@remote-host
   ```

3. **The tool uses these SSH options**:
   - `BatchMode=yes` - No password prompts
   - `ConnectTimeout=5` - 5-second connection timeout

## Development

### Build

```bash
npm run build
```

### Run Without Building

```bash
npx tsx src/index.ts
```

### Test Individual Modules

Some modules include self-test code:

```bash
# Test remote path existence checker
npx tsx src/remote-exists.ts

# Test remote command execution
npx tsx src/exec.ts
```

Note: Update the hardcoded test hosts/paths in these files before running.

### Clean

```bash
npm run clean-src
```

## Project Structure

```
incback/
├── src/
│   ├── index.ts          # Entry point (deprecated, use cli.ts)
│   ├── cli.ts            # CLI entry point
│   ├── backup.ts         # Main backup logic
│   ├── config.ts         # Configuration management
│   ├── exec.ts           # Command execution utilities
│   ├── remote-exists.ts  # Remote path existence checker
│   ├── logger.ts         # Logging utility (console + file)
│   ├── lib.ts            # Shared library functions
│   ├── types.ts          # TypeScript type definitions
│   └── type-guards.ts    # Runtime type validation
├── build/                # Build output
├── test/                 # Test files
├── Dockerfile            # Docker image configuration
├── docker-compose-*.yml  # Docker compose examples
├── package.json
├── tsconfig.json
└── CLAUDE.md            # Development guide for AI assistants
```

## Use Cases

### Local Backups

```bash
# Backup your documents folder
incback -s ~/Documents -d /mnt/backup/documents
```

### Server Backups

```bash
# Backup remote web server to local storage
incback -s /var/www -d ~/backups/website \
  -R src -U root -H webserver.com
```

### Scheduled Backups

Add to crontab for automated backups:

```bash
# Backup every day at 2 AM
0 2 * * * cd /path/to/project && incback
```

### Advanced Usage

**Exclude patterns:**

Create an exclude file (e.g., `exclude.txt`) with patterns to skip:
```
node_modules/
*.log
.git/
*.tmp
```

Use it with:
```bash
incback -s ~/projects -d /backup -e exclude.txt
```

**Logging to file:**

```bash
incback -s ~/data -d /backup -l backup.log
```

Logs include timestamps and are written to both console and file.

**Custom backup prefix:**

```bash
incback -s ~/data -d /backup -p "SNAPSHOT-"
```

Creates directories like `SNAPSHOT-2025-11-24T080000/` instead of `BACKUP-2025-11-24T080000/`.

**Full CLI Example:**

```bash
incback \
  --src /var/www/html \
  --dest /backups/website \
  --remote-role dest \
  --remote-user backup \
  --remote-host backup-server.com \
  --exclude-from ./exclude.txt \
  --log-file ./backup.log \
  --backup-prefix "WEB-"
```

**Combined example:**

```json
{
  "src": "/var/www/html",
  "dest": "/backups/website",
  "excludeFrom": "/etc/incback/exclude-web.txt",
  "logFile": "/var/log/incback/website.log",
  "backupPrefix": "WEB-",
  "remoteRole": "dest",
  "remoteUser": "backup",
  "remoteHost": "backup-server.com"
}
```

## Docker Usage

incback can be run in a Docker container for isolated and reproducible backup operations.

### Building the Docker Image

```bash
docker build -t incback .
```

The Docker image is based on `node:18-alpine` and includes:
- Node.js runtime
- rsync and OpenSSH client
- The compiled incback CLI tool

### Using Docker Compose

Two example configurations are provided:

#### Local Backups (docker-compose-local.yml)

For backing up local directories:

```yaml
services:
  incback:
    build: .
    volumes:
      - "/local/src/path:/source:ro"  # Source (read-only)
      - "/tmp/backup:/dest"            # Destination
    command: ["-s", "/source", "-d", "/dest"]
```

Run with:
```bash
docker compose -f docker-compose-local.yml up
```

#### Remote Backups (docker-compose-remote.yml)

For backing up to/from remote servers via SSH:

```yaml
services:
  incback:
    build: .
    volumes:
      - "/local/src/path:/source:ro"     # Local source
      - "${HOME}/.ssh:/root/.ssh:ro"     # SSH keys for remote access
    command: [
      "-s", "/source",
      "-d", "/remote/backup/path",
      "-H", "remote_host",
      "-U", "remote_user",
      "-R", "dest"
    ]
```

Run with:
```bash
docker compose -f docker-compose-remote.yml up
```

### Docker Run Examples

**Local backup:**
```bash
docker run --rm \
  -v /path/to/source:/source:ro \
  -v /path/to/backup:/dest \
  incback -s /source -d /dest
```

**Remote backup with exclude patterns:**
```bash
docker run --rm \
  -v /path/to/source:/source:ro \
  -v /path/to/exclude.txt:/exclude.txt:ro \
  -v ~/.ssh:/root/.ssh:ro \
  incback -s /source -d /remote/path \
    -H backup-server.com -U backup -R dest \
    -e /exclude.txt
```

**Using a configuration file:**
```bash
docker run --rm \
  -v /path/to/.incback:/backup/.incback:ro \
  -v /path/to/source:/source:ro \
  -v /path/to/backup:/dest \
  incback -c /backup/.incback
```

### Docker Notes

- The container's working directory is `/backup`
- Volumes `/source` and `/dest` are declared for convenience
- For remote backups, mount your SSH keys as read-only (`~/.ssh:/root/.ssh:ro`)
- Log files can be written to mounted volumes for persistence

## Security Considerations

- Uses SSH with `BatchMode=yes` to prevent interactive prompts
- All shell arguments are properly escaped to prevent injection
- Requires SSH key-based authentication (more secure than passwords)
- Never runs destructive commands without explicit configuration

## Troubleshooting

### "Configuration file .incback not found"

Create a `.incback` file in the current directory or use CLI arguments.

### "remoteCommand requires remoteUser and remoteHost"

When using `remoteRole`, both `remoteUser` and `remoteHost` must be specified.

### SSH Connection Failures

- Verify SSH key-based authentication is set up
- Test manual SSH connection: `ssh user@host`
- Check firewall settings
- Ensure the remote path exists and is accessible

### Permission Errors

- Ensure you have read permissions on source directory
- Ensure you have write permissions on destination directory
- For remote paths, verify SSH user has appropriate permissions

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

Created with ❤️ for efficient, space-saving backups
