const { app, BrowserWindow, dialog } = require('electron');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const http = require('http');

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
    resourcesPath: null,
    dataPath: null,
    pgPort: 54320,  // Non-standard port to avoid conflicts
    pgDatabase: 'posdb',
    pgUser: 'odoo',
    pgPassword: 'odoo123',  // Embedded PostgreSQL password
    odooPort: 8070,
    odooMasterPassword: 'admin',
    pgStartTimeout: 60000,  // 60 seconds for initialization
    odooStartTimeout: 180000,  // 3 minutes for Odoo startup
    shutdownTimeout: 10000,
    pollInterval: 1000,
    useSystemPostgres: false,  // Use embedded PostgreSQL
};

let loadingWindow = null;
let mainWindow = null;
let postgresProcess = null;
let odooProcess = null;
let isShuttingDown = false;
let logStream = null;

// ============================================================================
// PATH RESOLUTION
// ============================================================================
function initializePaths() {
    const isDev = !app.isPackaged;
    
    if (isDev) {
        CONFIG.resourcesPath = path.join(__dirname, 'resources');
        CONFIG.dataPath = path.join(__dirname, 'data');
    } else {
        CONFIG.resourcesPath = path.join(process.resourcesPath, 'resources');
        CONFIG.dataPath = path.join(app.getPath('userData'), 'data');
    }
    
    // Ensure directories exist
    [CONFIG.dataPath, path.join(CONFIG.dataPath, 'postgresql'), path.join(CONFIG.dataPath, 'logs')]
        .forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });
    
    // Initialize log file
    const logFile = path.join(CONFIG.dataPath, 'logs', `app-${new Date().toISOString().slice(0,10)}.log`);
    logStream = fs.createWriteStream(logFile, { flags: 'a' });
    
    log('INFO', `=== Application Starting ===`);
    log('INFO', `Dev Mode: ${isDev}`);
    log('INFO', `Resources: ${CONFIG.resourcesPath}`);
    log('INFO', `Data: ${CONFIG.dataPath}`);
}

// ============================================================================
// LOGGING
// ============================================================================
function log(level, message) {
    const msg = `[${new Date().toISOString()}] [${level}] ${message}`;
    console.log(msg);
    if (logStream) logStream.write(msg + '\n');
}

function updateStatus(status) {
    log('STATUS', status);
    if (loadingWindow && !loadingWindow.isDestroyed()) {
        loadingWindow.webContents.send('status', status);
    }
}

// ============================================================================
// WINDOWS
// ============================================================================
function createLoadingWindow() {
    loadingWindow = new BrowserWindow({
        width: 450,
        height: 350,
        frame: false,
        resizable: false,
        center: true,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    loadingWindow.loadFile('loading.html');
    return loadingWindow;
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        fullscreen: true,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    
    mainWindow.on('close', async (e) => {
        if (isShuttingDown) return;
        e.preventDefault();
        
        const { response } = await dialog.showMessageBox(mainWindow, {
            type: 'question',
            buttons: ['Exit', 'Cancel'],
            defaultId: 1,
            title: 'Confirm Exit',
            message: 'Exit POS System?',
            detail: 'All services will be stopped.'
        });
        
        if (response === 0) await shutdown();
    });
    
    mainWindow.webContents.on('before-input-event', (e, input) => {
        if (input.key === 'F11') {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
            e.preventDefault();
        }
    });
    
    return mainWindow;
}

// ============================================================================
// UTILITIES
// ============================================================================
const sleep = ms => new Promise(r => setTimeout(r, ms));

function checkPort(port) {
    return new Promise(resolve => {
        const socket = new net.Socket();
        socket.setTimeout(1000);
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.connect(port, '127.0.0.1');
    });
}

function checkHttp(url) {
    return new Promise(resolve => {
        const req = http.get(url, { timeout: 3000 }, res => {
            resolve(res.statusCode >= 200 && res.statusCode < 500);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
    });
}

async function waitForPort(port, timeout) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (await checkPort(port)) return true;
        await sleep(CONFIG.pollInterval);
    }
    return false;
}

async function waitForHttp(url, timeout) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (await checkHttp(url)) return true;
        await sleep(CONFIG.pollInterval);
    }
    return false;
}

