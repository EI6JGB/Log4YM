# Hamlib Native Libraries

This directory contains native Hamlib libraries for each supported platform. The application will automatically load the correct library based on the runtime platform.

## Directory Structure

```
runtimes/
├── win-x64/native/
│   └── hamlib-4.dll       (or libhamlib-4.dll)
├── linux-x64/native/
│   └── libhamlib.so.4
├── linux-arm64/native/
│   └── libhamlib.so.4
├── osx-x64/native/
│   └── libhamlib.4.dylib
└── osx-arm64/native/
    └── libhamlib.4.dylib
```

## Obtaining the Libraries

### macOS (via Homebrew)

```bash
# Install Hamlib
brew install hamlib

# Find the library location
brew --prefix hamlib
# Usually: /opt/homebrew/opt/hamlib (arm64) or /usr/local/opt/hamlib (x64)

# Copy the library (arm64 example)
cp /opt/homebrew/opt/hamlib/lib/libhamlib.4.dylib runtimes/osx-arm64/native/

# Copy the library (x64 example)
cp /usr/local/opt/hamlib/lib/libhamlib.4.dylib runtimes/osx-x64/native/
```

### Linux (via Package Manager)

```bash
# Debian/Ubuntu
sudo apt install libhamlib-dev

# Find and copy the library
cp /usr/lib/x86_64-linux-gnu/libhamlib.so.4* runtimes/linux-x64/native/
# or for ARM64
cp /usr/lib/aarch64-linux-gnu/libhamlib.so.4* runtimes/linux-arm64/native/

# Fedora/RHEL
sudo dnf install hamlib-devel
```

### Windows

Download pre-built binaries from the Hamlib project:
- https://github.com/Hamlib/Hamlib/releases

Extract and copy `libhamlib-4.dll` to `runtimes/win-x64/native/`

### Building from Source

```bash
# Clone Hamlib
git clone https://github.com/Hamlib/Hamlib.git
cd Hamlib

# Bootstrap (requires autotools)
./bootstrap

# Configure and build
./configure --disable-winradio
make
sudo make install

# Copy the library from /usr/local/lib/ to the appropriate runtimes folder
```

## Minimum Version

Hamlib 4.5 or later is recommended for full compatibility.

## Troubleshooting

If the native library fails to load:

1. Check that the library exists in the correct `runtimes/{RID}/native/` directory
2. On Linux/macOS, verify the library has execute permissions
3. Check for missing dependencies using `ldd` (Linux) or `otool -L` (macOS)
4. Ensure the library was built for the correct architecture (x64 vs arm64)
