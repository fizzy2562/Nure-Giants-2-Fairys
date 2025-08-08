const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Initialize SQLite
let db;
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(':memory:', (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Create tables
      db.run(`
        CREATE TABLE IF NOT EXISTS weekly_results (
          year INTEGER,
          week INTEGER,
          team TEXT,
          opponent TEXT,
          points REAL,
          opp_points REAL,
          result TEXT,
          season_type TEXT,
          coach TEXT,
          opp_coach TEXT,
          pair TEXT
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        db.run(`
          CREATE TABLE IF NOT EXISTS coach_lookup (
            roster_name TEXT,
            canonical_coach TEXT
          )
        `, (err) => {
          if (err) reject(err);
          else {
            console.log('Database tables created successfully');
            // Load initial data if Excel file exists
            loadInitialDataFromFile()
              .then(() => resolve())
              .catch(err => {
                console.log('No initial data file found or error loading:', err.message);
                resolve(); // Continue anyway
              });
          }
        });
      });
    });
  });
};

// Load initial data from Excel file
const loadInitialDataFromFile = () => {
  return new Promise((resolve, reject) => {
    const excelPath = path.join(__dirname, 'fantasy_results_2019_2024_v26.xlsx');
    
    if (!fs.existsSync(excelPath)) {
      reject(new Error('Excel file not found'));
      return;
    }
    
    try {
      console.log('Loading initial data from Excel file...');
      const workbook = XLSX.readFile(excelPath);
      
      // Process weekly_results sheet
      if (workbook.SheetNames.includes('weekly_results')) {
        const sheet = workbook.Sheets['weekly_results'];
        const data = XLSX.utils.sheet_to_json(sheet);
        
        console.log(`Processing ${data.length} weekly results...`);
        
        const stmt = db.prepare(`
          INSERT INTO weekly_results 
          (year, week, team, opponent, points, opp_points, result, season_type, coach, opp_coach, pair)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        data.forEach(row => {
          stmt.run([
            row.Year || row.year,
            row.Week || row.week,
            row.Team || row.team,
            row.Opponent || row.opponent,
            row.Points || row.points,
            row.Opp_Points || row.opp_points,
            row.Result || row.result,
            row.Season_Type || row.season_type,
            row.Coach || row.coach,
            row.Opp_Coach || row.opp_coach,
            row.Pair || row.pair
          ]);
        });
        
        stmt.finalize((err) => {
          if (err) {
            reject(err);
            return;
          }
          console.log('Weekly results loaded successfully');
        });
      }
      
      // Process coach_lookup sheet
      if (workbook.SheetNames.includes('coach_lookup')) {
        const sheet = workbook.Sheets['coach_lookup'];
        const data = XLSX.utils.sheet_to_json(sheet);
        
        console.log(`Processing ${data.length} coach mappings...`);
        
        const stmt = db.prepare(`
          INSERT INTO coach_lookup (roster_name, canonical_coach)
          VALUES (?, ?)
        `);
        
        data.forEach(row => {
          stmt.run([
            row.Roster_Name || row.roster_name,
            row.Canonical_Coach || row.canonical_coach
          ]);
        });
        
        stmt.finalize((err) => {
          if (err) {
            reject(err);
            return;
          }
          console.log('Coach lookup loaded successfully');
          resolve();
        });
      } else {
        resolve();
      }
      
    } catch (error) {
      reject(error);
    }
  });
};