// ============================================================================
// POSTGRESQL
// ============================================================================
function getPgPaths() {
    const bin = path.join(CONFIG.resourcesPath, 'postgresql-15', 'bin');
    const lib = path.join(CONFIG.resourcesPath, 'postgresql-15', 'lib');
    return {
        bin,
        lib,
        data: path.join(CONFIG.dataPath, 'postgresql'),
        initdb: path.join(bin, 'initdb.exe'),
        postgres: path.join(bin, 'postgres.exe'),
        pgctl: path.join(bin, 'pg_ctl.exe'),
        psql: path.join(bin, 'psql.exe'),
        createdb: path.join(bin, 'createdb.exe')
    };
}

async function initPostgres() {
    const pg = getPgPaths();
    const pgVersion = path.join(pg.data, 'PG_VERSION');
    
    if (fs.existsSync(pgVersion)) {
        log('INFO', 'PostgreSQL data directory already exists');
        return true;
    }
    
    log('INFO', 'Initializing PostgreSQL data directory...');
    updateStatus('Initializing database...');
    
    try {
        const env = { ...process.env };
        env.PATH = `${pg.bin};${pg.lib};${env.PATH}`;
        
        execSync(`"${pg.initdb}" -D "${pg.data}" -U postgres -E UTF8 --locale=C`, {
            env,
            windowsHide: true,
            stdio: 'pipe'
        });
        
        // Configure pg_hba.conf for trust authentication
        const hbaPath = path.join(pg.data, 'pg_hba.conf');
        fs.writeFileSync(hbaPath, `
# TYPE  DATABASE  USER  ADDRESS       METHOD
local   all       all                 trust
host    all       all   127.0.0.1/32  trust
host    all       all   ::1/128       trust
`);
        
        // Configure postgresql.conf
        const confPath = path.join(pg.data, 'postgresql.conf');
        fs.appendFileSync(confPath, `
# Custom settings for POS
listen_addresses = 'localhost'
port = ${CONFIG.pgPort}
`);
        
        log('INFO', 'PostgreSQL initialized successfully');
        return true;
    } catch (error) {
        log('ERROR', `PostgreSQL init failed: ${error.message}`);
        if (error.stderr) log('ERROR', error.stderr.toString());
        return false;
    }
}

