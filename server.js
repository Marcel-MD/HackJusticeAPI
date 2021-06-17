/////////////// Server Setup /////////////////
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUI = require("swagger-ui-express");

// Swagger API
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "HackJustice",
      version: "1.0.0",
      description: "A simple Express API for a hackathon project.",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
  },
  apis: ["./routes/*.js"], // files containing annotations as above
};

const specs = swaggerJsDoc(options);

// CORS policy
var corsOptions = {
  origin: "http://localhost:8080",
  optionsSuccessStatus: 200, // For legacy browser support
};

// Express App
const app = express();
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ extended: false }));
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));

// Mongoose Connect Database
try {
  mongoose.connect(process.env.MONGODB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  });
  console.log("MongoDB Connected...");
} catch (err) {
  console.error(err);
}

// Test Route
app.get("/", (req, res) => {
  res.send("Hello World");
});

// Define Routes
app.use("/users", require("./routes/users"));
app.use("/games", require("./routes/games"));

// Server App Listen
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
