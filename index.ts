const express = require('express');
const app = express();
const port = 3000;
const cors = require('cors');
import zod from 'zod';
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

app.use(express.json());
app.use(cors());

app.get('/', (req:any, res:any) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});