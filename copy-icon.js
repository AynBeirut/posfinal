const fs = require('fs');
const path = require('path');

// Copy favicon.ico from Odoo resources to use as app icon
const sourcePath = path.join(__dirname, 'resources', 'odoo', 'addons', 'point_of_sale', 'static', 'src', 'img', 'favicon.ico');
const destPath = path.join(__dirname, 'icon.ico');

if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log('✓ Icon copied successfully from Odoo POS resources');
} else {
    console.warn('⚠ Warning: Source icon not found at', sourcePath);
    console.warn('⚠ Continuing without icon...');
    // Don't exit with error, just continue
}
