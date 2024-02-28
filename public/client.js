async function test() {
    const data = await fetch("/auth/login").then((res) => res.json());
    alert(data.message);
}