// API Routes
app.get('/api/standings', (req, res) => {
  const year = req.query.year || 'all';
  
  let query = `
    SELECT 
      coach,
      COUNT(*) as games,
      SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN result = 'L' THEN 1 ELSE 0 END) as losses,
      SUM(CASE WHEN result = 'T' THEN 1 ELSE 0 END) as ties,
      ROUND(SUM(points), 2) as points_for,
      ROUND(SUM(opp_points), 2) as points_against,
      ROUND(AVG(points), 2) as avg_points_for,
      ROUND(AVG(opp_points), 2) as avg_points_against,
      ROUND(CAST(SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) AS REAL) / COUNT(*), 3) as win_pct
    FROM weekly_results 
    WHERE season_type = 'Regular'
  `;
  
  if (year !== 'all') {
    query += ` AND year = ${year}`;
  }
  
  query += ` GROUP BY coach ORDER BY win_pct DESC, points_for DESC`;
  
  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/head-to-head', (req, res) => {
  const query = `
    SELECT 
      coach,
      opp_coach,
      COUNT(*) as games,
      SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN result = 'L' THEN 1 ELSE 0 END) as losses,
      ROUND(SUM(points), 2) as points_for,
      ROUND(SUM(opp_points), 2) as points_against,
      ROUND(CAST(SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) AS REAL) / COUNT(*), 3) as win_pct
    FROM weekly_results 
    WHERE season_type = 'Regular'
    GROUP BY coach, opp_coach 
    ORDER BY coach, win_pct DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/weekly-performance', (req, res) => {
  const coach = req.query.coach;
  const year = req.query.year || 'all';
  
  let query = `
    SELECT 
      year,
      week,
      points,
      opp_points,
      result,
      opponent,
      opp_coach
    FROM weekly_results 
    WHERE season_type = 'Regular'
  `;
  
  if (coach && coach !== 'all') {
    query += ` AND coach = ?`;
  }
  
  if (year !== 'all') {
    query += ` AND year = ${year}`;
  }
  
  query += ` ORDER BY year, week`;
  
  const params = [];
  if (coach && coach !== 'all') {
    params.push(coach);
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/yearly-summary', (req, res) => {
  const query = `
    SELECT 
      year,
      coach,
      COUNT(*) as games,
      SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN result = 'L' THEN 1 ELSE 0 END) as losses,
      ROUND(SUM(points), 2) as points_for,
      ROUND(SUM(opp_points), 2) as points_against,
      ROUND(AVG(points), 2) as avg_points,
      ROUND(CAST(SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) AS REAL) / COUNT(*), 3) as win_pct
    FROM weekly_results 
    WHERE season_type = 'Regular'
    GROUP BY year, coach 
    ORDER BY year, win_pct DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/coaches', (req, res) => {
  const query = `SELECT DISTINCT coach FROM weekly_results ORDER BY coach`;
  
  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows.map(row => row.coach));
  });
});

app.get('/api/years', (req, res) => {
  const query = `SELECT DISTINCT year FROM weekly_results ORDER BY year`;
  
  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows.map(row => row.year));
  });
});

// Upload endpoint for Excel files
app.post('/api/upload', upload.single('excelFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const workbook = XLSX.readFile(req.file.path);
    
    // Clear existing data and reload
    db.serialize(() => {
      db.run('DELETE FROM weekly_results');
      db.run('DELETE FROM coach_lookup');
      
      // Process weekly_results sheet
      if (workbook.SheetNames.includes('weekly_results')) {
        const sheet = workbook.Sheets['weekly_results'];
        const data = XLSX.utils.sheet_to_json(sheet);
        
        const stmt = db.prepare(`
          INSERT INTO weekly_results 
          (year, week, team, opponent, points, opp_points, result, season_type, coach, opp_coach, pair)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        data.forEach(row => {
          stmt.run([
            row.Year || row.year,
            row.Week || row.week,
            row.Team || row.team,
            row.Opponent || row.opponent,
            row.Points || row.points,
            row.Opp_Points || row.opp_points,
            row.Result || row.result,
            row.Season_Type || row.season_type,
            row.Coach || row.coach,
            row.Opp_Coach || row.opp_coach,
            row.Pair || row.pair
          ]);
        });
        
        stmt.finalize();
      }
      
      // Process coach_lookup sheet
      if (workbook.SheetNames.includes('coach_lookup')) {
        const sheet = workbook.Sheets['coach_lookup'];
        const data = XLSX.utils.sheet_to_json(sheet);
        
        const stmt = db.prepare(`
          INSERT INTO coach_lookup (roster_name, canonical_coach)
          VALUES (?, ?)
        `);
        
        data.forEach(row => {
          stmt.run([
            row.Roster_Name || row.roster_name,
            row.Canonical_Coach || row.canonical_coach
          ]);
        });
        
        stmt.finalize();
      }
    });
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({ message: 'Data uploaded successfully' });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: 'Error processing file' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve the dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database and start server
initializeDatabase()
  .then(() => {
    console.log('Database initialized successfully');
    app.listen(port, () => {
      console.log(`Fantasy Football Dashboard running on port ${port}`);
      console.log(`Visit: http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