async function startPostgres() {
    // Check if already running
    if (await checkPort(CONFIG.pgPort)) {
        log('INFO', 'PostgreSQL already running on port ' + CONFIG.pgPort);
        return true;
    }
    
    const pg = getPgPaths();
    log('INFO', 'Starting PostgreSQL...');
    updateStatus('Starting database server...');
    
    const env = { ...process.env };
    env.PATH = `${pg.bin};${pg.lib};${env.PATH}`;
    
    postgresProcess = spawn(pg.postgres, ['-D', pg.data], {
        env,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    postgresProcess.stdout.on('data', d => log('PG', d.toString().trim()));
    postgresProcess.stderr.on('data', d => log('PG', d.toString().trim()));
    postgresProcess.on('exit', code => {
        if (!isShuttingDown) log('WARN', `PostgreSQL exited with code ${code}`);
        postgresProcess = null;
    });
    
    if (!await waitForPort(CONFIG.pgPort, CONFIG.pgStartTimeout)) {
        log('ERROR', 'PostgreSQL failed to start within timeout');
        return false;
    }
    
    log('INFO', 'PostgreSQL is ready');
    return true;
}

async function ensureDatabase() {
    const pg = getPgPaths();
    const env = { ...process.env };
    env.PATH = `${pg.bin};${pg.lib};${env.PATH}`;
    env.PGUSER = 'postgres';
    env.PGHOST = 'localhost';
    env.PGPORT = String(CONFIG.pgPort);
    
    try {
        // Create odoo user if it doesn't exist
        log('INFO', 'Creating Odoo database user...');
        updateStatus('Setting up database user...');
        
        const createUserCmd = `"${pg.psql}" -c "SELECT 1 FROM pg_user WHERE usename='${CONFIG.pgUser}'" -t | findstr /r "^1$" || "${pg.psql}" -c "CREATE USER ${CONFIG.pgUser} WITH PASSWORD '${CONFIG.pgPassword}' CREATEDB;"`;
        
        try {
            execSync(createUserCmd, {
                env,
                windowsHide: true,
                stdio: 'pipe',
                shell: 'cmd.exe'
            });
            log('INFO', 'Database user ready');
        } catch (error) {
            // User might already exist, that's ok
            log('INFO', 'Database user already exists or created');
        }
        
        return true;
    } catch (error) {
        log('WARN', `Database setup warning: ${error.message}`);
        // Don't fail - Odoo might still work
        return true;
    }
}

async function stopPostgres() {
    if (!postgresProcess) return;
    
    const pg = getPgPaths();
    log('INFO', 'Stopping PostgreSQL...');
    
    try {
        const env = { ...process.env };
        env.PATH = `${pg.bin};${pg.lib};${env.PATH}`;
        
        execSync(`"${pg.pgctl}" stop -D "${pg.data}" -m fast`, {
            env,
            windowsHide: true,
            timeout: CONFIG.shutdownTimeout,
            stdio: 'pipe'
        });
        log('INFO', 'PostgreSQL stopped gracefully');
    } catch (error) {
        log('WARN', `pg_ctl stop failed: ${error.message}`);
        if (postgresProcess) postgresProcess.kill('SIGKILL');
    }
    
    postgresProcess = null;
}

// ============================================================================
// ODOO
// ============================================================================
function getOdooPaths() {
    const pythonDir = path.join(CONFIG.resourcesPath, 'python-3.10');
    return {
        python: path.join(pythonDir, 'python.exe'),
        pythonDir,
        odooBin: path.join(CONFIG.resourcesPath, 'odoo', 'odoo-bin'),
        odooDir: path.join(CONFIG.resourcesPath, 'odoo'),
        addons: [
            path.join(CONFIG.resourcesPath, 'odoo', 'addons'),
            path.join(CONFIG.resourcesPath, 'odoo', 'odoo', 'addons')
        ].join(',')
    };
}

async function startOdoo() {
    // Check if already running
    if (await checkHttp(`http://localhost:${CONFIG.odooPort}`)) {
        log('INFO', 'Odoo already running on port ' + CONFIG.odooPort);
        return true;
    }
    
    const odoo = getOdooPaths();
    log('INFO', 'Starting Odoo...');
    updateStatus('Starting Odoo server...');
    
    // Use our wrapper script that sets up sys.path
    const runScript = path.join(odoo.odooDir, 'run_odoo.py');
    
    const args = [
        runScript,
        '--database', CONFIG.pgDatabase,
        '--db_host', 'localhost',
        '--db_port', String(CONFIG.pgPort),
        '--db_user', CONFIG.pgUser,
        '--db_password', CONFIG.pgPassword,
        '--http-port', String(CONFIG.odooPort),
        '--addons-path', odoo.addons,
        '--without-demo', 'all',
        '--log-level', 'info',
        '--init', 'point_of_sale'  // Initialize POS module on first run
    ];
    
    const env = { ...process.env };
    env.PATH = `${odoo.pythonDir};${odoo.pythonDir}\\Scripts;${env.PATH}`;
    // Do NOT set PYTHONPATH - let run_odoo.py handle it to avoid module shadowing
    env.PYTHONIOENCODING = 'utf-8';
    
    log('INFO', `Starting: ${odoo.python} ${runScript}`);
    
    odooProcess = spawn(odoo.python, args, {
        cwd: odoo.odooDir,
        env,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    odooProcess.stdout.on('data', d => log('ODOO', d.toString().trim()));
    odooProcess.stderr.on('data', d => log('ODOO', d.toString().trim()));
    odooProcess.on('exit', code => {
        if (!isShuttingDown) log('WARN', `Odoo exited with code ${code}`);
        odooProcess = null;
    });
    
    updateStatus('Waiting for Odoo to initialize (first start may take 1-2 minutes)...');
    
    if (!await waitForHttp(`http://localhost:${CONFIG.odooPort}/web/login`, CONFIG.odooStartTimeout)) {
        log('ERROR', 'Odoo failed to start within timeout');
        return false;
    }
    
    log('INFO', 'Odoo is ready');
    return true;
}

async function stopOdoo() {
    if (!odooProcess) return;
    
    log('INFO', 'Stopping Odoo...');
    
    try {
        odooProcess.kill('SIGTERM');
        await sleep(3000);
        if (odooProcess) odooProcess.kill('SIGKILL');
    } catch (error) {
        log('WARN', `Error stopping Odoo: ${error.message}`);
    }
    
    odooProcess = null;
}

// ============================================================================
// STARTUP / SHUTDOWN
// ============================================================================
async function startup() {
    try {
        updateStatus('Initializing paths...');
        
        // Check if using embedded or system PostgreSQL
        if (CONFIG.useSystemPostgres) {
            log('INFO', 'Using system PostgreSQL');
            updateStatus('Connecting to system database...');
        } else {
            log('INFO', 'Starting embedded PostgreSQL and Odoo');
            
            // Initialize PostgreSQL if needed
            if (!await initPostgres()) {
                throw new Error('Failed to initialize PostgreSQL');
            }
            
            // Start PostgreSQL server
            updateStatus('Starting PostgreSQL server...');
            if (!await startPostgres()) {
                throw new Error('Failed to start PostgreSQL');
            }
            
            // Ensure database exists (Odoo will create it if needed)
            await ensureDatabase();
        }
        
        // Start Odoo server
        if (!await startOdoo()) {
            throw new Error('Failed to start Odoo');
        }
        
        // Create main window and load POS
        updateStatus('Opening POS interface...');
        await sleep(1000);
        
        createMainWindow();
        mainWindow.loadURL(`http://localhost:${CONFIG.odooPort}/web`);
        
        mainWindow.webContents.on('did-finish-load', () => {
            log('INFO', 'POS loaded successfully');
            if (loadingWindow && !loadingWindow.isDestroyed()) {
                loadingWindow.close();
                loadingWindow = null;
            }
        });
        
    } catch (error) {
        log('ERROR', `Startup failed: ${error.message}`);
        
        const { response } = await dialog.showMessageBox({
            type: 'error',
            buttons: ['Retry', 'View Logs', 'Exit'],
            defaultId: 2,
            title: 'Startup Error',
            message: 'Failed to start POS system',
            detail: error.message + '\n\nCheck logs for details.'
        });
        
        if (response === 0) {
            // Retry
            await shutdown(false);
            setTimeout(startup, 2000);
        } else if (response === 1) {
            // View logs
            const logFile = path.join(CONFIG.dataPath, 'logs', `app-${new Date().toISOString().slice(0,10)}.log`);
            require('child_process').exec(`notepad "${logFile}"`);
            await shutdown();
        } else {
            await shutdown();
        }
    }
}

async function shutdown(shouldExit = true) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    log('INFO', 'Shutting down...');
    
    // Stop services in reverse order
    await stopOdoo();
    if (!CONFIG.useSystemPostgres) {
        await stopPostgres();
    }
    
    if (logStream) {
        logStream.end();
        logStream = null;
    }
    
    if (shouldExit) app.exit(0);
    else isShuttingDown = false;
}

// ============================================================================
// APP LIFECYCLE
// ============================================================================
app.whenReady().then(() => {
    initializePaths();
    createLoadingWindow();
    startup();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') shutdown();
});

app.on('before-quit', e => {
    if (!isShuttingDown) {
        e.preventDefault();
        shutdown();
    }
});

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
process.on('uncaughtException', error => {
    log('FATAL', `Uncaught: ${error.message}\n${error.stack}`);
    shutdown();
});
