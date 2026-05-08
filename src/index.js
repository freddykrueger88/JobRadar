const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/bewerbungen', require('./routes/bewerbungen'));
app.use('/api/profil', require('./routes/profil'));
app.use('/api/vorlagen', require('./routes/vorlagen'));
app.use('/api/suche', require('./routes/suche'));
app.use('/api/ki', require('./routes/ki'));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

app.listen(PORT, () => console.log(`JobRadar läuft auf http://localhost:${PORT}`));
