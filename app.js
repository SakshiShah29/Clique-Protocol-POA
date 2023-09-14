const express = require('express');
const app = express();
const port = process.env.PORT || 3000;


const sealerRoutes = require('./routes/sealerRoutes');
const itemRoutes = require('./routes/itemRoutes');


app.use(express.json());

// Use the routes
app.use('/api/sealer', sealerRoutes);
app.use('/api/item', itemRoutes);


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
