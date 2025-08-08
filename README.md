# Fantasy Football Dashboard

A comprehensive dashboard for tracking fantasy football league performance from 2019-2024, built with Express.js, DuckDB, and Chart.js.

## Features

- **Overall Standings**: Track wins, losses, points for/against, and win percentages
- **Yearly Performance**: Visualize performance trends over multiple seasons
- **Head-to-Head Records**: See matchup history between all coaches
- **Weekly Performance**: Analyze week-by-week scoring patterns
- **Data Upload**: Upload new Excel files to update the dashboard
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Backend**: Node.js with Express
- **Database**: DuckDB (in-memory for fast queries)
- **Frontend**: Vanilla JavaScript with Chart.js
- **File Processing**: SheetJS (XLSX) for Excel file handling
- **Hosting**: Render.com

## Quick Deploy to Render

### Option 1: One-Click Deploy
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### Option 2: Manual Deploy

1. **Fork or Download** this repository

2. **Create a Render account** at [render.com](https://render.com)

3. **Connect your GitHub repo** to Render:
   - Click "New +" → "Web Service"
   - Connect your GitHub account
   - Select your repository

4. **Configure the service**:
   - **Name**: `fantasy-football-dashboard`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for better performance)

5. **Add Environment Variables** (optional):
   ```
   NODE_ENV=production
   PORT=3000
   ```

6. **Deploy**: Click "Create Web Service"

## Local Development

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Setup

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd fantasy-football-dashboard
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Add your data file**:
   - Place your `fantasy_results_2019_2024_v26.xlsx` file in the root directory
   - Or use the upload feature in the dashboard

4. **Start the application**:
   ```bash
   npm start
   ```

5. **Open your browser**:
   Navigate to `http://localhost:3000`

## File Structure

```
fantasy-football-dashboard/
├── app.js                 # Main server file
├── package.json          # Dependencies and scripts
├── render.yaml           # Render deployment config
├── Dockerfile            # Docker configuration
├── load_data.js          # Initial data loading script
├── public/
│   └── index.html        # Frontend dashboard
├── uploads/              # Temporary upload directory
└── README.md             # This file
```

## Data Format

The dashboard expects an Excel file with these sheets:

### `weekly_results` sheet:
- **Year**: Season year (2019-2024)
- **Week**: Week number
- **Team**: Team name
- **Opponent**: Opponent team name  
- **Points**: Points scored
- **Opp_Points**: Opponent points scored
- **Result**: W/L/T
- **Season_Type**: Regular/Playoff
- **Coach**: Coach name
- **Opp_Coach**: Opponent coach name
- **Pair**: Coach pairing identifier

### `coach_lookup` sheet:
- **Roster_Name**: Team roster name
- **Canonical_Coach**: Standardized coach name

## API Endpoints

- `GET /api/standings?year={year}` - Get standings for specific year or all years
- `GET /api/head-to-head` - Get head-to-head matchup records
- `GET /api/weekly-performance?coach={coach}&year={year}` - Get weekly performance data
- `GET /api/yearly-summary` - Get year-by-year performance summary
- `GET /api/coaches` - Get list of all coaches
- `GET /api/years` - Get list of available years
- `POST /api/upload` - Upload new Excel data file

## Customization

### Adding New Features

1. **New API Endpoint**: Add routes in `app.js`
2. **New Chart**: Add Chart.js configuration in `index.html`
3. **New Table**: Add data processing in the frontend JavaScript

### Styling
- Modify the CSS in `public/index.html`
- The dashboard uses a modern gradient design with responsive layout

### Database Queries
- DuckDB SQL queries are in `app.js`
- Modify existing queries or add new ones for additional insights

## Deployment Tips

### Render.com Specific
- The free tier has limitations (512MB RAM, sleeps after 15min inactivity)
- For production use, consider upgrading to a paid plan
- Environment variables can be set in the Render dashboard

### Performance Optimization
- DuckDB runs in-memory for fast queries
- Consider persistent storage for larger datasets
- Add caching for frequently requested data

### Monitoring
- Render provides basic monitoring and logs
- Add custom health checks as needed
- Monitor memory usage with large datasets

## Troubleshooting

### Common Issues

1. **DuckDB installation issues**:
   ```bash
   npm rebuild duckdb
   ```

2. **File upload not working**:
   - Check file permissions in uploads directory
   - Verify Excel file format matches expected structure

3. **Charts not displaying**:
   - Check browser console for JavaScript errors
   - Ensure Chart.js CDN is accessible

4. **Deployment fails**:
   - Check Node.js version compatibility
   - Verify all dependencies in package.json
   - Review Render build logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## License

MIT License - feel free to use and modify for your fantasy football league!
