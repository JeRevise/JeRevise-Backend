const express = require("express");
const cors = require("cors");
require("dotenv").config();
const sequelize = require("./config/db");

const authRoutes = require("./routes/auth");
// const coursRoutes = require("./routes/cours");
// const qcmRoutes = require("./routes/qcm");
// const eleveRoutes = require("./routes/eleve");

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
// app.use("/api/cours", coursRoutes);
// app.use("/api/qcm", qcmRoutes);
// app.use("/api/eleve", eleveRoutes);


// Test DB & serveur
sequelize.authenticate()
  .then(() => console.log("DB connected"))
  .catch(err => console.log("DB error: ", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
