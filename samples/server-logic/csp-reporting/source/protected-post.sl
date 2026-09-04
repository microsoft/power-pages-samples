function post() {
    return JSON.stringify({
        accepted: true,
        protection: "antiforgery token required"
    });
}
