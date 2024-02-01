let headers = $response.headers;

headers["user-agent"] = "Surge";

let body = $response.body;

console.log("======\n" + body + "\n======");

$done({ headers, body });
