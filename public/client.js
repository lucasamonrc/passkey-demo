const base64url = {
    encode: function (buffer) {
        const base64 = window.btoa(
            String.fromCharCode(...new Uint8Array(buffer))
        );
        return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    },
    decode: function (base64url) {
        const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
        const binStr = window.atob(base64);
        const bin = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) {
            bin[i] = binStr.charCodeAt(i);
        }
        return bin.buffer;
    },
};

document
    .getElementById("registration")
    .addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value;
        const displayName = document.getElementById("displayName").value;

        const options = await fetch("/auth/register-start", {
            method: "POST",
            body: JSON.stringify({ email, displayName }),
            headers: {
                "Content-Type": "application/json",
            },
        }).then((res) => res.json());

        options.user.id = base64url.decode(options.user.id);
        options.challenge = base64url.decode(options.challenge);
        if (options.excludeCredentials) {
            for (let cred of options.excludeCredentials) {
                cred.id = base64url.decode(cred.id);
            }
        }

        options.authenticatorSelection = {
            authenticatorAttachment: "platform",
            requireResidentKey: true,
        };

        const cred = await navigator.credentials.create({
            publicKey: options,
        });

        const credential = {
            id: cred.id,
            rawId: base64url.encode(cred.rawId),
            type: cred.type,
        };

        if (cred.authenticatorAttachment) {
            credential.authenticatorAttachment = cred.authenticatorAttachment;
        }

        const clientDataJSON = base64url.encode(cred.response.clientDataJSON);
        const attestationObject = base64url.encode(
            cred.response.attestationObject
        );

        const transports = cred.response.getTransports
            ? cred.response.getTransports()
            : [];

        credential.response = {
            clientDataJSON,
            attestationObject,
            transports,
        };

        await fetch("/auth/register-finish", {
            method: "POST",
            body: JSON.stringify(credential),
            headers: {
                "Content-Type": "application/json",
            },
        });
    });

document
    .getElementById("authentication")
    .addEventListener("click", async (event) => {
        const options = await fetch("/auth/login-start", {
            method: "POST",
        }).then((res) => res.json());

        options.challenge = base64url.decode(options.challenge);
        options.allowCredentials = [];

        const cred = await navigator.credentials.get({
            publicKey: options,
            mediation: "optional",
        });

        const credential = {};
        credential.id = cred.id;
        credential.type = cred.type;
        credential.rawId = base64url.encode(cred.rawId);

        const clientDataJSON = base64url.encode(cred.response.clientDataJSON);
        const authenticatorData = base64url.encode(
            cred.response.authenticatorData
        );
        const signature = base64url.encode(cred.response.signature);
        const userHandle = base64url.encode(cred.response.userHandle);

        credential.response = {
            clientDataJSON,
            authenticatorData,
            signature,
            userHandle,
        };

        // Send the result to the server and return the promise.
        const data = await fetch(`/auth/login-finish`, {
            method: "POST",
            body: JSON.stringify(credential),
            headers: {
                "Content-Type": "application/json",
            },
        }).then((res) => res.json());

        console.log(data);
    });
