const { createApp } = require('./src/app');
const { createDb } = require('./db');

const PORT = process.env.PORT || 3000;
const db = createDb(process.env.DB_PATH || 'db.sqlite');
const app = createApp(db);

app.listen(PORT, () => {
  console.log(`FitMe platform running → http://localhost:${PORT}`);
  console.log('  Portal:  http://localhost:' + PORT + '/portal/');
  console.log('  Zara:    http://localhost:' + PORT + '/zara/');
  console.log('  Massimo: http://localhost:' + PORT + '/massimo/');
  console.log('  FitMe:   http://localhost:' + PORT + '/fitme/');
});
