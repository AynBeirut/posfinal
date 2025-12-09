import sys
import subprocess
import os

# Get the Python executable path
python_exe = sys.executable
python_dir = os.path.dirname(python_exe)
scripts_dir = os.path.join(python_dir, "Scripts")

# Install packages using ensurepip first
print("Installing pip properly...")
try:
    subprocess.run([python_exe, "-m", "ensurepip", "--upgrade"], check=True)
except:
    pass

# Now install the missing packages
print("Installing rjsmin and rcssmin...")
packages = ["rjsmin", "rcssmin"]

for package in packages:
    try:
        print(f"Installing {package}...")
        result = subprocess.run(
            [python_exe, "-m", "pip", "install", "--no-cache-dir", package],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print(f"✓ {package} installed successfully")
        else:
            print(f"✗ Failed to install {package}")
            print(result.stderr)
    except Exception as e:
        print(f"Error installing {package}: {e}")

print("\nDone!")
