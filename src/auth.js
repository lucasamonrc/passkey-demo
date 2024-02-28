const express = require("express");
const db = require("./db");
const {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
} = require("@simplewebauthn/server");
const { isoBase64URL } = require("@simplewebauthn/server/helpers");
const crypto = require("crypto");

const router = express.Router();

router.use(express.json());

router.post("/register-start", async (req, res) => {
    const { displayName, email } = req.body;

    if (email in db.users) {
        return res.status(400).json({ message: "User already exists" });
    }

    db.users[email] = {
        id: isoBase64URL.fromBuffer(crypto.randomBytes(32)),
        displayName,
        email,
        credentials: [],
    };

    db.session.user = {
        id: db.users[email].id,
        displayName,
        email,
    };

    const authSelection = {
        authenticatorAttachment: "platform",
        requireResidentKey: true,
    };
    const attestationType = "none";

    const options = await generateRegistrationOptions({
        rpName: "@lucasamonrc passkeys demo",
        rpID: "localhost",
        userID: db.users[email].id,
        userName: email,
        userDisplayName: displayName,
        attestationType,
        authenticatorSelection: authSelection,
    });

    db.session.challenge = options.challenge;

    return res.json(options);
});

router.post("/register-finish", async (req, res) => {
    const expectedChallenge = db.session.challenge;
    const credential = req.body;

    console.log(credential);

    const verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge,
        expectedRPID: "localhost",
        expectedOrigin: "http://localhost:8080",
        requireUserVerification: false,
    });

    const { verified, registrationInfo } = verification;

    if (!verified) {
        return res.status(400).json({ message: "Registration failed" });
    }

    const { credentialPublicKey, credentialID } = registrationInfo;

    const base64PublicKey = isoBase64URL.fromBuffer(credentialPublicKey);
    const base64CredentialID = isoBase64URL.fromBuffer(credentialID);

    const { user } = db.session;

    db.users[user.email].credentials.push(base64CredentialID);
    db.credentials[base64CredentialID] = {
        id: base64CredentialID,
        publicKey: base64PublicKey,
        userEmail: user.email,
    };

    delete db.session.challenge;

    return res.json(user);
});

router.post("/login-start", async (req, res) => {
    const options = await generateAuthenticationOptions({
        allowCredentials: [],
        rpID: "localhost",
    });

    db.session.challenge = options.challenge;

    return res.json(options);
});

router.post("/login-finish", async (req, res) => {
    const credential = req.body;
    const expectedChallenge = db.session.challenge;

    const cred = db.credentials[credential.id];

    const user = db.users[cred.userEmail];

    const authenticator = {
        credentialPublicKey: isoBase64URL.toBuffer(cred.publicKey),
        credentialID: isoBase64URL.toBuffer(cred.id),
        transports: cred.transports,
    };

    const verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge,
        expectedRPID: "localhost",
        expectedOrigin: "http://localhost:8080",
        authenticator,
        requireUserVerification: false,
    });

    const { verified, authenticationInfo } = verification;

    if (!verified) {
        throw new Error("User verification failed.");
    }

    delete db.session.challenge;

    db.session.user = {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
    };

    return res.json(db.session.user);
});

module.exports = {
    auth: router,
};
