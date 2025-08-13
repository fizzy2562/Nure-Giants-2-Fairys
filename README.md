# Fantasy Football Dashboard

A comprehensive dashboard for tracking fantasy football league performance from 2019-2024, built with Express.js, SQLite, and Chart.js.

## Features

- **Overall Standings**: Track wins, losses, points for/against, and win percentages
- **Yearly Performance**: Visualize performance trends over multiple seasons
- **Head-to-Head Records**: See matchup history between all coaches
- **Weekly Performance**: Analyze week-by-week scoring patterns
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Backend**: Node.js with Express
- **Database**: SQLite (in-memory for fast queries)
- **Frontend**: Vanilla JavaScript with Chart.js
- **File Processing**: SheetJS (XLSX) for Excel file handling

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
   - The application will automatically load this data on startup

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
├── public/
│   └── index.html        # Frontend dashboard
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
- `GET /health` - Health check endpoint

## Customization

### Adding New Features

1. **New API Endpoint**: Add routes in `app.js`
2. **New Chart**: Add Chart.js configuration in `public/index.html`
3. **New Table**: Add data processing in the frontend JavaScript

### Styling
- Modify the CSS in `public/index.html`
- The dashboard uses a modern gradient design with responsive layout

### Database Queries
- SQLite queries are in `app.js`
- Modify existing queries or add new ones for additional insights

## Performance Notes

- SQLite runs in-memory for fast queries
- Database is automatically recreated on each application start
- All data is loaded from the Excel file during initialization

## Troubleshooting

### Common Issues

1. **SQLite installation issues**:
   ```bash
   npm rebuild sqlite3
   ```

2. **Data not loading**:
   - Ensure `fantasy_results_2019_2024_v26.xlsx` is in the root directory
   - Check that Excel file format matches expected structure
   - Review console logs for data loading errors

3. **Charts not displaying**:
   - Check browser console for JavaScript errors
   - Ensure Chart.js CDN is accessible

4. **Application won't start**:
   - Check Node.js version compatibility (requires 16+)
   - Verify all dependencies in package.json are installed
   - Review application logs for specific errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## License

MIT License - feel free to use and modify for your fantasy football league!
