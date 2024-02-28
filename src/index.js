const path = require("path");
const express = require("express");
const session = require("express-session");

const { auth } = require("./auth");

const app = express();

app.use(express.json());
app.use(express.static("public"));
app.use(
    session({
        secret: "secret",
        resave: true,
        saveUninitialized: false,
        proxy: true,
        cookie: {
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV !== "dev",
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
    })
);

const RP_NAME = "@lucasamonrc passkeys demo";

app.use((req, res, next) => {
    process.env.HOSTNAME = req.hostname;
    const protocol = process.env.NODE_ENV === "localhost" ? "http" : "https";
    process.env.ORIGIN = `${protocol}://${req.headers.host}`;
    process.env.RP_NAME = RP_NAME;
    req.schema = "https";
    return next();
});

app.get("/", (req, res) => {
    return res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use("/auth", auth);

const listener = app.listen(process.env.PORT || 8080, () => {
    console.log("Your app is listening on port " + listener.address().port);
});
