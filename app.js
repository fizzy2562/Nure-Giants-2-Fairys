const express = require('express');
const { Database } = require('duckdb');
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

// Initialize DuckDB
let db;
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db = new Database(':memory:', (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Create tables
      db.run(`
        CREATE TABLE IF NOT EXISTS weekly_results (
          year INTEGER,
          week INTEGER,
          team VARCHAR,
          opponent VARCHAR,
          points DECIMAL(10,2),
          opp_points DECIMAL(10,2),
          result VARCHAR(1),
          season_type VARCHAR,
          coach VARCHAR,
          opp_coach VARCHAR,
          pair VARCHAR
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        db.run(`
          CREATE TABLE IF NOT EXISTS coach_lookup (
            roster_name VARCHAR,
            canonical_coach VARCHAR
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
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
      ROUND(SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 3) as win_pct
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
      ROUND(SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 3) as win_pct
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
  
  if (coach) {
    query += ` AND coach = '${coach}'`;
  }
  
  if (year !== 'all') {
    query += ` AND year = ${year}`;
  }
  
  query += ` ORDER BY year, week`;
  
  db.all(query, (err, rows) => {
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
      ROUND(SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 3) as win_pct
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
    
    // Process weekly_results sheet
    if (workbook.SheetNames.includes('weekly_results')) {
      const sheet = workbook.Sheets['weekly_results'];
      const data = XLSX.utils.sheet_to_json(sheet);
      
      // Clear existing data
      db.run('DELETE FROM weekly_results', (err) => {
        if (err) {
          console.error('Error clearing weekly_results:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Insert new data
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
      });
    }
    
    // Process coach_lookup sheet
    if (workbook.SheetNames.includes('coach_lookup')) {
      const sheet = workbook.Sheets['coach_lookup'];
      const data = XLSX.utils.sheet_to_json(sheet);
      
      db.run('DELETE FROM coach_lookup', (err) => {
        if (err) {
          console.error('Error clearing coach_lookup:', err);
          return;
        }
        
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
      });
    }
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({ message: 'Data uploaded successfully' });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: 'Error processing file' });
  }
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
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
