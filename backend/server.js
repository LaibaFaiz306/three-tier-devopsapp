const { app, initDb } = require('./app');
const PORT = process.env.PORT || 5000;

initDb()
  .then(() => app.listen(PORT, () => console.log(`Backend listening on ${PORT}`)))
  .catch(err => { console.error(err); process.exit(1); });
