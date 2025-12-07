#!/usr/bin/env python3
import sys
import os

# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))

# CRITICAL: Do NOT add odoo root to sys.path at position 0
# This causes Python's stdlib 'http' module to be shadowed by odoo/http.py

# Add only the parent directory so 'import odoo' works
# but odoo's internal modules don't shadow stdlib
if script_dir not in sys.path:
    sys.path.append(script_dir)

# Set PYTHONPATH environment variable
os.environ['PYTHONPATH'] = f"{script_dir};{os.environ.get('PYTHONPATH', '')}"

# Now import and run Odoo
if __name__ == '__main__':
    import odoo
    odoo.cli.main()
