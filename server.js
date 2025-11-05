require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const footprint = require("./routes/footprint");

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

// Route to serve friends.html
app.get("/friends", (req, res) => {
  res.sendFile(__dirname + "/public/friends.html");
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

// Route: Get current friends and pending requests
app.get("/api/friends", authenticateToken, async (req, res) => {
  try {
    const connection = await createConnection();
    const userEmail = req.user.email;

    // Get accepted friendships where user is involved (avoiding duplicates)
    const [friendsRows] = await connection.execute(`
      SELECT DISTINCT
        CASE 
          WHEN user_email = ? THEN friend_email 
          ELSE user_email 
        END as friend_email
      FROM friendships f
      WHERE (user_email = ? OR friend_email = ?) 
      AND status = 'accepted'
    `, [userEmail, userEmail, userEmail]);

    // Get pending friend requests received (only where user is the recipient)
    const [receivedRows] = await connection.execute(`
      SELECT DISTINCT 
        f.user_email as requester_email, 
        f.created_at
      FROM friendships f
      WHERE f.friend_email = ? AND f.status = 'pending'
    `, [userEmail]);

    // Get pending friend requests sent (only where user is the sender)
    const [sentRows] = await connection.execute(`
      SELECT 
        f.friend_email as recipient_email, 
        f.created_at
      FROM friendships f
      WHERE f.user_email = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `, [userEmail]);

    // Remove any potential duplicates by recipient email
    const uniqueSentRows = sentRows.filter((request, index, self) => 
      index === self.findIndex(r => r.recipient_email === request.recipient_email)
    );

    await connection.end();

    res.status(200).json({
      friends: friendsRows,
      receivedRequests: receivedRows,
      sentRequests: uniqueSentRows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving friends data." });
  }
});

// Route: Send friend request
app.post("/api/friends/request", authenticateToken, async (req, res) => {
  const { friendEmail } = req.body;
  const userEmail = req.user.email;

  if (!friendEmail) {
    return res.status(400).json({ message: "Friend email is required." });
  }

  if (friendEmail === userEmail) {
    return res.status(400).json({ message: "Cannot send friend request to yourself." });
  }

  try {
    const connection = await createConnection();

    // Check if friend exists
    const [userExists] = await connection.execute(
      'SELECT email FROM user WHERE email = ?',
      [friendEmail]
    );

    if (userExists.length === 0) {
      await connection.end();
      return res.status(404).json({ message: "User not found." });
    }

    // Check if friendship already exists (in either direction)
    const [existingFriendship] = await connection.execute(`
      SELECT * FROM friendships 
      WHERE (user_email = ? AND friend_email = ?) 
      OR (user_email = ? AND friend_email = ?)
    `, [userEmail, friendEmail, friendEmail, userEmail]);

    if (existingFriendship.length > 0) {
      await connection.end();
      return res.status(409).json({ message: "Friendship request already exists or you are already friends." });
    }

    // Create friend request (only one direction: sender -> recipient)
    await connection.execute(
      'INSERT INTO friendships (user_email, friend_email, requested_by, status) VALUES (?, ?, ?, ?)',
      [userEmail, friendEmail, userEmail, 'pending']
    );

    await connection.end();
    res.status(201).json({ message: "Friend request sent successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error sending friend request." });
  }
});

// Route: Accept friend request
app.post("/api/friends/accept", authenticateToken, async (req, res) => {
  const { requesterEmail } = req.body;
  const userEmail = req.user.email;

  if (!requesterEmail) {
    return res.status(400).json({ message: "Requester email is required." });
  }

  try {
    const connection = await createConnection();

    // Update the friend request to accepted
    const [result] = await connection.execute(`
      UPDATE friendships 
      SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
      WHERE user_email = ? AND friend_email = ? AND status = 'pending'
    `, [requesterEmail, userEmail]);

    await connection.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Friend request not found." });
    }

    res.status(200).json({ message: "Friend request accepted!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error accepting friend request." });
  }
});

// Route: Decline friend request
app.post("/api/friends/decline", authenticateToken, async (req, res) => {
  const { requesterEmail } = req.body;
  const userEmail = req.user.email;

  if (!requesterEmail) {
    return res.status(400).json({ message: "Requester email is required." });
  }

  try {
    const connection = await createConnection();

    // Delete the friend request
    const [result] = await connection.execute(`
      DELETE FROM friendships 
      WHERE user_email = ? AND friend_email = ? AND status = 'pending'
    `, [requesterEmail, userEmail]);

    await connection.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Friend request not found." });
    }

    res.status(200).json({ message: "Friend request declined." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error declining friend request." });
  }
});

// Route: Remove friend
app.delete("/api/friends/remove", authenticateToken, async (req, res) => {
  const { friendEmail } = req.body;
  const userEmail = req.user.email;

  if (!friendEmail) {
    return res.status(400).json({ message: "Friend email is required." });
  }

  try {
    const connection = await createConnection();

    // Remove friendship (works in both directions)
    const [result] = await connection.execute(`
      DELETE FROM friendships 
      WHERE ((user_email = ? AND friend_email = ?) OR (user_email = ? AND friend_email = ?))
      AND status = 'accepted'
    `, [userEmail, friendEmail, friendEmail, userEmail]);

    await connection.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Friendship not found." });
    }

    res.status(200).json({ message: "Friend removed successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error removing friend." });
  }
});

//////////////////////////////////////
// END ROUTES TO HANDLE API REQUESTS
//////////////////////////////////////

// ✅ Mount footprint API AFTER middleware and all routes
app.use("/api/footprint", authenticateToken, footprint);

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
