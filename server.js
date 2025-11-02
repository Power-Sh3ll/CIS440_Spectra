require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");


const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the "public" folder
app.use(express.static("public"));

//////////////////////////////////////
//ROUTES TO SERVE HTML FILES
//////////////////////////////////////
// Default route to serve logon.html
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/logon.html");
});

// Route to serve dashboard.html
app.get("/dashboard", (req, res) => {
  res.sendFile(__dirname + "/public/dashboard.html");
});

// Route to serve profile.html
app.get("/profile", (req, res) => {
  res.sendFile(__dirname + "/public/profile.html");
});

// Route to serve leaderboard.html
app.get("/leaderboard", (req, res) => {
  res.sendFile(__dirname + "/public/Leaderboard.html");
});
//////////////////////////////////////
//END ROUTES TO SERVE HTML FILES
//////////////////////////////////////

/////////////////////////////////////////////////
//HELPER FUNCTIONS AND AUTHENTICATION MIDDLEWARE
/////////////////////////////////////////////////
// Helper function to create a MySQL connection
async function createConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

// **Authorization Middleware: Verify JWT Token and Check User in Database**
async function authenticateToken(req, res, next) {
  const token = req.headers["authorization"];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token." });
    }

    try {
      const connection = await createConnection();

      // Query the database to verify that the email is associated with an active account
      const [rows] = await connection.execute(
        "SELECT email FROM user WHERE email = ?",
        [decoded.email]
      );

      await connection.end(); // Close connection

      if (rows.length === 0) {
        return res
          .status(403)
          .json({ message: "Account not found or deactivated." });
      }

      req.user = decoded; // Save the decoded email for use in the route
      next(); // Proceed to the next middleware or route handler
    } catch (dbError) {
      console.error(dbError);
      res
        .status(500)
        .json({ message: "Database error during authentication." });
    }
  });
}
/////////////////////////////////////////////////
//END HELPER FUNCTIONS AND AUTHENTICATION MIDDLEWARE
/////////////////////////////////////////////////

//////////////////////////////////////
//ROUTES TO HANDLE API REQUESTS
//////////////////////////////////////
// Route: Create Account
app.post("/api/create-account", async (req, res) => {
  const { email, password, firstName, lastName, dateOfBirth } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    const connection = await createConnection();
    const hashedPassword = await bcrypt.hash(password, 10); // Hash password

    await connection.execute(
      "INSERT INTO user (email, password, first_name, last_name, date_of_birth) VALUES (?, ?, ?, ?, ?)",
      [email, hashedPassword, firstName, lastName, dateOfBirth]
    );

    await connection.end(); // Close connection

    res.status(201).json({ message: "Account created successfully!" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      res
        .status(409)
        .json({ message: "An account with this email already exists." });
    } else {
      console.error(error);
      res.status(500).json({ message: "Error creating account." });
    }
  }
});

// Route: Logon
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    const connection = await createConnection();

    const [rows] = await connection.execute(
      "SELECT * FROM user WHERE email = ?",
      [email]
    );

    await connection.end(); // Close connection

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error logging in." });
  }
});

// Route: Get User Profile
app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const connection = await createConnection();

    const [rows] = await connection.execute(
      "SELECT email, first_name, last_name, date_of_birth FROM user WHERE email = ?",
      [req.user.email]
    );

    await connection.end();

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = rows[0];
    res.status(200).json({
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      dateOfBirth: user.date_of_birth,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching profile." });
  }
});

app.get("/api/leaderboard", authenticateToken, async (req, res) => {
  const query = `
        SELECT 
            email,
            first_name, 
            last_name, 
            walk_hours,
            run_hours,
            cycle_hours,
            hiking_hours,
            swimming_hours
        FROM user 
        ORDER BY walk_hours DESC
    `;
  try {
    const connection = await createConnection();
    const [rows] = await connection.execute(query);
    await connection.end();

    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching leaderboard." });
  }
});

// Route: Get All Email Addresses
app.get("/api/users", authenticateToken, async (req, res) => {
  try {
    const connection = await createConnection();

    const [rows] = await connection.execute("SELECT email FROM user");

    await connection.end(); // Close connection

    const emailList = rows.map((row) => row.email);
    res.status(200).json({ emails: emailList });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving email addresses." });
  }
});

// Save/update activity footprint for the logged-in user
app.post("/api/footprint/save", authenticateToken, async (req, res) => {
  // numbers only; default to 0
  const toNum = (v) => (isNaN(v) || v === "" || v == null ? 0 : Number(v));
  const steps         = toNum(req.body.steps);
  const walk_hours    = toNum(req.body.walk);
  const run_hours     = toNum(req.body.run);
  const cycle_hours   = toNum(req.body.cycle);
  const hiking_hours  = toNum(req.body.hike);
  const swimming_hours= toNum(req.body.swim);

  try {
    const conn = await createConnection();
    const [result] = await conn.execute(
      `UPDATE user
         SET steps = ?,
             walk_hours = ?,
             run_hours = ?,
             cycle_hours = ?,
             hiking_hours = ?,
             swimming_hours = ?
       WHERE email = ?`,
      [steps, walk_hours, run_hours, cycle_hours, hiking_hours, swimming_hours, req.user.email]
    );
    await conn.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json({ message: "Activity saved." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error saving activity." });
  }
});

// (Optional) fetch current values to prefill the form
app.get("/api/footprint", authenticateToken, async (req, res) => {
  try {
    const conn = await createConnection();
    const [rows] = await conn.execute(
      `SELECT steps, walk_hours AS walk, run_hours AS run,
              cycle_hours AS cycle, hiking_hours AS hike, swimming_hours AS swim
         FROM user WHERE email = ?`,
      [req.user.email]
    );
    await conn.end();
    if (!rows.length) return res.status(404).json({ message: "User not found." });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error fetching activity." });
  }
});

//////////////////////////////////////
// END ROUTES TO HANDLE API REQUESTS
//////////////////////////////////////
// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
