const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server is Running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

//Register API

app.post("/register", async (request, response) => {
  const userDetails = request.body;
  const { username, name, password, gender, location } = userDetails;
  const hashedPassword = await bcrypt.hash(password, 10);

  const selectUserQuery = `

        SELECT *
        FROM user
        WHERE
        username = '${username}';
    `;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const createUserQuery = `
            INSERT INTO user
            (username,name,password,gender,location)
            VALUES
            (
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}'
            );
          `;
      await db.run(createUserQuery);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//Login API

app.post("/login", async (request, response) => {
  const userDetails = request.body;
  const { username, password } = userDetails;
  const selectUserQuery = `

        SELECT *
        FROM user
        WHERE
        username = '${username}';
    `;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//Update password API

app.put("/change-password", async (request, response) => {
  const newPasswordDetails = request.body;
  const { username, oldPassword, newPassword } = newPasswordDetails;
  const newHashedPassword = await bcrypt.hash(newPassword, 10);
  const selectUserQuery = `
        SELECT *
        FROM user
        WHERE
        username = '${username}';
    `;
  const dbUser = await db.get(selectUserQuery);
  const isOldPasswordMatched = await bcrypt.compare(
    oldPassword,
    dbUser.password
  );
  if (isOldPasswordMatched === true) {
    if (newPassword.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const updateNewPasswordQuery = `
                UPDATE user
                SET
                password = '${newHashedPassword}'
                WHERE
                username = '${username}';
            `;
      await db.run(updateNewPasswordQuery);
      response.send("Password updated");
    }
  } else {
    response.status(400);
    response.send("Invalid current password");
  }
});

module.exports = app;
